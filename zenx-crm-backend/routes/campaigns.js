const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../services/supabase');

const DELIVERY_SERVICE_URL = `${process.env.CHANNEL_SERVICE_URL || 'http://localhost:4000'}/send`;
const CALLBACK_BASE_URL = process.env.CALLBACK_BASE_URL || 'http://localhost:3001';
// GET /campaigns — all campaigns with campaign_stats and segment name
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        campaign_stats (*),
        segments ( id, name )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('GET /campaigns error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /campaigns — create campaign + campaign_variant
router.post('/', async (req, res) => {
  try {
    const {
      name,
      segment_id,
      channel,
      status = 'draft',
      scheduled_at,
      // variant fields
      variant_name,
      message_template,
      weight = 100,
      ai_generated = false,
    } = req.body;

    if (!name || !segment_id || !channel) {
      return res.status(400).json({ error: 'name, segment_id, and channel are required.' });
    }

    // Insert campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({ name, segment_id, channel, status, scheduled_at })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // Insert campaign_variant
    const { data: variant, error: variantError } = await supabase
      .from('campaign_variants')
      .insert({
        campaign_id: campaign.id,
        variant_name: variant_name || 'Default',
        message_template,
        weight,
        ai_generated,
      })
      .select()
      .single();

    if (variantError) throw variantError;

    res.status(201).json({ campaign, variant });
  } catch (err) {
    console.error('POST /campaigns error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /campaigns/:id/send — dispatch campaign to every customer in the segment
router.post('/:id/send', async (req, res) => {
  const { id: campaignId } = req.params;
  console.log(`[SEND] Campaign ${campaignId} send triggered`);
  console.log(`[SEND] DELIVERY_SERVICE_URL = ${DELIVERY_SERVICE_URL}`);

  try {
    // Fetch campaign with its segment (including sql_query) and first variant
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        segments ( id, sql_query ),
        campaign_variants ( id, message_template )
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    console.log(`[SEND] Campaign channel: ${campaign.channel}`);

    const variant = campaign.campaign_variants?.[0];
    if (!variant) return res.status(400).json({ error: 'No variant found for this campaign.' });

    // ── Resolve audience from segment filter ─────────────────────────────────
    let targetProfileIds = null; // null means no filter → send to all (fallback)

    const rawFilter = campaign.segments?.sql_query;
    if (rawFilter) {
      let filters;
      try {
        filters = typeof rawFilter === 'string' ? JSON.parse(rawFilter) : rawFilter;
      } catch {
        filters = null;
      }

      if (Array.isArray(filters) && filters.length > 0) {
        console.log(`[SEND] Applying segment filters:`, JSON.stringify(filters));
        const { data: allAttributes, error: attrError } = await supabase
          .from('customer_attributes')
          .select('profile_id, key, value');

        if (attrError) throw attrError;

        const profileMap = {};
        for (const attr of allAttributes) {
          if (!profileMap[attr.profile_id]) profileMap[attr.profile_id] = {};
          profileMap[attr.profile_id][attr.key] = attr.value;
        }

        targetProfileIds = Object.entries(profileMap)
          .filter(([, attrs]) =>
            filters.every((f) => {
              const val = attrs[f.key];
              if (val === undefined || val === null) return false;
              switch (f.operator) {
                case 'eq':       return val.toLowerCase() === String(f.value).toLowerCase();
                case 'gt':       return parseFloat(val) > parseFloat(f.value);
                case 'lt':       return parseFloat(val) < parseFloat(f.value);
                case 'contains': return val.toLowerCase().includes(String(f.value).toLowerCase());
                default:         return false;
              }
            })
          )
          .map(([id]) => id);

        console.log(`[SEND] Segment matched ${targetProfileIds.length} profiles`);

        if (targetProfileIds.length === 0) {
          await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId);
          return res.json({ campaign_id: campaignId, dispatched: 0, results: [] });
        }
      }
    }

    // ── Fetch profiles ───────────────────────────────────────────────────────
    let profileQuery = supabase
      .from('customer_profiles')
      .select(`
        id,
        customer_identities ( channel, value, is_primary, opted_in ),
        customer_attributes ( key, value )
      `);

    if (targetProfileIds) {
      profileQuery = profileQuery.in('id', targetProfileIds);
    }

    const { data: profiles, error: profilesError } = await profileQuery;
    if (profilesError) throw profilesError;

    console.log(`[SEND] Fetched ${profiles.length} profiles`);

    // Mark campaign as sending
    await supabase
      .from('campaigns')
      .update({ status: 'sending', sent_at: new Date().toISOString() })
      .eq('id', campaignId);

    // ── Build send records ───────────────────────────────────────────────────
    const sendRecords = [];

    for (const profile of profiles) {
      // Find channel identity — allow opted_in=null (not explicitly opted out)
      // Only skip if opted_in is explicitly false
      const identity = profile.customer_identities?.find(
        (i) => i.channel === campaign.channel && i.opted_in !== false
      );

      if (!identity) {
        console.log(`[SEND] Profile ${profile.id} skipped — no ${campaign.channel} identity (or explicitly opted out)`);
        continue;
      }

      const nameAttr = profile.customer_attributes?.find((a) => a.key === 'name');
      const customerName = nameAttr?.value || 'Valued Customer';
      const personalizedMessage = (variant.message_template || '').replace(/\{name\}/gi, customerName);

      const { data: send, error: sendError } = await supabase
        .from('campaign_sends')
        .insert({
          campaign_id: campaignId,
          variant_id: variant.id,
          profile_id: profile.id,
          channel_address: identity.value,
          message_sent: personalizedMessage,
          status: 'pending',
        })
        .select()
        .single();

      if (sendError) {
        console.error(`[SEND] campaign_send insert error for profile ${profile.id}:`, sendError.message);
        continue;
      }

      sendRecords.push({ send, identity, personalizedMessage });
    }

    console.log(`[SEND] ${sendRecords.length} send records created, dispatching now...`);

    // ── Mark completed & respond immediately (fire-and-forget dispatch) ──────
    await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaignId);
    res.json({ campaign_id: campaignId, dispatched: sendRecords.length, results: sendRecords.map(r => ({ send_id: r.send.id, status: 'queued' })) });

    // ── Dispatch to channel service in background (non-blocking) ─────────────
    for (const { send, identity, personalizedMessage } of sendRecords) {
      const payload = {
        send_id: send.id,
        recipient: identity.value,
        message: personalizedMessage,
        channel: campaign.channel,
        callback_url: `${CALLBACK_BASE_URL}/api/receipts`,
      };
      console.log(`[SEND] Dispatching send_id=${send.id} to ${identity.value} via ${campaign.channel}`);
      axios.post(DELIVERY_SERVICE_URL, payload, { timeout: 30000 })
        .then(() => console.log(`[SEND] Dispatch OK send_id=${send.id}`))
        .catch((err) => console.error(`[SEND] Dispatch FAIL send_id=${send.id}: ${err.message}`));
    }

  } catch (err) {
    console.error(`[SEND] POST /campaigns/${campaignId}/send error:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});



// GET /campaigns/:id/stats — fetch campaign_stats for a campaign
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('campaign_stats')
      .select('*')
      .eq('campaign_id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Stats not found for this campaign.' });

    res.json(data);
  } catch (err) {
    console.error(`GET /campaigns/${req.params.id}/stats error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../services/supabase');

const DELIVERY_SERVICE_URL = 'http://localhost:4000/send';
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

  try {
    // Fetch campaign with its segment and first variant
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        *,
        segments ( id ),
        campaign_variants ( id, message_template )
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    const variant = campaign.campaign_variants?.[0];
    if (!variant) return res.status(400).json({ error: 'No variant found for this campaign.' });

    // Fetch all profiles in the segment via the segment's sql_query result
    // Segments store a sql_query; we use customer_profiles as the base audience.
    // For MVP we pull all profiles and use identity matching for the channel.
    const { data: profiles, error: profilesError } = await supabase
      .from('customer_profiles')
      .select(`
        id,
        customer_identities ( channel, value, is_primary, opted_in )
      `);

    if (profilesError) throw profilesError;

    // Mark campaign as sending
    await supabase
      .from('campaigns')
      .update({ status: 'sending', sent_at: new Date().toISOString() })
      .eq('id', campaignId);

    const results = [];

    for (const profile of profiles) {
      // Find the matching channel identity for this campaign's channel
      const identity = profile.customer_identities?.find(
        (i) => i.channel === campaign.channel && i.opted_in
      );

      if (!identity) continue; // skip profiles without a valid identity for this channel

      // Insert campaign_send record
      const { data: send, error: sendError } = await supabase
        .from('campaign_sends')
        .insert({
          campaign_id: campaignId,
          variant_id: variant.id,
          profile_id: profile.id,
          channel_address: identity.value,
          message_sent: variant.message_template,
          status: 'pending',
        })
        .select()
        .single();

      if (sendError) {
        console.error(`campaign_send insert error for profile ${profile.id}:`, sendError.message);
        continue;
      }

      // Dispatch to delivery service (fire-and-forget per send)
      try {
        await axios.post(DELIVERY_SERVICE_URL, {
          send_id: send.id,
          recipient: identity.value,
          message: variant.message_template,
          channel: campaign.channel,
          callback_url: `${CALLBACK_BASE_URL}/api/receipts`,
        });

        results.push({ send_id: send.id, status: 'dispatched' });
      } catch (dispatchErr) {
        console.error(`Dispatch error for send ${send.id}:`, dispatchErr.message);
        results.push({ send_id: send.id, status: 'dispatch_failed', error: dispatchErr.message });
      }
    }

    // Mark campaign as completed
    await supabase
      .from('campaigns')
      .update({ status: 'completed' })
      .eq('id', campaignId);

    res.json({ campaign_id: campaignId, dispatched: results.length, results });
  } catch (err) {
    console.error(`POST /campaigns/${campaignId}/send error:`, err.message);
    res.status(500).json({ error: err.message });
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

// routes/ai.js
const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// ── Simple in-memory cache with TTL ──────────────────────────────────────────
const cache = new Map();
function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.value;
}
function setCache(key, value, ttlMs = 3600000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// gemini-2.5-flash confirmed working on this account
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function callGemini(prompt, temperature = 0.1) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env');

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature },
    }),
  });

  const data = await res.json();

  // ── DIAGNOSTIC LOGGING (shows in your backend terminal) ──────────────────
  if (!res.ok || data.error) {
    console.error('[GEMINI ERROR] HTTP status:', res.status);
    console.error('[GEMINI ERROR] Body:', JSON.stringify(data, null, 2));
    throw new Error(data.error?.message || `Gemini API returned status ${res.status}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  console.log('[GEMINI RAW RESPONSE]:\n', text || '(empty — no candidates returned)');

  if (!text) {
    // Log the full response to understand why candidates is empty
    console.error('[GEMINI] Full response (no text extracted):', JSON.stringify(data, null, 2));
  }

  return text;
}

function safeParseJSON(text) {
  if (!text) return null;

  // Strategy 1: direct parse (Gemini obeyed the "no fences" instruction)
  try { return JSON.parse(text.trim()); } catch {}

  // Strategy 2: extract from a ```json ... ``` or ``` ... ``` block ANYWHERE in the text
  // Gemini often wraps even when told not to, and may add explanation before the fence
  try {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) return JSON.parse(fenceMatch[1].trim());
  } catch {}

  // Strategy 3: extract the first JSON array [...] found anywhere in the text
  try {
    const arrayMatch = text.match(/\[[\s\S]*?\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
  } catch {}

  // Strategy 4: extract the first JSON object {...} found anywhere in the text
  try {
    const objectMatch = text.match(/\{[\s\S]*?\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);
  } catch {}

  console.error('[AI] Could not parse Gemini response. Raw text was:\n', text);
  return null;
}

// POST /api/ai/segment
router.post('/segment', async (req, res) => {
  try {
    const { nl_query } = req.body;
    if (!nl_query?.trim()) {
      return res.status(400).json({ error: 'nl_query is required' });
    }

    const prompt = `You are a CRM segmentation engine for a fashion brand.

Customer data is stored as key-value pairs. Available attribute keys:
- name (string)
- city (string, e.g. "Mumbai", "Delhi", "Bangalore")
- loyalty_tier (exactly one of: "vip", "new", "regular", "lapsed")
- total_spent (numeric string, e.g. "4500")
- last_order_days_ago (numeric string, e.g. "70")

Convert this query into a JSON filter array:
"${nl_query}"

Rules:
- Return ONLY a raw JSON array. No markdown. No explanation. No code fences.
- Each filter: { "key": string, "operator": "eq"|"gt"|"lt"|"contains", "value": string }
- For loyalty_tier use operator "eq"
- For total_spent and last_order_days_ago use "gt" or "lt" with numeric string values
- For city and name use "eq" or "contains"
- Use multiple filters for AND conditions

Example output for "vip customers from Mumbai who spent over 2000":
[{"key":"loyalty_tier","operator":"eq","value":"vip"},{"key":"city","operator":"eq","value":"Mumbai"},{"key":"total_spent","operator":"gt","value":"2000"}]`;

    const raw = await callGemini(prompt, 0.1);

    // Try parsing — handle both array and {filters:[]} shapes
    let filters = safeParseJSON(raw);
    if (!filters) {
      return res.status(422).json({
        error: 'Could not parse AI response. Try rephrasing your query.',
        raw,
      });
    }
    if (!Array.isArray(filters)) {
      filters = filters.filters || [];
    }
    if (!Array.isArray(filters) || filters.length === 0) {
      return res
        .status(422)
        .json({ error: 'No filters generated. Try a more specific query.' });
    }

    // Fetch all attributes
    const { data: allAttributes, error: attrError } = await supabase
      .from('customer_attributes')
      .select('profile_id, key, value');

    if (attrError) throw attrError;

    // Group by profile_id
    const profileMap = {};
    for (const attr of allAttributes) {
      if (!profileMap[attr.profile_id]) profileMap[attr.profile_id] = {};
      profileMap[attr.profile_id][attr.key] = attr.value;
    }

    // Apply filters (AND logic)
    const matchingIds = Object.entries(profileMap)
      .filter(([, attrs]) =>
        filters.every((f) => {
          const val = attrs[f.key];
          if (val === undefined || val === null) return false;
          switch (f.operator) {
            case 'eq':
              return val.toLowerCase() === String(f.value).toLowerCase();
            case 'gt':
              return parseFloat(val) > parseFloat(f.value);
            case 'lt':
              return parseFloat(val) < parseFloat(f.value);
            case 'contains':
              return val.toLowerCase().includes(String(f.value).toLowerCase());
            default:
              return false;
          }
        })
      )
      .map(([id]) => id);

    // Fetch matching customer details (max 10 for preview)
    const { data: customers } = await supabase
      .from('customer_profiles')
      .select(
        'id, customer_identities(channel,value), customer_attributes(key,value)'
      )
      .in(
        'id',
        matchingIds.length > 0
          ? matchingIds
          : ['00000000-0000-0000-0000-000000000000']
      );

    // Save segment to DB
    const { data: segment } = await supabase
      .from('segments')
      .insert({
        name: nl_query.slice(0, 80),
        nl_query,
        sql_query: JSON.stringify(filters),
        last_count: matchingIds.length,
        last_computed: new Date().toISOString(),
      })
      .select()
      .single();

    res.json({
      nl_query,
      filters,
      segment_id: segment?.id,
      preview_count: matchingIds.length,
      customers: (customers || []).slice(0, 10),
    });
  } catch (err) {
    console.error('AI segment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/message
router.post('/message', async (req, res) => {
  try {
    const {
      segment_description,
      channel = 'whatsapp',
      brand_name = 'ZenX',
    } = req.body;
    if (!segment_description?.trim()) {
      return res
        .status(400)
        .json({ error: 'segment_description is required' });
    }

    // Per-channel correct max lengths
    const MAX_LENGTHS = { sms: 160, whatsapp: 300, email: 500, rcs: 400 };
    const maxLen = MAX_LENGTHS[channel] || 300;

    // Emoji hint to make channel feel native
    const channelHints = {
      whatsapp: 'Use 1-2 tasteful emojis.',
      sms: 'No emojis. Plain text only.',
      email: 'Professional yet warm. Can be slightly longer.',
      rcs: 'Rich and engaging. Use 1-2 emojis.',
    };
    const channelHint = channelHints[channel] || '';

    const prompt = `You are a marketing copywriter for ${brand_name}, a premium D2C Indian fashion brand.

Write ONE ${channel.toUpperCase()} marketing message for this customer segment: "${segment_description}"

CRITICAL RULES — follow exactly:
1. You MUST use the literal string {name} (with curly braces) as the ONLY personalization placeholder. Never write a real person's name like Priya, Rahul, Ananya, etc.
2. Start the message with "Hi {name}" or "Hey {name}," — never a real name.
3. Keep the message under ${maxLen} characters (including {name}).
4. ${channelHint}
5. Include one clear call-to-action.
6. Return ONLY the message text. No quotes. No explanation. No labels.

CORRECT example output:
Hi {name}! Your favourite styles are back in stock. Grab them before they sell out 👗 Shop now: [Link]

WRONG example (never do this):
Hi Priya! Your favourite styles are back in stock.`;

    let message = await callGemini(prompt, 0.75);
    if (!message) {
      return res.status(500).json({ error: 'Failed to generate message' });
    }

    // ── Safety net: replace any hardcoded Indian names with {name} ──────────
    // Covers common names Gemini tends to default to
    const commonNames = /\b(Priya|Rahul|Ananya|Arjun|Divya|Neha|Amit|Aisha|Rohan|Sneha|Kavya|Riya|Ishaan|Pooja|Vikram)\b/g;
    message = message.replace(commonNames, '{name}');

    // If Gemini still put no {name}, prepend one
    if (!message.includes('{name}')) {
      message = `Hi {name}! ${message}`;
    }

    // Trim to channel max length (preserve {name} if it would be cut)
    if (message.length > maxLen) {
      message = message.slice(0, maxLen - 1).trimEnd() + '…';
    }

    res.json({ message });
  } catch (err) {
    console.error('AI message error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/insights — Generate AI-powered CRM insights
router.post('/insights', async (req, res) => {
  try {
    const cacheKey = 'ai_insights';
    const cached = getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    // Fetch customer attribute summary
    const { data: attrs } = await supabase
      .from('customer_attributes')
      .select('profile_id, key, value');

    // Fetch basic campaign stats
    const { data: stats } = await supabase
      .from('campaign_stats')
      .select('total_sent, total_delivered, total_opened, total_clicked');

    const { count: totalCustomers } = await supabase
      .from('customer_profiles')
      .select('id', { count: 'exact', head: true });

    // Build distribution summary
    const profileMap = {};
    for (const a of (attrs || [])) {
      if (!profileMap[a.profile_id]) profileMap[a.profile_id] = {};
      profileMap[a.profile_id][a.key] = a.value;
    }
    const profiles = Object.values(profileMap);

    const tierCounts = { vip: 0, regular: 0, new: 0, lapsed: 0 };
    let totalSpentSum = 0, highValueCount = 0, atRiskCount = 0;
    for (const p of profiles) {
      const tier = (p.loyalty_tier || 'new').toLowerCase();
      if (tierCounts[tier] !== undefined) tierCounts[tier]++;
      const spent = parseFloat(p.total_spent || 0);
      totalSpentSum += spent;
      if (spent > 10000) highValueCount++;
      const daysAgo = parseFloat(p.last_order_days_ago || 0);
      if (daysAgo > 90) atRiskCount++;
    }

    const campaignTotals = (stats || []).reduce(
      (acc, s) => ({
        sent: acc.sent + (s.total_sent || 0),
        delivered: acc.delivered + (s.total_delivered || 0),
        opened: acc.opened + (s.total_opened || 0),
        clicked: acc.clicked + (s.total_clicked || 0),
      }),
      { sent: 0, delivered: 0, opened: 0, clicked: 0 }
    );

    const deliveryRate = campaignTotals.sent > 0
      ? Math.round((campaignTotals.delivered / campaignTotals.sent) * 100) : 0;
    const openRate = campaignTotals.delivered > 0
      ? Math.round((campaignTotals.opened / campaignTotals.delivered) * 100) : 0;
    const clickRate = campaignTotals.opened > 0
      ? Math.round((campaignTotals.clicked / campaignTotals.opened) * 100) : 0;

    const prompt = `You are an AI analyst for ZenX, a premium D2C Indian fashion CRM.

Customer Database Summary:
- Total customers: ${totalCustomers || profiles.length}
- VIP: ${tierCounts.vip}, Regular: ${tierCounts.regular}, New: ${tierCounts.new}, Lapsed: ${tierCounts.lapsed}
- High-value customers (spent >₹10,000): ${highValueCount}
- At-risk customers (no purchase >90 days): ${atRiskCount}
- Avg. spent: ₹${profiles.length > 0 ? Math.round(totalSpentSum / profiles.length) : 0}

Campaign Performance:
- Delivery rate: ${deliveryRate}%, Open rate: ${openRate}%, Click rate: ${clickRate}%

Generate a JSON response with these exact keys (no markdown):
{
  "churn_risk": { "count": number, "percentage": number, "level": "high"|"medium"|"low", "recommendation": "one actionable sentence" },
  "ltv_insight": { "avg_ltv": number, "top_segment": "segment name", "ltv_growth_tip": "one sentence" },
  "next_best_action": { "action": "short action title", "description": "2 sentence description", "target_segment": "segment", "estimated_reach": number, "priority": "high"|"medium" },
  "health_score": { "score": number_0_to_100, "trend": "up"|"down"|"stable", "summary": "one sentence" },
  "quick_wins": [ { "title": "short title", "impact": "high"|"medium", "description": "one sentence" } ]
}

Base recommendations on the data. Be specific and actionable.`;

    const raw = await callGemini(prompt, 0.3);
    const insights = safeParseJSON(raw);

    if (!insights) {
      // Fallback mock insights when AI fails
      const fallback = {
        churn_risk: { count: atRiskCount, percentage: profiles.length > 0 ? Math.round((atRiskCount / profiles.length) * 100) : 0, level: atRiskCount > 20 ? 'high' : 'medium', recommendation: 'Send a re-engagement campaign to inactive customers with a special discount.' },
        ltv_insight: { avg_ltv: Math.round(totalSpentSum / Math.max(profiles.length, 1)), top_segment: 'VIP', ltv_growth_tip: 'Focus on converting Regular customers to VIP through loyalty rewards.' },
        next_best_action: { action: 'Re-engage Lapsed VIPs', description: 'Your lapsed VIP segment has high purchase history. A targeted 20% discount campaign could reactivate them.', target_segment: 'Lapsed VIP', estimated_reach: tierCounts.lapsed, priority: 'high' },
        health_score: { score: Math.min(100, Math.max(0, deliveryRate + openRate / 2)), trend: 'stable', summary: `Overall CRM health is ${deliveryRate > 70 ? 'strong' : 'moderate'} with ${deliveryRate}% delivery rate.` },
        quick_wins: [
          { title: 'WhatsApp blast to VIPs', impact: 'high', description: 'Send a personalized message to your VIP segment — they have the highest engagement rates.' },
          { title: 'Welcome new customers', impact: 'medium', description: 'Automate a welcome message for the ${tierCounts.new} new customers in your database.' },
        ],
      };
      setCache(cacheKey, fallback);
      return res.json({ ...fallback, cached: false, fallback: true });
    }

    setCache(cacheKey, insights);
    res.json({ ...insights, cached: false });
  } catch (err) {
    console.error('AI insights error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// routes/ai.js
const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

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

    const maxLen = channel === 'sms' ? 160 : 300;

    const prompt = `You are a marketing copywriter for ${brand_name}, a premium D2C Indian fashion brand.

Write a ${channel} message for this customer segment: "${segment_description}"

Rules:
- Use {name} exactly once as the personalization placeholder
- Maximum ${maxLen} characters
- Be warm, specific, urgent but not pushy
- Include one clear call to action
- Sound like a real brand, not a template
- Return ONLY the message text. No quotes. No explanation.`;

    const message = await callGemini(prompt, 0.7);
    if (!message) {
      return res.status(500).json({ error: 'Failed to generate message' });
    }

    res.json({ message });
  } catch (err) {
    console.error('AI message error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

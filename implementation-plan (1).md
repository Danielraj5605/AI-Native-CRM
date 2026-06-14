# ZenX CRM — Frontend Implementation Plan (v2)
> Give this entire file to Gemini. It contains everything needed to build the frontend and AI routes.

---

## Project Context

You are building the frontend for **ZenX CRM** — an AI-native Mini CRM for a D2C Indian fashion brand called **ZenX**. The frontend connects to a running Express backend on `http://localhost:3001`.

The product helps marketers:
1. View their shoppers
2. Create audience segments using plain English (AI-powered)
3. Send personalized campaigns via WhatsApp/SMS/Email
4. Track campaign performance in real time

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, already initialized)
- **Styling:** Tailwind CSS (already installed)
- **HTTP:** fetch API (no axios needed)
- **No TypeScript**
- **No authentication**
- **No external UI libraries**

---

## Design Direction

**Brand:** ZenX — a modern, minimal D2C Indian fashion label.

**CSS Variables (add to globals.css):**
```css
:root {
  --bg: #0a0a0a;
  --surface: #141414;
  --border: #242424;
  --accent: #8B5CF6;
  --accent-dim: #6D28D9;
  --cyan: #06B6D4;
  --success: #10B981;
  --danger: #EF4444;
  --warning: #F59E0B;
  --text: #F9FAFB;
  --muted: #6B7280;
}
```

**Feel:** Dark, clean, data-dense. Like a premium analytics dashboard. Sharp edges, intentional spacing. Think Linear.app meets a fashion brand.

**Responsive breakpoints:**
- Mobile: < 768px → sidebar hidden, hamburger menu
- Tablet: 768px–1024px → sidebar collapsed to icons only
- Desktop: > 1024px → full sidebar 220px

---

## Backend API Reference

Base URL constant in all files: `const API = 'http://localhost:3001'`

### Customers
```
GET  /api/customers
     → array of profiles:
       {
         id, external_id, created_at,
         customer_identities: [{channel, value, is_primary}],
         customer_attributes: [{key, value}]
       }
       attribute keys: name, city, loyalty_tier, total_spent, last_order_days_ago
```

### Segments
```
GET  /api/segments
     → [{id, name, nl_query, sql_query, last_count, created_at}]

POST /api/segments
     body: { name, nl_query, sql_query }
     → segment object
```

### Campaigns
```
GET  /api/campaigns
     → [{id, name, channel, status, created_at, segments:{name}, campaign_stats:{...}}]

POST /api/campaigns
     body: { name, segment_id, channel, message_template, ai_generated }
     → { campaign, variant }

POST /api/campaigns/:id/send
     body: {}
     → { campaign_id, dispatched, results }

GET  /api/campaigns/:id/stats
     → { total_sent, total_delivered, total_failed, total_opened, total_clicked, total_converted }
```

### Dashboard Stats (aggregate — add this to backend)
```
GET  /api/dashboard/stats
     → {
         total_customers: number,
         total_campaigns: number,
         total_sent: number,
         total_delivered: number,
         total_opened: number,
         total_clicked: number,
         recent_campaigns: [...last 5 campaigns with stats]
       }
```

### AI Routes (add to backend)
```
POST /api/ai/segment
     body: { nl_query: string }
     → {
         nl_query: string,
         filters: [...],
         segment_id: string,
         preview_count: number,
         customers: [...first 10 matching customers]
       }

POST /api/ai/message
     body: {
       segment_description: string,
       channel: "whatsapp"|"sms"|"email"|"rcs",
       brand_name: "ZenX"
     }
     → { message: string }
```

---

## Backend Routes to Add

### 1. `zenx-crm-backend/routes/dashboard.js`

```javascript
const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

router.get('/stats', async (req, res) => {
  try {
    const [customersRes, campaignsRes, statsRes] = await Promise.all([
      supabase.from('customer_profiles').select('id', { count: 'exact' }),
      supabase.from('campaigns').select(`
        id, name, channel, status, created_at,
        segments(name),
        campaign_stats(*)
      `).order('created_at', { ascending: false }).limit(5),
      supabase.from('campaign_stats').select('*')
    ]);

    const allStats = statsRes.data || [];
    const totals = allStats.reduce((acc, s) => ({
      total_sent:      acc.total_sent      + (s.total_sent      || 0),
      total_delivered: acc.total_delivered + (s.total_delivered || 0),
      total_opened:    acc.total_opened    + (s.total_opened    || 0),
      total_clicked:   acc.total_clicked   + (s.total_clicked   || 0),
    }), { total_sent: 0, total_delivered: 0, total_opened: 0, total_clicked: 0 });

    res.json({
      total_customers:  customersRes.count || 0,
      total_campaigns:  campaignsRes.data?.length || 0,
      ...totals,
      recent_campaigns: campaignsRes.data || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 2. `zenx-crm-backend/routes/ai.js`

```javascript
const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

async function callGemini(prompt, temperature = 0.1) {
  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature }
    })
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

function safeParseJSON(text) {
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
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
      return res.status(422).json({ error: 'Could not parse AI response. Try rephrasing your query.', raw });
    }
    if (!Array.isArray(filters)) {
      filters = filters.filters || [];
    }
    if (!Array.isArray(filters) || filters.length === 0) {
      return res.status(422).json({ error: 'No filters generated. Try a more specific query.' });
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

    // Apply filters
    const matchingIds = Object.entries(profileMap)
      .filter(([_, attrs]) =>
        filters.every(f => {
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

    // Fetch matching customer details (max 10 for preview)
    const { data: customers } = await supabase
      .from('customer_profiles')
      .select('id, customer_identities(channel,value), customer_attributes(key,value)')
      .in('id', matchingIds.length > 0 ? matchingIds : ['00000000-0000-0000-0000-000000000000']);

    // Save segment
    const { data: segment } = await supabase
      .from('segments')
      .insert({
        name: nl_query.slice(0, 80),
        nl_query,
        sql_query: JSON.stringify(filters),
        last_count: matchingIds.length,
        last_computed: new Date().toISOString()
      })
      .select()
      .single();

    res.json({
      nl_query,
      filters,
      segment_id: segment?.id,
      preview_count: matchingIds.length,
      customers: (customers || []).slice(0, 10)
    });

  } catch (err) {
    console.error('AI segment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/message
router.post('/message', async (req, res) => {
  try {
    const { segment_description, channel = 'whatsapp', brand_name = 'ZenX' } = req.body;
    if (!segment_description?.trim()) {
      return res.status(400).json({ error: 'segment_description is required' });
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 3. Mount both in `zenx-crm-backend/index.js`

Add these two lines after the existing route mounts:
```javascript
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai',        require('./routes/ai'));
```

---

## Frontend File Structure

```
zenx-crm-frontend/
└── app/
    ├── globals.css
    ├── layout.js
    ├── page.js                    ← Dashboard
    ├── customers/
    │   └── page.js
    ├── campaigns/
    │   ├── page.js
    │   └── new/
    │       └── page.js
    └── components/
        ├── Sidebar.js
        ├── StatCard.js
        ├── Badge.js
        ├── Toast.js
        ├── LoadingSpinner.js
        ├── ConfirmModal.js
        └── CustomerPreviewTable.js
```

---

## Component Specs

### `components/Badge.js`
Renders a small pill badge. Props: `type` (one of the sets below), `label`.

```
channel:      whatsapp=green, sms=blue, email=gray, rcs=violet
status:       draft=gray, sending=cyan, completed=green, failed=red
loyalty_tier: vip=violet, new=cyan, regular=gray, lapsed=red
```

### `components/StatCard.js`
Props: `title`, `value`, `subtitle` (optional), `color` (accent|cyan|success|danger).
Dark card with colored top border. Large number, small label.

### `components/Toast.js`
Fixed bottom-right toast. Props: `message`, `type` (success|error), `onClose`.
Auto-dismisses after 3 seconds.

### `components/LoadingSpinner.js`
Small spinning circle in accent color. Props: `size` (sm|md|lg).

### `components/ConfirmModal.js`
Centered modal overlay. Props: `title`, `message`, `confirmLabel`, `onConfirm`, `onCancel`.
Dark backdrop. Sharp-edged modal card.

### `components/CustomerPreviewTable.js`
Props: `customers` (array from AI segment response).
Shows: Name, City, Loyalty Tier (as Badge), Total Spent.

Helper functions (put in `app/lib/helpers.js`):
```javascript
export const getAttr = (attributes, key) =>
  attributes?.find(a => a.key === key)?.value || '—';

export const getIdentity = (identities, channel) =>
  identities?.find(i => i.channel === channel)?.value || '—';

export const formatCurrency = (val) =>
  val && val !== '—' ? `₹${parseInt(val).toLocaleString('en-IN')}` : '—';
```

### `components/Sidebar.js`
- Fixed left sidebar, 220px wide on desktop
- Logo: "zenx." in violet, bold, top of sidebar
- Nav links with icons (use Unicode or simple SVG — no icon library):
  - 📊 Dashboard → /
  - 👥 Customers → /customers
  - 📣 Campaigns → /campaigns
  - ✨ New Campaign → /campaigns/new (violet bg button style)
- Active link highlighted (violet bg, white text)
- Mobile: hidden by default, slide-in drawer triggered by hamburger icon
- Hamburger button: top-left, visible only on mobile (< 768px)
- Backdrop overlay closes drawer on mobile

---

## Page Specs

### `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0a0a0a;
  --surface: #141414;
  --border: #242424;
  --accent: #8B5CF6;
  --accent-dim: #6D28D9;
  --cyan: #06B6D4;
  --success: #10B981;
  --danger: #EF4444;
  --warning: #F59E0B;
  --text: #F9FAFB;
  --muted: #6B7280;
}

* { box-sizing: border-box; }
body { background: var(--bg); color: var(--text); font-family: Inter, system-ui, sans-serif; margin: 0; }
```

### `app/layout.js`
- Renders `<Sidebar />` + `<main>` side by side
- Main content: `margin-left: 220px` on desktop, `margin-left: 0` on mobile
- Passes active path to Sidebar via `usePathname()`
- Must include `'use client'`

### `app/page.js` — Dashboard

Fetches `GET /api/dashboard/stats` once on mount.

Layout:
```
Page title: "Dashboard"
Subtitle: "Welcome back. Here's what's happening with ZenX."

[4 stat cards in a row]
Total Customers | Total Campaigns | Messages Sent | Total Clicked

[Recent Campaigns section]
Title: "Recent Campaigns"
[Table or card list of last 5 campaigns]
Columns: Name | Channel | Status | Sent | Delivered | Opened | Clicked
```

Loading state: show skeleton cards (gray animated pulse divs).
Empty state: "No campaigns yet." with button to /campaigns/new.

### `app/customers/page.js` — Customers

Fetches `GET /api/customers` on mount.

Layout:
```
[Header row]
Title: "Customers"         Search input (right-aligned)

[Table]
Name | Email | City | Loyalty Tier | Total Spent | Last Order
```

- Search filters by name or city (client-side, case-insensitive)
- Loyalty tier shown as `<Badge type="loyalty_tier" />`
- Total Spent formatted as ₹X,XXX
- Last Order shown as "X days ago" or "Never"
- Loading: spinner centered
- Empty after search: "No customers match your search."

### `app/campaigns/page.js` — Campaigns List

Fetches `GET /api/campaigns` on mount.

Layout:
```
[Header]
Title: "Campaigns"         [+ New Campaign] button → /campaigns/new

[Grid of campaign cards, 2 columns on desktop, 1 on mobile]
```

Each card:
```
[Campaign Name]          [Channel Badge]
Segment: [segment name]  [Status Badge]

[Stats row]
📤 Sent: X   ✅ Delivered: X   👁 Opened: X   🔗 Clicked: X

[Send Campaign button]
```

Send Campaign button behavior:
1. Click → open ConfirmModal: "Send to all customers in this segment?"
2. Confirm → button shows "Sending..." spinner, disabled
3. Call POST /api/campaigns/:id/send
4. Success → show Toast "Dispatched to X customers!" + refresh campaign stats
5. Error → show Toast "Failed to send. Try again." in red

### `app/campaigns/new/page.js` — New Campaign ⭐

This is the most important page. Build it carefully.

**Form layout (single column, max-w-2xl, centered, padded):**

```
Page title: "Create Campaign"
Subtitle: "Reach the right people with the right message."

━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1: Campaign Basics
━━━━━━━━━━━━━━━━━━━━━━━━━━
Campaign Name*         [text input]
Channel*               [select: WhatsApp / SMS / Email / RCS]

━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2: Choose Audience
━━━━━━━━━━━━━━━━━━━━━━━━━━
[Tab: ✨ Ask AI]  [Tab: 📋 Browse Segments]

--- Ask AI tab (default) ---
[Textarea: "Describe your audience..."]
[Example pills row]:
  "Lapsed VIP customers"
  "New customers from Mumbai"
  "Customers who spent over ₹2000"
  "Inactive for 60+ days"

[Find Audience →] button (violet, full width)

--- After AI result ---
✅ Found 3 customers matching your query
[CustomerPreviewTable showing matches]
[Use This Audience] button (confirms segment selection)

--- Browse Segments tab ---
[List of saved segments from GET /api/segments]
Each: Name | Customer count | [Select] button

━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3: Message
━━━━━━━━━━━━━━━━━━━━━━━━━━
Message Template*
[Textarea with placeholder: "Hey {name}, we have something special for you..."]
[Hint: Use {name} for personalization]
[Character count: X / 300]

[✨ Generate with AI] button
  → calls POST /api/ai/message with {segment_description: nl_query, channel}
  → fills textarea with generated message
  → shows spinner while loading

Live Preview box:
"Preview: Hey Priya, we have something special for you..."
(replace {name} with "Priya" for preview)

━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4: Actions
━━━━━━━━━━━━━━━━━━━━━━━━━━
[Save as Draft]    [Create & Send →]
```

**Validation (check before submit):**
- Campaign name: required, min 3 chars
- Channel: required
- Segment: must be selected (either via AI or Browse)
- Message template: required, min 10 chars
- Show inline error messages in red below each field

**"Create & Send" flow:**
1. Validate all fields → show errors if any
2. Open ConfirmModal: "Send to [preview_count] customers via [channel]?"
3. Confirm → POST /api/campaigns with {name, segment_id, channel, message_template, ai_generated}
4. On success → POST /api/campaigns/:id/send
5. Show Toast "Campaign sent to X customers!"
6. Redirect to /campaigns after 1.5 seconds

**"Save as Draft" flow:**
1. Validate name, channel, message only (segment optional for draft)
2. POST /api/campaigns with status: 'draft'
3. Toast "Campaign saved as draft"
4. Redirect to /campaigns

**State management (all useState):**
```javascript
const [form, setForm] = useState({ name: '', channel: '', message_template: '' });
const [errors, setErrors] = useState({});
const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'browse'
const [nlQuery, setNlQuery] = useState('');
const [aiResult, setAiResult] = useState(null);   // {segment_id, preview_count, customers}
const [selectedSegment, setSelectedSegment] = useState(null); // {id, name, last_count}
const [segments, setSegments] = useState([]);
const [isLoadingAI, setIsLoadingAI] = useState(false);
const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);
const [isSubmitting, setIsSubmitting] = useState(false);
const [showConfirm, setShowConfirm] = useState(false);
const [confirmAction, setConfirmAction] = useState(null); // 'send' | 'draft'
const [toast, setToast] = useState(null);
```

**Tab switching:** AI result persists when switching tabs. Selecting a segment from Browse tab clears AI result and vice versa.

---

## Critical Implementation Rules

1. `'use client'` at top of every file using useState/useEffect/usePathname
2. All API calls wrapped in try/catch with loading + error state
3. Never show a blank screen — always loading skeleton or spinner
4. Toast auto-dismisses after 3000ms using setTimeout in useEffect
5. All forms show inline validation errors on submit attempt
6. Mobile: sidebar hidden, hamburger shows drawer with backdrop
7. No external libraries except what's already installed
8. Keep all colors using CSS variables — no hardcoded hex in JSX
9. Every button has disabled + opacity-50 state while loading
10. Build ALL files completely — no TODOs, no placeholders

---

## Gemini Instructions

Build every file listed above completely. Do them in this order:
1. `app/lib/helpers.js`
2. All components in `app/components/`
3. `app/globals.css`
4. `app/layout.js`
5. `app/page.js` (Dashboard)
6. `app/customers/page.js`
7. `app/campaigns/page.js`
8. `app/campaigns/new/page.js`

Then the two backend files:
9. `zenx-crm-backend/routes/dashboard.js`
10. `zenx-crm-backend/routes/ai.js`

For each file: output the filename as a comment on line 1, then the complete code.

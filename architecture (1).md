# ZenX CRM — System Architecture & Project Explanation

---

## What Is ZenX CRM?

ZenX CRM is an **AI-native Mini CRM** (Customer Relationship Management tool)
built for a fictional D2C Indian fashion brand called **ZenX**.

The problem it solves:
> A fashion brand has hundreds of customers and their purchase history.
> The marketing team needs to know WHO to talk to, WHAT to say,
> and WHETHER it worked — without spending hours in spreadsheets.

ZenX CRM solves this by combining:
- A **customer database** (who your shoppers are and what they bought)
- **AI-powered segmentation** (find the right audience in plain English)
- **Campaign messaging** (send personalized WhatsApp/SMS/Email blasts)
- **Real-time delivery tracking** (see who got it, opened it, clicked it)

This is NOT a sales CRM (no deals, leads, or pipelines).
This is purely a **marketing and customer engagement tool**.

---

## The Real World Problem This Mirrors

```
WITHOUT ZenX CRM:
  Marketer opens Excel sheet of 500 customers
  Manually filters by "last purchase > 60 days"
  Copy-pastes phone numbers into WhatsApp
  Has no idea if anyone read the message
  Repeat every week. Manually.

WITH ZenX CRM:
  Marketer types: "VIP customers inactive for 60 days"
  AI finds 47 matching customers instantly
  AI drafts a personalized message
  One click sends to all 47 via WhatsApp
  Dashboard shows: 43 delivered, 31 opened, 12 clicked
  Done in 3 minutes.
```

---

## System Overview — The Three Services

This project runs as **3 separate services** that talk to each other:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│   MARKETER opens browser                                             │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              FRONTEND  (Next.js — port 3000)                │   │
│   │                                                             │   │
│   │   /dashboard    → see overall stats                        │   │
│   │   /customers    → browse all shoppers                      │   │
│   │   /campaigns    → view and send campaigns                  │   │
│   │   /campaigns/new → create campaign with AI                 │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
│                              │ HTTP requests (fetch)                 │
│                              ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │             CRM BACKEND  (Express — port 3001)              │   │
│   │                                                             │   │
│   │   /api/customers   → read customer data                    │   │
│   │   /api/segments    → manage audience segments              │   │
│   │   /api/campaigns   → create + send campaigns               │   │
│   │   /api/receipts    → receive delivery callbacks            │   │
│   │   /api/ai          → Gemini AI for segments + messages     │   │
│   │   /api/dashboard   → aggregated stats                      │   │
│   └────────┬──────────────────────────┬───────────────────────┘   │
│            │                          │                             │
│            │ Supabase JS              │ HTTP POST                   │
│            ▼                          ▼                             │
│   ┌─────────────┐       ┌──────────────────────────────────────┐   │
│   │  SUPABASE   │       │   CHANNEL SERVICE  (Express — 4000)  │   │
│   │ PostgreSQL  │       │                                      │   │
│   │             │       │  Fake messaging provider.            │   │
│   │  10 tables  │       │  Receives send requests.             │   │
│   │  1 trigger  │       │  Simulates delivery async.           │   │
│   │             │       │  Fires callbacks back to CRM.        │   │
│   └─────────────┘       └──────────────┬─────────────────────┘   │
│                                         │                           │
│                          POST /api/receipts (callbacks)            │
│                                         │                           │
│                          ┌──────────────▼──────────────────────┐   │
│                          │  CRM Backend receives each event    │   │
│                          │  → inserts into delivery_events     │   │
│                          │  → DB trigger updates campaign_stats│   │
│                          └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Service 1 — Frontend (`zenx-crm-frontend`, port 3000)

**Tech:** Next.js 14 (App Router) + Tailwind CSS

**What it is:**
The UI the marketer uses. A dark, minimal dashboard inspired by
Linear.app — clean, data-dense, feels like a premium SaaS tool.

**4 Pages:**

```
/                  Dashboard
                   → 4 stat cards: Customers, Campaigns, Sent, Clicked
                   → Recent campaigns table with live stats
                   → One API call to /api/dashboard/stats (not 20 separate calls)

/customers         Customers Table
                   → All ZenX shoppers with name, email, city, tier, spend
                   → Client-side search by name or city
                   → Loyalty tier shown as colored badge (vip=violet, lapsed=red)

/campaigns         Campaigns List
                   → Cards for each campaign with stats
                   → "Send Campaign" button → confirm modal → dispatches
                   → Live stats: Sent / Delivered / Opened / Clicked

/campaigns/new     New Campaign ← THE MAIN FEATURE
                   → Step 1: Name + Channel
                   → Step 2: AI Audience Builder (plain English → segment)
                   → Step 3: Message template + AI generation
                   → Step 4: Save as Draft OR Create & Send
```

**Key frontend decisions:**
- No auth (out of scope per assignment)
- No external UI libraries (pure Tailwind)
- Mobile responsive (sidebar collapses to hamburger drawer)
- Every button has loading/disabled state
- Every form has inline validation
- Toast notifications for all success/error feedback

---

## Service 2 — CRM Backend (`zenx-crm-backend`, port 3001)

**Tech:** Node.js + Express + Supabase JS Client

**What it is:**
The brain. All business logic lives here.
Frontend talks to it. Channel service calls back to it.

**File Structure:**
```
zenx-crm-backend/
├── index.js              ← app entry point, mounts all routes
├── .env                  ← secrets (Supabase, Gemini keys)
├── services/
│   └── supabase.js       ← single Supabase client instance
└── routes/
    ├── customers.js      ← read profiles, identities, attributes, orders
    ├── segments.js       ← create and fetch audience segments
    ├── campaigns.js      ← create campaigns, trigger sends, fetch stats
    ├── receipts.js       ← receive delivery events from channel service
    ├── dashboard.js      ← aggregated stats for dashboard page
    └── ai.js             ← Gemini AI: segmentation + message generation
```

**Route Map:**
```
GET  /api/customers              all profiles with identities + attributes
GET  /api/customers/:id          single profile with orders

GET  /api/segments               all saved segments
POST /api/segments               create segment

GET  /api/campaigns              all campaigns with stats + segment name
POST /api/campaigns              create campaign + message variant
POST /api/campaigns/:id/send     dispatch to all customers in segment
GET  /api/campaigns/:id/stats    stats for one campaign

POST /api/receipts               receive delivery callback from channel service

GET  /api/dashboard/stats        one-call aggregate for entire dashboard

POST /api/ai/segment             NL query → Gemini → filters → matching customers
POST /api/ai/message             segment description → Gemini → message copy
```

---

## Service 3 — Channel Service (`channel-service`, port 4000)

**Tech:** Node.js + Express + axios

**What it is:**
A fake (stubbed) messaging provider.
It does NOT send real WhatsApp or SMS messages.
It **simulates** what a real provider like Twilio or Gupshup does —
accepting a message, attempting delivery, and reporting back
what happened asynchronously via webhooks.

**Why it exists:**
The assignment requires modeling the full delivery lifecycle.
Real messaging APIs work exactly like this — you send a message,
they call you back later with "delivered", "read", "clicked".
Building this stub shows you understand how production systems work.

**How it works:**
```
Step 1 — CRM calls POST /send:
{
  send_id:      "f2241b5b-...",
  recipient:    "+919876543210",
  message:      "Hey Priya, we miss you at ZenX!",
  channel:      "whatsapp",
  callback_url: "http://localhost:3001/api/receipts"
}

Step 2 — Channel Service responds immediately:
{ status: "queued", send_id: "f2241b5b-..." }

Step 3 — Asynchronously, after 2–6 seconds:
  80% of the time → POST callback_url { event_type: "delivered" }
  20% of the time → POST callback_url { event_type: "failed" }

Step 4 — If delivered, after 2–4 more seconds:
  60% chance → POST callback_url { event_type: "opened" }

Step 5 — If opened, after 1–3 more seconds:
  40% chance → POST callback_url { event_type: "clicked",
                metadata: { link: "https://zenx.fashion/offer" } }
```

**Probability model:**
```
100 messages sent
  └── 80 delivered, 20 failed
        └── 48 opened  (60% of 80)
              └── 19 clicked  (40% of 48)
```

This gives realistic engagement rates:
- Delivery rate: 80%
- Open rate: 60%
- Click rate: 40%

---

## The Database — Supabase PostgreSQL

**10 tables across 5 logical layers:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYER 1 — WHO ARE YOUR CUSTOMERS?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

customer_profiles
  One row per real person.
  id, external_id, created_at

customer_identities
  All the ways to reach that person.
  One person can have email + whatsapp + sms.
  profile_id → channel → value (the actual address)

customer_attributes
  Flexible key-value store for anything about the customer.
  profile_id → key → value
  Keys: name, city, loyalty_tier, total_spent, last_order_days_ago
  Why key-value? So we can add new attributes without changing schema.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYER 2 — WHAT DID THEY DO?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

customer_events
  Append-only log of all customer actions.
  profile_id → event_type → properties (JSONB) → occurred_at

orders
  Structured purchase records linked to profiles.
  profile_id → order_number → total_amount → line_items (JSONB)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYER 3 — WHO DO YOU WANT TO TALK TO?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

segments
  Saved audience definitions.
  name → nl_query (what the marketer typed)
       → sql_query (filters generated by AI)
       → last_count (how many customers match)
  Segments are reusable across multiple campaigns.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYER 4 — WHAT DID YOU SEND?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

campaigns
  One row per campaign.
  name → channel → segment_id → status → sent_at

campaign_variants
  The actual message template(s) for a campaign.
  Supports A/B testing (multiple variants per campaign).
  message_template → weight → ai_generated

campaign_sends
  One row per customer per campaign.
  This is the individual send record.
  campaign_id → profile_id → message_sent → status → channel_address
  Status: pending → sent → delivered → failed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAYER 5 — WHAT HAPPENED AFTER?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

delivery_events
  Append-only log of every callback from channel service.
  campaign_send_id → event_type → metadata → occurred_at
  Event types: queued, sent, delivered, failed, opened, read, clicked, converted

campaign_stats
  Pre-computed rollup table. Updated automatically by DB trigger.
  campaign_id → total_sent → total_delivered → total_failed
             → total_opened → total_read → total_clicked → total_converted
  Why? So dashboard loads instantly — no counting at query time.
```

**The Database Trigger:**
```sql
-- Every INSERT into delivery_events automatically runs this:
TRIGGER: trigger_update_campaign_stats
  → finds which campaign this send belongs to
  → increments the correct counter in campaign_stats
  → no application code needed

Example:
  delivery_events INSERT { event_type: 'clicked' }
       ↓ trigger fires
  campaign_stats UPDATE SET total_clicked = total_clicked + 1
```

---

## The AI Layer — How Intelligence Works

### AI Feature 1: Natural Language Segmentation

**The flow:**
```
Marketer types in the UI:
"VIP customers who haven't ordered in 60 days"

Frontend → POST /api/ai/segment { nl_query: "..." }

Backend builds a prompt for Gemini:
  - Explains available attribute keys
  - Explains filter operators (eq, gt, lt, contains)
  - Asks for raw JSON array only
  - Gives an example of expected output

Gemini returns:
[
  { "key": "loyalty_tier",        "operator": "eq", "value": "vip" },
  { "key": "last_order_days_ago", "operator": "gt", "value": "60"  }
]

Backend:
  → Fetches all customer_attributes from Supabase
  → Groups them by profile_id into a map
  → Applies every filter (AND logic)
  → Returns matching profile IDs
  → Fetches full customer details for those IDs
  → Saves as a segment in DB
  → Returns { segment_id, preview_count, customers: [...first 10] }

Marketer sees:
  "Found 2 customers matching your query"
  [table: Priya Sharma, Mumbai, VIP | Karan Patel, Chennai, Lapsed]
  [Use This Audience] button
```

**Why Gemini over raw SQL generation?**
SQL generation from NL is hard to validate safely.
JSON filters are safer — we control exactly what queries run.
The filter engine in the backend is simple, predictable, and debuggable.

### AI Feature 2: Message Generation

**The flow:**
```
Marketer clicks "Generate with AI"
(after selecting a segment)

Frontend → POST /api/ai/message {
  segment_description: "VIP customers who haven't ordered in 60 days",
  channel: "whatsapp",
  brand_name: "ZenX"
}

Backend builds prompt:
  - Brand context (ZenX, premium D2C fashion)
  - Channel context (WhatsApp, max 300 chars)
  - Audience context (segment description)
  - Rules: use {name}, warm tone, clear CTA

Gemini returns:
"Hey {name}, it's been a while! Your favourite styles at ZenX
are back in stock. Shop now and enjoy 20% off — just for you. 🛍"

Frontend fills the message textarea.
Marketer can edit before sending.
Live preview shows: "Hey Priya, it's been a while!..."
```

---

## The Complete Campaign Lifecycle

```
STEP 1: Marketer creates campaign on /campaigns/new
        → fills: name, channel, audience (AI), message
        → clicks "Create & Send"
        → validation runs (all fields required)
        → confirm modal: "Send to 2 customers via WhatsApp?"

STEP 2: Frontend calls POST /api/campaigns
        → CRM creates campaign record (status: draft)
        → CRM creates campaign_variant with message template
        → Returns campaign.id

STEP 3: Frontend calls POST /api/campaigns/:id/send
        → CRM fetches all customers in the segment
        → For each customer:
            → finds their WhatsApp number from customer_identities
            → personalizes message: replaces {name} with their name
            → inserts campaign_send record (status: pending)
            → calls POST http://localhost:4000/send

STEP 4: Channel service receives each /send call
        → responds immediately: { status: "queued" }
        → waits 2-6 seconds (async, simulates real delivery)
        → fires POST to /api/receipts with event_type

STEP 5: CRM /api/receipts receives each callback
        → inserts into delivery_events
        → DB trigger auto-increments campaign_stats

STEP 6: Campaign marked 'completed'
        → Frontend shows toast: "Dispatched to 2 customers!"
        → Marketer goes to /campaigns to watch live stats
        → Stats update as callbacks arrive over next 15 seconds
```

---

## Technology Choices & Tradeoffs

| Decision | What We Chose | Why | What We Gave Up |
|---|---|---|---|
| Database | Supabase PostgreSQL | Free, instant setup, built-in JS client | Not self-hosted |
| Backend | Node.js + Express | Fast to build, familiar | No type safety |
| Frontend | Next.js 14 App Router | Easy Vercel deploy, modern React | Slightly heavier than CRA |
| AI | Gemini 2.0 Flash | Free tier, fast, good JSON output | Occasional parsing edge cases |
| Segmentation | JSON filters (not SQL) | Safe, predictable, debuggable | Less flexible than raw SQL |
| Stats | DB trigger | Zero app-level code, always consistent | Harder to debug trigger issues |
| Async queue | Direct HTTP (no queue) | Simple for prototype | Won't handle 10k+ sends |
| Auth | None | Assignment said skip it | Not production-ready |
| Styling | Pure Tailwind | No dependencies | More verbose JSX |

---

## What Is Consciously Out of Scope

These were deliberate decisions, not oversights:

| Feature | Why Skipped |
|---|---|
| Authentication | Assignment explicitly said to skip |
| Real WhatsApp/SMS | Assignment said to stub the channel |
| Pagination | 5 seed customers — not needed |
| Retry logic on failed sends | Prototype scope |
| A/B testing UI | Schema supports it, UI complexity not worth it |
| Scheduled campaigns | Schema has scheduled_at, time didn't allow UI |
| Multi-brand / multi-tenant | Single brand demo |
| Rate limiting | Not evaluated in assignment |

At real scale (10k+ customers) I would add:
- A proper queue (BullMQ + Redis) for sends
- Pagination on all list endpoints
- Row-level security on Supabase
- Retry with exponential backoff on failed callbacks
- Proper auth (Clerk or Supabase Auth)

---

## Local Development

**Prerequisites:** Node.js v22+, Supabase project created

```bash
# Terminal 1 — CRM Backend
cd zenx-crm-backend
node index.js
# → ZenX CRM backend running on port 3001

# Terminal 2 — Channel Service
cd channel-service
node index.js
# → Channel service running on port 4000

# Terminal 3 — Frontend
cd zenx-crm-frontend
npm run dev
# → Next.js running on http://localhost:3000
```

**Environment variables (`zenx-crm-backend/.env`):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
CHANNEL_SERVICE_URL=http://localhost:4000
CALLBACK_BASE_URL=http://localhost:3001
PORT=3001
```

---

## Deployment

| Service | Platform | Reason |
|---|---|---|
| Frontend | Vercel | Built for Next.js, free, instant |
| CRM Backend | Render | Free Node.js hosting, always-on |
| Channel Service | Render | Separate instance, same platform |
| Database | Supabase | Already hosted, no change |

**Deploy order (important):**
```
1. Deploy Channel Service first → get its public URL
   e.g. https://channel-service.onrender.com

2. Deploy CRM Backend
   Set env: CHANNEL_SERVICE_URL=https://channel-service.onrender.com
   Set env: CALLBACK_BASE_URL=https://crm-backend.onrender.com
   Get its public URL: https://crm-backend.onrender.com

3. Deploy Frontend
   Set env: NEXT_PUBLIC_API_URL=https://crm-backend.onrender.com

4. Test the full loop on production URLs
```

---

## Summary

```
What it is:    AI-native Mini CRM for D2C fashion brands
Who uses it:   Marketing teams
What it does:  Find customers → Send messages → Track results
AI features:   NL segmentation + AI message generation
Architecture:  3 services (Frontend + CRM Backend + Channel Service)
Database:      10 tables, 1 trigger, Supabase PostgreSQL
Stack:         Next.js + Express + Supabase + Gemini API
Deploy:        Vercel + Render + Supabase
```

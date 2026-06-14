# ZenX CRM (AI-Native CRM)

An **AI-native Mini CRM** (Customer Relationship Management) and marketing automation platform built for D2C brands (modeled for a fictional Indian fashion brand **ZenX**). 

Instead of manual spreadsheet filtering and untracked messaging, ZenX CRM enables marketing teams to query customer audiences in plain English using Gemini AI, draft personalized messages, send campaign alerts, and track delivery/read/click status in real-time.

---

## 🚀 Key Features

* **Natural Language Segmentation:** Convert plain English queries (e.g., *"VIP customers who haven't ordered in 60 days"*) into query filters dynamically using Gemini AI.
* **AI Message Generation:** Generate context-aware, highly engaging marketing message templates personalized with customer fields (like name) for WhatsApp, SMS, or Email.
* **Asynchronous Message Delivery & Tracking:** Track the message lifecycle in real-time (`queued` ➡️ `delivered`/`failed` ➡️ `opened` ➡️ `clicked`) through webhooks.
* **Aggregated Analytics Dashboard:** Live visual performance indicators (Delivery, Open, Click, and Conversion Rates) powered by pre-calculated DB triggers in PostgreSQL.

---

## 🛠️ Tech Stack & Architecture

ZenX CRM is architected as a monorepo consisting of **3 separate services**:

1. **Frontend (`zenx-crm-frontend`):** Next.js 14 (App Router) + Tailwind CSS client interface running on `http://localhost:3000`. Inspired by clean, minimal SaaS designs.
2. **CRM Backend (`zenx-crm-backend`):** Node.js + Express REST API running on `http://localhost:3001` interacting with **Supabase PostgreSQL** and **Gemini 2.0 Flash**.
3. **Channel Service (`channel-service`):** Node.js + Express mock service on `http://localhost:4000` which simulates an external messaging gateway (like Twilio or Gupshup) with asynchronous delivery callbacks.

---

## 📂 Project Structure

```
Xeno-CRM/
├── channel-service/       # Mock SMS/WhatsApp gateway service
├── zenx-crm-backend/      # Express API Server, Database client, & AI routing
├── zenx-crm-frontend/     # Next.js web application frontend
├── .gitignore             # Global git ignore configuration
├── README.md              # Project documentation
├── architecture (1).md    # Detailed architecture specification
└── implementation-plan.md # Technical implementation notes
```

---

## ⚙️ Setup & Local Development

### Prerequisites
* **Node.js** v22+
* A **Supabase PostgreSQL** project
* **Gemini API Key** (from Google AI Studio)

### Environment Variables
Create a `.env` file inside `zenx-crm-backend/.env` with the following configuration:
```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
CHANNEL_SERVICE_URL=http://localhost:4000
CALLBACK_BASE_URL=http://localhost:3001
```

> [!WARNING]
> Environment files (`.env`, `.env.*`) contain sensitive credentials and keys. They are configured in the root `.gitignore` to prevent them from being checked into version control.

### Run Services Locally

You will need three separate terminal windows:

#### 1. Start the CRM Backend
```bash
cd zenx-crm-backend
npm install
node index.js
```

#### 2. Start the Channel Service
```bash
cd channel-service
npm install
node index.js
```

#### 3. Start the Frontend
```bash
cd zenx-crm-frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

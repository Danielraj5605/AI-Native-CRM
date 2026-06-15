require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Resend } = require('resend');

const app = express();
app.use(express.json());

// ─── Resend Client ────────────────────────────────────────────────────────────

let resendClient = null;

function getResendClient() {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('your-resend')) {
    console.warn('[EMAIL] RESEND_API_KEY not set — email channel will simulate only.');
    return null;
  }

  resendClient = new Resend(apiKey);
  console.log('[EMAIL] Resend client ready (HTTP API — no SMTP port issues)');
  return resendClient;
}

// ─── Email HTML Template ──────────────────────────────────────────────────────

function buildEmailHtml(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZenX — New Message</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f14; font-family: 'Segoe UI', Arial, sans-serif; padding: 40px 16px; }
    .wrapper { max-width: 560px; margin: 0 auto; }
    .card {
      background: #1a1a24;
      border: 1px solid #2e2e40;
      border-radius: 16px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 60%, #8b5cf6 100%);
      padding: 32px 36px 28px;
    }
    .logo {
      font-size: 22px;
      font-weight: 900;
      color: #fff;
      letter-spacing: -0.03em;
    }
    .logo span { opacity: 0.7; font-weight: 400; font-size: 13px; margin-left: 4px; }
    .body { padding: 32px 36px; }
    .message {
      font-size: 16px;
      line-height: 1.75;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .divider { height: 1px; background: #2e2e40; margin: 28px 0; }
    .footer { font-size: 12px; color: #64748b; line-height: 1.6; }
    .footer a { color: #8b5cf6; text-decoration: none; }
    .badge {
      display: inline-block;
      margin-top: 24px;
      padding: 10px 22px;
      background: linear-gradient(135deg, #6d28d9, #8b5cf6);
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">zenx.<span>CRM PLATFORM</span></div>
      </div>
      <div class="body">
        <p class="message">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        <div class="divider"></div>
        <p class="footer">
          You received this message because you are a valued ZenX customer.<br/>
          Sent via <a href="#">ZenX CRM</a>. &copy; ${new Date().getFullYear()} ZenX.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fireCallback(callbackUrl, payload) {
  try {
    await axios.post(callbackUrl, payload);
    console.log(`[CALLBACK OK ] send_id=${payload.campaign_send_id} event=${payload.event_type}`);
  } catch (err) {
    console.error(`[CALLBACK ERR] send_id=${payload.campaign_send_id} event=${payload.event_type} → ${err.message}`);
  }
}

// ─── Email Send ───────────────────────────────────────────────────────────────

async function sendRealEmail({ send_id, recipient, message, callback_url }) {
  const client = getResendClient();

  if (!client) {
    // Fall back to simulation if Resend is not configured
    console.warn(`[EMAIL SIM   ] send_id=${send_id} Resend not configured — simulating`);
    return simulateDelivery({ send_id, callback_url });
  }

  console.log(`[EMAIL SEND  ] send_id=${send_id} → ${recipient}`);

  try {
    const fromAddress = process.env.RESEND_FROM || 'ZenX CRM <onboarding@resend.dev>';
    const { data, error } = await client.emails.send({
      from: fromAddress,
      to: recipient,
      subject: '✨ A message from ZenX — Just for you',
      text: message,
      html: buildEmailHtml(message),
    });

    if (error) throw new Error(error.message || JSON.stringify(error));

    console.log(`[EMAIL OK    ] send_id=${send_id} → ${recipient} (id: ${data?.id})`);
    await fireCallback(callback_url, { campaign_send_id: send_id, event_type: 'delivered', metadata: { via: 'resend', resend_id: data?.id } });

    // Simulate open after short delay
    setTimeout(async () => {
      await fireCallback(callback_url, { campaign_send_id: send_id, event_type: 'opened', metadata: {} });
    }, Math.floor(Math.random() * 5000) + 3000);

  } catch (err) {
    console.error(`[EMAIL FAIL  ] send_id=${send_id} → ${err.message}`);
    await fireCallback(callback_url, { campaign_send_id: send_id, event_type: 'failed', metadata: { error: err.message } });
  }
}


// ─── Simulation chain (WhatsApp / SMS / RCS) ─────────────────────────────────

async function simulateDelivery({ send_id, callback_url }) {
  const deliveryDelay = randomBetween(2000, 6000);
  await sleep(deliveryDelay);

  const delivered = Math.random() < 0.8;
  const deliveryEvent = delivered ? 'delivered' : 'failed';

  console.log(`[${deliveryEvent.toUpperCase().padEnd(12)}] send_id=${send_id} after ${deliveryDelay}ms`);
  await fireCallback(callback_url, { campaign_send_id: send_id, event_type: deliveryEvent, metadata: {} });

  if (!delivered) return;

  const openDelay = randomBetween(2000, 4000);
  await sleep(openDelay);
  const opened = Math.random() < 0.6;
  if (!opened) { console.log(`[NO OPEN     ] send_id=${send_id}`); return; }

  console.log(`[OPENED      ] send_id=${send_id}`);
  await fireCallback(callback_url, { campaign_send_id: send_id, event_type: 'opened', metadata: {} });

  const clickDelay = randomBetween(1000, 3000);
  await sleep(clickDelay);
  const clicked = Math.random() < 0.4;
  if (!clicked) { console.log(`[NO CLICK    ] send_id=${send_id}`); return; }

  console.log(`[CLICKED     ] send_id=${send_id}`);
  await fireCallback(callback_url, { campaign_send_id: send_id, event_type: 'clicked', metadata: { link: 'https://zenx.fashion/offer' } });
}

async function simulateSend({ send_id, recipient, message, channel, callback_url }) {
  console.log(`[QUEUED      ] send_id=${send_id} channel=${channel} recipient=${recipient}`);

  if (channel === 'email') {
    // Real email via Gmail SMTP
    await sendRealEmail({ send_id, recipient, message, callback_url });
  } else {
    // Simulate WhatsApp / SMS / RCS delivery
    await simulateDelivery({ send_id, callback_url });
  }
}

// ─── Route ──────────────────────────────────────────────────────────────────

app.post('/send', (req, res) => {
  const { send_id, recipient, message, channel, callback_url } = req.body;

  if (!send_id || !recipient || !channel || !callback_url) {
    return res.status(400).json({ error: 'send_id, recipient, channel, and callback_url are required.' });
  }

  // Respond immediately — do NOT await the chain
  res.json({ status: 'queued', send_id });

  // Kick off the async send/simulation in the background
  simulateSend({ send_id, recipient, message, channel, callback_url });
});


// ─── Boot ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Channel service running on port ${PORT}`);
  // Warm up the Resend client on startup
  getResendClient();
});

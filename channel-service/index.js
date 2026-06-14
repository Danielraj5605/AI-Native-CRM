const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Return a random integer between min and max (inclusive). */
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Sleep for `ms` milliseconds. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fire a POST callback and log the outcome.
 * Errors are caught so they never crash the background chain.
 */
async function fireCallback(callbackUrl, payload) {
  try {
    await axios.post(callbackUrl, payload);
    console.log(`[CALLBACK OK ] send_id=${payload.campaign_send_id} event=${payload.event_type}`);
  } catch (err) {
    console.error(`[CALLBACK ERR] send_id=${payload.campaign_send_id} event=${payload.event_type} → ${err.message}`);
  }
}

// ─── Background simulation chain ────────────────────────────────────────────

async function simulateSend({ send_id, recipient, message, channel, callback_url }) {
  console.log(`[QUEUED      ] send_id=${send_id} channel=${channel} recipient=${recipient}`);

  // ── Step 1: delivered vs failed (2000–6000 ms) ──────────────────────────
  const deliveryDelay = randomBetween(2000, 6000);
  await sleep(deliveryDelay);

  const delivered = Math.random() < 0.8;
  const deliveryEvent = delivered ? 'delivered' : 'failed';

  console.log(`[${deliveryEvent.toUpperCase().padEnd(12)}] send_id=${send_id} after ${deliveryDelay}ms`);
  await fireCallback(callback_url, {
    campaign_send_id: send_id,
    event_type: deliveryEvent,
    metadata: {},
  });

  if (!delivered) return; // chain ends on failure

  // ── Step 2: opened (60% chance, 2000–4000 ms after delivered) ───────────
  const openDelay = randomBetween(2000, 4000);
  await sleep(openDelay);

  const opened = Math.random() < 0.6;

  if (!opened) {
    console.log(`[NO OPEN     ] send_id=${send_id} after ${openDelay}ms`);
    return;
  }

  console.log(`[OPENED      ] send_id=${send_id} after ${openDelay}ms`);
  await fireCallback(callback_url, {
    campaign_send_id: send_id,
    event_type: 'opened',
    metadata: {},
  });

  // ── Step 3: clicked (40% chance, 1000–3000 ms after opened) ─────────────
  const clickDelay = randomBetween(1000, 3000);
  await sleep(clickDelay);

  const clicked = Math.random() < 0.4;

  if (!clicked) {
    console.log(`[NO CLICK    ] send_id=${send_id} after ${clickDelay}ms`);
    return;
  }

  console.log(`[CLICKED     ] send_id=${send_id} after ${clickDelay}ms`);
  await fireCallback(callback_url, {
    campaign_send_id: send_id,
    event_type: 'clicked',
    metadata: { link: 'https://zenx.fashion/offer' },
  });
}

// ─── Route ──────────────────────────────────────────────────────────────────

app.post('/send', (req, res) => {
  const { send_id, recipient, message, channel, callback_url } = req.body;

  if (!send_id || !recipient || !channel || !callback_url) {
    return res.status(400).json({ error: 'send_id, recipient, channel, and callback_url are required.' });
  }

  // Respond immediately — do NOT await the chain
  res.json({ status: 'queued', send_id });

  // Kick off the async simulation in the background
  simulateSend({ send_id, recipient, message, channel, callback_url });
});

// ─── Boot ────────────────────────────────────────────────────────────────────

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Channel service running on port ${PORT}`);
});

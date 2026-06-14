const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// POST /receipts — delivery callback: insert delivery_event + update campaign_send status
router.post('/', async (req, res) => {
  try {
    const { campaign_send_id, send_id, event_type, metadata } = req.body;
    const resolvedId = campaign_send_id || send_id;

    if (!resolvedId || !event_type) {
      return res.status(400).json({ error: 'send_id and event_type are required.' });
    }

    // Insert delivery event
    const { error: eventError } = await supabase
      .from('delivery_events')
      .insert({
        campaign_send_id: resolvedId,
        event_type,
        metadata: metadata || null,
        occurred_at: new Date().toISOString(),
      });

    if (eventError) throw eventError;

    // Map delivery event type to campaign_send status
    const STATUS_MAP = {
      queued: 'pending',
      sent: 'sent',
      delivered: 'delivered',
      failed: 'failed',
      opened: 'delivered',
      read: 'delivered',
      clicked: 'delivered',
      converted: 'delivered',
    };

    const newStatus = STATUS_MAP[event_type];

    if (newStatus) {
      const { error: updateError } = await supabase
        .from('campaign_sends')
        .update({ status: newStatus })
        .eq('id', resolvedId);

      if (updateError) throw updateError;
    }

    res.json({ success: true, send_id: resolvedId, event_type });
  } catch (err) {
    console.error('POST /receipts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

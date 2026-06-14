// routes/dashboard.js
const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

router.get('/stats', async (req, res) => {
  try {
    const [customersRes, campaignsRes, statsRes] = await Promise.all([
      supabase.from('customer_profiles').select('id', { count: 'exact' }),
      supabase
        .from('campaigns')
        .select(`
          id, name, channel, status, created_at,
          segments(name),
          campaign_stats(*)
        `)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('campaign_stats').select('*'),
    ]);

    const allStats = statsRes.data || [];
    const totals = allStats.reduce(
      (acc, s) => ({
        total_sent:      acc.total_sent      + (s.total_sent      || 0),
        total_delivered: acc.total_delivered + (s.total_delivered || 0),
        total_opened:    acc.total_opened    + (s.total_opened    || 0),
        total_clicked:   acc.total_clicked   + (s.total_clicked   || 0),
      }),
      { total_sent: 0, total_delivered: 0, total_opened: 0, total_clicked: 0 }
    );

    res.json({
      total_customers:  customersRes.count || 0,
      total_campaigns:  campaignsRes.data?.length || 0,
      ...totals,
      recent_campaigns: campaignsRes.data || [],
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

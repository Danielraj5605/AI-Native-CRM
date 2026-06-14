const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// GET /segments — all segments ordered by created_at desc
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('segments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('GET /segments error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /segments — create a new segment
router.post('/', async (req, res) => {
  try {
    const { name, nl_query, sql_query } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required.' });
    }

    const { data, error } = await supabase
      .from('segments')
      .insert({ name, nl_query, sql_query })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error('POST /segments error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

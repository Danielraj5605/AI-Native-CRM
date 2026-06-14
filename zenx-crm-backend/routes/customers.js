const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// ─── Helper: create identities + attributes for a profile ────────────────────
async function writeProfileData(profileId, { name, email, whatsapp, city, loyalty_tier, total_spent, last_order_days_ago }) {
  // Build identities array
  const identities = [];
  if (email)    identities.push({ profile_id: profileId, channel: 'email',    value: email.toLowerCase(),    is_primary: true,  opted_in: true });
  if (whatsapp) identities.push({ profile_id: profileId, channel: 'whatsapp', value: whatsapp, is_primary: false, opted_in: true });

  // Preemptively check if the email/whatsapp is already in use by another profile
  const conflictValues = [];
  if (email) conflictValues.push(email.toLowerCase());
  if (whatsapp) conflictValues.push(whatsapp);

  if (conflictValues.length > 0) {
    const { data: existingIdentities, error: checkError } = await supabase
      .from('customer_identities')
      .select('profile_id, channel, value')
      .in('value', conflictValues);
    
    if (checkError) throw checkError;

    if (existingIdentities && existingIdentities.length > 0) {
      for (const ident of existingIdentities) {
        if (ident.profile_id !== profileId) {
          throw new Error(`The ${ident.channel} '${ident.value}' is already in use by another customer.`);
        }
      }
    }
  }

  // Delete existing identities for this profile first
  const { error: deleteError } = await supabase
    .from('customer_identities')
    .delete()
    .eq('profile_id', profileId);
  if (deleteError) throw deleteError;

  if (identities.length > 0) {
    const { error: insertError } = await supabase
      .from('customer_identities')
      .insert(identities);
    if (insertError) throw insertError;
  }

  // Build attributes array
  const attrMap = { name, city, loyalty_tier, total_spent, last_order_days_ago };
  const attributes = Object.entries(attrMap)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => ({ profile_id: profileId, key, value: String(value) }));

  if (attributes.length > 0) {
    const { error } = await supabase
      .from('customer_attributes')
      .upsert(attributes, { onConflict: 'profile_id,key' });
    if (error) throw error;
  }
}

// GET /customers/test
router.get('/test', async (req, res) => {
  try {
    const { data, error } = await supabase.from('customer_profiles').select('*');
    res.json({ data, error });
  } catch (err) {
    res.json({ caught: err.message });
  }
});

// GET /customers — all profiles with identities and attributes
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customer_profiles')
      .select('*, customer_identities (*), customer_attributes (*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET /customers error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /customers/:id — single profile with identities, attributes, and orders
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('customer_profiles')
      .select('*, customer_identities (*), customer_attributes (*), orders (*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Customer not found.' });
    res.json(data);
  } catch (err) {
    console.error(`GET /customers/${req.params.id} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /customers — create a new customer
router.post('/', async (req, res) => {
  try {
    const { name, email, whatsapp, city, loyalty_tier, total_spent, last_order_days_ago } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!email?.trim()) return res.status(400).json({ error: 'email is required' });

    // Create external_id from email (deterministic, unique)
    const external_id = `manual_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    // Insert profile
    const { data: profile, error: profileError } = await supabase
      .from('customer_profiles')
      .insert({ external_id })
      .select()
      .single();

    if (profileError) throw profileError;

    // Write identities + attributes
    await writeProfileData(profile.id, { name, email, whatsapp, city, loyalty_tier, total_spent, last_order_days_ago });

    // Return full profile
    const { data: full } = await supabase
      .from('customer_profiles')
      .select('*, customer_identities(*), customer_attributes(*)')
      .eq('id', profile.id)
      .single();

    res.status(201).json(full);
  } catch (err) {
    console.error('POST /customers error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /customers/:id — update an existing customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, whatsapp, city, loyalty_tier, total_spent, last_order_days_ago } = req.body;

    // Verify customer exists
    const { data: existing, error: existError } = await supabase
      .from('customer_profiles')
      .select('id')
      .eq('id', id)
      .single();

    if (existError || !existing) return res.status(404).json({ error: 'Customer not found.' });

    // Update identities + attributes (upsert handles insert-or-update)
    await writeProfileData(id, { name, email, whatsapp, city, loyalty_tier, total_spent, last_order_days_ago });

    // Return updated profile
    const { data: updated } = await supabase
      .from('customer_profiles')
      .select('*, customer_identities(*), customer_attributes(*)')
      .eq('id', id)
      .single();

    res.json(updated);
  } catch (err) {
    console.error(`PUT /customers/${req.params.id} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /customers/import — bulk import array of customers
router.post('/import', async (req, res) => {
  try {
    const { customers } = req.body;
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ error: 'customers array is required' });
    }

    const results = { imported: 0, failed: 0, errors: [] };

    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      try {
        if (!c.name?.trim() || !c.email?.trim()) {
          throw new Error(`Row ${i + 1}: name and email are required`);
        }

        const external_id = `import_${c.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}_${i}`;

        const { data: profile, error: profileError } = await supabase
          .from('customer_profiles')
          .insert({ external_id })
          .select()
          .single();

        if (profileError) throw profileError;

        await writeProfileData(profile.id, c);
        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: i + 1, email: c.email, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('POST /customers/import error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


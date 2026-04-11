const express = require('express');
const axios   = require('axios');
const { authenticate } = require('../middleware/auth');
const FinchConnection  = require('../models/FinchConnection');

const router = express.Router();

const FINCH_API  = 'https://api.tryfinch.com';
const FINCH_AUTH = 'https://connect.tryfinch.com/authorize';
const PRODUCTS   = 'company directory individual employment payment pay_statement';

// POST /api/finch/connect-url — return the Finch OAuth URL
router.post('/connect-url', authenticate, (req, res) => {
  if (!process.env.FINCH_CLIENT_ID || process.env.FINCH_CLIENT_ID === 'your_finch_client_id') {
    return res.status(503).json({ error: 'Finch credentials not configured. Add FINCH_CLIENT_ID to .env' });
  }

  const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/finch-callback`;

  const params = {
    client_id:    process.env.FINCH_CLIENT_ID,
    products:     PRODUCTS,
    redirect_uri: redirectUri,
    sandbox:      'finch',
  };

  const url = `${FINCH_AUTH}?` + new URLSearchParams(params).toString();

  console.log('[Finch] Connect URL:', url);
  res.json({ url });
});

// POST /api/finch/exchange — exchange authorization_code for access_token
router.post('/exchange', authenticate, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Authorization code is required.' });

  const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/finch-callback`;

  try {
    // Exchange code for token
    const tokenRes = await axios.post(`${FINCH_API}/auth/token`, {
      client_id:     process.env.FINCH_CLIENT_ID,
      client_secret: process.env.FINCH_CLIENT_SECRET,
      code,
      redirect_uri:  redirectUri,
    });

    const accessToken = tokenRes.data.access_token;

    // Fetch company info
    let companyName = '';
    let companyId   = '';
    let provider    = '';
    try {
      const companyRes = await axios.get(`${FINCH_API}/employer/company`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Finch-API-Version': '2020-09-17' },
      });
      companyName = companyRes.data.legal_name || '';
      companyId   = companyRes.data.id || '';
    } catch (_) { /* company fetch is best-effort */ }

    // Extract provider from token introspect (optional)
    try {
      const introspect = await axios.get(`${FINCH_API}/introspect`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Finch-API-Version': '2020-09-17' },
      });
      provider = introspect.data.payroll_provider_id || '';
    } catch (_) { /* introspect is best-effort */ }

    // Save connection
    const connection = await FinchConnection.findOneAndUpdate(
      { userId: req.user._id, companyId: companyId || accessToken },
      {
        userId: req.user._id,
        accessToken,
        provider,
        companyId,
        companyName,
        products: PRODUCTS.split(' '),
        connectedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json(connection);
  } catch (err) {
    console.error('Finch exchange error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to connect payroll account.' });
  }
});

// GET /api/finch/connections — list user's Finch connections
router.get('/connections', authenticate, async (req, res) => {
  try {
    const conns = await FinchConnection.find({ userId: req.user._id }).lean();
    res.json(conns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch connections.' });
  }
});

// GET /api/finch/connections/:id/employment — fetch employment data
router.get('/connections/:id/employment', authenticate, async (req, res) => {
  try {
    const conn = await FinchConnection.findOne({ _id: req.params.id, userId: req.user._id });
    if (!conn) return res.status(404).json({ error: 'Connection not found.' });

    // Fetch directory (list of individuals)
    const dirRes = await axios.get(`${FINCH_API}/employer/directory`, {
      headers: { Authorization: `Bearer ${conn.accessToken}`, 'Finch-API-Version': '2020-09-17' },
    });

    const individuals = dirRes.data.individuals || [];

    // Fetch employment details for all individuals
    if (individuals.length > 0) {
      const empRes = await axios.post(`${FINCH_API}/employer/employment`,
        { requests: individuals.map((i) => ({ individual_id: i.id })) },
        { headers: { Authorization: `Bearer ${conn.accessToken}`, 'Finch-API-Version': '2020-09-17' } }
      );
      return res.json({ individuals, employment: empRes.data.responses || [] });
    }

    res.json({ individuals: [], employment: [] });
  } catch (err) {
    console.error('Finch employment error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch employment data.' });
  }
});

// DELETE /api/finch/connections/:id
router.delete('/connections/:id', authenticate, async (req, res) => {
  try {
    await FinchConnection.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect.' });
  }
});

module.exports = router;

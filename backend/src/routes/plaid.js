const express = require('express');
const moment  = require('moment');
const { body, validationResult } = require('express-validator');

const { authenticate }   = require('../middleware/auth');
const { plaidClient }    = require('../services/plaidService');
const Account            = require('../models/Account');
const Transaction        = require('../models/Transaction');

const router = express.Router();

// POST /api/plaid/link-token — create a Plaid Link token
router.post('/link-token', authenticate, async (req, res) => {
  // Guard: catch missing credentials early with a clear message
  if (!process.env.PLAID_CLIENT_ID || process.env.PLAID_CLIENT_ID === 'your_plaid_client_id' ||
      !process.env.PLAID_SECRET    || process.env.PLAID_SECRET    === 'your_plaid_sandbox_secret') {
    return res.status(503).json({
      error: 'Plaid credentials are not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to your .env file.',
    });
  }

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUri = `${frontendUrl}/user/plaid-oauth-return`;

    const payload = {
      user:          { client_user_id: req.user._id.toString() },
      client_name:   'ClaimYourAid',
      products:      ['transactions'],
      country_codes: ['US'],
      language:      'en',
      redirect_uri:  redirectUri,
    };

    console.log('[Plaid] Creating link token with redirect_uri:', redirectUri);
    const response = await plaidClient.linkTokenCreate(payload);
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    // Surface the actual Plaid error message to make debugging easier
    const plaidMsg = err.response?.data?.error_message
                  || err.response?.data?.display_message
                  || err.message;
    console.error('Link token error:', err.response?.data || err.message);
    res.status(500).json({ error: `Plaid error: ${plaidMsg}` });
  }
});

// GET /api/plaid/accounts — list user's linked accounts
router.get('/accounts', authenticate, async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user._id }).lean();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts.' });
  }
});

// POST /api/plaid/accounts/add — exchange public token and save account
router.post(
  '/accounts/add',
  authenticate,
  [
    body('public_token').notEmpty().withMessage('public_token is required'),
    body('metadata.institution').notEmpty().withMessage('institution metadata is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { public_token, metadata } = req.body;
    const { name: institutionName, institution_id: institutionId } = metadata.institution;

    try {
      // Check for duplicate before calling Plaid
      const existing = await Account.findOne({ userId: req.user._id, institutionId });
      if (existing)
        return res.status(409).json({ error: 'This bank account is already linked.' });

      const tokenRes  = await plaidClient.itemPublicTokenExchange({ public_token });
      const { access_token, item_id } = tokenRes.data;

      const account = await Account.create({
        userId:          req.user._id,
        accessToken:     access_token,
        itemId:          item_id,
        institutionId,
        institutionName,
      });

      res.status(201).json(account);
    } catch (err) {
      console.error('Account add error:', err.response?.data || err.message);
      res.status(500).json({ error: 'Failed to link account.' });
    }
  }
);

// DELETE /api/plaid/accounts/:id — unlink account
router.delete('/accounts/:id', authenticate, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({
      _id:    req.params.id,
      userId: req.user._id, // ensure ownership
    });
    if (!account) return res.status(404).json({ error: 'Account not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

// POST /api/plaid/accounts/:id/import — bulk-import 2-year transaction history
router.post('/accounts/:id/import', authenticate, async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found.' });

    const today       = moment().format('YYYY-MM-DD');
    const twoYearsAgo = moment().subtract(2, 'years').format('YYYY-MM-DD');

    const response = await plaidClient.transactionsGet({
      access_token: account.accessToken,
      start_date:   twoYearsAgo,
      end_date:     today,
      options: { count: 500 },
    });

    const plaidTxns = response.data.transactions;
    const docs = plaidTxns.map((t) => ({
      _id:         t.transaction_id,
      userId:      req.user._id,
      accountId:   account._id,
      accessToken: account.accessToken,
      accountName: account.institutionName,
      name:        t.name,
      amount:      t.amount,
      txnDate:     t.date,
      category:    t.category?.[0] || '',
      pending:     t.pending || false,
    }));

    // insertMany with ordered:false continues on duplicate key errors
    let inserted = 0;
    try {
      const result = await Transaction.insertMany(docs, { ordered: false });
      inserted = result.length;
    } catch (err) {
      if (err.code === 11000 || err.name === 'BulkWriteError') {
        inserted = err.result?.nInserted ?? 0;
      } else {
        throw err;
      }
    }

    res.json({ imported: inserted, total: plaidTxns.length });
  } catch (err) {
    console.error('Import error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to import transactions.' });
  }
});

// GET /api/plaid/accounts/:id/transactions — get stored transactions for an account
router.get('/accounts/:id/transactions', authenticate, async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found.' });

    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const txns = await Transaction.find({ accountId: account._id })
      .sort({ txnDate: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

module.exports = router;

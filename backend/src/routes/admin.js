const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const User             = require('../models/User');
const Account          = require('../models/Account');
const Transaction      = require('../models/Transaction');
const Alert            = require('../models/Alert');
const FinchConnection  = require('../models/FinchConnection');

const router = express.Router();

// All admin routes require admin role
router.use(requireAdmin);

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    // Distinct non-admin user IDs that have at least one linked account
    const nonAdminUsers  = await User.find({ role: { $ne: 'admin' } }).select('_id').lean();
    const nonAdminIdSet  = new Set(nonAdminUsers.map((u) => u._id.toString()));
    const allLinkedIds   = await Account.distinct('userId');
    const linkedUserIds  = allLinkedIds.filter((id) => nonAdminIdSet.has(id.toString()));

    const [totalUsers, totalAccounts, activeAlerts, totalTransactions] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Account.countDocuments(),
      Alert.countDocuments({ active: true }),
      Transaction.countDocuments(),
    ]);

    res.json({
      totalUsers,
      linkedUsers:      linkedUserIds.length,
      notLinkedUsers:   totalUsers - linkedUserIds.length,
      totalAccounts,
      activeAlerts,
      totalTransactions,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// All registered users enriched with accountCount + hasLinked flag
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const accountCounts = await Account.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(
      accountCounts.map((a) => [a._id.toString(), a.count])
    );

    const result = users.map((u) => ({
      ...u,
      accountCount: countMap[u._id.toString()] || 0,
      hasLinked:    (countMap[u._id.toString()] || 0) > 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ── GET /api/admin/users/:userId/accounts ────────────────────────────────────
router.get('/users/:userId/accounts', async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.params.userId }).lean();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts.' });
  }
});

// ── GET /api/admin/users/:userId/transactions ────────────────────────────────
// Supports ?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=&offset=
router.get('/users/:userId/transactions', async (req, res) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;

    const filter = { userId: req.params.userId };
    if (req.query.accountId) filter.accountId = req.query.accountId;
    if (req.query.from || req.query.to) {
      filter.txnDate = {};
      if (req.query.from) filter.txnDate.$gte = req.query.from;
      if (req.query.to)   filter.txnDate.$lte = req.query.to;
    }

    const [txns, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ txnDate: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json({ transactions: txns, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

// ── GET /api/admin/users/:userId/alerts ──────────────────────────────────────
router.get('/users/:userId/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.params.userId })
      .populate('accountId', 'institutionName accountName')
      .lean();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

// ── POST /api/admin/users/:userId/alerts ─────────────────────────────────────
router.post('/users/:userId/alerts', async (req, res) => {
  const { accountId, name, minAmount, maxAmount, merchantFilter,
          notifyEmail, notifyPhone, emailTemplate, smsTemplate } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId is required' });
  try {
    const account = await Account.findOne({ _id: accountId, userId: req.params.userId });
    if (!account) return res.status(404).json({ error: 'Account not found.' });

    const alert = await Alert.findOneAndUpdate(
      { userId: req.params.userId, accountId },
      {
        userId:         req.params.userId,
        accountId,
        accessToken:    account.accessToken,
        name:           name || `${account.institutionName} Alert`,
        minAmount:      minAmount ?? 0,
        maxAmount:      maxAmount ?? 999999,
        merchantFilter: merchantFilter || '',
        notifyEmail:    notifyEmail || '',
        notifyPhone:    notifyPhone || '',
        emailTemplate:  emailTemplate || 'New transaction on <<Deposit Date>>: <<Deposit Description>> for $<<Deposit Amount>>',
        smsTemplate:    smsTemplate   || 'Alert: <<Deposit Description>> $<<Deposit Amount>> on <<Deposit Date>>',
        active:         true,
        updatedAt:      new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(alert);
  } catch (err) {
    console.error('Admin alert save error:', err.message);
    res.status(500).json({ error: 'Failed to save alert.' });
  }
});

// ── PATCH /api/admin/users/:userId/alerts/:alertId/toggle ────────────────────
router.patch('/users/:userId/alerts/:alertId/toggle', async (req, res) => {
  try {
    const alert = await Alert.findOne({ _id: req.params.alertId, userId: req.params.userId });
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    alert.active    = !alert.active;
    alert.updatedAt = new Date();
    await alert.save();
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle alert.' });
  }
});

// ── DELETE /api/admin/users/:userId/alerts/:alertId ──────────────────────────
router.delete('/users/:userId/alerts/:alertId', async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({ _id: req.params.alertId, userId: req.params.userId });
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete alert.' });
  }
});

// ── GET /api/admin/users/:userId/finch ───────────────────────────────────────
router.get('/users/:userId/finch', async (req, res) => {
  try {
    const conns = await FinchConnection.find({ userId: req.params.userId }).lean();
    res.json(conns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Finch connections.' });
  }
});

// ── DELETE /api/admin/users/:userId ──────────────────────────────────────────
router.delete('/users/:userId', async (req, res) => {
  try {
    await Promise.all([
      User.findByIdAndDelete(req.params.userId),
      Account.deleteMany({ userId: req.params.userId }),
      Transaction.deleteMany({ userId: req.params.userId }),
      Alert.deleteMany({ userId: req.params.userId }),
      FinchConnection.deleteMany({ userId: req.params.userId }),
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const Alert   = require('../models/Alert');
const Account = require('../models/Account');

const router = express.Router();

// GET /api/alerts — list user's alerts
router.get('/', authenticate, async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id })
      .populate('accountId', 'institutionName accountName')
      .lean();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts.' });
  }
});

// POST /api/alerts — create or upsert alert for an account
router.post(
  '/',
  authenticate,
  [
    body('accountId').notEmpty().withMessage('accountId is required'),
    body('minAmount').optional().isFloat({ min: 0 }),
    body('maxAmount').optional().isFloat({ min: 0 }),
    body('notifyEmail').optional().isEmail().normalizeEmail(),
    body('notifyPhone').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { accountId, name, minAmount, maxAmount, merchantFilter,
            notifyEmail, notifyPhone, emailTemplate, smsTemplate } = req.body;

    try {
      const account = await Account.findOne({ _id: accountId, userId: req.user._id });
      if (!account) return res.status(404).json({ error: 'Account not found.' });

      // Upsert: one alert per account per user
      const alert = await Alert.findOneAndUpdate(
        { userId: req.user._id, accountId },
        {
          userId:         req.user._id,
          accountId,
          accessToken:    account.accessToken,
          name:           name || `${account.institutionName} Alert`,
          minAmount:      minAmount ?? 0,
          maxAmount:      maxAmount ?? 999999,
          merchantFilter: merchantFilter || '',
          notifyEmail:    notifyEmail || '',
          notifyPhone:    notifyPhone || '',
          emailTemplate:  emailTemplate || 'New transaction on <<Deposit Date>>: <<Deposit Description>> for $<<Deposit Amount>>',
          smsTemplate:    smsTemplate || 'Alert: <<Deposit Description>> $<<Deposit Amount>> on <<Deposit Date>>',
          active:         true,
          updatedAt:      new Date(),
        },
        { upsert: true, new: true, runValidators: true }
      );

      res.json(alert);
    } catch (err) {
      console.error('Alert save error:', err.message);
      res.status(500).json({ error: 'Failed to save alert.' });
    }
  }
);

// PATCH /api/alerts/:id/toggle — enable/disable alert
router.patch('/:id/toggle', authenticate, async (req, res) => {
  try {
    const alert = await Alert.findOne({ _id: req.params.id, userId: req.user._id });
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    alert.active = !alert.active;
    alert.updatedAt = new Date();
    await alert.save();
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update alert.' });
  }
});

// DELETE /api/alerts/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete alert.' });
  }
});

module.exports = router;

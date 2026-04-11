const cron         = require('node-cron');
const moment       = require('moment');
const Alert        = require('../models/Alert');
const Transaction  = require('../models/Transaction');
const { plaidClient } = require('./plaidService');
const { notify }   = require('./notificationService');

const matchesAlert = (alert, txn) => {
  const absAmount = Math.abs(txn.amount);
  const amountMatch =
    absAmount >= alert.minAmount && absAmount <= alert.maxAmount;
  const merchantMatch =
    !alert.merchantFilter ||
    txn.name.toLowerCase().includes(alert.merchantFilter.toLowerCase());
  return amountMatch && merchantMatch;
};

const processAlert = async (alert) => {
  // Find the most recent transaction we have on record for this account
  const latest = await Transaction.findOne({ accessToken: alert.accessToken })
    .sort({ txnDate: -1 })
    .lean();

  if (!latest) {
    console.log(`[AlertWorker] No transactions on record for alert ${alert._id} — skipping`);
    return;
  }

  const today = moment().format('YYYY-MM-DD');
  const startDate = latest.txnDate; // fetch from last known transaction

  let response;
  try {
    response = await plaidClient.transactionsGet({
      access_token: alert.accessToken,
      start_date:   startDate,
      end_date:     today,
      options: { count: 100 },
    });
  } catch (err) {
    console.error(`[AlertWorker] Plaid fetch failed for alert ${alert._id}:`, err.message);
    return;
  }

  const plaidTxns = response.data.transactions;

  // Build a Set of transaction IDs we already have for fast lookup
  const knownIds = new Set(
    (await Transaction.find({ accessToken: alert.accessToken })
      .select('_id')
      .sort({ txnDate: -1 })
      .limit(500)
      .lean()
    ).map((t) => t._id)
  );

  const newTxns = plaidTxns.filter((t) => !knownIds.has(t.transaction_id));

  for (const txn of newTxns) {
    // Save to DB (ignore duplicate key errors from concurrent runs)
    try {
      await Transaction.create({
        _id:         txn.transaction_id,
        userId:      alert.userId,
        accountId:   alert.accountId,
        accessToken: alert.accessToken,
        accountName: latest.accountName,
        name:        txn.name,
        amount:      txn.amount,
        txnDate:     txn.date,
        category:    txn.category?.[0] || '',
        pending:     txn.pending || false,
      });
    } catch (err) {
      if (err.code !== 11000) // ignore duplicate key
        console.error('[AlertWorker] Transaction save error:', err.message);
      continue;
    }

    // Fire notifications if this transaction matches the alert criteria
    if (matchesAlert(alert, txn)) {
      console.log(`[AlertWorker] Alert matched — txn: ${txn.name} $${txn.amount}`);
      await notify(alert, txn);
    }
  }
};

const runWorker = async () => {
  try {
    const alerts = await Alert.find({ active: true }).lean();
    if (alerts.length === 0) return;
    console.log(`[AlertWorker] Checking ${alerts.length} active alert(s)...`);
    await Promise.allSettled(alerts.map(processAlert));
  } catch (err) {
    console.error('[AlertWorker] Error:', err.message);
  }
};

const startAlertWorker = () => {
  console.log('[AlertWorker] Starting — runs every minute');
  cron.schedule('* * * * *', runWorker);
};

module.exports = { startAlertWorker };

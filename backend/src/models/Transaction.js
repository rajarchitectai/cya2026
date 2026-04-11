const mongoose = require('mongoose');

// Use Plaid's transaction_id as _id for built-in deduplication
const TransactionSchema = new mongoose.Schema({
  _id:         { type: String }, // Plaid transaction_id
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  accessToken: { type: String, required: true },
  accountName: { type: String },
  name:        { type: String, required: true },
  amount:      { type: Number, required: true },
  txnDate:     { type: String, required: true }, // YYYY-MM-DD
  category:    { type: String },
  pending:     { type: Boolean, default: false },
  importedAt:  { type: Date, default: Date.now },
});

TransactionSchema.index({ accessToken: 1, txnDate: -1 });
TransactionSchema.index({ userId: 1, txnDate: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);

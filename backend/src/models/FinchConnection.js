const mongoose = require('mongoose');

const FinchConnectionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessToken: { type: String, required: true },
  provider:    { type: String },  // e.g. 'adp', 'gusto', 'paychex', 'bamboohr'
  companyId:   { type: String },
  companyName: { type: String },
  products:    [{ type: String }], // e.g. ['employment', 'payment', 'pay_statement']
  connectedAt: { type: Date, default: Date.now },
});

FinchConnectionSchema.index({ userId: 1 });

module.exports = mongoose.model('FinchConnection', FinchConnectionSchema);

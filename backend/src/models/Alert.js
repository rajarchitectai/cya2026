const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  accessToken: { type: String, required: true },
  name:        { type: String, default: 'Alert' },

  // Matching criteria
  minAmount:      { type: Number, default: 0 },
  maxAmount:      { type: Number, default: 999999 },
  merchantFilter: { type: String, default: '' }, // partial match on merchant name

  // Notification targets
  notifyEmail: { type: String },
  notifyPhone: { type: String },

  // Message templates — supports <<Deposit Date>>, <<Deposit Amount>>, <<Deposit Description>>
  emailTemplate: { type: String, default: 'New transaction on <<Deposit Date>>: <<Deposit Description>> for $<<Deposit Amount>>' },
  smsTemplate:   { type: String, default: 'Alert: <<Deposit Description>> $<<Deposit Amount>> on <<Deposit Date>>' },

  active:      { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});

AlertSchema.index({ userId: 1 });
AlertSchema.index({ accessToken: 1 });

module.exports = mongoose.model('Alert', AlertSchema);

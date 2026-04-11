const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessToken:     { type: String, required: true },
  itemId:          { type: String, required: true },
  institutionId:   { type: String, required: true },
  institutionName: { type: String },
  accountName:     { type: String },
  accountType:     { type: String },
  accountSubtype:  { type: String },
  linkedAt:        { type: Date, default: Date.now },
});

AccountSchema.index({ userId: 1, institutionId: 1 }, { unique: true });

module.exports = mongoose.model('Account', AccountSchema);

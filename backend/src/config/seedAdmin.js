const bcrypt = require('bcryptjs');
const User   = require('../models/User');

// Back-fill role:'user' on any legacy documents that have no role field
const backfillRoles = async () => {
  const result = await User.updateMany(
    { role: { $exists: false } },
    { $set: { role: 'user' } }
  );
  if (result.modifiedCount > 0)
    console.log(`[Seed] Back-filled role:'user' on ${result.modifiedCount} legacy user(s)`);
};

const seedAdmin = async () => {
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fname    = process.env.ADMIN_FNAME || 'Admin';

  if (!email || !password) {
    console.warn('[Seed] ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed');
    return;
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      // Ensure existing user has admin role
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log(`[Seed] Upgraded ${email} to admin role`);
      }
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    await User.create({
      fname,
      lname: '',
      cell:  '0000000000',
      email: email.toLowerCase(),
      password: hash,
      role: 'admin',
    });
    console.log(`[Seed] Admin user created: ${email}`);
  } catch (err) {
    console.error('[Seed] Admin seed failed:', err.message);
  }

  // Always run role back-fill after admin seed
  await backfillRoles();
};

module.exports = seedAdmin;

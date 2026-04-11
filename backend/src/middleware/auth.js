const passport = require('passport');

const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  })(req, res, next);
};

const requireAdmin = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    req.user = user;
    next();
  })(req, res, next);
};

module.exports = { authenticate, requireAdmin };

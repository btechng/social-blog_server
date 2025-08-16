import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/register',
  body('username').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const exists = await User.findOne({ $or: [{ email: req.body.email }, { username: req.body.username }] });
      if (exists) return res.status(400).json({ message: 'User already exists' });
      const user = await User.create(req.body);
      const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { _id: user._id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio } });
    } catch (e) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const user = await User.findOne({ email: req.body.email }).select('+password');
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });
      const ok = await user.comparePassword(req.body.password);
      if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ _id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { _id: user._id, username: user.username, email: user.email, avatarUrl: user.avatarUrl, bio: user.bio } });
    } catch (e) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.get('/me', auth, async (req, res) => {
  const me = await User.findById(req.user._id).select('-password');
  res.json(me);
});

export default router;

import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// search users
router.get('/', auth, async (req, res) => {
  const q = req.query.search || '';
  const limit = Math.min(parseInt(req.query.limit || '10'), 50);
  const users = await User.find(q ? { $text: { $search: q } } : {}).select('username avatarUrl').limit(limit);
  res.json(users);
});

router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
});

router.put('/:id', auth, async (req, res) => {
  if (req.user._id !== req.params.id) return res.status(403).json({ message: 'Forbidden' });
  const updated = await User.findByIdAndUpdate(req.params.id, { avatarUrl: req.body.avatarUrl, bio: req.body.bio }, { new: true }).select('-password');
  res.json(updated);
});

export default router;

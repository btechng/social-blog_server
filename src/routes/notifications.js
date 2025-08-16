import express from 'express';
import auth from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const notes = await Notification.find({ user: req.user._id })
    .populate('actor', 'username avatarUrl')
    .populate('post', 'title')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(notes);
});

router.post('/:id/read', auth, async (req, res) => {
  const n = await Notification.findById(req.params.id);
  if (!n || n.user.toString() != req.user._id) return res.status(404).json({ message: 'Not found' });
  n.read = true;
  await n.save();
  res.json(n);
});

export default router;

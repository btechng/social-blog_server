import express from 'express';
import auth from '../middleware/auth.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Fetch messages between me and :userId with pagination (newest last)
router.get('/:userId', auth, async (req, res) => {
  const other = req.params.userId;
  const page = Math.max(parseInt(req.query.page || '1'), 1);
  const limit = Math.min(parseInt(req.query.limit || '20'), 100);

  const filter = {
    $or: [
      { from: req.user._id, to: other },
      { from: other, to: req.user._id }
    ]
  };
  const total = await Message.countDocuments(filter);
  const messages = await Message.find(filter)
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
  res.json({ data: messages, total, page, pages: Math.ceil(total / limit) });
});

// Send message
router.post('/:userId', auth, async (req, res) => {
  const other = req.params.userId;
  const msg = await Message.create({ from: req.user._id, to: other, content: req.body.content });
  const io = req.app.get('io');
  // notify via DM room
  const room = [req.user._id, other].sort().join(':');
  io.to(`dm:${room}`).emit('dm:new', msg);
  if (other !== req.user._id) {
    const n = await Notification.create({ user: other, type: 'message', actor: req.user._id });
    io.to(`user:${other}`).emit('notification', { _id: n._id, type: 'message' });
  }
  res.status(201).json(msg);
});

export default router;

import express from 'express';
import auth from '../middleware/auth.js';
import cloudinary from '../utils/cloudinary.js';
const router = express.Router();

router.post('/', auth, async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ message: 'No image' });
  try {
    const result = await cloudinary.uploader.upload(image, { folder: 'social-blog' });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (e) {
    res.status(500).json({ message: 'Upload failed', error: e.message });
  }
});

export default router;

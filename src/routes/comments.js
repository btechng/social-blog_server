import express from "express";
import auth from "../middleware/auth.js";
import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// List comments for a post with pagination
router.get("/post/:postId", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const limit = Math.min(parseInt(req.query.limit || "10"), 50);

    const comments = await Comment.find({ post: req.params.postId })
      .populate("author", "username avatarUrl")
      .sort({ createdAt: 1 }) // oldest first
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Comment.countDocuments({ post: req.params.postId });
    res.json({ data: comments, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch comments for social-post (same as above but route can be different if needed)
router.get("/social-post/:postId", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const limit = Math.min(parseInt(req.query.limit || "10"), 50);

    const comments = await Comment.find({ post: req.params.postId })
      .populate("author", "username avatarUrl")
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Comment.countDocuments({ post: req.params.postId });
    res.json({ data: comments, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new comment
router.post("/post/:postId", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = await Comment.create({
      author: req.user._id,
      post: post._id,
      content: req.body.content,
    });

    // Add comment ID to post
    post.comments.push(comment._id);
    await post.save();

    const populated = await comment.populate("author", "username avatarUrl");

    // Create notification if commenting on someone else's post
    if (post.author.toString() !== req.user._id) {
      const n = await Notification.create({
        user: post.author,
        type: "comment",
        actor: req.user._id,
        post: post._id,
      });
      const io = req.app.get("io");
      io.to(`user:${post.author.toString()}`).emit("notification", {
        _id: n._id,
        type: "comment",
        post: post._id,
      });
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a comment (only author)
router.put("/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Not found" });
    if (comment.author.toString() !== req.user._id)
      return res.status(403).json({ message: "Forbidden" });

    comment.content = req.body.content ?? comment.content;
    await comment.save();

    const populated = await Comment.findById(comment._id).populate(
      "author",
      "username avatarUrl"
    );
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a comment (only author)
router.delete("/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Not found" });
    if (comment.author.toString() !== req.user._id)
      return res.status(403).json({ message: "Forbidden" });

    // Remove comment from post's comments array
    const post = await Post.findById(comment.post);
    if (post) {
      post.comments = post.comments.filter(
        (cId) => cId.toString() !== comment._id.toString()
      );
      await post.save();
    }

    await comment.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

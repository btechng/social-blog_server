import express from "express";
import auth from "../middleware/auth.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// List with pagination & search
router.get("/", async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1"), 1);
  const limit = Math.min(parseInt(req.query.limit || "10"), 50);
  const q = (req.query.q || "").trim();

  const filter = q ? { $text: { $search: q } } : {};
  const total = await Post.countDocuments(filter);
  const posts = await Post.find(filter)
    .populate("author", "username avatarUrl")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  res.json({ data: posts, total, page, pages: Math.ceil(total / limit) });
});

// Create
router.post("/", auth, async (req, res) => {
  const post = await Post.create({ ...req.body, author: req.user._id });
  const populated = await post.populate("author", "username avatarUrl");
  res.status(201).json(populated);
});
app.get("/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "author",
      "username avatarUrl"
    );
    if (!post) return res.status(404).send("Post not found");

    const metaTitle = post.title || `${post.author?.username}'s post`;
    const metaDesc =
      (post.content || "").slice(0, 150) || "Check out this post!";
    const metaImage = post.imageUrl || "https://taskncart.shop/taskcart.png";
    const postUrl = `https://taskncart.shop/posts/${post._id}`;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${metaTitle}</title>

        <!-- Open Graph -->
        <meta property="og:type" content="article" />
        <meta property="og:title" content="${metaTitle}" />
        <meta property="og:description" content="${metaDesc}" />
        <meta property="og:image" content="${metaImage}" />
        <meta property="og:url" content="${postUrl}" />

        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${metaTitle}" />
        <meta name="twitter:description" content="${metaDesc}" />
        <meta name="twitter:image" content="${metaImage}" />
      </head>
      <body>
        <p>Redirecting...</p>
        <script>
          window.location.href = "${postUrl}";
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get("/social-post:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "author",
      "username avatarUrl"
    );
    if (!post) return res.status(404).send("Post not found");

    const metaTitle = post.title || `${post.author?.username}'s post`;
    const metaDesc =
      (post.content || "").slice(0, 150) || "Check out this post!";
    const metaImage = post.imageUrl || "https://taskncart.shop/taskcart.png";
    const postUrl = `https://taskncart.shop/social-post/${social - post._id}`;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${metaTitle}</title>

        <!-- Open Graph -->
        <meta property="og:type" content="article" />
        <meta property="og:title" content="${metaTitle}" />
        <meta property="og:description" content="${metaDesc}" />
        <meta property="og:image" content="${metaImage}" />
        <meta property="og:url" content="${postUrl}" />

        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${metaTitle}" />
        <meta name="twitter:description" content="${metaDesc}" />
        <meta name="twitter:image" content="${metaImage}" />
      </head>
      <body>
        <p>Redirecting...</p>
        <script>
          window.location.href = "${postUrl}";
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
// Read
router.get("/:id", async (req, res) => {
  const post = await Post.findById(req.params.id).populate(
    "author",
    "username avatarUrl"
  );
  if (!post) return res.status(404).json({ message: "Not found" });
  res.json(post);
});

// Update (only author)
router.put("/:id", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Not found" });
  if (post.author.toString() !== req.user._id)
    return res.status(403).json({ message: "Forbidden" });

  post.title = req.body.title ?? post.title;
  post.content = req.body.content ?? post.content;
  post.imageUrl = req.body.imageUrl ?? post.imageUrl;
  await post.save();
  const populated = await Post.findById(post._id).populate(
    "author",
    "username avatarUrl"
  );
  res.json(populated);
});

// Delete (only author)
router.delete("/:id", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Not found" });
  if (post.author.toString() !== req.user._id)
    return res.status(403).json({ message: "Forbidden" });
  await post.deleteOne();
  res.json({ ok: true });
});

// Toggle like
router.post("/:id/like", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Not found" });
  const hasLiked = post.likes.some((u) => u.toString() === req.user._id);
  if (hasLiked) {
    post.likes = post.likes.filter((u) => u.toString() !== req.user._id);
  } else {
    post.likes.push(req.user._id);
    if (post.author.toString() !== req.user._id) {
      const n = await Notification.create({
        user: post.author,
        type: "like",
        actor: req.user._id,
        post: post._id,
      });
      const io = req.app.get("io");
      io.to(`user:${post.author.toString()}`).emit("notification", {
        _id: n._id,
        type: "like",
        post: post._id,
      });
    }
  }
  await post.save();
  const populated = await Post.findById(post._id).populate(
    "author",
    "username avatarUrl"
  );
  res.json(populated);
});

export default router;

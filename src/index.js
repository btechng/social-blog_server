import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import commentRoutes from "./routes/comments.js";
import uploadRoutes from "./routes/uploads.js";
import notificationRoutes from "./routes/notifications.js";
import chatRoutes from "./routes/chat.js";

const app = express();
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
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.set("io", io);

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json({ limit: "4mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => res.send("Social Blog API running"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);

io.on("connection", (socket) => {
  socket.on("join", (userId) => socket.join(`user:${userId}`));
  socket.on("dm:join", ({ me, other }) => {
    const room = [me, other].sort().join(":");
    socket.join(`dm:${room}`);
  });
  socket.on("disconnect", () => {});
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    httpServer.listen(PORT, () => console.log("Server listening on", PORT));
  })
  .catch((err) => console.error("Mongo error", err));

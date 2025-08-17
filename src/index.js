import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import path from "path";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import commentRoutes from "./routes/comments.js";
import uploadRoutes from "./routes/uploads.js";
import notificationRoutes from "./routes/notifications.js";
import chatRoutes from "./routes/chat.js";
import Post from "./models/Post.js"; // ✅ Post model

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

// ✅ API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);

// ✅ Helper to generate dynamic HTML with meta tags
function generatePostHTML(post, route) {
  const metaTitle = post.title || "Social Blog Post";
  const metaDesc =
    post.content?.substring(0, 150) || "Read this amazing post on Social Blog.";
  const metaImage = post.image || "https://taskncart.shop/taskcart.png";
  const metaUrl = `${
    process.env.CLIENT_URL || "https://taskncart.shop"
  }/${route}/${post._id}`;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${metaTitle}</title>

        <!-- Primary Meta -->
        <meta name="title" content="${metaTitle}" />
        <meta name="description" content="${metaDesc}" />

        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="article" />
        <meta property="og:url" content="${metaUrl}" />
        <meta property="og:title" content="${metaTitle}" />
        <meta property="og:description" content="${metaDesc}" />
        <meta property="og:image" content="${metaImage}" />

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="${metaUrl}" />
        <meta property="twitter:title" content="${metaTitle}" />
        <meta property="twitter:description" content="${metaDesc}" />
        <meta property="twitter:image" content="${metaImage}" />
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/src/main.tsx"></script>
      </body>
    </html>
  `;
}

// ✅ Dynamic SEO for both routes
app.get("/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");
    res.send(generatePostHTML(post, "posts"));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get("/social-post/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({
        path: "comments",
        populate: { path: "author", select: "username avatarUrl" },
        options: { sort: { createdAt: 1 } }, // oldest first
      })
      .populate("author", "username avatarUrl"); // post author

    if (!post) return res.status(404).send("Post not found");

    res.send(generatePostHTML(post, "social-post"));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ✅ Serve frontend build (Vite/React)
app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// ✅ Socket.io setup
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

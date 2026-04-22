import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Trust the first proxy in front of Express (needed for Cloud Run / reverse proxies)
  app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: false
  }));
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
  });
  app.use(limiter);
  const allowedOrigins = [
    'https://ais-pre-3co5u3o6lfljwy3witc6wc-364257698549.us-west2.run.app',
    'https://circulo-hermetico.onrender.com'
  ];

  if (process.env.PRODUCTION_URL) {
    // Remove tralilng slash if exists
    allowedOrigins.push(process.env.PRODUCTION_URL.replace(/\/$/, ''));
  }

  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json({ limit: '10kb' }));

  // Socket.io logic for Voice Chat Signaling
  const userSocketMap = new Map<string, string>();

  io.on("connection", (socket: any) => {
    console.log("A user connected:", socket.id);

    socket.on("join-room", (roomId: string, userId: string) => {
      userSocketMap.set(userId, socket.id);
      socket.join(roomId);
      console.log(`User ${userId} joined room ${roomId}`);
      socket.to(roomId).emit("user-connected", userId);

      socket.on("disconnect", () => {
        console.log("User disconnected:", userId);
        userSocketMap.delete(userId);
        socket.to(roomId).emit("user-disconnected", userId);
      });
    });

    socket.on("signal", (data: { to: string, from: string, signal: any }) => {
      const targetSocketId = userSocketMap.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("signal", {
          from: data.from,
          signal: data.signal
        });
      }
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

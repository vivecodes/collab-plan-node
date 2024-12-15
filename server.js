import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const { DB_HOST, PORT } = process.env;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

app.use(express.json());
app.use(cors());

mongoose
  .connect(DB_HOST)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

import authRoutes from "./routes/auth.js";
import listRoutes from "./routes/list.js";
import taskRoutes from "./routes/task.js";

app.use("/api/auth", authRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/tasks", taskRoutes(io));

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("joinRoom", (listId) => {
    socket.join(listId);
    console.log(`Socket ${socket.id} joined room: ${listId}`);
  });

  socket.on("leaveRoom", (listId) => {
    socket.leave(listId);
    console.log(`Socket ${socket.id} left room: ${listId}`);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

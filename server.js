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
const io = new Server(server);

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
app.use("/api/tasks", taskRoutes);

io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle adding a new task
  // socket.on("addTask", async (task) => {
  //   try {
  //     const newTask = new Task(task);
  //     await newTask.save();
  //     io.emit("taskAdded", newTask); // Emit event to all connected clients
  //   } catch (err) {
  //     console.error(err);
  //   }
  // });

  // Handle updating a task
  // socket.on("updateTask", async (task) => {
  //   try {
  //     const updatedTask = await Task.findByIdAndUpdate(task._id, task, {
  //       new: true,
  //     });
  //     io.emit("taskUpdated", updatedTask); // Emit event to all connected clients
  //   } catch (err) {
  //     console.error(err);
  //   }
  // });

  // Handle deleting a task
  // socket.on("deleteTask", async (taskId) => {
  //   try {
  //     await Task.findByIdAndDelete(taskId);
  //     io.emit("taskDeleted", taskId); // Emit event to all connected clients
  //   } catch (err) {
  //     console.error(err);
  //   }
  // });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});

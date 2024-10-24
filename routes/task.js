import express from "express";

import Task from "../models/task.js";
import List from "../models/list.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { ErrorMessage, Message } from "../utils/constants.js";

const router = express.Router();

// Get all tasks for the list
router.get("/:listId", authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;
    const { id: userId } = req.user;

    const list = await List.findOne({
      _id: listId,
      $or: [{ owner: userId }, { sharedWith: userId }],
    })
      .populate("owner", "username")
      .populate({
        path: "tasks",
        populate: [
          { path: "createdBy", select: "username", model: "user" },
          { path: "updatedBy", select: "username", model: "user" },
        ],
      });
    if (!list) {
      res.status(404).json({ error: ErrorMessage.listNotFound });
    }
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a task to a list
router.post("/:listId", authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const { listId } = req.params;
    const { id: userId } = req.user;

    const list = await List.findOne({
      _id: listId,
      $or: [{ owner: userId }, { sharedWith: userId }],
    });
    if (!list) {
      return res.status(403).json({ error: ErrorMessage.listNotFound });
    }

    const task = new Task({
      content,
      completed: false,
      list: list._id,
      owner: list.owner,
      createdBy: userId,
      updatedBy: userId,
    });

    await task.save();

    list.tasks.push(task._id);
    await list.save();

    await task
      .populate("createdBy", "username")
      .populate("updatedBy", "username");

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a task
router.put("/:listId/:taskId", authenticateToken, async (req, res) => {
  try {
    const { content, completed } = req.body;
    const { listId, taskId } = req.params;
    const { id: userId } = req.user;

    const list = await List.findOne({
      _id: listId,
      $or: [{ owner: userId }, { sharedWith: userId }],
    });
    if (!list) {
      return res.status(403).json({ error: ErrorMessage.listNotFound });
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, list: listId },
      { content, completed, updatedBy: userId },
      { new: true }
    )
      .populate("createdBy", "username")
      .populate("updatedBy", "username");

    if (!task) {
      return res.status(404).json({ error: ErrorMessage.taskNotFound });
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a task
router.delete("/:listId/:taskId", authenticateToken, async (req, res) => {
  try {
    const { listId, taskId } = req.params;
    const { id: userId } = req.user;

    const list = await List.findOne({
      _id: listId,
      $or: [{ owner: userId }, { sharedWith: userId }],
    });
    if (!list) {
      return res.status(403).json({ error: ErrorMessage.listNotFound });
    }

    const task = await Task.findOneAndDelete({
      _id: taskId,
      list: listId,
    });
    if (!task) {
      return res.status(404).json({ error: ErrorMessage.taskNotFound });
    }

    list.tasks = list.tasks.filter((id) => id.toString() !== taskId);
    await list.save();

    res.status(200).json({ message: Message.taskIsDeleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

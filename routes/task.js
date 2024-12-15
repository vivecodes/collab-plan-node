import express from "express";
import Task from "../models/task.js";
import List from "../models/list.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { ErrorMessage, Message } from "../utils/constants.js";

const router = express.Router();

const checkIfListExistAndAccessible = async (listId, userId) => {
  const list = await List.findOne({ _id: listId });
  if (!list) {
    return res.status(404).json({ error: ErrorMessage.listNotFound });
  }

  const hasAccess =
    list.owner.toString() === userId || list.sharedWith.includes(userId);
  if (!hasAccess) {
    return res.status(403).json({ error: ErrorMessage.accessDeniedList });
  }

  return list;
};

export default (io) => {
  // Get all tasks in a list
  router.get("/:listId", authenticateToken, async (req, res) => {
    try {
      const { listId } = req.params;
      const { id: userId } = req.user;

      checkIfListExistAndAccessible(listId, userId);

      const populatedList = await List.findOne({ _id: listId })
        .populate("owner", "username")
        .populate({
          path: "tasks",
          populate: [
            { path: "createdBy", select: "username", model: "user" },
            { path: "updatedBy", select: "username", model: "user" },
          ],
        });

      res.status(200).json(populatedList);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new task
  router.post("/:listId", authenticateToken, async (req, res) => {
    try {
      const { content } = req.body;
      const { listId } = req.params;
      const { id: userId } = req.user;

      const list = await checkIfListExistAndAccessible(listId, userId);

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

      const createdTask = await Task.findOne({
        _id: task._id,
      })
        .populate({ path: "createdBy", select: "username", model: "user" })
        .populate({ path: "updatedBy", select: "username", model: "user" });
      if (!createdTask) {
        return res.status(404).json({ error: ErrorMessage.taskNotFound });
      }

      io.to(listId).emit("taskCreated", createdTask);
      res.status(201).json(createdTask);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update description of a task
  router.put("/:listId/:taskId", authenticateToken, async (req, res) => {
    try {
      const { content } = req.body;
      const { listId, taskId } = req.params;
      const { id: userId } = req.user;

      checkIfListExistAndAccessible(listId, userId);

      const task = await Task.findOneAndUpdate(
        { _id: taskId, list: listId },
        { content, updatedBy: userId },
        { new: true }
      )
        .populate("createdBy", "username")
        .populate("updatedBy", "username");
      if (!task) {
        return res.status(404).json({ error: ErrorMessage.taskNotFound });
      }

      io.to(listId).emit("taskDescriptionUpdated", task);
      res.status(200).json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update completion of a task
  router.put(
    "/:listId/:taskId/complete",
    authenticateToken,
    async (req, res) => {
      try {
        const { completed } = req.body;
        const { listId, taskId } = req.params;
        const { id: userId } = req.user;

        checkIfListExistAndAccessible(listId, userId);

        const task = await Task.findOneAndUpdate(
          { _id: taskId, list: listId },
          { completed, updatedBy: userId },
          { new: true }
        )
          .populate("createdBy", "username")
          .populate("updatedBy", "username");
        if (!task) {
          return res.status(404).json({ error: ErrorMessage.taskNotFound });
        }

        io.to(listId).emit("taskCompletionUpdated", task);
        res.status(200).json(task);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Delete a task
  router.delete("/:listId/:taskId", authenticateToken, async (req, res) => {
    try {
      const { listId, taskId } = req.params;
      const { id: userId } = req.user;

      const list = await checkIfListExistAndAccessible(listId, userId);

      const task = await Task.findOneAndDelete({
        _id: taskId,
        list: listId,
      });
      if (!task) {
        return res.status(404).json({ error: ErrorMessage.taskNotFound });
      }

      list.tasks = list.tasks.filter((id) => id.toString() !== taskId);
      await list.save();

      io.to(listId).emit("taskDeleted", taskId);
      res.status(200).json({ message: Message.taskIsDeleted });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

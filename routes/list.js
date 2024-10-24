import express from "express";

import User from "../models/user.js";
import List from "../models/list.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { ErrorMessage, Message } from "../utils/constants.js";

const router = express.Router();

// Get all lists for the logged-in user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { id } = req.user;

    const ownedLists = await List.find({ owner: id }).lean();
    const ownedListsWithFlag = ownedLists.map((list) => ({
      ...list,
      isOwner: true,
    }));

    const sharedLists = await List.find({ sharedWith: id }).lean();
    const sharedListsWithFlag = sharedLists.map((list) => ({
      ...list,
      isOwner: false,
    }));

    res.status(200).json([...ownedListsWithFlag, ...sharedListsWithFlag]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new list
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.user;

    const list = new List({
      name,
      owner: id,
    });
    await list.save();
    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Share a list
router.post("/:listId/share", authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    const { listId } = req.params;
    const { id: userId } = req.user;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: ErrorMessage.userNotFound });
    }

    const list = await List.findOne({
      _id: listId,
      owner: userId,
    });
    if (!list) {
      return res.status(404).json({ error: ErrorMessage.listNotFound });
    }

    if (list.sharedWith.includes(user._id)) {
      return res.status(400).json({ error: ErrorMessage.listAlreadyShared });
    }

    list.sharedWith.push(user._id);
    await list.save();
    res.status(200).json({ message: Message.listIsShared });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

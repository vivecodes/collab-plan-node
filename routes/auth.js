import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/user.js";
import { ErrorMessage } from "../utils/constants.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    const duplicatedUser = await User.findOne({ username });
    if (duplicatedUser) {
      res.status(500).json({ error: ErrorMessage.dublicatedUser });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ error: ErrorMessage.usernameInvalid });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: ErrorMessage.passwordInvalid });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

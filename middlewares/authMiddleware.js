import jwt from "jsonwebtoken";

import { ErrorMessage } from "../utils/constants.js";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader)
    return res
      .status(401)
      .json({ message: ErrorMessage.accessDenided });

  const token = authHeader.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ message: ErrorMessage.accessDenided });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: ErrorMessage.tokenInvalid });
    }
    req.user = user;
    next();
  });
};

import { Request, Response, NextFunction } from "express";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Simple auth check
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "No authorization token" });
  }
  next();
};

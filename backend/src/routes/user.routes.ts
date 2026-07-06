import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { createUser, createUserSchema, getUser } from "../services/user.service.js";

export const userRoutes = Router();

userRoutes.post("/", asyncHandler(async (req, res) => {
  const body = createUserSchema.parse(req.body);
  const user = await createUser(body);
  res.status(201).json({ data: user });
}));

userRoutes.get("/:id", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const user = await getUser(id);
  res.json({ data: user });
}));

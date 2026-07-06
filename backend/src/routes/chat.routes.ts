import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  listConversations,
  sendMessage,
  sendMessageSchema,
  startConversation,
  startConversationSchema
} from "../services/chat.service.js";

export const chatRoutes = Router();

chatRoutes.use(requireAuth);

chatRoutes.get("/", asyncHandler(async (req, res) => {
  const conversations = await listConversations(req.user!);
  res.json({ data: conversations });
}));

chatRoutes.post("/", asyncHandler(async (req, res) => {
  const body = startConversationSchema.parse(req.body);
  const conversation = await startConversation(req.user!.id, body);
  res.status(201).json({ data: conversation });
}));

chatRoutes.post("/:id/messages", asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const body = sendMessageSchema.parse(req.body);
  const conversation = await sendMessage(req.user!, id, body.content);
  res.status(201).json({ data: conversation });
}));

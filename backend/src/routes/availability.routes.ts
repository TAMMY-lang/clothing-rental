import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { availabilitySchema, checkAvailability } from "../services/availability.service.js";

export const availabilityRoutes = Router();

availabilityRoutes.get("/check", asyncHandler(async (req, res) => {
  const query = availabilitySchema.parse(req.query);
  const result = await checkAvailability(query);
  res.json({ data: result });
}));

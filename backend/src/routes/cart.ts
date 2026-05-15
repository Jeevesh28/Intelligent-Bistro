import { Router } from "express";
import { z } from "zod";
import { applyCartAction, clearCart, getOrCreateCart } from "../store/sessions.js";

export const cartRouter = Router();

cartRouter.get("/:sessionId", (req, res) => {
  res.json(getOrCreateCart(req.params.sessionId));
});

const addBody = z.object({
  item_id: z.string(),
  quantity: z.number().int().min(1).default(1),
  modifiers: z.array(z.string()).optional(),
  size: z.enum(["small", "medium", "large"]).optional(),
  notes: z.string().optional(),
});

cartRouter.post("/:sessionId/items", (req, res) => {
  const parsed = addBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const result = applyCartAction(req.params.sessionId, { type: "add_item", ...parsed.data });
  if (!result.ok) return res.status(400).json({ error: result.message });
  res.json(getOrCreateCart(req.params.sessionId));
});

const patchBody = z.object({ quantity: z.number().int().min(0) });

cartRouter.patch("/:sessionId/items/:lineId", (req, res) => {
  const parsed = patchBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const result = applyCartAction(req.params.sessionId, {
    type: "update_line",
    line_id: req.params.lineId,
    quantity: parsed.data.quantity,
  });
  if (!result.ok) return res.status(404).json({ error: result.message });
  res.json(getOrCreateCart(req.params.sessionId));
});

cartRouter.delete("/:sessionId/items/:lineId", (req, res) => {
  const result = applyCartAction(req.params.sessionId, { type: "remove_item", line_id: req.params.lineId });
  if (!result.ok) return res.status(404).json({ error: result.message });
  res.json(getOrCreateCart(req.params.sessionId));
});

cartRouter.delete("/:sessionId", (req, res) => {
  res.json(clearCart(req.params.sessionId));
});

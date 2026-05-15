import { Router } from "express";
import { z } from "zod";
import { runChat } from "../ai/claude.js";

export const chatRouter = Router();

const body = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(40)
    .default([]),
});

chatRouter.post("/:sessionId", async (req, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  console.log("[chat] request session=%s msg=%j", req.params.sessionId, parsed.data.message);
  const t0 = Date.now();
  try {
    const result = await runChat(req.params.sessionId, parsed.data.message, parsed.data.history);
    console.log(
      "[chat] done in %dms · actions=%d · suggestions=%d",
      Date.now() - t0,
      result.actions.length,
      result.suggestions.length,
    );
    res.json(result);
  } catch (err) {
    console.error("[chat] error after %dms:", Date.now() - t0, err);
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `AI request failed: ${message}` });
  }
});

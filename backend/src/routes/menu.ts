import { Router } from "express";
import { menu } from "../store/sessions.js";

export const menuRouter = Router();

menuRouter.get("/", (_req, res) => {
  res.json(menu);
});

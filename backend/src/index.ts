import "dotenv/config";
import express from "express";
import cors from "cors";
import { menuRouter } from "./routes/menu.js";
import { cartRouter } from "./routes/cart.js";
import { chatRouter } from "./routes/chat.js";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("[startup] ANTHROPIC_API_KEY not set — /chat will fail until you add it to backend/.env");
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/menu", menuRouter);
app.use("/cart", cartRouter);
app.use("/chat", chatRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[bistro] listening on http://0.0.0.0:${PORT} (LAN-reachable)`);
});

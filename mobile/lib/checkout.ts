export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function formatCvc(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}

export function detectBrand(cardNumber: string): "visa" | "mastercard" | "amex" | "discover" | "card" {
  const digits = cardNumber.replace(/\D/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return "card";
}

export interface CardValidation {
  ok: boolean;
  reason?: string;
}

export function validateCard(card: {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}): CardValidation {
  const digits = card.number.replace(/\D/g, "");
  if (digits.length < 13) return { ok: false, reason: "Card number looks short" };
  const [mm, yy] = card.expiry.split("/");
  const month = Number(mm);
  const year = Number(yy);
  if (!month || month < 1 || month > 12) return { ok: false, reason: "Check expiry month" };
  if (!year) return { ok: false, reason: "Check expiry year" };
  if (card.cvc.length < 3) return { ok: false, reason: "Check the security code" };
  if (card.name.trim().length < 2) return { ok: false, reason: "Add the name on card" };
  return { ok: true };
}

export function newOrderId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  s += "-";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

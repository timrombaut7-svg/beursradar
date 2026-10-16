import { z } from "zod";
import { RequestValidationError } from "./profile";

const symbol = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.\-^=]{1,15}$/, "ongeldig symbool");
const assetType = z.enum(["stock", "crypto"]);

export const watchItemInput = z.object({
  symbol,
  name: z.string().trim().min(1).max(120),
  type: assetType,
});

export const positionInput = z.object({
  id: z.string().uuid(),
  symbol,
  name: z.string().trim().min(1).max(120),
  type: assetType,
  quantity: z.number().positive().finite().max(1e12),
  buyPrice: z.number().positive().finite().max(1e12),
  buyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "datum moet YYYY-MM-DD zijn"),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  stopLoss: z.number().positive().finite().nullish(),
  target1: z.number().positive().finite().nullish(),
  target2: z.number().positive().finite().nullish(),
  horizon: z.enum(["short", "long"]).default("short"),
});

export const importInput = z.object({
  watchlist: z.array(watchItemInput).max(200).default([]),
  positions: z.array(positionInput).max(500).default([]),
});

export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new RequestValidationError("Ongeldige JSON");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new RequestValidationError(`${issue.path.join(".") || "body"}: ${issue.message}`);
  }
  return parsed.data;
}

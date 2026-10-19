import { z } from "zod";
import { USERNAME_RE, normalizeUsername } from "./account";

export const credentialsSchema = z.object({
  username: z
    .string()
    .transform(normalizeUsername)
    .refine((u) => USERNAME_RE.test(u), "Gebruikersnaam: 3 tot 30 tekens, alleen letters, cijfers, punt, - of _"),
  password: z.string().min(8, "Wachtwoord: minstens 8 tekens").max(200, "Wachtwoord is te lang"),
});

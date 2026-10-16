// Past databasemigraties toe tijdens de build als er een database is geconfigureerd
// (bijv. Vercel Postgres / Neon). Zonder DATABASE_URL wordt deze stap overgeslagen
// en draait de app in LocalStorage-modus.
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  console.log("[beursradar] Geen DATABASE_URL: migraties overgeslagen (LocalStorage-modus).");
} else {
  console.log("[beursradar] Database gevonden: migraties toepassen…");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}

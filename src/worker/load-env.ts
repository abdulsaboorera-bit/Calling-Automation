import { config } from "dotenv";
import path from "path";
import { existsSync } from "fs";

// Load .env.local for local development (Render injects env vars directly)
if (!process.env.RENDER) {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    config({ path: envPath });
    console.log("[env] Loaded .env.local");
  }
}

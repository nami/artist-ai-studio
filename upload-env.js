import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const envPath = path.resolve(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");

const envVars = envContent
  .split("\n")
  .filter((line) => line.trim() && !line.startsWith("#"));

envVars.forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    try {
      execSync(
        `vercel env add ${key.trim()} production --value="${value.trim()}"`,
        { stdio: "inherit" }
      );
    } catch {
      console.log(`Skipping ${key.trim()} as it already exists.`);
    }
  }
});

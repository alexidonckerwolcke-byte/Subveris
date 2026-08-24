import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const retentionMs = 30 * 24 * 60 * 60 * 1000;
const cutoff = Date.now() - retentionMs;
const logFiles = process.argv.slice(2);

for (const relativePath of logFiles) {
  const logPath = path.resolve(projectRoot, relativePath);
  if (!fs.existsSync(logPath)) continue;

  const retainedLines = fs.readFileSync(logPath, "utf8")
    .split("\n")
    .filter((line) => {
      if (!line.trim()) return false;
      let timestamp = null;
      try {
        timestamp = JSON.parse(line).ts || null;
      } catch {
        timestamp = line;
      }
      const time = Date.parse(timestamp);
      return !Number.isFinite(time) || time >= cutoff;
    });

  fs.writeFileSync(logPath, retainedLines.length ? `${retainedLines.join("\n")}\n` : "");
}

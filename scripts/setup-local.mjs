import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
if (!existsSync(".dev.vars")) {
  writeFileSync(
    ".dev.vars",
    `BETTER_AUTH_SECRET=${randomBytes(48).toString("base64url")}\n`,
    { mode: 0o600 },
  );
  console.log("Configuração local criada; segredo não exibido.");
} else console.log("Configuração local existente preservada.");

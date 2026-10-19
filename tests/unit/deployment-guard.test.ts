import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("checkpoint deployment isolation", () => {
  it.each(["WORKERS_CI", "WORKERS_CI_BUILD_UUID", "CF_PAGES"])(
    "refuses automated publishing via %s",
    (key) => {
      const result = spawnSync(
        process.execPath,
        ["scripts/assert-deployment-disabled.mjs"],
        { env: { ...process.env, [key]: "1" } },
      );
      expect(result.status).toBe(1);
      expect(result.stderr.toString()).toContain("Deployment disabled");
    },
  );
});

import { spawnSync } from "node:child_process";
import { loadEnv } from "@medusajs/framework/utils";

const testType = process.argv[2] ?? "unit";
const extraArgs = process.argv.slice(3);
const existingNodeOptions = process.env.NODE_OPTIONS ?? "";

loadEnv("test", process.cwd());

process.env.TEST_TYPE = testType;
process.env.NODE_OPTIONS = [
  existingNodeOptions,
  "--experimental-vm-modules",
]
  .filter(Boolean)
  .join(" ");

if (
  testType.startsWith("integration") &&
  (!process.env.DATABASE_URL ||
    !process.env.DB_USERNAME ||
    typeof process.env.DB_PASSWORD !== "string")
) {
  console.error(
    [
      "Missing PostgreSQL test settings for integration tests.",
      "Create apps/backend/.env.test from apps/backend/.env.test.template and point it to a local PostgreSQL server.",
      "Example: DATABASE_URL=postgres://medusa:medusa@localhost:5432/medusa_b2b_starter_test",
      "Required: DATABASE_URL, DB_HOST, DB_USERNAME, DB_PASSWORD, DB_PORT.",
    ].join("\n")
  );
  process.exit(1);
}

const result = spawnSync(
  "jest",
  [
    "--silent=false",
    "--runInBand",
    "--forceExit",
    ...extraArgs,
  ],
  {
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  }
);

process.exit(result.status ?? 1);

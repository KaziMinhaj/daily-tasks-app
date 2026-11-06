import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string | undefined {
  // 1. If an external cloud database (PostgreSQL, MySQL, Supabase, Neon, Turso) is set, use it:
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:")) {
    return process.env.DATABASE_URL;
  }

  // 2. On Vercel / AWS Lambda serverless execution:
  // The root filesystem is strictly read-only, which causes SQLite lock/journal operations to fail with EROFS.
  // /tmp is the only writable directory in serverless environments.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = path.join("/tmp", "dev.db");
    const sourceDbPath = path.join(process.cwd(), "prisma", "dev.db");

    if (!fs.existsSync(tmpDbPath)) {
      if (fs.existsSync(sourceDbPath)) {
        try {
          fs.copyFileSync(sourceDbPath, tmpDbPath);
          console.log(`[Prisma] Successfully initialized database at ${tmpDbPath}`);
        } catch (err) {
          console.error(`[Prisma] Failed to copy SQLite database to /tmp:`, err);
        }
      }
    }
    return `file:${tmpDbPath}`;
  }

  // 3. Fallback for local development
  return process.env.DATABASE_URL || "file:./dev.db";
}

const dbUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl
      ? {
          db: {
            url: dbUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

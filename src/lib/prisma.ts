import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function withPoolParams(url: string | undefined) {
  if (!url) return url;
  if (/[?&]connection_limit=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=8&pool_timeout=20`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: withPoolParams(process.env.DATABASE_URL),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

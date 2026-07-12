import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { createApp } from "./app.js";

const app = createApp();

async function seedIfEmpty() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log("[init] Database is empty, seeding default data...");
      const { execSync } = await import("child_process");
      execSync("npx prisma db seed", { stdio: "inherit", cwd: "/app" });
      console.log("[init] Seed completed.");
    } else {
      console.log(`[init] Database has ${userCount} users, skipping seed.`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[init] Seed check failed:", msg);
  }
}

seedIfEmpty().then(() => {
  const server = app.listen(env.PORT, () => {
    console.log(`服装租赁后端服务已启动：http://localhost:${env.PORT}`);
  });

  async function shutdown() {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});

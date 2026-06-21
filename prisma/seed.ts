// Seeds the database with sample URLs so you have something to demo/test with
// immediately, instead of an empty table. Run with: npm run seed

import { PrismaClient } from "@prisma/client";
import { encodeBase62 } from "../lib/shortcode";

const db = new PrismaClient();

const sampleUrls = [
  "https://www.anthropic.com",
  "https://nextjs.org/docs",
  "https://www.postgresql.org",
  "https://redis.io",
  "https://kafka.apache.org",
];

async function main() {
  console.log("Seeding database...");

  for (const longUrl of sampleUrls) {
    const created = await db.url.create({ data: { longUrl, shortCode: crypto.randomUUID() } });
    const shortCode = encodeBase62(created.id);
    await db.url.update({ where: { id: created.id }, data: { shortCode } });
    console.log(`  ${longUrl} -> /${shortCode}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

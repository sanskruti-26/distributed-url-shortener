// Standalone consumer: reads click events off Kafka, batches them, writes to
// ClickHouse. This runs as its own long-lived process — NOT inside a Next.js
// API route, because API routes are request-scoped and can't hold an open
// Kafka consumer connection.
//
// Run it with: npx tsx scripts/consumer.ts
// (or containerize it separately and run alongside the app in production)

import { Kafka } from "kafkajs";
import { createClient } from "@clickhouse/client";

const kafka = new Kafka({
  clientId: "click-consumer",
  brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"],
});

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
});

const consumer = kafka.consumer({ groupId: "click-events-group" });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: "click-events", fromBeginning: true });

  console.log("Consumer started, listening for click events...");

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const event = JSON.parse(message.value.toString());

      await clickhouse.insert({
        table: "click_events",
        values: [
          {
            short_code: event.shortCode,
            timestamp: event.timestamp.replace("T", " ").replace("Z", ""),
            referrer: event.referrer ?? "",
          },
        ],
        format: "JSONEachRow",
      });

      console.log("Inserted click event:", event.shortCode);
    },
  });
}

run().catch((err) => {
  console.error("Consumer crashed:", err);
  process.exit(1);
});

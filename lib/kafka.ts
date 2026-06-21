import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "url-shortener",
  brokers: [process.env.KAFKA_BROKER ?? "localhost:9092"],
});

const producer = kafka.producer();
let connected = false;

async function ensureConnected() {
  if (!connected) {
    await producer.connect();
    connected = true;
  }
}

// Publishes a click event instead of writing analytics straight into Postgres.
// Why: the transactional DB (Postgres) should only hold data needed to serve
// requests (redirects). Analytics is a separate, append-only, high-volume
// workload — better suited to a stream (Kafka) feeding an analytics-optimized
// store (ClickHouse) than to cluttering/locking your OLTP tables.
export async function publishClickEvent(event: {
  shortCode: string;
  timestamp: string;
  referrer?: string;
}) {
  try {
    await ensureConnected();
    await producer.send({
      topic: "click-events",
      messages: [{ value: JSON.stringify(event) }],
    });
  } catch (err) {
    // Never let analytics failures break the actual redirect
    console.error("Failed to publish click event:", err);
  }
}

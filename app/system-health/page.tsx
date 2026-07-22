"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Ping = {
  id: number;
  servedBy: string;
  timestamp: string;
};

const POLL_INTERVAL_MS = 2000;
const MAX_VISIBLE_PINGS = 10;
const SINGLE_INSTANCE_THRESHOLD = 5;

// Dataviz skill's validated categorical slots 1-3 (blue, green, magenta) —
// pre-validated for CVD-safety in this fixed order. Color is always paired
// with the instance label below, never the sole identity signal.
const PALETTE = ["#2a78d6", "#008300", "#e87ba4"];
const FALLBACK_COLOR = "#898781";

function colorFor(servedBy: string, order: string[]): string {
  const idx = order.indexOf(servedBy);
  if (idx === -1 || idx >= PALETTE.length) return FALLBACK_COLOR;
  return PALETTE[idx];
}

export default function SystemHealthPage() {
  const [pings, setPings] = useState<Ping[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [colorOrder, setColorOrder] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(0);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/ping", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { servedBy: string; timestamp: string };

      nextId.current += 1;
      const ping: Ping = { id: nextId.current, servedBy: data.servedBy, timestamp: data.timestamp };

      setPings((prev) => [ping, ...prev].slice(0, MAX_VISIBLE_PINGS));
      setCounts((prev) => ({ ...prev, [data.servedBy]: (prev[data.servedBy] ?? 0) + 1 }));
      setColorOrder((prev) => (prev.includes(data.servedBy) ? prev : [...prev, data.servedBy]));
      setError(null);
    } catch {
      setError("Couldn't reach /api/ping");
    }
  }, []);

  useEffect(() => {
    if (paused) return;
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [paused, poll]);

  const distinctInstances = Object.keys(counts).length;
  const totalPings = Object.values(counts).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...Object.values(counts));

  let statusMessage: string;
  let statusColor: string;
  if (totalPings < SINGLE_INSTANCE_THRESHOLD) {
    statusMessage = "Collecting data…";
    statusColor = "#898781";
  } else if (distinctInstances >= 2) {
    statusMessage = `Confirmed: load-balanced across ${distinctInstances} containers`;
    statusColor = "#008300";
  } else {
    statusMessage = "Running as a single instance — expected on Vercel or plain local dev, not a failure";
    statusColor = "#2a78d6";
  }

  return (
    <main style={{ maxWidth: 640, margin: "60px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>System health</h1>

      <div
        style={{
          background: "#f9f9f7",
          border: "1px solid #e1e0d9",
          borderRadius: 8,
          padding: "12px 16px",
          fontSize: 13,
          color: "#52514e",
          marginBottom: 16,
        }}
      >
        This page pings <code>/api/ping</code> every 2s. Locally,{" "}
        <code>docker-compose.layer4.yml</code> runs 3 identical app
        containers behind Nginx round-robin — watch the server tag rotate
        below. On Vercel's serverless deployment there's no fixed container
        to rotate across, so a single consistent instance is expected, not a
        failure.
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: statusColor }}>
          {statusMessage}
        </span>
        <button
          onClick={() => setPaused((p) => !p)}
          style={{
            padding: "6px 14px",
            background: paused ? "#111" : "#fff",
            color: paused ? "#fff" : "#111",
            border: "1px solid #111",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      {error && (
        <p style={{ color: "crimson", fontSize: 13, marginBottom: 16 }}>{error}</p>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 14, color: "#52514e", marginBottom: 8 }}>
          Live pings (last {MAX_VISIBLE_PINGS})
        </h2>
        {pings.length === 0 ? (
          <p style={{ fontSize: 13, color: "#898781" }}>Waiting for first ping…</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {pings.map((ping) => (
              <li
                key={ping.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom: "1px solid #e1e0d9",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: colorFor(ping.servedBy, colorOrder),
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: "monospace", color: "#0b0b0b" }}>
                  {ping.servedBy}
                </span>
                <span style={{ color: "#898781", marginLeft: "auto" }}>
                  {new Date(ping.timestamp).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 14, color: "#52514e", marginBottom: 8 }}>
          Requests served (running total)
        </h2>
        {colorOrder.length === 0 ? (
          <p style={{ fontSize: 13, color: "#898781" }}>No data yet.</p>
        ) : (
          colorOrder.map((instance) => {
            const count = counts[instance] ?? 0;
            const pct = (count / maxCount) * 100;
            return (
              <div
                key={instance}
                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
              >
                <span
                  style={{
                    width: 120,
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#52514e",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {instance}
                </span>
                <div
                  style={{
                    flex: 1,
                    background: "#e1e0d9",
                    borderRadius: 4,
                    height: 16,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      background: colorFor(instance, colorOrder),
                      height: "100%",
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span style={{ width: 32, textAlign: "right", fontSize: 12, color: "#52514e" }}>
                  {count}
                </span>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}

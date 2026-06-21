import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@clickhouse/client";

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
});

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const result = await clickhouse.query({
      query: `
        SELECT
          toStartOfHour(timestamp) AS hour,
          count() AS clicks
        FROM click_events
        WHERE short_code = {code:String}
        GROUP BY hour
        ORDER BY hour DESC
        LIMIT 24
      `,
      query_params: { code: params.code },
      format: "JSONEachRow",
    });

    const rows = await result.json();
    return NextResponse.json({ shortCode: params.code, hourly: rows });
  } catch (err) {
    console.error("ClickHouse query failed:", err);
    return NextResponse.json(
      { error: "Analytics temporarily unavailable" },
      { status: 503 }
    );
  }
}

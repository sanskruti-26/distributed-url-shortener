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
          count() AS total_clicks,
          min(timestamp) AS first_click,
          max(timestamp) AS last_click
        FROM click_events
        WHERE short_code = {code:String}
      `,
      query_params: { code: params.code },
      format: "JSONEachRow",
    });

    const rows = await result.json<{
      total_clicks: string;
      first_click: string;
      last_click: string;
    }>();

    // ClickHouse count() returns "0" when no rows match — treat that as 404
    if (!rows.length || rows[0].total_clicks === "0") {
      return NextResponse.json({ error: "No clicks found" }, { status: 404 });
    }

    const { total_clicks, first_click, last_click } = rows[0];
    return NextResponse.json({
      short_code: params.code,
      total_clicks: Number(total_clicks),
      first_click,
      last_click,
    });
  } catch (err) {
    console.error("ClickHouse query failed:", err);
    return NextResponse.json(
      { error: "Analytics temporarily unavailable" },
      { status: 503 }
    );
  }
}

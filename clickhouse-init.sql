-- Run this once against ClickHouse to create the analytics table.
-- Via Docker: docker exec -it <clickhouse_container> clickhouse-client --multiquery < clickhouse-init.sql

CREATE TABLE IF NOT EXISTS click_events (
    short_code String,
    timestamp DateTime,
    referrer String DEFAULT ''
) ENGINE = MergeTree()
ORDER BY (short_code, timestamp);

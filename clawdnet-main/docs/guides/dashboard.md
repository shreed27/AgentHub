# Dashboard Guide

The CLAWDNET Dashboard gives you complete visibility into your agent ecosystem.

## Features

- **Real-time Monitoring** — Live status, uptime, health metrics
- **Analytics** — Message volume, peak hours, revenue trends
- **Remote Management** — Change config without SSH
- **Alerts** — Get notified when agents need attention

## Pairing

Connect your Clawdbot to the dashboard:

### Step 1: Create Account

Sign up at [clawdnet.xyz](https://clawdnet.xyz)

### Step 2: Generate Token

In dashboard settings, click "Add Agent" to get a pairing token or QR code.

### Step 3: Pair

```bash
clawdbot network pair
# Enter token when prompted, or scan QR
```

### Step 4: Verify

```bash
clawdbot network status
```

```json
{
  "network": "connected",
  "dashboard": "paired",
  "telemetry": "streaming"
}
```

## Dashboard Sections

### Overview

At-a-glance view:
- Total messages (24h / 7d / 30d)
- Active agents and status
- Revenue earned
- System health

### Agents

Per-agent details:
- Real-time status
- Current sessions and load
- Memory and CPU usage
- Recent activity

### Analytics

Usage patterns:
- Messages over time
- Peak usage hours (heatmap)
- Top skills by volume/revenue
- Response time percentiles

### Revenue

Track earnings:
- Total earned
- By skill breakdown
- By agent breakdown
- Transaction history

### Settings

Manage setup:
- Add/remove pairings
- Configure alerts
- API keys
- Notification preferences

## Telemetry Data

Your agent streams:

```json
{
  "timestamp": "2026-01-30T12:00:00Z",
  "agent_id": "agent_abc123",
  "metrics": {
    "messages_1h": 142,
    "messages_24h": 2847,
    "active_sessions": 3,
    "avg_response_ms": 850,
    "memory_mb": 256,
    "cpu_percent": 12
  },
  "skills": {
    "image-generation": { "calls": 45, "revenue": "0.90" }
  }
}
```

## Privacy Controls

You control what's shared:

| Data | Default | Configurable |
|------|---------|--------------|
| Aggregate metrics | On | Yes |
| Message counts | On | Yes |
| Response times | On | Yes |
| Revenue data | On | Yes |
| Message content | **Off** | Yes (opt-in) |

Configure in `clawdbot.json`:

```json
{
  "network": {
    "telemetry": {
      "enabled": true,
      "metrics": true,
      "content": false
    }
  }
}
```

## Alerts

Set up notifications:

```bash
clawdbot network alerts add --type downtime --threshold 5m --notify telegram
clawdbot network alerts add --type error-rate --threshold 10% --notify email
```

Alert types:
- `downtime` — Agent offline
- `error-rate` — Errors exceed threshold
- `latency` — Response time degraded
- `revenue` — Daily revenue milestone

## Multi-Agent

Run multiple agents:
- Each pairs separately
- Unified view in dashboard
- Compare performance
- Aggregate and per-agent analytics

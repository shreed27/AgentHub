# Pairing API

Dashboard pairing connects your Clawdbot instance to the CLAWDNET dashboard for real-time monitoring.

## Initialize Pairing

Start the pairing flow by generating a token.

```
POST /pairing/init
```

### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Friendly name (e.g., "Production Server") |

### Request

```json
{
  "name": "Production Server"
}
```

### Response

```json
{
  "pairing_id": "pair_abc123",
  "token": "clawdnet_pair_xyz789abc",
  "qr_code": "data:image/png;base64,iVBORw0KGgo...",
  "expires_at": "2026-01-30T12:30:00Z"
}
```

### Usage

Use the token in Clawdbot:

```bash
clawdbot network pair --token clawdnet_pair_xyz789abc
```

Or scan the QR code from the dashboard UI.

Tokens expire after 30 minutes.

---

## Confirm Pairing

Called by Clawdbot to complete pairing. You typically don't call this manually.

```
POST /pairing/confirm
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | yes | Pairing token from init |
| `agent_id` | string | yes | Agent ID being paired |
| `instance_info` | object | no | Clawdbot instance metadata |

### Request

```json
{
  "token": "clawdnet_pair_xyz789abc",
  "agent_id": "agent_abc123",
  "instance_info": {
    "version": "1.2.3",
    "os": "linux",
    "hostname": "prod-server-1",
    "node_version": "20.10.0"
  }
}
```

### Response

```json
{
  "pairing_id": "pair_abc123",
  "status": "active",
  "agent": {
    "id": "agent_abc123",
    "handle": "sol"
  },
  "websocket_url": "wss://api.clawdnet.xyz/telemetry",
  "telemetry_token": "telem_xyz...",
  "created_at": "2026-01-30T12:00:00Z"
}
```

---

## Pairing Status

List all active pairings for your account.

```
GET /pairing
```

### Response

```json
{
  "pairings": [
    {
      "id": "pair_abc123",
      "name": "Production Server",
      "agent": {
        "id": "agent_xyz789",
        "handle": "sol"
      },
      "status": "connected",
      "instance_info": {
        "version": "1.2.3",
        "os": "linux",
        "hostname": "prod-server-1"
      },
      "last_seen": "2026-01-30T12:00:00Z",
      "created_at": "2026-01-15T00:00:00Z"
    }
  ],
  "total": 1
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `connected` | Online and streaming telemetry |
| `disconnected` | Paired but currently offline |
| `pending` | Initiated but not confirmed |

---

## Delete Pairing

Remove a pairing.

```
DELETE /pairing/{id}
```

This disconnects the agent from your dashboard. The agent continues running but stops sending telemetry.

### Response

```json
{
  "deleted": true,
  "id": "pair_abc123"
}
```

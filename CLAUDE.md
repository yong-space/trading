# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A portfolio dashboard for Interactive Brokers (IBKR) accounts. The backend proxies the IBKR Client Portal Gateway API and serves a single-page frontend that displays live or end-of-day positions with P&L.

## Running locally

```bash
# Activate virtualenv
source env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server (requires IBKR Client Portal Gateway running on localhost:5000)
uvicorn main:app --reload
```

The app serves on port 8000. The IBKR Client Portal Gateway must be running locally on port 5000 (default ibind host). No `.env` file — configuration is minimal.

## Architecture

**`main.py`** — FastAPI app. Thin layer: each route calls one method on the `Ibkr` class and wraps exceptions in HTTP 500s.

**`ibkr.py`** — All IBKR logic. Uses `ibind.IbkrClient` (wraps the IBKR Client Portal REST API). Key methods:
- `get_positions()` — fetches positions then enriches with live market data snapshot (fields 31, 78, 80). Retries up to 3× if data looks bad (all `dailyPnl` zero, or any ticker missing).
- `get_eod_positions()` — same but uses field 7741 (close price) instead of 78 (dailyPnl), then computes daily P&L as `(lastPrice - closePrice) * shares`.
- `get_summary()` — holdings, cash, USD→SGD FX rate.
- `get_trades()`, `get_transaction_history()`, `get_performance()` — pass-through to ibind.

IBKR market data field IDs used: `31`=lastPrice, `78`=dailyPnl, `80`=unrealizedPnlPercent, `7741`=closePrice (EOD, field 7296 also referenced in git history).

**`static/`** — Frontend. Preact + htm, no build step — runs directly in the browser via ESM imports from CDN. `main.js` is a single-file Preact app. The "Live" / "End of Day" toggle switches between `/positions` and `/positions/eod` endpoints.

## Deployment

Push to `main` → GitHub Actions builds a Docker image, pushes to a private registry, then does a `kubectl set image` rolling update on an on-prem Kubernetes cluster. Tags are auto-generated (semver) by `mathieudutour/github-tag-action`.

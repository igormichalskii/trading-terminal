# Trading Terminal

> **TL;DR** — A self-built Terminal for retail investors. React + FastAPI app with real candlestick charts (Alpaca data), multi-timeframe support (1D–ALL), OHLCV hover stats, and a dark terminal UI. Early Phase 1 — indicators and AI assistant coming next.

An all-in-one trading terminal for retail investors — think Bloomberg Terminal, but accessible and AI-native. Built solo as a learning project with the goal of covering stocks, ETFs, crypto, forex, options, and commodities with technical indicators, an AI trading assistant, and portfolio optimization.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Phase](https://img.shields.io/badge/phase-1%20of%203-blue)

---

## What's built so far

### Sprint 1 — Scaffold
- React + TypeScript frontend (Vite + Tailwind v4)
- FastAPI backend with uvicorn
- CORS configured for local development
- `/health` endpoint
- Project structure established

### Sprint 2 — Charts & Data
- **Candlestick chart** powered by TradingView Lightweight Charts
- **Symbol search** — type any US stock ticker and hit Enter or Load
- **Timeframe selector** — 1D · 1W · 1M · 3M · 6M · 1Y · 5Y · ALL with infinite scroll / paginated data loading
- **Price stats panel** — Open, High, Low, Close, Volume for the latest bar
- **Alpaca Market Data API** as the data provider (free tier, real historical bars)

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| Charts | TradingView Lightweight Charts v5 |
| Backend | FastAPI, Python 3.12, uvicorn |
| HTTP client | httpx (async) |
| Market data | Alpaca Market Data API (free tier) |
| Auth / DB | Supabase (set up, not yet integrated) |

---

## Running locally

You need two terminals.

**Backend**
```powershell
cd backend
.venv\Scripts\activate
uvicorn main:app --reload
```
Runs at `http://localhost:8000`. API docs at `/docs`.

**Frontend**
```powershell
cd frontend
npm run dev
```
Runs at `http://localhost:5173`.

**Environment variables**

`backend/.env`:
```
ALPACA_KEY_ID=...
ALPACA_SECRET_KEY=...
SUPABASE_URL=...
SUPABASE_KEY=...
```

`frontend/.env`:
```
VITE_API_URL=http://localhost:8000
```

Get a free Alpaca API key at [alpaca.markets](https://alpaca.markets) — no brokerage account needed, just sign up and generate paper trading keys.

---

## Roadmap

### Phase 1 — Foundation
- [x] Sprint 1: Scaffold, backend/frontend wired up, first API connection
- [x] Sprint 2: Candlestick chart, symbol search, timeframes, stats panel, Alpaca integration
- [ ] Sprint 3: Technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, VWAP, Stochastic, ATR, OBV, Ichimoku) + overlay UI
- [ ] Sprint 4: Watchlist with persistence, price alerts, error states, deploy

### Phase 2 — Intelligence
- [ ] AI trading assistant (Claude API with market context injection)
- [ ] News feed + sentiment analysis
- [ ] Earnings calendar

### Phase 3 — Advanced
- [ ] ML price prediction engine
- [ ] Portfolio optimization (Modern Portfolio Theory)
- [ ] Multi-asset support: crypto, forex, options, commodities
- [ ] Mobile responsive layout
- [ ] Monetization

---

## Constraints & notes

- Alpaca free tier covers **US stocks only** via the IEX feed. Crypto and forex come in Phase 3.
- No real-money trade execution — this is a research and analysis tool only.
- Price predictions (Phase 3) will always be framed as probabilistic signals, not guarantees.
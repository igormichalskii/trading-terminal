import os
from datetime import datetime, timedelta, timezone
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Trading Terminal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALPACA_KEY_ID = os.getenv("ALPACA_KEY_ID")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
ALPACA_BASE = "https://data.alpaca.markets/v2"

# alpaca_tf: bar timeframe, days_back: how far back to fetch
TIMEFRAME_CONFIG = {
    "1D":  {"alpaca_tf": "1Hour",  "days_back": 3},
    "1W":  {"alpaca_tf": "1Hour",  "days_back": 7},
    "1M":  {"alpaca_tf": "1Day",   "days_back": 30},
    "3M":  {"alpaca_tf": "1Day",   "days_back": 90},
    "1Y":  {"alpaca_tf": "1Week",  "days_back": 365},
    "ALL": {"alpaca_tf": "1Month", "days_back": 9000},
}

DAILY_TFS = {"1Day", "1Week", "1Month"}


def to_unix(iso: str) -> int:
    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp())


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ohlcv/{symbol}")
async def get_ohlcv(symbol: str, timeframe: str = "1M"):
    if timeframe not in TIMEFRAME_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid timeframe")

    cfg = TIMEFRAME_CONFIG[timeframe]
    start = datetime.now(timezone.utc) - timedelta(days=cfg["days_back"])

    params = {
        "timeframe": cfg["alpaca_tf"],
        "start": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "limit": 1000,
        "feed": "iex",
        "sort": "asc",
    }
    headers = {
        "APCA-API-KEY-ID": ALPACA_KEY_ID,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    }

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{ALPACA_BASE}/stocks/{symbol.upper()}/bars",
            params=params,
            headers=headers,
        )

    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="Symbol not found")
    if r.status_code == 403:
        raise HTTPException(status_code=403, detail="Invalid API credentials")
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Upstream error: {r.status_code}")

    bars = r.json().get("bars") or []
    if not bars:
        raise HTTPException(status_code=404, detail="No data returned for symbol")

    # Daily/weekly/monthly: "YYYY-MM-DD" string; intraday: Unix seconds (int) required by Lightweight Charts
    def bar_time(t: str):
        return t[:10] if cfg["alpaca_tf"] in DAILY_TFS else to_unix(t)

    candles = [
        {
            "time": bar_time(b["t"]),
            "open": b["o"],
            "high": b["h"],
            "low": b["l"],
            "close": b["c"],
            "volume": b["v"],
        }
        for b in bars
    ]

    return {"symbol": symbol.upper(), "timeframe": timeframe, "candles": candles}
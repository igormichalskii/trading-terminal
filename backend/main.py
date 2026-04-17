import os
from datetime import datetime, timedelta, timezone
import numpy as np
import pandas as pd
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Trading Terminal API")

ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALPACA_KEY_ID = os.getenv("ALPACA_KEY_ID")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
ALPACA_BASE = "https://data.alpaca.markets/v2"

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


def bar_time(t: str, alpaca_tf: str):
    return t[:10] if alpaca_tf in DAILY_TFS else to_unix(t)


async def _fetch_bars(symbol: str, timeframe: str) -> tuple[list[dict], str]:
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

    raw = r.json().get("bars") or []
    if not raw:
        raise HTTPException(status_code=404, detail="No data returned for symbol")

    alpaca_tf = cfg["alpaca_tf"]
    candles = [
        {
            "time": bar_time(b["t"], alpaca_tf),
            "open": b["o"],
            "high": b["h"],
            "low": b["l"],
            "close": b["c"],
            "volume": b["v"],
        }
        for b in raw
    ]
    return candles, alpaca_tf


def _points(times, series: pd.Series) -> list[dict]:
    """Convert a pandas Series + time list into [{time, value}], dropping NaNs."""
    result = []
    for t, v in zip(times, series):
        if v is not None and not (isinstance(v, float) and np.isnan(v)):
            result.append({"time": t, "value": round(float(v), 4)})
    return result


def compute_indicators(candles: list[dict], requested: set[str]) -> dict:
    df = pd.DataFrame(candles)
    times = df["time"].tolist()
    close = df["close"]
    high = df["high"]
    low = df["low"]
    volume = df["volume"]
    result = {}

    if "sma" in requested:
        result["sma"] = _points(times, close.rolling(20).mean())

    if "ema" in requested:
        result["ema"] = _points(times, close.ewm(span=20, adjust=False).mean())

    if "bb" in requested:
        mid = close.rolling(20).mean()
        std = close.rolling(20).std()
        result["bb"] = {
            "upper": _points(times, mid + 2 * std),
            "middle": _points(times, mid),
            "lower": _points(times, mid - 2 * std),
        }

    if "vwap" in requested:
        typical = (high + low + close) / 3
        result["vwap"] = _points(times, (typical * volume).cumsum() / volume.cumsum())

    if "rsi" in requested:
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss
        result["rsi"] = _points(times, 100 - (100 / (1 + rs)))

    if "macd" in requested:
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal
        result["macd"] = {
            "macd": _points(times, macd_line),
            "signal": _points(times, signal),
            "histogram": _points(times, histogram),
        }

    if "stoch" in requested:
        lowest = low.rolling(14).min()
        highest = high.rolling(14).max()
        k = 100 * (close - lowest) / (highest - lowest)
        result["stoch"] = {
            "k": _points(times, k),
            "d": _points(times, k.rolling(3).mean()),
        }

    if "atr" in requested:
        prev_close = close.shift(1)
        tr = pd.concat([
            high - low,
            (high - prev_close).abs(),
            (low - prev_close).abs(),
        ], axis=1).max(axis=1)
        result["atr"] = _points(times, tr.rolling(14).mean())

    if "obv" in requested:
        direction = np.sign(close.diff()).fillna(0)
        result["obv"] = _points(times, (direction * volume).cumsum())

    if "ichimoku" in requested:
        tenkan = (high.rolling(9).max() + low.rolling(9).min()) / 2
        kijun = (high.rolling(26).max() + low.rolling(26).min()) / 2
        result["ichimoku"] = {
            "tenkan": _points(times, tenkan),
            "kijun": _points(times, kijun),
            "senkou_a": _points(times, ((tenkan + kijun) / 2).shift(26)),
            "senkou_b": _points(times, (high.rolling(52).max() + low.rolling(52).min()) / 2),
            "chikou": _points(times, close.shift(-26)),
        }

    return result


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ohlcv/{symbol}")
async def get_ohlcv(symbol: str, timeframe: str = "1M"):
    if timeframe not in TIMEFRAME_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid timeframe")
    candles, _ = await _fetch_bars(symbol, timeframe)
    return {"symbol": symbol.upper(), "timeframe": timeframe, "candles": candles}


@app.get("/indicators/{symbol}")
async def get_indicators(symbol: str, timeframe: str = "1M", indicators: str = "sma"):
    if timeframe not in TIMEFRAME_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid timeframe")
    requested = {i.strip().lower() for i in indicators.split(",")}
    candles, _ = await _fetch_bars(symbol, timeframe)
    return {
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "indicators": compute_indicators(candles, requested),
    }

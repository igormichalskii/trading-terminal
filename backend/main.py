import os
import json
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any
import numpy as np
import pandas as pd
import scipy.optimize as sco
from sklearn.ensemble import RandomForestClassifier
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from anthropic import AsyncAnthropic
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
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

anthropic_client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
FINNHUB_KEY = os.getenv("FINNHUB_KEY")
_sia = SentimentIntensityAnalyzer()

ALPACA_KEY_ID = os.getenv("ALPACA_KEY_ID")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
ALPACA_BASE = "https://data.alpaca.markets/v2"

FREE_CANDLE_LIMIT = 250

# page_size: bars per page; window_days: calendar days to cover ~page_size bars
TIMEFRAME_CONFIG = {
    "1D":  {"alpaca_tf": "1Hour",  "page_size": 168, "window_days": 60},
    "1W":  {"alpaca_tf": "1Hour",  "page_size": 504, "window_days": 180},
    "1M":  {"alpaca_tf": "1Day",   "page_size": 180, "window_days": 300},
    "3M":  {"alpaca_tf": "1Day",   "page_size": 180, "window_days": 300},
    "1Y":  {"alpaca_tf": "1Week",  "page_size": 104, "window_days": 800},
    "ALL": {"alpaca_tf": "1Month", "page_size": 120, "window_days": 4000},
}

DAILY_TFS = {"1Day", "1Week", "1Month"}


def to_unix(iso: str) -> int:
    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp())


def bar_time(t: str, alpaca_tf: str):
    return t[:10] if alpaca_tf in DAILY_TFS else to_unix(t)


async def _fetch_bars(
    symbol: str,
    timeframe: str,
    before: str | None = None,
    page_size: int | None = None,
) -> tuple[list[dict], str]:
    cfg = TIMEFRAME_CONFIG[timeframe]
    size = page_size or cfg["page_size"]

    if before:
        end_dt = datetime.fromisoformat(before.replace("Z", "+00:00")) - timedelta(seconds=1)
    else:
        end_dt = datetime.now(timezone.utc)

    start_dt = end_dt - timedelta(days=cfg["window_days"])

    params = {
        "timeframe": cfg["alpaca_tf"],
        "start": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "limit": size,
        "feed": "iex",
        "sort": "asc",
    }

    headers = {
        "APCA-API-KEY-ID": ALPACA_KEY_ID,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"{ALPACA_BASE}/stocks/{symbol.upper()}/bars",
                params=params,
                headers=headers,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Alpaca API timed out")

    if r.status_code in (401, 403):
        raise HTTPException(status_code=403, detail=f"Alpaca auth error: {r.text}")
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="Symbol not found")
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Alpaca error {r.status_code}: {r.text}")

    raw = r.json().get("bars") or []
    if not raw:
        # When paginating backward, empty = reached beginning of history (not an error)
        if before is not None:
            return [], cfg["alpaca_tf"]
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
        if b.get("o") is not None and b.get("h") is not None
        and b.get("l") is not None and b.get("c") is not None
    ]
    # Already ascending (sort=asc); trim to page_size most-recent bars
    return candles[-size:], alpaca_tf


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
async def get_ohlcv(symbol: str, timeframe: str = "1M", before: str = None, limit: int = 0):
    if timeframe not in TIMEFRAME_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid timeframe")

    if limit > 0:
        # Unauthenticated / capped — ignore before, return the latest N candles only
        candles, _ = await _fetch_bars(symbol, timeframe, page_size=limit)
        return {"symbol": symbol.upper(), "timeframe": timeframe, "candles": candles, "has_more": False}

    page_size = TIMEFRAME_CONFIG[timeframe]["page_size"]
    candles, _ = await _fetch_bars(symbol, timeframe, before=before)
    return {
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "candles": candles,
        "has_more": len(candles) >= page_size,
    }


@app.get("/indicators/{symbol}")
async def get_indicators(symbol: str, timeframe: str = "1M", indicators: str = "sma", limit: int = 0):
    if timeframe not in TIMEFRAME_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid timeframe")
    requested = {i.strip().lower() for i in indicators.split(",")}
    page_size = limit if limit > 0 else None
    candles, _ = await _fetch_bars(symbol, timeframe, page_size=page_size)
    return {
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "indicators": compute_indicators(candles, requested),
    }


# ── News & Sentiment ─────────────────────────────────────────────────────────

@app.get("/news/{symbol}")
async def get_news(symbol: str):
    today = datetime.now(timezone.utc).date()
    from_date = today - timedelta(days=7)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://finnhub.io/api/v1/company-news",
                params={
                    "symbol": symbol.upper(),
                    "from": from_date.isoformat(),
                    "to": today.isoformat(),
                    "token": FINNHUB_KEY,
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Finnhub API timed out")

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Finnhub error {r.status_code}")

    raw = r.json()
    if not isinstance(raw, list):
        raise HTTPException(status_code=502, detail="Unexpected Finnhub response")

    articles = []
    for a in raw[:25]:
        headline = a.get("headline", "")
        summary = a.get("summary", "")
        compound = _sia.polarity_scores(f"{headline}. {summary}")["compound"]
        if compound >= 0.05:
            sentiment = "positive"
        elif compound <= -0.05:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        articles.append({
            "headline": headline,
            "summary": summary,
            "source": a.get("source", ""),
            "url": a.get("url", ""),
            "datetime": a.get("datetime", 0),
            "sentiment": sentiment,
            "score": round(compound, 3),
        })

    return {"symbol": symbol.upper(), "articles": articles}


# ── Earnings Calendar ─────────────────────────────────────────────────────────

@app.get("/earnings")
async def get_earnings(symbols: str):
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        return {"earnings": []}

    today = datetime.now(timezone.utc).date()
    from_date = (today - timedelta(weeks=8)).isoformat()
    to_date = (today + timedelta(weeks=8)).isoformat()

    async def fetch_one(sym: str) -> list:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(
                    "https://finnhub.io/api/v1/calendar/earnings",
                    params={"symbol": sym, "from": from_date, "to": to_date, "token": FINNHUB_KEY},
                )
            if r.status_code == 200:
                return r.json().get("earningsCalendar") or []
        except Exception:
            pass
        return []

    results = await asyncio.gather(*[fetch_one(s) for s in symbol_list])

    earnings = []
    for batch in results:
        for e in batch:
            earnings.append({
                "symbol":          e.get("symbol", ""),
                "date":            e.get("date", ""),
                "hour":            e.get("hour", ""),
                "epsEstimate":     e.get("epsEstimate"),
                "epsActual":       e.get("epsActual"),
                "revenueEstimate": e.get("revenueEstimate"),
                "revenueActual":   e.get("revenueActual"),
                "quarter":         e.get("quarter"),
                "year":            e.get("year"),
            })

    earnings.sort(key=lambda x: x["date"])
    return {"earnings": earnings}


# ── Portfolio Optimization ────────────────────────────────────────────────────

class PortfolioOptimizeRequest(BaseModel):
    symbols: list[str]
    period_days: int = 365
    risk_free_rate: float = 0.0


async def _fetch_daily_closes(symbol: str, period_days: int) -> pd.Series:
    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=period_days + 60)

    params = {
        "timeframe": "1Day",
        "start": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "limit": period_days,
        "feed": "iex",
        "sort": "asc",
    }
    headers = {
        "APCA-API-KEY-ID": ALPACA_KEY_ID,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f"{ALPACA_BASE}/stocks/{symbol.upper()}/bars",
                params=params,
                headers=headers,
            )
    except Exception:
        return pd.Series([], dtype=float, name=symbol.upper())

    if r.status_code != 200:
        return pd.Series([], dtype=float, name=symbol.upper())

    raw = r.json().get("bars") or []
    if not raw:
        return pd.Series([], dtype=float, name=symbol.upper())

    return pd.Series(
        {b["t"][:10]: b["c"] for b in raw},
        name=symbol.upper(),
        dtype=float,
    )


def _portfolio_stats(
    weights: np.ndarray, mean_ret: np.ndarray, cov: np.ndarray, rf: float
) -> tuple[float, float, float]:
    ret = float(np.dot(weights, mean_ret))
    vol = float(np.sqrt(np.dot(weights.T, np.dot(cov, weights))))
    sharpe = (ret - rf) / vol if vol > 1e-10 else 0.0
    return ret, vol, sharpe


@app.post("/portfolio/optimize")
async def optimize_portfolio(req: PortfolioOptimizeRequest):
    symbols = [s.strip().upper() for s in req.symbols if s.strip()]
    if len(symbols) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 symbols")
    if len(symbols) > 20:
        raise HTTPException(status_code=400, detail="Max 20 symbols")

    series_list = await asyncio.gather(*[_fetch_daily_closes(s, req.period_days) for s in symbols])

    price_df = pd.concat([s for s in series_list if len(s) >= 30], axis=1).dropna()

    if price_df.shape[1] < 2:
        raise HTTPException(status_code=422, detail="Insufficient price data — check symbols are valid")
    if price_df.shape[0] < 30:
        raise HTTPException(status_code=422, detail="Not enough overlapping trading days")

    valid_symbols = price_df.columns.tolist()
    n = len(valid_symbols)

    returns = np.log(price_df / price_df.shift(1)).dropna()
    mean_ret = returns.mean().values * 252
    cov = returns.cov().values * 252

    rf = req.risk_free_rate
    rng = np.random.default_rng(42)

    frontier = []
    for _ in range(2000):
        w = rng.random(n)
        w /= w.sum()
        ret, vol, sharpe = _portfolio_stats(w, mean_ret, cov, rf)
        frontier.append({"vol": round(vol, 4), "ret": round(ret, 4), "sharpe": round(sharpe, 4)})

    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    bounds = [(0.0, 1.0)] * n
    w0 = np.ones(n) / n

    res_sharpe = sco.minimize(
        lambda w: -_portfolio_stats(w, mean_ret, cov, rf)[2],
        w0, method="SLSQP", bounds=bounds, constraints=constraints,
    )
    res_vol = sco.minimize(
        lambda w: _portfolio_stats(w, mean_ret, cov, rf)[1],
        w0, method="SLSQP", bounds=bounds, constraints=constraints,
    )

    def _alloc(weights: np.ndarray) -> dict:
        ret, vol, sharpe = _portfolio_stats(weights, mean_ret, cov, rf)
        return {
            "weights": {sym: round(float(w), 4) for sym, w in zip(valid_symbols, weights)},
            "expected_return": round(ret, 4),
            "volatility": round(vol, 4),
            "sharpe": round(sharpe, 4),
        }

    return {
        "symbols": valid_symbols,
        "frontier": frontier,
        "max_sharpe": _alloc(res_sharpe.x),
        "min_vol": _alloc(res_vol.x),
        "equal_weight": _alloc(w0),
    }


# ── ML Prediction ─────────────────────────────────────────────────────────────

FEATURE_COLS = ["ret_1d", "ret_5d", "ret_10d", "ret_20d", "vol_10d", "vol_20d",
                "rsi", "macd_hist", "bb_pos", "vol_ratio"]

FEATURE_LABELS = {
    "ret_1d":    "1-day momentum",
    "ret_5d":    "5-day momentum",
    "ret_10d":   "10-day momentum",
    "ret_20d":   "20-day momentum",
    "vol_10d":   "Short-term volatility",
    "vol_20d":   "Medium-term volatility",
    "rsi":       "RSI (14)",
    "macd_hist": "MACD histogram",
    "bb_pos":    "Bollinger position",
    "vol_ratio": "Volume ratio",
}


async def _fetch_daily_bars(symbol: str, period_days: int = 730) -> list[dict]:
    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=period_days + 60)

    params = {
        "timeframe": "1Day",
        "start": start_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end": end_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "limit": period_days,
        "feed": "iex",
        "sort": "asc",
    }
    headers = {
        "APCA-API-KEY-ID": ALPACA_KEY_ID,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f"{ALPACA_BASE}/stocks/{symbol.upper()}/bars",
                params=params,
                headers=headers,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Alpaca API timed out")

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Alpaca error {r.status_code}")

    raw = r.json().get("bars") or []
    if not raw:
        raise HTTPException(status_code=404, detail="No data for symbol")

    return [
        {"time": b["t"][:10], "open": b["o"], "high": b["h"],
         "low": b["l"], "close": b["c"], "volume": b["v"]}
        for b in raw
    ]


def _engineer_features(candles: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(candles)

    r = df["close"].pct_change()
    df["ret_1d"]  = r
    df["ret_5d"]  = df["close"].pct_change(5)
    df["ret_10d"] = df["close"].pct_change(10)
    df["ret_20d"] = df["close"].pct_change(20)
    df["vol_10d"] = r.rolling(10).std()
    df["vol_20d"] = r.rolling(20).std()

    delta = df["close"].diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    df["rsi"] = 100 - (100 / (1 + gain / loss))

    ema12 = df["close"].ewm(span=12, adjust=False).mean()
    ema26 = df["close"].ewm(span=26, adjust=False).mean()
    macd  = ema12 - ema26
    df["macd_hist"] = macd - macd.ewm(span=9, adjust=False).mean()

    mid = df["close"].rolling(20).mean()
    std = df["close"].rolling(20).std()
    df["bb_pos"] = (df["close"] - mid) / (2 * std.replace(0, np.nan))

    df["vol_ratio"] = df["volume"] / df["volume"].rolling(20).mean()

    # Target: next bar closes higher
    df["target"] = (df["close"].shift(-1) > df["close"]).astype(int)

    return df.dropna(subset=FEATURE_COLS + ["target"]).reset_index(drop=True)


@app.get("/predict/{symbol}")
async def predict(symbol: str):
    candles = await _fetch_daily_bars(symbol, period_days=730)
    df = _engineer_features(candles)

    if len(df) < 60:
        raise HTTPException(status_code=422, detail="Insufficient history for prediction")

    # All rows except the last have a known target; use those to train
    train = df.iloc[:-1]
    latest = df.iloc[[-1]]

    X_train = train[FEATURE_COLS].values
    y_train = train["target"].values
    X_latest = latest[FEATURE_COLS].values

    model = RandomForestClassifier(
        n_estimators=200, max_depth=6, min_samples_leaf=5,
        random_state=42, n_jobs=-1,
    )
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_latest)[0]
    up_prob = float(proba[1])
    direction = "up" if up_prob >= 0.5 else "down"

    importances = sorted(
        [{"feature": k, "label": FEATURE_LABELS[k], "importance": round(float(v), 4)}
         for k, v in zip(FEATURE_COLS, model.feature_importances_)],
        key=lambda x: -x["importance"],
    )

    return {
        "symbol": symbol.upper(),
        "direction": direction,
        "up_probability": round(up_prob, 3),
        "confidence": round(max(up_prob, 1 - up_prob), 3),
        "trained_on": len(X_train),
        "feature_importances": importances,
        "signal_date": candles[-1]["time"],
    }


class NewsAnalysisRequest(BaseModel):
    symbol: str
    headline: str
    summary: str


@app.post("/news/analyze")
async def analyze_news(req: NewsAnalysisRequest):
    summary_line = f"\nSummary: {req.summary}" if req.summary.strip() else ""
    msg = await anthropic_client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=120,
        system=f"You are a concise financial analyst. Analyze news impact on {req.symbol} stock in 2-3 short sentences only.",
        messages=[{
            "role": "user",
            "content": (
                f"Headline: {req.headline}{summary_line}\n\n"
                f"Rate importance (High/Medium/Low), explain why briefly, "
                f"and state the expected price impact for {req.symbol}."
            ),
        }],
    )
    return {"analysis": msg.content[0].text}


# ── AI Assistant ──────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert trading advisor embedded in a professional trading terminal. \
You have access to real-time market data for whatever the user is currently analyzing.

Your role:
- Interpret price action, chart patterns, and technical indicators
- Help plan trading strategies and optimize portfolio decisions
- Explain what indicators signal and how to act on them
- Analyze news and its potential market impact
- Keep answers concise and actionable — this is a terminal, not a blog

Current market context is injected at the start of each user message. \
Always factor it into your response, but don't repeat it back verbatim."""


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: dict[str, Any]


def _build_context_block(ctx: dict[str, Any]) -> str:
    symbol = ctx.get("symbol", "?")
    timeframe = ctx.get("timeframe", "?")
    stats = ctx.get("stats")
    active_indicators = ctx.get("activeIndicators", [])

    lines = [f"[Market context — {symbol} · {timeframe}]"]

    if stats:
        change = stats["close"] - stats["open"]
        pct = (change / stats["open"] * 100) if stats["open"] else 0
        direction = "▲" if change >= 0 else "▼"
        lines.append(
            f"Price: {stats['close']:.2f}  {direction} {abs(pct):.2f}%  "
            f"| O {stats['open']:.2f}  H {stats['high']:.2f}  L {stats['low']:.2f}  "
            f"| Vol {int(stats['volume']):,}"
        )

    if active_indicators:
        lines.append(f"Active indicators: {', '.join(active_indicators)}")

    candles = ctx.get("candles", [])
    if candles:
        recent = candles[-10:]
        lines.append(f"Recent candles (last {len(recent)}, oldest→newest):")
        for c in recent:
            lines.append(f"  {c['time']}  O{c['open']:.2f} H{c['high']:.2f} L{c['low']:.2f} C{c['close']:.2f}")

    return "\n".join(lines)


@app.post("/chat")
async def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    context_block = _build_context_block(req.context)

    # Inject context into the latest user message
    api_messages = []
    for i, msg in enumerate(req.messages):
        if i == len(req.messages) - 1 and msg.role == "user":
            api_messages.append({
                "role": "user",
                "content": f"{context_block}\n\n{msg.content}",
            })
        else:
            api_messages.append({"role": msg.role, "content": msg.content})

    async def stream():
        try:
            async with anthropic_client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=api_messages,
            ) as s:
                async for text in s.text_stream:
                    yield f"data: {json.dumps({'text': text})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface Article {
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime: number;
    sentiment: "positive" | "negative" | "neutral";
    score: number;
}

interface Props {
    symbol: string;
}

function timeAgo(unix: number): string {
    const diff = Math.floor(Date.now() / 1000) - unix;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

const SENTIMENT_COLOR: Record<Article["sentiment"], string> = {
    positive: "var(--up)",
    negative: "var(--down)",
    neutral:  "var(--text-muted)",
};

const SENTIMENT_LABEL: Record<Article["sentiment"], string> = {
    positive: "POS",
    negative: "NEG",
    neutral:  "NEU",
};

export default function NewsFeed({ symbol }: Props) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);

    const [expandedIdx,  setExpandedIdx]  = useState<number | null>(null);
    const [analyses,     setAnalyses]     = useState<Record<number, string>>({});
    const [analyzingIdx, setAnalyzingIdx] = useState<number | null>(null);

    useEffect(() => {
        setArticles([]);
        setError(null);
        setExpandedIdx(null);
        setAnalyses({});
        setLoading(true);
        apiFetch<{ articles: Article[] }>(`/news/${symbol}`)
            .then(({ articles }) => setArticles(articles))
            .catch(() => setError("Failed to load news"))
            .finally(() => setLoading(false));
    }, [symbol]);

    async function toggleAnalysis(idx: number, article: Article) {
        if (expandedIdx === idx) { setExpandedIdx(null); return; }
        setExpandedIdx(idx);
        if (analyses[idx]) return;
        setAnalyzingIdx(idx);
        try {
            const { analysis } = await apiFetch<{ analysis: string }>("/news/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol, headline: article.headline, summary: article.summary }),
            });
            setAnalyses((prev) => ({ ...prev, [idx]: analysis }));
        } catch {
            setAnalyses((prev) => ({ ...prev, [idx]: "Analysis unavailable." }));
        } finally {
            setAnalyzingIdx(null);
        }
    }

    const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

    if (loading) return (
        <div style={{ ...mono, padding: "16px 12px", fontSize: 11, color: "var(--text-muted)" }}>
            LOADING…
        </div>
    );

    if (error) return (
        <div style={{ ...mono, padding: "16px 12px", fontSize: 11, color: "var(--down)" }}>
            {error.toUpperCase()}
        </div>
    );

    if (articles.length === 0) return (
        <div style={{ ...mono, padding: "16px 12px", fontSize: 11, color: "var(--text-muted)" }}>
            NO NEWS FOR {symbol} IN THE LAST 7 DAYS
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column" }}>
            {articles.map((a, i) => (
                <div
                    key={i}
                    style={{ borderBottom: "1px solid var(--border)" }}
                >
                    {/* Headline row */}
                    <div style={{ display: "flex", gap: 10, padding: "8px 12px", alignItems: "flex-start" }}>
                        {/* Sentiment badge */}
                        <div style={{
                            ...mono,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            color: SENTIMENT_COLOR[a.sentiment],
                            background: `color-mix(in srgb, ${SENTIMENT_COLOR[a.sentiment]} 12%, transparent)`,
                            padding: "2px 5px",
                            flexShrink: 0,
                            marginTop: 2,
                            minWidth: 30,
                            textAlign: "center",
                        }}>
                            {SENTIMENT_LABEL[a.sentiment]}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                            <a
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    ...mono,
                                    fontSize: 11,
                                    color: "var(--text)",
                                    textDecoration: "none",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    lineHeight: 1.5,
                                    transition: "color 0.15s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text)")}
                            >
                                {a.headline}
                            </a>

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                                <span style={{ ...mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                                    {a.source.toUpperCase()} · {timeAgo(a.datetime)} AGO
                                </span>
                                <button
                                    onClick={() => toggleAnalysis(i, a)}
                                    style={{
                                        ...mono,
                                        fontSize: 9,
                                        letterSpacing: "0.08em",
                                        color: expandedIdx === i ? "var(--accent)" : "var(--text-muted)",
                                        background: "transparent",
                                        border: `1px solid ${expandedIdx === i ? "var(--accent)" : "var(--border-bright)"}`,
                                        padding: "2px 6px",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                        flexShrink: 0,
                                        marginLeft: 8,
                                    }}
                                >
                                    {expandedIdx === i ? "HIDE" : "AI"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* AI analysis dropdown */}
                    {expandedIdx === i && (
                        <div style={{
                            margin: "0 12px 8px",
                            padding: "8px 10px",
                            background: "var(--bg)",
                            borderLeft: "2px solid var(--accent)",
                        }}>
                            {analyzingIdx === i ? (
                                <span style={{ ...mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                                    ANALYZING…
                                </span>
                            ) : (
                                <p style={{ ...mono, fontSize: 10, color: "var(--text-dim)", lineHeight: 1.6, margin: 0 }}>
                                    {analyses[i]}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

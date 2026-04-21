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
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const SENTIMENT_DOT: Record<Article["sentiment"], string> = {
    positive: "bg-green-500",
    negative: "bg-red-500",
    neutral:  "bg-gray-500",
};

export default function NewsFeed({ symbol }: Props) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(true);

    // Per-article analysis state
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const [analyses, setAnalyses] = useState<Record<number, string>>({});
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
        if (expandedIdx === idx) {
            setExpandedIdx(null);
            return;
        }
        setExpandedIdx(idx);
        if (analyses[idx]) return; // already fetched

        setAnalyzingIdx(idx);
        try {
            const { analysis } = await apiFetch<{ analysis: string }>("/news/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol,
                    headline: article.headline,
                    summary: article.summary,
                }),
            });
            setAnalyses((prev) => ({ ...prev, [idx]: analysis }));
        } catch {
            setAnalyses((prev) => ({ ...prev, [idx]: "Analysis unavailable." }));
        } finally {
            setAnalyzingIdx(null);
        }
    }

    return (
        <div className="mt-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            {/* Header */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">News</span>
                    <span className="text-xs text-gray-500">{symbol}</span>
                    {!loading && articles.length > 0 && (
                        <span className="text-xs text-gray-600">· {articles.length} articles</span>
                    )}
                </div>
                <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div className="border-t border-[#2a2a2a]">
                    {loading && (
                        <div className="flex justify-center py-8">
                            <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                        </div>
                    )}

                    {!loading && error && (
                        <p className="text-sm text-red-400 px-4 py-6 text-center">{error}</p>
                    )}

                    {!loading && !error && articles.length === 0 && (
                        <p className="text-sm text-gray-600 px-4 py-6 text-center">
                            No news found for {symbol} in the last 7 days
                        </p>
                    )}

                    {!loading && articles.length > 0 && (
                        <ul>
                            {articles.map((a, i) => (
                                <li key={i} className={i < articles.length - 1 ? "border-b border-[#2a2a2a]" : ""}>
                                    {/* Headline row */}
                                    <div className="flex items-start gap-3 px-4 py-3">
                                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${SENTIMENT_DOT[a.sentiment]}`} />
                                        <div className="flex-1 min-w-0">
                                            <a
                                                href={a.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-gray-200 leading-snug line-clamp-2 hover:text-white transition-colors"
                                            >
                                                {a.headline}
                                            </a>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-xs text-gray-600">
                                                    {a.source} · {timeAgo(a.datetime)}
                                                </p>
                                                <button
                                                    onClick={() => toggleAnalysis(i, a)}
                                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer ml-3 shrink-0"
                                                >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <line x1="12" y1="8" x2="12" y2="12" />
                                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                                    </svg>
                                                    {expandedIdx === i ? "Hide" : "Analyze"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Analysis dropdown */}
                                    {expandedIdx === i && (
                                        <div className="mx-4 mb-3 px-3 py-2.5 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a]">
                                            {analyzingIdx === i ? (
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <div className="w-3 h-3 border border-gray-600 border-t-white rounded-full animate-spin" />
                                                    Analyzing…
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                    {analyses[i]}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

import { useEffect, useRef, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface Candle {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface Stats {
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface Context {
    symbol: string;
    timeframe: string;
    stats: Stats | null;
    candles: Candle[];
    activeIndicators: string[];
}

interface Props {
    context: Context;
}

const DEFAULT_POS = { x: window.innerWidth - 380, y: window.innerHeight - 520 };

export default function AIAssistant({ context }: Props) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);

    const pos = useRef(DEFAULT_POS);
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Scroll to bottom when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Drag handlers
    function onHeaderMouseDown(e: React.MouseEvent) {
        dragging.current = true;
        dragOffset.current = {
            x: e.clientX - pos.current.x,
            y: e.clientY - pos.current.y,
        };
        e.preventDefault();
    }

    useEffect(() => {
        function onMouseMove(e: MouseEvent) {
            if (!dragging.current || !panelRef.current) return;
            const x = Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 360));
            const y = Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 48));
            pos.current = { x, y };
            panelRef.current.style.left = `${x}px`;
            panelRef.current.style.top = `${y}px`;
        }
        function onMouseUp() { dragging.current = false; }
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    async function sendMessage() {
        const text = input.trim();
        if (!text || streaming) return;

        const userMsg: Message = { role: "user", content: text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setInput("");
        setStreaming(true);

        // Placeholder for the assistant turn
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        try {
            const res = await fetch(`${BASE_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: nextMessages,
                    context: {
                        symbol: context.symbol,
                        timeframe: context.timeframe,
                        stats: context.stats,
                        candles: context.candles.slice(-20),
                        activeIndicators: context.activeIndicators,
                    },
                }),
            });

            if (!res.ok || !res.body) throw new Error(`API error ${res.status}`);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6);
                    if (payload === "[DONE]") break;
                    try {
                        const { text, error } = JSON.parse(payload);
                        if (error) throw new Error(error);
                        if (text) {
                            setMessages((prev) => {
                                const updated = [...prev];
                                updated[updated.length - 1] = {
                                    role: "assistant",
                                    content: updated[updated.length - 1].content + text,
                                };
                                return updated;
                            });
                        }
                    } catch {}
                }
            }
        } catch (err) {
            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: "assistant",
                    content: "Sorry, something went wrong. Please try again.",
                };
                return updated;
            });
        } finally {
            setStreaming(false);
        }
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-gray-500 text-sm text-gray-300 hover:text-white px-4 py-2.5 rounded-full shadow-lg transition-colors cursor-pointer"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                AI Advisor
            </button>
        );
    }

    return (
        <div
            ref={panelRef}
            className="fixed z-50 w-[360px] h-[480px] bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl shadow-2xl flex flex-col overflow-hidden"
            style={{ left: pos.current.x, top: pos.current.y }}
        >
            {/* Header — drag handle */}
            <div
                onMouseDown={onHeaderMouseDown}
                className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] cursor-grab active:cursor-grabbing select-none bg-[#141414]"
            >
                <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-200">AI Advisor</span>
                    <span className="text-xs text-gray-500">{context.symbol} · {context.timeframe}</span>
                </div>
                <button
                    onClick={() => setOpen(false)}
                    className="text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-sm">
                {messages.length === 0 && (
                    <p className="text-gray-600 text-xs text-center mt-8 leading-relaxed">
                        Ask me anything about {context.symbol} — price action,<br />
                        indicators, strategy, or portfolio decisions.
                    </p>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                        <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === "user"
                                    ? "bg-[#2a2a2a] text-gray-100"
                                    : "text-gray-300"
                            }`}
                        >
                            {msg.content}
                            {msg.role === "assistant" && streaming && i === messages.length - 1 && (
                                <span className="inline-block w-1.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse align-middle" />
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-[#2a2a2a]">
                <div className="flex items-end gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 focus-within:border-gray-500 transition-colors">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Ask anything…"
                        rows={1}
                        disabled={streaming}
                        className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none disabled:opacity-50"
                        style={{ maxHeight: 96 }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || streaming}
                        className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer shrink-0 pb-0.5"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
                <p className="text-xs text-gray-700 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
            </div>
        </div>
    );
}

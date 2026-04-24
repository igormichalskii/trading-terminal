import { useState } from "react";
import { supabase } from "../lib/supabase";
import { passwordError } from "../lib/validation";

interface Props {
    onClose: () => void;
}

type Mode = "signin" | "signup";

export default function AuthModal({ onClose }: Props) {
    const [mode, setMode] = useState<Mode>("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const pwErr = passwordError(password);
        if (pwErr) { setError(pwErr); return; }
        setLoading(true);
        try {
            if (mode === "signup") {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setSuccessMsg("Check your email for a confirmation link.");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onClose();
            }
        } catch (err: any) {
            setError(err.message ?? "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: "google" | "apple") => {
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: window.location.origin },
        });
        if (error) setError(error.message);
    };

    const inputStyle: React.CSSProperties = {
        width: "100%",
        background: "var(--bg)",
        border: "1px solid var(--border-bright)",
        color: "var(--text)",
        padding: "8px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        outline: "none",
        letterSpacing: "0.02em",
        transition: "border-color 0.15s",
    };

    return (
        <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
        >
            <div
                style={{ background: "var(--panel)", border: "1px solid var(--border-bright)", padding: "28px 24px", width: "100%", maxWidth: 360, margin: "0 16px" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                    <div style={{ width: 14, height: 14, background: "var(--accent)", clipPath: "polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {mode === "signin" ? "Sign In" : "Create Account"}
                    </span>
                </div>

                {/* OAuth buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {(["google", "apple"] as const).map((provider) => (
                        <button
                            key={provider}
                            onClick={() => handleOAuth(provider)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "1px solid var(--border-bright)", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.05em", cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-bright)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)"; }}
                        >
                            {provider === "google" ? <GoogleIcon /> : <AppleIcon />}
                            {provider === "google" ? "CONTINUE WITH GOOGLE" : "CONTINUE WITH APPLE"}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ flex: 1, height: 1, background: "var(--border-bright)" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em" }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border-bright)" }} />
                </div>

                {/* Email/password form */}
                {successMsg ? (
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--up)", textAlign: "center", letterSpacing: "0.05em" }}>{successMsg}</p>
                ) : (
                    <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <input
                            type="email"
                            placeholder="EMAIL"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={inputStyle}
                            onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--accent)"; }}
                            onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-bright)"; }}
                        />
                        <input
                            type="password"
                            placeholder="PASSWORD"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={inputStyle}
                            onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--accent)"; }}
                            onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-bright)"; }}
                        />
                        {error && (
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--down)", letterSpacing: "0.04em" }}>{error}</p>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ padding: "9px 12px", background: loading ? "var(--border-bright)" : "var(--accent)", border: "none", color: loading ? "var(--text-muted)" : "#fff", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", cursor: loading ? "default" : "pointer", transition: "all 0.15s", opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? "…" : mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
                        </button>
                    </form>
                )}

                {/* Toggle mode */}
                <div style={{ marginTop: 20, textAlign: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                        {mode === "signin" ? "No account? " : "Have an account? "}
                    </span>
                    <button
                        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
                        style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em", textDecoration: "underline" }}
                    >
                        {mode === "signin" ? "Sign up" : "Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
    );
}

function AppleIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
    );
}
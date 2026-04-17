import { useState } from "react";
import { supabase } from "../lib/supabase";

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 w-full max-w-sm mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold mb-5">
                    {mode === "signin" ? "Sign in" : "Create account"}
                </h2>

                {/* OAuth buttons */}
                <div className="flex flex-col gap-2 mb-5">
                    <button
                        onClick={() => handleOAuth("google")}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded border border-[#2a2a2a] text-sm hover:border-gray-500 transition-colors cursor-pointer"
                    >
                        <GoogleIcon />
                        Continue with Google
                    </button>
                    <button
                        onClick={() => handleOAuth("apple")}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded border border-[#2a2a2a] text-sm hover:border-gray-500 transition-colors cursor-pointer"
                    >
                        <AppleIcon />
                        Continue with Apple
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-[#2a2a2a]" />
                    <span className="text-xs text-gray-500">or</span>
                    <div className="flex-1 h-px bg-[#2a2a2a]" />
                </div>

                {/* Email/password form */}
                {successMsg ? (
                    <p className="text-sm text-green-400 text-center">{successMsg}</p>
                ) : (
                    <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                        />
                        {error && <p className="text-xs text-red-400">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-white text-black text-sm px-4 py-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
                        </button>
                    </form>
                )}

                <p className="text-xs text-gray-500 mt-4 text-center">
                    {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
                        className="text-white underline cursor-pointer"
                    >
                        {mode === "signin" ? "Sign up" : "Sign in"}
                    </button>
                </p>
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
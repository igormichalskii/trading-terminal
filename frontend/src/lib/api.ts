const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, options);
    if (!res.ok) {
        let detail = `API error: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.detail) detail = body.detail;
        } catch {}
        throw new Error(detail);
    }
    return res.json();
}
import { useCallback, useEffect, useState } from "react"
import { supabase } from "./supabase";
import type { Drawing } from "./drawings";
import type { User } from "@supabase/supabase-js";

interface Props {
    user: User | null,
    symbol: string | null,
    timeframe: string | null,
}

export default function useDrawings({
    user,
    symbol,
    timeframe,
}: Props) {
    const [chart_drawings, setChartDrawings] = useState<Drawing[]>([]);
 
    useEffect(() => {
        if (!user) {
            setChartDrawings([]);
            return;
        } 

        supabase
            .from("chart_drawings")
            .select("data")
            .eq("user_id", user.id)
            .eq("symbol", symbol)
            .eq("timeframe", timeframe)
            .then(({ data, error }) => {
                if (error) console.error("drawings fetch failed:", error);
                if (!data || data.length === 0) {
                    setChartDrawings([]);
                    return;
                }
                setChartDrawings(data.map((drawing) => drawing.data));
            })
    }, [user?.id, symbol, timeframe])

    const addDrawing = useCallback((drawing: Drawing) => {
        setChartDrawings((prev) => [...prev, drawing]);
        if (user) supabase.from("chart_drawings").insert({ id: drawing.id, user_id: user.id, symbol: symbol, timeframe: timeframe, type: drawing.type, data: drawing}).then(({error}) => { if (error) console.error("drawing add failed:", error)});
    }, [user]);

    const removeDrawing = useCallback((id: string) => {
        setChartDrawings((prev) => prev.filter((d) => d.id !== id)) ;
        if (user) supabase.from("chart_drawings").delete().eq("user_id", user.id).eq("id", id).then(({error}) => { if (error) console.error("drawing delete failed:", error)});
    }, [user])

    return {drawings: chart_drawings, addDrawing: addDrawing, removeDrawing: removeDrawing};
}
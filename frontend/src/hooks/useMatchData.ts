import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../lib/utils";

export function useMatches(filters?: Record<string, string>) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    axios.get(`${API_BASE}/matches?${params}`).then(r => setMatches(r.data)).finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  return { matches, loading };
}

export function useLiveMatches() {
  const [matches, setMatches] = useState<any[]>([]);
  useEffect(() => {
    const fetch = () => axios.get(`${API_BASE}/matches/live`).then(r => setMatches(r.data));
    fetch();
    const t = setInterval(fetch, 60000);
    return () => clearInterval(t);
  }, []);
  return matches;
}

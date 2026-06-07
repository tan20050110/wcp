import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../lib/utils";

export function usePrediction() {
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchPrediction = async (mid: string) => {
    setLoading(true);
    const { data } = await axios.get(`${API_BASE}/predictions/match/${mid}`);
    setPrediction(data);
    setLoading(false);
  };

  const simulate = async (total: number = 10000) => {
    setLoading(true);
    const { data } = await axios.post(`${API_BASE}/predictions/simulate`, { total_simulations: total });
    setPrediction(data);
    setLoading(false);
    return data;
  };

  return { prediction, loading, fetchPrediction, simulate };
}

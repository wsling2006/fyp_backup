// Example dashboard hook
import { useEffect, useState } from "react";
import api from "../lib/api";

export function useDashboard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api.get("/dashboard").then((res: any) => setData(res.data)).catch(() => {});
  }, []);
  return data;
}

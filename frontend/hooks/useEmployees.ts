import { useEffect, useState } from "react";
import api from "../lib/api";

export function useEmployees() {
  const [employees, setEmployees] = useState<any[]>([]);
  useEffect(() => {
    api.get("/employees")
      .then((res: any) => setEmployees(res.data))
      .catch(() => {});
  }, []);
  return employees;
}

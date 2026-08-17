import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/useAuth";

type NotificationCounts = { total: number };

const POLL_MS = 30_000;

export function useNotificationCounts() {
  const { session } = useAuth();
  const [data, setData] = useState<NotificationCounts>({ total: 0 });

  useEffect(() => {
    if (!session) return;

    function fetchCounts() {
      api
        .get<NotificationCounts>("/notifications/unread-counts")
        .then((res) => setData(res.data))
        .catch(() => {});
    }

    fetchCounts();
    const id = setInterval(fetchCounts, POLL_MS);
    return () => clearInterval(id);
  }, [session]);

  return data;
}

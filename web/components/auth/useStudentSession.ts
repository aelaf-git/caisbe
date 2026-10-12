"use client";

import { useEffect, useState } from "react";
import { clearStudentToken, studentFetch, type StudentUser } from "@/lib/studentSession";

export function useStudentSession() {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void studentFetch<StudentUser>("/auth/me")
      .then((me) => {
        if (!active) return;
        if (me.role === "admin") {
          clearStudentToken();
          setUser(null);
          return;
        }
        setUser(me);
      })
      .catch(() => {
        if (!active) return;
        clearStudentToken();
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}

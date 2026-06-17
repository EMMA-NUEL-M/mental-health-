"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Marks the signed-in user online on mount, refreshes a heartbeat every
// 30s, and marks them offline when the tab closes or loses focus for
// good. Helpers are only matched while is_online is true (see
// request_match in schema.sql), so this is what makes "is the other
// person online" meaningful.
export function usePresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;

    async function goOnline() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      userId = data.user.id;
      await supabase
        .from("profiles")
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq("id", userId);
    }

    async function goOffline() {
      if (!userId) return;
      await supabase.from("profiles").update({ is_online: false }).eq("id", userId);
    }

    goOnline();
    const heartbeat = setInterval(() => {
      if (userId) {
        supabase
          .from("profiles")
          .update({ last_seen: new Date().toISOString() })
          .eq("id", userId);
      }
    }, 30000);

    window.addEventListener("beforeunload", goOffline);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", goOffline);
      goOffline();
    };
  }, []);
}

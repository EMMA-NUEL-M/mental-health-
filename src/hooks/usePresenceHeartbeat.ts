"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Presence strategy: heartbeat updates last_seen every 20 seconds while
// the page is open. Anything with last_seen older than 45 seconds is
// treated as offline by the UI. This avoids relying on beforeunload
// (unreliable on mobile) — the user appears offline automatically once
// they close the tab or lose signal, no explicit "go offline" call needed.
export function usePresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    async function goOnline() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      userId = data.user.id;
      await supabase
        .from("profiles")
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq("id", userId);
    }

    async function beat() {
      if (!userId) return;
      await supabase
        .from("profiles")
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq("id", userId);
    }

    async function goOffline() {
      if (!userId) return;
      await supabase
        .from("profiles")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("id", userId);
    }

    // Handle tab visibility changes — mark offline immediately when
    // the user switches away, back online when they return.
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        goOffline();
      } else {
        goOnline();
      }
    }

    goOnline();
    heartbeatInterval = setInterval(beat, 20000);

    window.addEventListener("beforeunload", goOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      window.removeEventListener("beforeunload", goOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      goOffline();
    };
  }, []);
}
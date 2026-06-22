"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

type Status = "checking" | "searching" | "none_available" | "found";

const CLOCK_FACES = ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"];

const PLAYFUL_MESSAGES = [
  "Looking for someone kind…",
  "Checking who's around…",
  "Finding your match…",
  "Scanning the lobby…",
  "Almost there…",
];

const SEARCH_DURATION_MS = 30000;
const RETRY_INTERVAL_MS = 5000;

export default function WaitingPage() {
  usePresenceHeartbeat();
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<Status>("checking");
  const [clockIndex, setClockIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const searchingRef = useRef(false);

  async function tryOnce(): Promise<boolean> {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return false;

    const { data: existing } = await supabase
      .from("matches")
      .select("id")
      .or(`helper_id.eq.${userId},seeker_id.eq.${userId}`)
      .in("status", ["pending", "active"])
      .limit(1)
      .maybeSingle();

    if (existing) {
      router.push(`/chat/${existing.id}`);
      return true;
    }

    const { data: matchId, error } = await supabase.rpc("request_match", {
      seeker: userId,
    });

    if (error) {
      console.error(error);
      return false;
    }

    if (matchId) {
      router.push(`/chat/${matchId}`);
      return true;
    }

    return false;
  }

  async function startSearch() {
    if (searchingRef.current) return;
    searchingRef.current = true;
    setStatus("searching");
    setSecondsLeft(30);

    const found = await tryOnce();
    if (found) return;

    const startTime = Date.now();

    const retryInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((SEARCH_DURATION_MS - elapsed) / 1000));
      setSecondsLeft(remaining);

      if (elapsed >= SEARCH_DURATION_MS) {
        clearInterval(retryInterval);
        searchingRef.current = false;
        setStatus("none_available");
        return;
      }

      const found = await tryOnce();
      if (found) {
        clearInterval(retryInterval);
      }
    }, RETRY_INTERVAL_MS);
  }

  function handleTryAgain() {
    searchingRef.current = false;
    startSearch();
  }

  useEffect(() => {
    startSearch();
    return () => {
      searchingRef.current = false;
    };
  }, []);

  // Listen for someone else opening a match where we're the helper.
  useEffect(() => {
    let channelUserId: string | null = null;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      channelUserId = userRes.user?.id ?? null;
      if (!channelUserId) return;

      const channel = supabase
        .channel(`incoming-matches-${channelUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "matches" },
          (payload) => {
            const row = payload.new as { id: string; helper_id: string; seeker_id: string };
            if (row.helper_id === channelUserId || row.seeker_id === channelUserId) {
              router.push(`/chat/${row.id}`);
            }
          }
        )
        .subscribe();

      unsubscribe = () => supabase.removeChannel(channel);
    })();

    return () => unsubscribe?.();
  }, []);

  // Cycle the clock face for a smooth but readable ticking effect.
  useEffect(() => {
    if (status !== "checking" && status !== "searching") return;
    const interval = setInterval(() => {
      setClockIndex((i) => (i + 1) % CLOCK_FACES.length);
    }, 750);
    return () => clearInterval(interval);
  }, [status]);

  // Rotate through playful status lines slowly so users can read them.
  useEffect(() => {
    if (status !== "checking" && status !== "searching") return;
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % PLAYFUL_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card max-w-md w-full text-center">
        {status === "checking" || status === "searching" ? (
          <>
            <div className="text-6xl mb-4">{CLOCK_FACES[clockIndex]}</div>
            <h1 className="font-display text-xl text-ink-900">
              {PLAYFUL_MESSAGES[messageIndex]}
            </h1>
            <p className="text-ink-500 text-sm mt-2">
              You'll be connected automatically as soon as someone's available.
            </p>
            <p className="text-ink-500 text-xs mt-3">
              Searching for {secondsLeft}s…
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">😴</div>
            <h1 className="font-display text-xl text-ink-900">
              No one's available right now
            </h1>
            <p className="text-ink-500 text-sm mt-2 mb-5">
              Try again in a few minutes — new people come online throughout the day.
            </p>
            <button onClick={handleTryAgain} className="btn-primary">
              Search again
            </button>
          </>
        )}
        <button
          onClick={() => router.push("/lobby")}
          className="block mx-auto mt-6 text-sm text-ink-500 underline"
        >
          Back to lobby
        </button>
      </div>
    </main>
  );
}
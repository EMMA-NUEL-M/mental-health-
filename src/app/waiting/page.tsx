"use client";

import { useEffect, useState } from "react";
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

export default function WaitingPage() {
  usePresenceHeartbeat();
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<Status>("checking");
  const [clockIndex, setClockIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  async function lookForMatch() {
    setStatus("searching");
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return;

    // Already in a pending/active match? Jump straight there.
    const { data: existing } = await supabase
      .from("matches")
      .select("id")
      .or(`helper_id.eq.${userId},seeker_id.eq.${userId}`)
      .in("status", ["pending", "active"])
      .limit(1)
      .maybeSingle();

    if (existing) {
      router.push(`/chat/${existing.id}`);
      return;
    }

    const { data: matchId, error } = await supabase.rpc("request_match", {
      seeker: userId,
    });

    if (error) {
      console.error(error);
      setStatus("none_available");
      return;
    }

    if (!matchId) {
      setStatus("none_available");
      return;
    }

    setStatus("found");
    router.push(`/chat/${matchId}`);
  }

  useEffect(() => {
    lookForMatch();
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
    }, 2750);
    return () => clearInterval(interval);
  }, [status]);

  // Rotate through playful status lines slowly so users can read them.
  useEffect(() => {
    if (status !== "checking" && status !== "searching") return;
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % PLAYFUL_MESSAGES.length);
    }, 20000);
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
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">😴</div>
            <h1 className="font-display text-xl text-ink-900">
              No one's available right now
            </h1>
            <p className="text-ink-500 text-sm mt-2 mb-5">
              We'll keep listening, and you can also try again in a few minutes.
            </p>
            <button onClick={lookForMatch} className="btn-primary">
              Try again
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
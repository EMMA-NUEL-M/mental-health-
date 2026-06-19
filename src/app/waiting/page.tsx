"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

type Status = "checking" | "searching" | "none_available" | "found";

export default function WaitingPage() {
  usePresenceHeartbeat();
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<Status>("checking");
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

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

    setPendingMatchId(matchId);
    setStatus("found");
    router.push(`/chat/${matchId}`);
  }

  useEffect(() => {
    lookForMatch();
  }, []);

  // Listen for someone else opening a match where we're the helper.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`incoming-matches-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        (payload) => {
          const row = payload.new as {
            id: string;
            helper_id: string;
            seeker_id: string;
          };

          if (row.helper_id === userId || row.seeker_id === userId) {
            router.push(`/chat/${row.id}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card max-w-md w-full text-center">
        {status === "checking" || status === "searching" ? (
          <>
            <div className="h-10 w-10 border-2 border-sage-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="font-display text-xl text-ink-900">
              Looking for a match…
            </h1>
            <p className="text-ink-500 text-sm mt-2">
              You'll be connected automatically as soon as someone's available.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl text-ink-900">
              No one's available right now
            </h1>
            <p className="text-ink-500 text-sm mt-2 mb-5">
              We'll keep listening, and you can also try again in a few
              minutes.
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
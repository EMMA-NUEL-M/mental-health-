"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

type RolePreference = "seek_help" | "give_help" | "both";

type Profile = {
  display_name: string;
  role_preference: RolePreference;
  is_suspended: boolean;
};

type ExistingMatch = {
  id: string;
  status: "pending" | "active";
};

const ROLE_LABELS: Record<RolePreference, string> = {
  seek_help: "looking for someone to talk to",
  give_help: "looking to support someone else",
  both: "open to either talking or listening",
};

export default function LobbyPage() {
  usePresenceHeartbeat();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [existingMatch, setExistingMatch] = useState<ExistingMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        router.push("/login");
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("display_name, role_preference, is_suspended")
        .eq("id", userId)
        .single();

      if (!profileRow) {
        setLoading(false);
        return;
      }

      if (profileRow.is_suspended) {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      setProfile(profileRow as Profile);

      const { data: matchRow } = await supabase
        .from("matches")
        .select("id, status")
        .or(`helper_id.eq.${userId},seeker_id.eq.${userId}`)
        .in("status", ["pending", "active"])
        .limit(1)
        .maybeSingle();

      if (matchRow) {
        setExistingMatch(matchRow as ExistingMatch);
      }

      setLoading(false);
    })();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card max-w-md w-full text-center">
        <h1 className="font-display text-2xl text-ink-900 mb-1">
          Hey {profile?.display_name ?? "there"}
        </h1>
        {profile && (
          <p className="text-ink-500 text-sm mb-6">
            You're currently {ROLE_LABELS[profile.role_preference]}.
          </p>
        )}

        {existingMatch ? (
          <button
            onClick={() => router.push(`/chat/${existingMatch.id}`)}
            className="btn-primary w-full mb-3"
          >
            {existingMatch.status === "pending" ? "View pending match" : "Continue conversation"}
          </button>
        ) : (
          <button onClick={() => router.push("/waiting")} className="btn-primary w-full mb-3">
            Find someone now
          </button>
        )}

        <button onClick={() => router.push("/onboarding")} className="btn-secondary w-full mb-3">
          Edit my preferences
        </button>

        <button onClick={handleSignOut} className="text-sm text-ink-500 underline">
          Sign out
        </button>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { containsCrisisLanguage } from "@/lib/crisisKeywords";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import PresenceDot from "@/components/PresenceDot";
import CrisisModal from "@/components/CrisisModal";
import ReportModal from "@/components/ReportModal";

type Match = {
  id: string;
  helper_id: string;
  seeker_id: string;
  status: "pending" | "active" | "ended" | "rejected";
};

type OtherProfile = {
  id: string;
  display_name: string;
  is_online: boolean;
};

type TopicTag = { name: string; kind: "strength" | "weakness"; rating: number };

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function ChatPage() {
  usePresenceHeartbeat();
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [other, setOther] = useState<OtherProfile | null>(null);
  const [otherTopics, setOtherTopics] = useState<TopicTag[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingCrisisText, setPendingCrisisText] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data: matchRow } = await supabase
        .from("matches")
        .select("id, helper_id, seeker_id, status")
        .eq("id", params.matchId)
        .single();
      if (!matchRow) return;
      setMatch(matchRow);

      const otherId = matchRow.helper_id === uid ? matchRow.seeker_id : matchRow.helper_id;

      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("id, display_name, is_online")
        .eq("id", otherId)
        .single();
      if (otherProfile) setOther(otherProfile);

      const { data: topicRows } = await supabase
        .from("user_topics")
        .select("kind, rating, topics(name)")
        .eq("user_id", otherId);
      if (topicRows) {
        setOtherTopics(
          topicRows.map((t: any) => ({
            name: t.topics.name,
            kind: t.kind,
            rating: t.rating,
          }))
        );
      }

      if (matchRow.status === "active") {
        const { data: existingMessages } = await supabase
          .from("messages")
          .select("id, sender_id, content, created_at")
          .eq("match_id", matchRow.id)
          .order("created_at", { ascending: true });
        setMessages(existingMessages ?? []);
      }
    })();
  }, [params.matchId]);

  // Realtime: new messages + match status changes (e.g. other side accepts).
  useEffect(() => {
    const channel = supabase
      .channel(`match-${params.matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${params.matchId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${params.matchId}` },
        (payload) => setMatch(payload.new as Match)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function respondToMatch(accept: boolean) {
    if (!match) return;
    await supabase
      .from("matches")
      .update({ status: accept ? "active" : "rejected" })
      .eq("id", match.id);

    if (!accept) router.push("/lobby");
  }

  async function sendMessage(text: string) {
    if (!match || !userId || text.trim().length === 0) return;
    await supabase.from("messages").insert({
      match_id: match.id,
      sender_id: userId,
      content: text.trim(),
      flagged_crisis: containsCrisisLanguage(text),
    });
    setDraft("");
  }

  function handleSendClick() {
    if (containsCrisisLanguage(draft)) {
      setPendingCrisisText(draft);
      return;
    }
    sendMessage(draft);
  }

  async function endMatch() {
    if (!match) return;
    await supabase.from("matches").update({ status: "ended" }).eq("id", match.id);
    router.push("/lobby");
  }

  if (!match || !other || !userId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink-500">Loading conversation…</p>
      </main>
    );
  }

  const iAmSeeker = match.seeker_id === userId;
  const waitingOnOtherToRespond = match.status === "pending" && iAmSeeker;
  const iNeedToRespond = match.status === "pending" && !iAmSeeker;

  if (match.status === "pending") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="card max-w-md w-full">
          <h1 className="font-display text-xl text-ink-900 mb-1">
            {other.display_name}
          </h1>
          <PresenceDot online={other.is_online} />

          <div className="mt-4">
            <p className="text-sm font-medium text-ink-700 mb-2">
              {iAmSeeker ? "Their strengths" : "What they're looking for help with"}
            </p>
            <div className="flex flex-wrap gap-2">
              {otherTopics
                .filter((t) => (iAmSeeker ? t.kind === "strength" : t.kind === "weakness"))
                .map((t) => (
                  <span
                    key={t.name}
                    className="text-xs bg-sage-100 text-sage-600 px-3 py-1 rounded-full"
                  >
                    {t.name}
                  </span>
                ))}
              {otherTopics.length === 0 && (
                <span className="text-xs text-ink-500">No topics listed yet.</span>
              )}
            </div>
          </div>

          {iNeedToRespond ? (
            <div className="flex gap-2 mt-6">
              <button onClick={() => respondToMatch(false)} className="btn-secondary flex-1">
                Not now
              </button>
              <button onClick={() => respondToMatch(true)} className="btn-primary flex-1">
                Start chatting
              </button>
            </div>
          ) : (
            <p className="text-ink-500 text-sm mt-6">
              {waitingOnOtherToRespond
                ? "Waiting for them to accept…"
                : "This match isn't active."}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-ink-500/10 px-6 py-4 flex items-center justify-between bg-white">
        <div>
          <h1 className="font-medium text-ink-900">{other.display_name}</h1>
          <PresenceDot online={other.is_online} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowReport(true)} className="text-xs text-ink-500 underline">
            Report
          </button>
          <button onClick={endMatch} className="text-xs text-clay-600 underline">
            End chat
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3 max-w-2xl mx-auto w-full">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-xs px-4 py-2 rounded-card text-sm ${
              m.sender_id === userId
                ? "bg-sage-600 text-white ml-auto"
                : "bg-white border border-ink-500/10 text-ink-900"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-ink-500/10 px-6 py-4 bg-white">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendClick()}
            className="input-field"
            placeholder="Type a message… (don't share phone numbers or your location)"
          />
          <button onClick={handleSendClick} className="btn-primary">
            Send
          </button>
        </div>
      </div>

      {pendingCrisisText && (
        <CrisisModal
          onContinueAnyway={() => {
            sendMessage(pendingCrisisText);
            setPendingCrisisText(null);
          }}
          onClose={() => setPendingCrisisText(null)}
        />
      )}

      {showReport && (
        <ReportModal
          matchId={match.id}
          reportedUserId={other.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </main>
  );
}

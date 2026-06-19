"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TopicSelector, { Topic, TopicSelection } from "@/components/TopicSelector";

type RolePreference = "seek_help" | "give_help" | "both";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<RolePreference>("seek_help");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selections, setSelections] = useState<TopicSelection>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("topics")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => setTopics(data ?? []));
  }, [supabase]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      setError("Your session expired. Please log in again.");
      setSaving(false);
      return;
    }

    const rows = Object.entries(selections)
      .filter(([, v]) => v.kind !== null)
      .map(([topicId, v]) => ({
        user_id: userId,
        topic_id: Number(topicId),
        kind: v.kind,
        rating: v.rating,
      }));

    if (rows.length > 0) {
      const { error: topicsError } = await supabase.from("user_topics").upsert(rows);
      if (topicsError) {
        setError(topicsError.message);
        setSaving(false);
        return;
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role_preference: role, onboarded: true })
      .eq("id", userId);

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    router.push("/lobby");
  }

  return (
    <main className="min-h-screen px-6 py-12 flex justify-center">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl text-ink-900">A bit about you</h1>
          <p className="text-ink-500 text-sm mt-1">
            This helps us pair you with the right person. You can change this any time.
          </p>
        </div>

        <section className="card">
          <h2 className="font-medium text-ink-900 mb-3">What are you here for?</h2>
          <div className="flex flex-col gap-2">
            {[
              { value: "seek_help", label: "I want someone to talk to" },
              { value: "give_help", label: "I want to support someone else" },
              { value: "both", label: "Either is fine" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 border rounded-card px-4 py-3 cursor-pointer ${
                  role === opt.value ? "border-sage-500 bg-sage-100" : "border-ink-500/15"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={role === opt.value}
                  onChange={() => setRole(opt.value as RolePreference)}
                />
                <span className="text-sm text-ink-900">{opt.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="font-medium text-ink-900 mb-1">Your strengths and what you're working on</h2>
          <p className="text-ink-500 text-sm mb-2">
            Mark a topic as a <strong className="font-bold text-sage-600">Strength</strong> if you
            feel equipped to support someone there, or{" "}
            <strong className="font-bold text-gold-500">Working on it</strong> if it's something
            you're personally finding hard right now.
          </p>
          <p className="text-ink-500 text-sm mb-4">
            For a <strong className="font-bold text-sage-600">Strength</strong>, 1 means you're
            fairly confident there and 5 means you're very strong in it. For{" "}
            <strong className="font-bold text-gold-500">Working on it</strong>, 1 means you're
            struggling a little and 5 means you're struggling a lot.
          </p>
          <TopicSelector topics={topics} selections={selections} onChange={setSelections} />
        </section>

        {error && <p className="text-clay-600 text-sm">{error}</p>}

        <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full">
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </main>
  );
}
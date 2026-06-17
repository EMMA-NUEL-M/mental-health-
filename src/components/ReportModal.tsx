"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  matchId: string;
  reportedUserId: string;
  onClose: () => void;
};

export default function ReportModal({ matchId, reportedUserId, onClose }: Props) {
  const supabase = createClient();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const { data: userRes } = await supabase.auth.getUser();
    const reporterId = userRes.user?.id;
    if (!reporterId) return;

    await supabase.from("reports").insert({
      reporter_id: reporterId,
      reported_id: reportedUserId,
      match_id: matchId,
      reason,
    });

    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 bg-ink-900/40 flex items-center justify-center px-6 z-50">
      <div className="bg-white rounded-card p-6 max-w-sm w-full">
        {submitted ? (
          <>
            <h2 className="font-display text-lg text-ink-900 mb-2">Report sent</h2>
            <p className="text-sm text-ink-700 mb-4">
              Thanks for flagging this. We'll look into it.
            </p>
            <button onClick={onClose} className="btn-primary w-full">
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-lg text-ink-900 mb-2">Report this person</h2>
            <p className="text-sm text-ink-500 mb-3">
              Tell us briefly what happened. This isn't shared with them.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field h-24 mb-4"
              placeholder="What happened?"
            />
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || reason.trim().length === 0}
                className="btn-danger flex-1"
              >
                {submitting ? "Sending…" : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

// Placeholders below are intentional: don't ship a guessed phone
// number for a crisis line. Before launch, fill these in with your
// campus counseling center's real number and a verified national
// crisis line for the country you're launching in.
const CAMPUS_COUNSELING = "[Add your campus counseling center's number]";
const NATIONAL_CRISIS_LINE = "[Add a verified national crisis line for your country]";

type Props = {
  onContinueAnyway: () => void;
  onClose: () => void;
};

export default function CrisisModal({ onContinueAnyway, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-ink-900/40 flex items-center justify-center px-6 z-50">
      <div className="bg-white rounded-card p-6 max-w-md w-full border-2 border-clay-500">
        <h2 className="font-display text-xl text-ink-900 mb-2">
          It sounds like things are really hard right now
        </h2>
        <p className="text-ink-700 text-sm mb-4">
          A fellow student can offer support, but they're not equipped to
          help with a crisis. Please reach out to one of these instead:
        </p>
        <ul className="text-sm text-ink-900 space-y-1 mb-4">
          <li>
            <span className="font-medium">Campus counseling:</span> {CAMPUS_COUNSELING}
          </li>
          <li>
            <span className="font-medium">Crisis line:</span> {NATIONAL_CRISIS_LINE}
          </li>
          <li>
            <a
              href="https://befrienders.org"
              target="_blank"
              rel="noreferrer"
              className="underline text-sage-600"
            >
              befrienders.org
            </a>{" "}
            &mdash; directory of crisis helplines worldwide
          </li>
        </ul>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-primary flex-1">
            Show me these resources
          </button>
          <button onClick={onContinueAnyway} className="btn-secondary flex-1 text-sm">
            Send message anyway
          </button>
        </div>
      </div>
    </div>
  );
}

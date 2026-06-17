"use client";

export type Topic = { id: number; name: string };
export type TopicSelection = Record<number, { kind: "strength" | "weakness" | null; rating: number }>;

type Props = {
  topics: Topic[];
  selections: TopicSelection;
  onChange: (selections: TopicSelection) => void;
};

export default function TopicSelector({ topics, selections, onChange }: Props) {
  function setKind(topicId: number, kind: "strength" | "weakness" | null) {
    const current = selections[topicId] ?? { kind: null, rating: 3 };
    onChange({ ...selections, [topicId]: { ...current, kind } });
  }

  function setRating(topicId: number, rating: number) {
    const current = selections[topicId] ?? { kind: null, rating: 3 };
    onChange({ ...selections, [topicId]: { ...current, rating } });
  }

  return (
    <div className="space-y-3">
      {topics.map((topic) => {
        const selection = selections[topic.id] ?? { kind: null, rating: 3 };
        return (
          <div
            key={topic.id}
            className="flex items-center justify-between gap-4 border border-ink-500/10 rounded-card px-4 py-3"
          >
            <span className="text-ink-900 text-sm font-medium">{topic.name}</span>
            <div className="flex items-center gap-3">
              {selection.kind && (
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={selection.rating}
                  onChange={(e) => setRating(topic.id, Number(e.target.value))}
                  className="w-24 accent-sage-600"
                  aria-label={`${topic.name} rating`}
                />
              )}
              <div className="flex rounded-card overflow-hidden border border-ink-500/20 text-xs">
                <button
                  type="button"
                  onClick={() => setKind(topic.id, selection.kind === "strength" ? null : "strength")}
                  className={`px-3 py-1.5 ${
                    selection.kind === "strength" ? "bg-sage-600 text-white" : "bg-white text-ink-700"
                  }`}
                >
                  Strength
                </button>
                <button
                  type="button"
                  onClick={() => setKind(topic.id, selection.kind === "weakness" ? null : "weakness")}
                  className={`px-3 py-1.5 border-l border-ink-500/20 ${
                    selection.kind === "weakness" ? "bg-gold-500 text-white" : "bg-white text-ink-700"
                  }`}
                >
                  Working on it
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

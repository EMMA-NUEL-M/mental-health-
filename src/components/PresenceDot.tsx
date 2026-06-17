export default function PresenceDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
      <span
        className={`h-2 w-2 rounded-full ${online ? "bg-sage-500" : "bg-ink-500/30"}`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

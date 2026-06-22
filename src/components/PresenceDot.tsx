import { formatRelativeTime } from "@/lib/formatRelativeTime";

type Props = {
  online: boolean;
  lastSeen?: string;
};

// Consider someone offline if their last_seen is older than 45 seconds,
// regardless of what the is_online flag says. This catches cases where
// the tab was closed on mobile without firing beforeunload.
function isRecentlyActive(lastSeen?: string): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 45000;
}

export default function PresenceDot({ online, lastSeen }: Props) {
  const actuallyOnline = online && isRecentlyActive(lastSeen);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
      <span
        className={`h-2 w-2 rounded-full ${actuallyOnline ? "bg-sage-500" : "bg-ink-500/30"}`}
      />
      {actuallyOnline
        ? "Online"
        : lastSeen
        ? `Last seen ${formatRelativeTime(lastSeen)}`
        : "Offline"}
    </span>
  );
}
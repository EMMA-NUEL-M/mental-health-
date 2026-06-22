import { formatRelativeTime } from "@/lib/formatRelativeTime";

type Props = {
  online: boolean;
  lastSeen?: string;
};

export default function PresenceDot({ online, lastSeen }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
      <span
        className={`h-2 w-2 rounded-full ${online ? "bg-sage-500" : "bg-ink-500/30"}`}
      />
      {online ? "Online" : lastSeen ? `Last seen ${formatRelativeTime(lastSeen)}` : "Offline"}
    </span>
  );
}

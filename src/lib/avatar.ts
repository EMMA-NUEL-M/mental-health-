// Deterministically turns a display name into a fun, consistent avatar
// (an animal emoji on a colored circle). No database column needed -
// any page that knows someone's display name can compute the same
// avatar locally, and it updates automatically if the name changes.

const AVATAR_EMOJIS = [
  "🦊", "🐻", "🐼", "🦉", "🐢", "🦋", "🐧", "🐬", "🦁", "🐯",
  "🐨", "🐰", "🦄", "🐝", "🦔", "🐙", "🦦", "🐺", "🦅", "🐸",
];

const AVATAR_COLORS = ["bg-sage-500", "bg-sage-600", "bg-gold-500", "bg-clay-500"];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAvatarForName(name: string): { emoji: string; bgClass: string } {
  const trimmed = name.trim() || "?";
  const hash = hashString(trimmed);
  const emoji = AVATAR_EMOJIS[hash % AVATAR_EMOJIS.length];
  const bgClass = AVATAR_COLORS[Math.floor(hash / AVATAR_EMOJIS.length) % AVATAR_COLORS.length];
  return { emoji, bgClass };
}
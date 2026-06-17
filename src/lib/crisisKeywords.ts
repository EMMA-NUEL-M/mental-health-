// Lightweight client-side safety net. This is NOT a substitute for
// moderation or professional triage - it exists only to interrupt a
// message before it's sent and redirect someone toward real help.
// Keep this list short and high-precision; the goal is to catch clear
// statements of intent, not to police ordinary venting about a bad day.
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bsuicid(e|al)\b/i,
  /\bwant to die\b/i,
  /\bdon'?t want to (be alive|live)\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bself[\s-]?harm\b/i,
  /\bno reason to (live|go on)\b/i,
];

export function containsCrisisLanguage(text: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}

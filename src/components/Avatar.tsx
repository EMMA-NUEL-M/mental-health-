import { getAvatarForName } from "@/lib/avatar";

type Props = {
  name: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-8 w-8 text-base",
  md: "h-12 w-12 text-2xl",
  lg: "h-16 w-16 text-3xl",
};

export default function Avatar({ name, size = "md" }: Props) {
  const { emoji, bgClass } = getAvatarForName(name);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${bgClass} ${SIZE_CLASSES[size]}`}
      aria-hidden="true"
    >
      {emoji}
    </span>
  );
}
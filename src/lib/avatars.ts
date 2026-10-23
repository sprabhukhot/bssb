/** Built-in fun avatar set for image-choice fields (emoji + CSS motion). */
export type FunAvatar = {
  id: string;
  emoji: string;
  label: string;
};

export const FUN_AVATARS: FunAvatar[] = [
  { id: "lotus", emoji: "🪷", label: "Lotus" },
  { id: "diya", emoji: "🪔", label: "Diya" },
  { id: "marigold", emoji: "🌼", label: "Marigold" },
  { id: "peacock", emoji: "🦚", label: "Peacock" },
  { id: "drum", emoji: "🥁", label: "Drum" },
  { id: "sparkles", emoji: "✨", label: "Sparkles" },
  { id: "sun", emoji: "☀️", label: "Sun" },
  { id: "moon", emoji: "🌙", label: "Moon" },
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "heart", emoji: "🧡", label: "Heart" },
  { id: "tea", emoji: "🍵", label: "Chai" },
  { id: "dance", emoji: "💃", label: "Dance" },
];

export function getAvatar(id: string | undefined | null): FunAvatar | null {
  if (!id) return null;
  return FUN_AVATARS.find((a) => a.id === id) ?? null;
}

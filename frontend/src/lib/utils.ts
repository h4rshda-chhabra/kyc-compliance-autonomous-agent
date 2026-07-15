import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strips markdown formatting and returns the first `lines` non-empty lines,
// joined, for use as a card preview of a longer narrative document.
export function previewLines(markdown: string, lines = 2): string {
  const plain = markdown
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*]\s+/, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/[_`>]/g, "")
    )
    .filter((line) => line && !/^-{3,}$/.test(line))

  return plain.slice(0, lines).join(" ")
}

export function userInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

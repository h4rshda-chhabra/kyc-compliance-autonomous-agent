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

// SCREAMING_SNAKE_CASE / snake_case -> "Title Case", for any backend enum
// value that gets rendered directly instead of through a dedicated badge.
function titleCaseFromSnakeCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  sanction: "Sanctions Match",
  adverse_media: "Adverse Media",
  connected_entity: "Related Entity Risk",
}

// Maps a raw evidence_type enum value to the label a compliance reviewer
// should see, falling back to a title-cased version for any new type.
export function evidenceTypeLabel(evidenceType: string): string {
  return EVIDENCE_TYPE_LABELS[evidenceType] ?? titleCaseFromSnakeCase(evidenceType)
}

// "COMPLIANCE_OFFICER" -> "Compliance Officer", "ADMIN" -> "Admin"
export function roleLabel(role: string): string {
  return titleCaseFromSnakeCase(role)
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

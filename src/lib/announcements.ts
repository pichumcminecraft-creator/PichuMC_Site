// Workaround for adding an "audience" field without a DB migration.
// Audience is encoded as a marker prefix in the announcement `content` column:
//   [[audience:staff]]   -> staff intern (default)
//   [[audience:public]]  -> visible on public site
//
// All read/write goes through these helpers so the rest of the app is clean.

export type Audience = "staff" | "public";

const MARKER_RE = /^\[\[audience:(staff|public)\]\]\n?/;

export function parseAnnouncement<T extends { content?: string | null }>(
  a: T,
): T & { audience: Audience; cleanContent: string } {
  const raw = a.content || "";
  const match = raw.match(MARKER_RE);
  const audience: Audience = (match?.[1] as Audience) || "staff";
  const cleanContent = raw.replace(MARKER_RE, "");
  return { ...a, audience, cleanContent };
}

export function encodeAnnouncementContent(content: string, audience: Audience): string {
  return `[[audience:${audience}]]\n${content || ""}`;
}

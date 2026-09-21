// What "pick for us" showed recently, remembered for this visit so "not today" never bounces straight back.
// Shared by the Home card and the Saturday sheet so they don't repeat each other either.
const recent: string[] = [];

export const recentPicks = (): readonly string[] => recent;

export function rememberPick(id: string) {
  recent.push(id);
  if (recent.length > 6) recent.shift();
}

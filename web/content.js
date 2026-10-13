// Ship gate. A new set stays hidden (no Today, Practice, placement, clubs or Lessons list) until the owner has said
// the method for every kind of question in it out loud, unaided, on the explain-it check at #/draft/<set>, and,
// where the topic needs one, a named reviewer has checked it. Going live is a commit that fills in `explained`.
// Sets built before the gate are not listed here and count as live.
export const CONTENT = {
  mna: { v: 1, status: "draft", explained: null, reviewer: null, needsReviewer: false },
};

export function isLive(set, content = CONTENT) {
  const c = content[set];
  if (!c) return true;
  return c.status === "live" && /^\d{4}-\d{2}-\d{2}$/.test(c.explained ?? "") && (!c.needsReviewer || Boolean(c.reviewer));
}
export const draftSets = (content = CONTENT) => Object.keys(content).filter((s) => !isLive(s, content));

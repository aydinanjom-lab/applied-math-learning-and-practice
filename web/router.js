// Hash routes so every page has an address and the back button works. No framework.
export const TABS = [
  { id: "today", path: "#/", label: "Today" },
  { id: "practice", path: "#/practice", label: "Practice" },
  { id: "lessons", path: "#/lessons", label: "Lessons" },
  { id: "progress", path: "#/progress", label: "Progress" },
  { id: "you", path: "#/you", label: "You" },
];

// Pattern -> route name. ":x" captures one path segment.
const ROUTES = [
  ["/", "today"], ["/practice", "practice"], ["/set/:id", "set"], ["/runs", "runs"],
  ["/lessons", "lessons"], ["/lesson/:id", "lesson"], ["/glossary", "glossary"], ["/card", "card"], ["/explain/:name", "explain"],
  ["/progress", "progress"],
  ["/you", "you"], ["/account", "account"], ["/priorities", "priorities"], ["/about", "about"],
  ["/join/:code", "join"], ["/s/:short", "clubSession"], ["/club", "club"],
  ["/session", "session"],
];

// Which tab a route lights up.
const TAB_OF = { today: "today", practice: "practice", set: "practice", runs: "practice", lessons: "lessons", lesson: "lessons", glossary: "lessons", card: "lessons", explain: "lessons", progress: "progress", you: "you", account: "you", priorities: "you", about: "you", join: "you", club: "you", clubSession: "practice" };

export function parseRoute(hash) {
  let path = String(hash ?? "").replace(/^#/, "");
  if (!path.startsWith("/")) path = "/" + path;
  path = path.replace(/\/+$/, "") || "/";
  const segs = path.split("/").slice(1);
  for (const [pattern, name] of ROUTES) {
    const ps = pattern.split("/").slice(1);
    if (ps.length !== segs.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].startsWith(":")) params[ps[i].slice(1)] = decodeURIComponent(segs[i]);
      else if (ps[i] !== segs[i]) { ok = false; break; }
    }
    if (ok) return { name, params, tab: TAB_OF[name] ?? null };
  }
  return { name: "today", params: {}, tab: "today", unknown: true };
}

export const tabFor = (name) => TAB_OF[name] ?? null;

// Spoken answers, for the voice test page only (#/voice). Nothing here is used in sessions until the phone test passes.
// Speech engines return digits ("33.3") or words ("thirty three point three"); both become a number, or null.
import { parseAnswer } from "./core.js";

const ONES = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { thousand: 1e3, million: 1e6, billion: 1e9 };

export function spokenNumber(text) {
  let t = String(text ?? "").toLowerCase().trim()
    .replace(/[?!]/g, "").replace(/\.$/, "")
    .replace(/\b(percent|per cent|dollars?|bucks|x|times|to one)\b/g, "")
    .replace(/(\d),(?=\d{3})/g, "$1")
    .replace(/\b(\d{1,2}):(\d\d)\b/g, "$1$2") // "12:50" heard as a time
    .replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  let sign = 1;
  if (/^(negative|minus) /.test(t)) { sign = -1; t = t.replace(/^(negative|minus) /, ""); }
  // "4.5 million", "4.5m"
  const mixed = t.match(/^([\d.]+) (thousand|million|billion)$/);
  if (mixed) { const v = parseAnswer(mixed[1]); return v === null ? null : sign * v * SCALES[mixed[2]]; }
  const digits = parseAnswer(t.replace(/ /g, ""));
  if (digits !== null && /\d/.test(t)) return sign * digits;
  const words = t.replace(/\band\b/g, " ").replace(/\ba (hundred|thousand|million|billion)\b/g, "one $1").split(" ").filter(Boolean);
  let total = 0, current = 0, seen = false, i = 0;
  for (; i < words.length; i++) {
    const w = words[i];
    if (w === "point") break;
    if (w in ONES || w in TENS) {
      const v = ONES[w] ?? TENS[w];
      // "twelve fifty" is 1,250 and "nineteen ninety" 1,990; "twenty five" is 25.
      current = current >= 10 && current % 100 !== 0 && v >= 10 ? current * 100 + v : current + v;
    }
    else if (w === "hundred") current = (current || 1) * 100;
    else if (w in SCALES) { total += (current || 1) * SCALES[w]; current = 0; }
    else if (/^\d+$/.test(w)) current += Number(w);
    else return null;
    seen = true;
  }
  let value = total + current;
  if (i < words.length) {
    const rest = words.slice(i + 1);
    if (!rest.length) return null;
    let frac = "";
    for (const w of rest) {
      if (w in ONES && ONES[w] < 10) frac += String(ONES[w]);
      else if (/^\d+$/.test(w)) frac += w;
      else return null;
    }
    value += Number("0." + frac);
    seen = true;
  }
  return seen ? sign * value : null;
}

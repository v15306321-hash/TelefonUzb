/**
 * Lightweight in-memory product search: understands brand/model names typed in
 * Cyrillic ("айфон 17", "самсунг ультра"), Latin and Uzbek Latin, matches
 * by model, brand, category, memory, colour and specification values.
 */

const SYNONYMS: [RegExp, string][] = [
  [/айфон|айфоун/g, "iphone"],
  [/айпад/g, "ipad"],
  [/эпл|эппл|апл|аппл|эйпл/g, "apple"],
  [/самсунг|самсанг/g, "samsung"],
  [/галакси|гэлакси|галакси/g, "galaxy"],
  [/сяоми|ксиоми|шаоми|ксяоми/g, "xiaomi"],
  [/редми/g, "redmi"],
  [/поко/g, "poco"],
  [/пиксель|пиксел/g, "pixel"],
  [/гугл|гугол/g, "google"],
  [/хонор/g, "honor"],
  [/хуавей|хуавэй/g, "huawei"],
  [/реалми/g, "realme"],
  [/виво/g, "vivo"],
  [/оппо/g, "oppo"],
  [/ванплас|ванплюс|уанплас/g, "oneplus"],
  [/техно/g, "tecno"],
  [/инфиникс/g, "infinix"],
  [/нотхинг|нафинг/g, "nothing"],
  [/ультра/g, "ultra"],
  [/макс/g, "max"],
  [/плюс/g, "plus"],
  [/про\b/g, "pro"],
  [/фолд/g, "fold"],
  [/флип/g, "flip"],
  [/гб\b/g, "gb"],
  [/тб\b/g, "tb"],
];

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

export function normalize(input: string): string {
  let s = input.toLowerCase().normalize("NFKC");
  s = s.replace(/[‘’ʻʼ`']/g, "");
  for (const [re, rep] of SYNONYMS) s = s.replace(re, ` ${rep} `);
  s = s.replace(/[а-яёўқғҳ]/g, (ch) => CYR[ch] ?? ch);
  // "256gb" -> "256 gb", "s25ultra" stays but split letters/numbers boundary for memory sizes
  s = s.replace(/(\d)(gb|tb)\b/g, "$1 $2");
  return s.replace(/[^a-z0-9.+]+/g, " ").replace(/\s+/g, " ").trim();
}

export type SearchDoc = {
  id: string;
  primary: string; // name + brand
  secondary: string; // category, memory, colours, specs, description
};

export function buildDoc(id: string, primary: string[], secondary: string[]): SearchDoc {
  return { id, primary: ` ${normalize(primary.join(" "))} `, secondary: ` ${normalize(secondary.join(" "))} ` };
}

/** Returns matching ids sorted by relevance. Every query token has to match. */
export function searchDocs(docs: SearchDoc[], query: string): string[] {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (!tokens.length) return docs.map((d) => d.id);
  const scored: { id: string; score: number }[] = [];
  for (const doc of docs) {
    let score = 0;
    let ok = true;
    for (const tok of tokens) {
      if (doc.primary.includes(` ${tok} `)) score += 10;
      else if (doc.primary.includes(` ${tok}`)) score += 7;
      else if (doc.primary.includes(tok)) score += 4;
      else if (doc.secondary.includes(` ${tok}`)) score += 2;
      else if (tok.length >= 3 && doc.secondary.includes(tok)) score += 1;
      else {
        ok = false;
        break;
      }
    }
    // prefer shorter (more exact) names on equal match quality
    if (ok) scored.push({ id: doc.id, score: score - doc.primary.length * 0.01 });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.id);
}

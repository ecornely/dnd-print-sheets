/**
 * Résolution de chemins dans le JSON du personnage : "abilities.STR.score",
 * "spells.0.name", etc. Retourne undefined au premier maillon manquant.
 */
export function resolveData(root: unknown, expr: string): unknown {
  if (expr === "") return root;
  let cur: unknown = root;
  for (const part of expr.split(".")) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(part);
      cur = Number.isInteger(idx) ? cur[idx] : undefined;
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") return value ? "✓" : "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value).trim();
  return text === "" ? "—" : text;
}

/** Formate un modificateur signé : +1, -1, +0 */
export function signed(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  return num >= 0 ? `+${num}` : `${num}`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

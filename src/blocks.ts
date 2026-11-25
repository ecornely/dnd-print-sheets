/**
 * Rendu HTML de chaque type de block. Un block reçoit le personnage entier
 * et rend une chaîne HTML ; la classe CSS suit le type du block, le style
 * vit entièrement dans le CSS du thème.
 */
import type { AnyBlock, FillControl, FillColumn } from "./theme.js";
import { resolveData, formatValue, signed, escapeHtml } from "./data.js";

const e = escapeHtml;

/** Bouton de retrait d'une ligne de tableau (masqué à l'impression). */
const removeCell = '<button class="rm no-print" type="button" aria-label="Retirer cette ligne">×</button>';

function attrs(block: AnyBlock): string {
  const classes = ["block", `block-${block.block}`, block.className].filter(Boolean).join(" ");
  return `class="${e(classes)}"`;
}

function section(title: string | undefined, inner: string): string {
  const head = title ? `<h2 class="block-title">${e(title)}</h2>` : "";
  return `${head}${inner}`;
}

/** Unité résolue dans le personnage, entre parenthèses (ex. « lb », « m »).
 *  Les unités viennent des données (meta.units), jamais du thème. */
function unitSuffix(character: unknown, unitPath: string | undefined): string {
  if (!unitPath) return "";
  const unit = resolveData(character, unitPath);
  return typeof unit === "string" && unit ? ` (${e(unit)})` : "";
}

export function renderBlock(block: AnyBlock, character: unknown): string {
  switch (block.block) {
    case "header":
      return renderHeader(block, character);
    case "heading":
      return renderHeading(block);
    case "text":
      return renderText(block, character);
    case "stats":
      return renderStats(block, character);
    case "abilities":
      return renderAbilities(block, character);
    case "savingThrows":
      return renderSavingThrows(block, character);
    case "skills":
      return renderSkills(block, character);
    case "proficiencyGroups":
      return renderProficiencyGroups(block, character);
    case "defenses":
      return renderDefenses(block, character);
    case "table":
      return renderTable(block, character);
    case "defList":
      return renderDefList(block, character);
    case "coins":
      return renderCoins(block, character);
    case "spells":
      return renderSpells(block, character);
    case "paragraphs":
      return renderParagraphs(block, character);
    case "free":
      return renderFree(block, character);
    case "identity":
      return renderIdentity(block, character);
    case "abilitySheet":
      return renderAbilitySheet(block, character);
    case "fillBox":
      return renderFillBox(block, character);
    case "fillTable":
      return renderFillTable(block, character);
    case "spellSlots":
      return renderSpellSlots(block, character);
    case "spellTables":
      return renderSpellTables(block, character);
    case "container":
      return renderContainer(block, character);
    /* istanbul ignore next */
    default:
      return "";
  }
}

function renderHeader(block: Extract<AnyBlock, { block: "header" }>, character: unknown): string {
  const name = e(formatValue(resolveData(character, "name")));
  const fields = (block.fields ?? [])
    .map((f) => {
      const raw = resolveData(character, f.path);
      return `<span class="header-field"><span class="header-field-label">${e(f.label)}</span> <span class="header-field-value">${e(formatValue(raw))}</span></span>`;
    })
    .join("");
  return `<header ${attrs(block)}><h1 class="header-name">${name}</h1><div class="header-fields">${fields}</div></header>`;
}

function renderHeading(block: Extract<AnyBlock, { block: "heading" }>): string {
  const classes = ["sheet-h1", `block-${block.block}`, block.className].filter(Boolean).join(" ");
  return `<h1 class="${e(classes)}">${e(blockTitle(block) ?? "")}</h1>`;
}

function renderText(block: Extract<AnyBlock, { block: "text" }>, character: unknown): string {
  const value = e(formatValue(resolveData(character, block.path)));
  return `<div ${attrs(block)}>${section(block.title, `<p class="text-value">${value}</p>`)}</div>`;
}

function renderStats(block: Extract<AnyBlock, { block: "stats" }>, character: unknown): string {
  const boxes = block.items
    .map((item) => {
      const raw = item.path !== undefined ? resolveData(character, item.path) : undefined;
      const isSigned = item.suffix === "signed";
      const value = isSigned ? signed(raw) : formatValue(raw);
      const suffix = isSigned ? "" : item.suffix ?? "";
      const id = item.id ? ` id="${e(item.id)}"` : "";
      let body: string;
      if (item.control === "input") {
        const type = item.type === "number" ? ' type="number"' : "";
        body = `<input${id}${type} value="${e(value)}"${item.path !== undefined ? ' data-bound="1"' : ""}>`;
      } else if (item.control === "output") {
        body = `<output${id}>${e(value)}</output>`;
      } else {
        body = `<div class="stat-value">${e(value)}${suffix ? `<span class="stat-suffix">${e(suffix)}</span>` : ""}</div>`;
      }
      return `<div class="stat-box"><div class="stat-label">${e(item.label)}</div>${body}</div>`;
    })
    .join("");
  return `<div ${attrs(block)}><div class="stat-grid">${boxes}</div></div>`;
}

function renderAbilities(block: Extract<AnyBlock, { block: "abilities" }>, character: unknown): string {
  const data = resolveData(character, block.path) as Record<string, { score?: number; modifier?: number }> | undefined;
  if (!data || typeof data !== "object") return "";
  const keys = block.keys ?? Object.keys(data);
  const cells = keys
    .filter((k) => data[k])
    .map((k) => {
      const label = block.labels?.[k] ?? k;
      const { score, modifier } = data[k];
      return `<div class="ability-box"><div class="ability-label">${e(label)}</div><div class="ability-modifier">${e(signed(modifier))}</div><div class="ability-score">${e(formatValue(score))}</div></div>`;
    })
    .join("");
  return `<div ${attrs(block)}><div class="ability-grid">${cells}</div></div>`;
}

function renderSavingThrows(block: Extract<AnyBlock, { block: "savingThrows" }>, character: unknown): string {
  const data = resolveData(character, block.path) as Record<string, { value?: number; proficient?: boolean }> | undefined;
  if (!data || typeof data !== "object") return "";
  const rows = Object.entries(data)
    .map(([key, st]) => {
      const label = block.labels?.[key] ?? key;
      const dot = st.proficient ? '<span class="prof-dot prof-full" title="Maîtrise">●</span>' : '<span class="prof-dot prof-none">○</span>';
      return `<div class="save-row">${dot}<span class="save-name">${e(label)}</span><span class="save-value">${e(signed(st.value))}</span></div>`;
    })
    .join("");
  return `<div ${attrs(block)}>${section(blockTitle(block), `<div class="save-list">${rows}</div>`)}</div>`;
}

function blockTitle(block: object): string | undefined {
  return (block as { title?: string }).title;
}

function renderSkills(block: Extract<AnyBlock, { block: "skills" }>, character: unknown): string {
  const skills = resolveData(character, block.path) as
    | { name: string; ability?: string; value?: number; proficiency?: string }[]
    | undefined;
  if (!Array.isArray(skills)) return "";
  const symbols: Record<string, string> = {
    none: "○",
    half: "◐",
    proficient: "●",
    expertise: "⊗",
    ...(block.proficiencySymbols ?? {}),
  };
  const rows = skills
    .map((skill) => {
      const symbol = symbols[skill.proficiency ?? "none"] ?? "○";
      const profClass = `prof-${skill.proficiency ?? "none"}`;
      const ability = skill.ability ? `<span class="skill-ability">${e(skill.ability)}</span>` : "";
      return `<div class="skill-row"><span class="prof-dot ${profClass}">${symbol}</span><span class="skill-value">${e(signed(skill.value))}</span><span class="skill-name">${e(skill.name)}</span>${ability}</div>`;
    })
    .join("");
  return `<div ${attrs(block)}>${section(blockTitle(block), `<div class="skill-list">${rows}</div>`)}</div>`;
}

function renderProficiencyGroups(block: Extract<AnyBlock, { block: "proficiencyGroups" }>, character: unknown): string {
  const data = resolveData(character, block.path) as Record<string, string[]> | undefined;
  if (!data || typeof data !== "object") return "";
  const groups = Object.entries(data)
    .filter(([, list]) => Array.isArray(list) && list.length > 0)
    .map(([key, list]) => {
      const label = block.labels?.[key] ?? key;
      return `<div class="prof-group"><h3 class="prof-group-label">${e(label)}</h3><p class="prof-group-items">${e(list.join(", "))}</p></div>`;
    })
    .join("");
  return `<div ${attrs(block)}>${section(blockTitle(block), `<div class="prof-groups">${groups}</div>`)}</div>`;
}

/** Normalise un item de défense : string ou objet {value} (extrait DDB). */
function defenseValue(raw: unknown): string | null {
  if (typeof raw === "string") return raw.trim() || null;
  if (raw && typeof raw === "object") {
    const v = resolveData(raw, "value");
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function renderDefenses(block: Extract<AnyBlock, { block: "defenses" }>, character: unknown): string {
  const data = resolveData(character, block.path) as Record<string, unknown[]> | undefined;
  if (!data || typeof data !== "object") return "";
  const groups = Object.entries(data)
    .map(([key, list]) => {
      if (!Array.isArray(list)) return "";
      const values = list.map(defenseValue).filter((v): v is string => v !== null);
      if (values.length === 0) return "";
      const label = block.labels?.[key] ?? key;
      return `<div class="prof-group"><h3 class="prof-group-label">${e(label)}</h3><p class="prof-group-items">${e(values.join(", "))}</p></div>`;
    })
    .filter(Boolean)
    .join("");
  if (!groups) return "";
  return `<div ${attrs(block)}>${section(blockTitle(block), `<div class="prof-groups">${groups}</div>`)}</div>`;
}

function renderTable(block: Extract<AnyBlock, { block: "table" }>, character: unknown): string {
  const items = resolveData(character, block.path) as Record<string, unknown>[] | undefined;
  if (!Array.isArray(items) || items.length === 0) return "";
  const head = block.columns
    .map((c) => `<th>${e(c.title ?? c.field)}</th>`)
    .join("");
  const body = items
    .map(
      (item) =>
        `<tr>${block.columns
          .map((c) => `<td>${e(formatValue(resolveData(item, c.field)))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<div ${attrs(block)}>${section(blockTitle(block), `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`)}</div>`;
}

function renderDefList(block: Extract<AnyBlock, { block: "defList" }>, character: unknown): string {
  const items = resolveData(character, block.path) as Record<string, unknown>[] | undefined;
  if (!Array.isArray(items) || items.length === 0) return "";
  const nameField = block.nameField ?? "name";
  const entries = items
    .map((item) => {
      const name = e(formatValue(resolveData(item, nameField)));
      const subtitles = (block.subtitleFields ?? [])
        .map((f) => e(formatValue(resolveData(item, f))))
        .filter((v) => v !== "—")
        .join(" · ");
      const sub = subtitles ? `<span class="def-subtitle">${subtitles}</span>` : "";
      const desc = block.descriptionField ? resolveData(item, block.descriptionField) : undefined;
      const descHtml =
        desc !== undefined && desc !== null && String(desc).trim() !== ""
          ? `<p class="def-description">${e(String(desc))}</p>`
          : "";
      return `<div class="def-entry"><div class="def-name">${name}${sub}</div>${descHtml}</div>`;
    })
    .join("");
  return `<div ${attrs(block)}>${section(blockTitle(block), `<div class="def-list">${entries}</div>`)}</div>`;
}

function renderCoins(block: Extract<AnyBlock, { block: "coins" }>, character: unknown): string {
  const data = resolveData(character, block.path) as Record<string, number> | undefined;
  if (!data || typeof data !== "object") return "";
  const boxes = Object.entries(data)
    .map(([key, value]) => {
      const label = block.labels?.[key] ?? key.toUpperCase();
      return `<div class="coin-box"><div class="coin-value">${e(formatValue(value))}</div><div class="coin-label">${e(label)}</div></div>`;
    })
    .join("");
  return `<div ${attrs(block)}>${section(blockTitle(block), `<div class="coin-grid">${boxes}</div>`)}</div>`;
}

function renderSpells(block: Extract<AnyBlock, { block: "spells" }>, character: unknown): string {
  const spells = resolveData(character, block.path) as
    | { name: string; level?: number; school?: string; castingTime?: string; range?: string; duration?: string; damaging?: boolean; prepared?: boolean }[]
    | undefined;
  if (!Array.isArray(spells) || spells.length === 0) return "";
  const levelLabels = block.levelLabels ?? {};
  const byLevel = new Map<number, typeof spells>();
  for (const spell of spells) {
    const level = spell.level ?? 0;
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(spell);
  }
  for (const list of byLevel.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const groups = levels
    .map((level) => {
      const label = levelLabels[String(level)] ?? (level === 0 ? (block.cantripLabel ?? "Cantrips") : `Niveau ${level}`);
      const rows = byLevel
        .get(level)!
        .map((spell) => {
          const dot =
            spell.prepared === true
              ? '<span class="prof-dot prof-full">●</span>'
              : spell.prepared === false
                ? '<span class="prof-dot prof-none">○</span>'
                : "";
          const meta = [spell.school, spell.castingTime, spell.range, spell.duration]
            .filter((s): s is string => typeof s === "string" && s !== "")
            .map(e)
            .join(" · ");
          return `<div class="spell-row">${dot}<span class="spell-name">${spell.damaging === true ? "⚔ " : ""}${e(spell.name)}</span><span class="spell-meta">${meta}</span></div>`;
        })
        .join("");
      return `<div class="spell-level"><h3 class="spell-level-label">${e(label)}</h3>${rows}</div>`;
    })
    .join("");
  return `<div ${attrs(block)}>${section(blockTitle(block), `<div class="spell-groups">${groups}</div>`)}</div>`;
}

function renderParagraphs(block: Extract<AnyBlock, { block: "paragraphs" }>, character: unknown): string {
  const raw = resolveData(character, block.path);
  if (raw === undefined || raw === null || String(raw).trim() === "") return "";
  const parts = String(raw)
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const html = parts.map((p) => `<p class="paragraph">${e(p)}</p>`).join("");
  return `<div ${attrs(block)}>${section(blockTitle(block), `<div class="paragraphs">${html}</div>`)}</div>`;
}

function renderFree(block: Extract<AnyBlock, { block: "free" }>, character: unknown): string {
  const rows = block.rows
    .map((row) => {
      const value = e(formatValue(resolveData(character, row.path)));
      return `<div class="free-row"><span class="free-label">${e(row.label)}</span><span class="free-value">${value}</span></div>`;
    })
    .join("");
  return `<div ${attrs(block)}>${section(blockTitle(block), `<div class="free-list">${rows}</div>`)}</div>`;
}

/* ============================================================
 * Blocs « fiche remplissable » : inputs/textareas/cercles préremplis
 * depuis le JSON, éditables à la main comme une fiche papier.
 * ============================================================ */

/** Valeur « fiche » : string/number, array joint par lignes/virgules,
 *  objets {value} des extraits DDB, tags HTML retirés pour les textarea.
 *  `template` : pour un array/objet, gabarit « {name} — {description} ». */
function fillValue(root: unknown, expr: string | undefined, join = ", ", template?: string): string | undefined {
  if (expr === undefined) return undefined;
  const raw = resolveData(root, expr);
  if (raw === undefined || raw === null) return undefined;
  let text: string;
  if (Array.isArray(raw)) {
    const parts = raw.map((item) => fillValue({ v: item }, "v", join, template) ?? "").filter(Boolean);
    text = parts.length ? parts.join(join) : "";
  } else if (template !== undefined && typeof raw === "object") {
    return template.replace(/\{([^}]+)\}/g, (_, token: string) => fillValue(raw, token, join) ?? "");
  } else if (typeof raw === "object") {
    if (resolveData(raw, "value") !== undefined) {
      text = String(resolveData(raw, "value") ?? "");
    } else {
      // Objet complexe (ex. defenses) : on aplatit ses valeurs récursivement
      const parts = Object.entries(raw as Record<string, unknown>)
        .map(([, v]) => fillValue({ v }, "v", join, template) ?? "")
        .filter(Boolean);
      text = parts.join(" ; ");
    }
  } else {
    text = String(raw);
  }
  // On retire les tags HTML et on normalise les espaces, ligne par ligne
  // pour préserver les retours à la ligne (un élément d'array = une ligne).
  text = text
    .replace(/<[^>]*>/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .trim();
  return text === "" ? undefined : text;
}

function renderIdentity(block: Extract<AnyBlock, { block: "identity" }>, character: unknown): string {
  const name = e(fillValue(character, block.namePath ?? "name") ?? "");
  const fields = (block.fields ?? [])
    .map((f) => {
      const value = e(fillValue(character, f.path, f.join ?? ", ", f.template) ?? "");
      const type = f.type === "number" ? ' type="number" min="1" max="20"' : "";
      const id = f.id ? ` id="${e(f.id)}"` : "";
      return `<div><label>${e(f.label)}</label><input${type}${id} value="${value}"></div>`;
    })
    .join("");
  const star = block.inspiration
    ? '<div class="st" style="text-align:center"><label>Inspiration</label><span class="t star" tabindex="0"></span></div>'
    : "";
  return `<div ${attrs(block)}><div class="head"><h1><input placeholder="Nom du personnage" aria-label="Nom" value="${name}" data-bound="1"></h1>${star}</div><div class="id">${fields}</div></div>`;
}

/** Une ligne « fiche » : cercle(s) de maîtrise + libellé + valeur. */
function sheetRow(label: string, value: string, circles: { on?: boolean; half?: boolean; hidden?: boolean }[], key?: string, isBound?: boolean): string {
  const dots = circles
    .map((c) => {
      const cls = ["t", "d", c.on ? "on" : "", c.half ? "half" : "", c.hidden ? "x" : ""].filter(Boolean).join(" ");
      return `<i class="${cls}"></i>`;
    })
    .join("");
  const k = key ? ` data-k="${e(key)}"` : "";
  const boundAttr = isBound ? ' data-bound="1"' : "";
  return `<div class="r"${k}${boundAttr}>${dots}<span class="l">${e(label)}</span><output>${e(value)}</output></div>`;
}

function proficiencyCircles(level: string | undefined): { on?: boolean; half?: boolean }[] {
  switch (level) {
    case "expertise":
      return [{ on: true }, { on: true }];
    case "proficient":
      return [{ on: true }, {}];
    case "half":
      return [{ half: true }, {}];
    default:
      return [{}, {}];
  }
}

function renderAbilitySheet(block: Extract<AnyBlock, { block: "abilitySheet" }>, character: unknown): string {
  const abilities = resolveData(character, block.abilitiesPath ?? "abilities") as
    | Record<string, { score?: number; modifier?: number }>
    | undefined;
  if (!abilities || typeof abilities !== "object") return "";
  type Skill = { name: string; ability?: string; value?: number; proficiency?: string };
  const savingThrows = resolveData(character, block.savingThrowsPath ?? "savingThrows") as
    | Record<string, { value?: number; proficient?: boolean }>
    | undefined;
  const skills = (resolveData(character, block.skillsPath ?? "skills") as Skill[] | undefined) ?? [];
  const sections = Object.entries(abilities)
    .map(([key, ab]) => {
      const label = block.keyLabels?.[key] ?? key;
      const boundOnes =
        ab.score !== undefined && ab.modifier !== undefined ? ' data-bound="1"' : "";
      const mod = signed(ab.modifier);
      const score = ab.score ?? 10;
      // Jet de sauvegarde : 2e cercle masqué (le point de maîtrise est le 1er)
      const save = savingThrows?.[key];
      const saveRow = save
        ? sheetRow("Jet de sauvegarde", signed(save.value), [{ on: save.proficient }, { hidden: true }], "Jet de sauvegarde", true)
        : "";
      const skillRows = skills
        .filter((s) => s.ability === key)
        .map((s) =>
          sheetRow(
            block.skillLabels?.[s.name] ?? s.name,
            signed(s.value),
            proficiencyCircles(s.proficiency),
            block.skillLabels?.[s.name] ?? s.name,
            true,
          ),
        )
        .join("");
      return `<section class="ab" data-ability="${e(key)}"${boundOnes}><h3>${e(label)}</h3><div>${saveRow}${skillRows}</div><div class="cir"><b class="mod">${e(mod)}</b><input class="sc" type="number" value="${score}" aria-label="Valeur de ${e(label)}"></div></section>`;
    })
    .join("");
  return `<div ${attrs(block)} id="abs">${sections}</div>`;
}

function renderControl(control: FillControl, character: unknown): string {
  const label =
    control.label !== undefined
      ? `<label>${e(control.label)}${unitSuffix(character, control.unitPath)}</label>`
      : "";
  const id = control.id ? ` id="${e(control.id)}"` : "";
  const placeholder = control.placeholder ? ` placeholder="${e(control.placeholder)}"` : "";
  const cls = control.className ? ` class="${e(control.className)}"` : "";
  const raw = control.path !== undefined ? resolveData(character, control.path) : undefined;
  const value = control.preset ?? (control.signed ? signed(raw) : fillValue(character, control.path, control.join ?? ", ", control.template)) ?? "";
  const reserved = value;
  const boundAttr = reserved && reserved !== "—" ? ' data-bound="1"' : "";
  switch (control.control) {
    case "textarea": {
      const rows = control.rows ? ` rows="${control.rows}"` : "";
      // Le minimum en hauteur vient des données (rows -> min-height inline),
      // pas du script : autogrow n'a plus qu'à coller height: scrollHeight.
      const min = control.rows ? ` style="min-height: calc(${control.rows} * 1.25em + 2px)"` : "";
      return `${label}<textarea${rows}${cls}${min}${placeholder}>${e(value)}</textarea>`;
    }
    case "output":
      return `${label}<output${id}${cls}${value && value !== "—" ? ' data-bound="1"' : ""}>${e(value)}</output>`;
    case "select": {
      const options = (control.options ?? [])
        .map((o) => `<option value="${e(o.value)}"${o.value === value ? " selected" : ""}>${e(o.label)}</option>`)
        .join("");
      return `${label}<select${id}>${options}</select>`;
    }
    case "circles": {
      const count = control.circleCount ?? 3;
      const on = Number(resolveData(character, control.onPath ?? "") ?? 0) || 0;
      const dots = Array.from({ length: count }, (_, i) => {
        const state = control.onPath && i < on ? ' class="t d on"' : ' class="t d"';
        const circleLabel = control.circleLabels?.[i];
        return `<span><i${state} tabindex="0"></i>${circleLabel ? `<span class="n">${e(circleLabel)}</span>` : ""}</span>`;
      }).join("");
      const note = control.note ? `<label style="font-size:6.3pt">${e(control.note)}</label>` : "";
      return `<div class="row"><small>${e(control.label ?? "")}</small>${dots}</div>${note}`;
    }
    case "star":
      return '<span class="t star" tabindex="0"></span>';
    case "note":
      return `<label style="font-size:6.3pt">${e(control.note ?? "")}</label>`;
    default: {
      const type = control.type === "number" ? ' type="number"' : "";
      const prefill = control.path !== undefined ? boundAttr : "";
      return `${label}<input${id}${cls}${type}${placeholder} value="${e(value)}"${prefill}>`;
    }
  }
}

/** boxAttrs qui accepte aussi spellSlots ( cadre « box » avec titre). */
function boxAttrs(
  block: Extract<AnyBlock, { block: "fillBox" | "fillTable" | "spellSlots" }>,
): string {
  const classes = ["box", "block", `block-${block.block}`, block.className].filter(Boolean).join(" ");
  return `class="${e(classes)}"`;
}

function renderFillBox(block: Extract<AnyBlock, { block: "fillBox" }>, character: unknown): string {
  const title = blockTitle(block);
  const head = title ? `<h3>${e(title)}</h3>` : "";
  const cell = block.cellBox ? ' class="cell"' : "";
  const body =
    block.grid !== undefined
      ? `<div class="g${block.grid}">${block.controls.map((c) => `<div${cell}>${renderControl(c, character)}</div>`).join("")}</div>`
      : block.controls.map((c) => renderControl(c, character)).join("");
  return `<div ${boxAttrs(block)}>${head}${body}</div>`;
}

function renderFillTable(block: Extract<AnyBlock, { block: "fillTable" }>, character: unknown): string {
  const items = (resolveData(character, block.path ?? "") as Record<string, unknown>[] | undefined) ?? [];
  const thead = block.columns
    .map((c) => `<th${c.width ? ` style="width:${e(c.width)}"` : ""}>${e(c.title)}${unitSuffix(character, c.unitPath)}</th>`)
    .join("");
  const cell = (col: FillColumn, item: Record<string, unknown> | undefined, isLast = false): string => {
    if (col.checkbox) {
      const checked = item !== undefined && col.path !== undefined && resolveData(item, col.path) === true;
      return `<td class="p"><i class="t cb${checked ? " on" : ""}"></i></td>`;
    }
    if (col.control === "output") {
      const outcls = col.inputClass ? ` class="${e(col.inputClass)}"` : "";
      return `<td><output${outcls}></output></td>`;
    }
    const cls = col.inputClass ? ` class="${e(col.inputClass)}"` : "";
    const num = col.type === "number" ? ' type="number"' : "";
    const value = item === undefined ? "" : e(fillValue(item, col.path) ?? "");
    return `<td${isLast ? ' class="rm-cell"' : ""}><input${cls}${num} value="${value}">${isLast ? removeCell : ""}</td>`;
  };
  const row = (item?: Record<string, unknown>) =>
    `<tr>${block.columns.map((col, i) => cell(col, item, i === block.columns.length - 1)).join("")}</tr>`;
  const blanks = Math.max(0, (block.extra ?? 0) - items.length);
  const rows = items.map((item) => row(item)).join("") + Array.from({ length: blanks }, () => row()).join("");
  const title = blockTitle(block);
  const head = title ? `<h3>${e(title)}</h3>` : "";
  const add = '<button class="add no-print" type="button">+ ligne</button>';
  return `<div ${boxAttrs(block)}>${head}<table><thead><tr>${thead}</tr></thead><tbody>${rows}</tbody></table>${add}</div>`;
}

function renderSpellSlots(block: Extract<AnyBlock, { block: "spellSlots" }>, character: unknown): string {
  const fromData = resolveData(character, block.path ?? "spellSlots") as number[] | undefined;
  // Absent du JSON (anciens extraits) → defaults du thème ; présent (même
  // vide, non-incantateur) → les données font foi.
  const slots = Array.isArray(fromData) ? fromData : block.defaults ?? [];
  const levels = Array.from({ length: 9 }, (_, i) => {
    const count = slots[i] ?? 0;
    return `<div class="sl"><b>Niv. ${i + 1}</b><input type="number" min="0" max="9" value="${count}" data-n="${i}"><span class="bx"></span></div>`;
  }).join("");
  const inner = `<div id="slots">${levels}</div>`;
  if (!block.title && !block.className) return `<div ${attrs(block)}>${inner}</div>`;
  return `<div ${boxAttrs(block)}><h3>${e(blockTitle(block) ?? "")}</h3>${inner}</div>`;
}

function renderContainer(block: Extract<AnyBlock, { block: "container" }>, character: unknown): string {
  const inner = block.blocks.map((child) => renderBlock(child, character)).join("\n");
  return `<div ${attrs(block)}>${inner}</div>`;
}

function renderSpellTables(block: Extract<AnyBlock, { block: "spellTables" }>, character: unknown): string {
  const spells = (resolveData(character, block.path ?? "spells") as
    | { name: string; level?: number; castingTime?: unknown; range?: unknown; duration?: unknown; damaging?: boolean; prepared?: boolean }[]
    | undefined) ?? [];
  const byLevel = new Map<number, typeof spells>();
  for (const spell of spells) {
    const level = spell.level ?? 0;
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(spell);
  }
  for (const list of byLevel.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
  }
  const emptyRows = block.emptyRows ?? 4;
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const rowHtml = (spell?: (typeof spells)[number], hasPrep = false) =>
    `<tr><td class="p">${hasPrep && spell?.prepared === true ? '<i class="t cb on"></i>' : hasPrep ? '<i class="t cb"></i>' : ""}</td>` +
    `<td><input value="${spell?.damaging ? "⚔ " : ""}${e(spell?.name ?? "")}"></td>` +
    `<td><input value="${e(fillValue({ v: spell?.castingTime }, "v") ?? "")}"></td>` +
    `<td><input value="${e(fillValue({ v: spell?.range }, "v") ?? "")}"></td>` +
    `<td><input value="${e(fillValue({ v: spell?.duration }, "v") ?? "")}"></td><td class="rm-cell"><input>${removeCell}</td></tr>`;
  const headHtml = (hasPrep: boolean) =>
    `<thead><tr><th class="p" style="width:10mm">${hasPrep ? "Prép." : ""}</th><th style="width:36%">Sort</th><th style="width:13%">Incantation</th><th style="width:13%">Portée</th><th style="width:15%">Durée</th><th>Notes</th></tr></thead>`;
  const levelSection = (label: string, rows: string, hasPrep: boolean, cls = "") =>
    `<section class="lvl${cls}"><h3>${e(label)}</h3><table>${headHtml(hasPrep)}<tbody>${rows}</tbody></table>` +
    '<button class="add no-print" type="button">+ ligne</button>' +
    '<button class="rm-lvl no-print" type="button" aria-label="Retirer ce niveau">retirer ce niveau</button></section>';
  const tables = levels
    .map((level) => {
      const label = block.levelLabels?.[String(level)] ?? (level === 0 ? (block.cantripLabel ?? "Tours de magie") : `Niveau ${level}`);
      const rows = byLevel.get(level)!;
      const blanks = Math.max(0, emptyRows - rows.length);
      const body = rows.map((s) => rowHtml(s, level > 0)).join("") + Array.from({ length: blanks }, () => rowHtml(undefined, level > 0)).join("");
      return levelSection(label, body, level > 0);
    })
    .join("");
  // Gabarit masqué : « + niveau » le clone en table vide avec case « Prép. »
  const template = levelSection("", rowHtml(undefined, true), true, " lvl-template no-print");
  const nextLevel = (levels.length ? levels[levels.length - 1] : 0) + 1;
  return `<div ${attrs(block)} id="spells">${tables}${template}<button class="add-lvl no-print" type="button">+ Niveau ${nextLevel}</button></div>`;
}

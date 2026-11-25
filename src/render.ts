/**
 * Moteur de rendu : charge un thème (JSON), rend chaque page en HTML.
 * Un thème ne décide que de la structure ; le style vit dans le CSS du thème.
 */
import type { Theme, AnyBlock } from "./theme.js";
import { renderBlock } from "./blocks.js";
import { escapeHtml } from "./data.js";

const e = escapeHtml;

export const blockTypes: AnyBlock["block"][] = [
  "header",
  "heading",
  "text",
  "stats",
  "abilities",
  "savingThrows",
  "skills",
  "proficiencyGroups",
  "defenses",
  "table",
  "defList",
  "coins",
  "spells",
  "paragraphs",
  "free",
  "identity",
  "abilitySheet",
  "fillBox",
  "fillTable",
  "spellSlots",
  "spellTables",
  "container",
];

export function renderPages(theme: Theme, character: unknown): string {
  return theme.pages
    .map((page, index) => {
      const blocks = page.blocks.map((b) => renderBlock(b, character)).join("\n");
      const title = page.title ? `<h2 class="sheet-page-title">${e(page.title)}</h2>` : "";
      const footer = page.title ? `<div class="sheet-footer">${e(page.title)} — ${index + 1}/${theme.pages.length}</div>` : "";
      return `<section class="sheet-page" id="page-${index + 1}">\n<div class="sheet-content">\n${title}\n${blocks}\n</div>\n${footer}\n</section>`;
    })
    .join("\n");
}

export function renderTheme(theme: Theme, character: unknown): string {
  const pages = renderPages(theme, character);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${e(pageTitle(theme, character))}</title>
<link rel="stylesheet" href="style.css">
<script src="script.js" defer></script>
</head>
<body>
<main class="sheet">
${pages}
</main>
</body>
</html>
`;
}

function pageTitle(theme: Theme, character: unknown): string {
  const name = (character as { name?: string })?.name;
  return name ? `${name} — fiche de personnage` : "Fiche de personnage";
}

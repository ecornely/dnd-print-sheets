/**
 * Test de rendu sans framework : rend le personnage de la fixture avec le
 * thème default et vérifie le HTML produit. Lancé par `npm test`.
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTheme, renderPages } from "../src/render.js";
import type { Theme } from "../src/theme.js";

const here = dirname(fileURLToPath(import.meta.url));

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ok  ${label}`);
  } else {
    failures++;
    console.error(`FAIL  ${label}`);
  }
}

const theme: Theme = JSON.parse(await readFile(resolve(here, "../themes/default/theme.json"), "utf8"));
const character = JSON.parse(await readFile(resolve(here, "../fixtures/oros.character.json"), "utf8"));
const html = renderTheme(theme, character);

console.log("renderTheme (thème default, Oros)");

check("doctype présent", html.startsWith("<!DOCTYPE html>"));
check("4 pages A4", (html.match(/class="sheet-page"/g) ?? []).length === 4);
check("nom du personnage prérempli", html.includes('value="Oros Telluros"'));
check("6 feuilles de caractéristiques", (html.match(/class="ab"/g) ?? []).length === 6);
check("libellés FR des caractéristiques", html.includes(">Dextérité</h3>") && html.includes(">Sagesse</h3>"));
check("24 lignes caractère (6 saves + 18 compétences)", (html.match(/<div class="r"/g) ?? []).length === 24);
check("compétence FR (Athlétisme)", html.includes(">Athlétisme</span>"));
check("case Taille (sans Sens)", html.includes(">Taille</label>") && !html.includes("Sens &amp; taille"));
check("taille préremplie depuis la source", html.includes('>Taille</label><input class="sm" value="Medium"'));
check("maîtrises d'armes / d'armures", html.includes(">Maîtrises d'armes</h3>") && html.includes(">Maîtrises d'armures</h3>"));
check("maîtrises d'armes remplies depuis proficiencies.weapons", html.includes(">Simple Weapons</textarea>"));
check("maîtrises une par ligne (armures)", html.includes("Light Armor\nShields"));
check("textareas autogrow (12 : maîtrises×3, outils, langues, capacités, apparence, personnalité×4, alliés, objectifs)", (html.match(/<textarea[^>]*class="autogrow"/g) ?? []).length === 12);
check("PV actuels affiché mais vide (écrit au crayon)", html.includes(">Actuels</label><input value=\"\">"));
check("titres dans les cases à droite", html.includes(">Initiative</label>") && html.includes(">Bonus de maîtrise</label>"));
check("identité allégée (pas d'Historique / Joueur / XP)", !html.includes(">Historique</label>") && !html.includes(">Joueur</label>") && !html.includes(">Points d'expérience</label>"));
check("PV : titre + sous-titres Max/Temporaires", html.includes(">Points de vie</h3>") && html.includes(">Maximum</label>") && html.includes(">Temporaires</label>"));
check("9 lignes d'emplacements de sort", (html.match(/class="sl"/g) ?? []).length === 9);
check("36 lignes d'inventaire", (html.match(/<output class="tw">/g) ?? []).length === 36);
check("pas de boîte Bourse en page inventaire", !html.includes("Bourse, trésors, troc"));
check("Classe et Niveau empilés (colonne 1)", html.indexOf(">Classe</label>") < html.indexOf(">Sous-classe</label>") && html.indexOf(">Niveau</label>") < html.indexOf(">Espèce</label>"));
check("5 cases de monnaie", (html.match(/class="cell"/g) ?? []).length >= 11 && html.includes('value="25"'));
check("titre inventaire", html.includes("sheet-h1") && html.includes("Inventaire"));
check("sorts groupés par niveau", html.includes("Tours de magie") && html.includes("Niveau 1"));
check("3 tables de sorts (0 + 1 + 2, Pass without Trace)", (html.match(/<section class="lvl">/g) ?? []).length === 3 && html.includes('value="Pass without Trace"'));
check("bouton « + Niveau 3 » et gabarit de niveau masqué", html.includes('class="add-lvl no-print" type="button">+ Niveau 3') && html.includes('class="lvl lvl-template no-print"'));
check("bouton de retrait sur chaque ligne (×, non imprimé)", (html.match(/class="rm no-print"/g) ?? []).length >= 40);
check("« retirer ce niveau » sur chaque table + gabarit", (html.match(/class="rm-lvl no-print"/g) ?? []).length === 4);
check("sorts de don dans les tables (Mold Earth)", html.includes('value="Mold Earth"'));
check("emplacements : données du JSON (3 au niveau 1, 0 ensuite)", html.includes('value="3" data-n="0"') && html.includes('value="0" data-n="1"') && html.includes('value="0" data-n="8"'));
check("7 sorts préremplis", html.includes('value="Guidance"') && html.includes('value="⚔ Thunderclap"'));
check("table d'attaques : 6 lignes", (html.match(/block-fillTable attacks/g) ?? []).length === 1);
check("attaques préremplies (nom, bonus, dégâts)", html.includes('value="Club"') && html.includes('value="+3"') && html.includes('value="1d4+1 Bludgeoning"'));
check("script de thème lié", html.includes('<script src="script.js" defer></script>'));
check("footer de pagination", html.includes("1/4"));
check("feuille de style liée", html.includes('<link rel="stylesheet" href="style.css">'));

/** Blocs absents du fichier → rendus vides, sans crash */
const minimalTheme: Theme = {
  pages: [
    {
      blocks: [
        { block: "text", path: "backstory", title: "Histoire" },
        { block: "paragraphs", path: "backstory" },
        { block: "skills", path: "skills", title: "Compétences" },
        { block: "table", path: "attacks", title: "Attaques", columns: [{ field: "name" }] },
        { block: "spells", path: "spells" },
        { block: "coins", path: "coins" },
        { block: "free", rows: [{ label: "X", path: "nope.missing" }] },
      ],
    },
  ],
};
/** Personnage vide → blocs rendus vides, sans crash */
const minimalHtml = renderTheme(minimalTheme, {});
console.log("blocs sur données vides (personnage {})");
check("table vide → pas de <table>", !minimalHtml.includes("data-table"));
check("spells vides → pas de section", !minimalHtml.includes("spell-row"));
check("aucun crash", typeof minimalHtml === "string" && minimalHtml.length > 0);

/** renderPages : les pages seules, sans squelette HTML (utilisées par l'app web) */
const pages = renderPages(theme, character);
console.log("renderPages (thème default, Oros)");
check("pas de doctype (fragment à injecter)", !pages.includes("DOCTYPE"));
check("4 pages présentes", (pages.match(/class="sheet-page"/g) ?? []).length === 4);
check("nom du personnage présent", pages.includes("Oros Telluros"));

/** Damaia : dés de vie, défenses et incantation préremplis */
const damaia = JSON.parse(await readFile(resolve(here, "../fixtures/damaia.character.json"), "utf8"));
const damaiaHtml2 = renderTheme(theme, damaia);
console.log("renderTheme (thème default, Damaia)");
check("hitDice 2d8 prérempli", damaiaHtml2.includes('value="2d8"'));
check("résistance au feu dans la boîte dédiée", damaiaHtml2.includes(">Fire</textarea>"));
check("capacité d'incantation préselectionnée (CHA)", damaiaHtml2.includes('value="CHA" selected'));
check("boîte Capacités et traits préremplie", damaiaHtml2.includes("Dark Bargain"));
check("demi-maîtrise (cercle .half)", damaiaHtml2.includes('class="t d half"'));
check("DD de sauvegarde de sort 13", damaiaHtml2.includes('id="dd" data-bound="1">13</output>'));
check("attaque de sort +5 signée", damaiaHtml2.includes('id="ba" data-bound="1">+5</output>'));
check("niveau prérempli (2)", damaiaHtml2.includes('id="lvl" value="2"'));
check("bonus de maîtrise prérempli (+2)", damaiaHtml2.includes('id="pb" data-bound="1">+2</output>'));
check("taille Damaia (Medium or Small)", damaiaHtml2.includes('>Taille</label><input class="sm" value="Medium or Small"'));
check("cantrip racial prérempli (Fire Bolt, marqué dégâts)", damaiaHtml2.includes('value="⚔ Fire Bolt"'));
{
  const l0 = damaiaHtml2.slice(damaiaHtml2.indexOf("Tours de magie"), damaiaHtml2.indexOf(">Niveau 1<"));
  const l0Names = l0
    .split("<tr>")
    .slice(1)
    .map((r) => (/<td><input value="([^"]*)"/.exec(r) ?? [])[1])
    .filter((n): n is string => Boolean(n))
    .map((n) => n.replace(/^⚔ /, ""));
  const expectedL0 = (damaia.spells ?? [])
    .filter((s: { level?: number }) => (s.level ?? 0) === 0)
    .map((s: { name: string }) => s.name)
    .sort((a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  check("tours de magie triés alphabétiquement", JSON.stringify(l0Names) === JSON.stringify(expectedL0));
}
check("portée des sorts en pieds (Ranged 120 → 120 ft.)", damaiaHtml2.includes('value="120 ft."'));
check("durée des sorts préremplie (1 Hour)", damaiaHtml2.includes('value="1 Hour"') && damaiaHtml2.includes('value="Conc. 1 Minute"'));
check("sorts de dégâts marqués (⚔ Fire Bolt)", damaiaHtml2.includes('value="⚔ Fire Bolt"') && !damaiaHtml2.includes('⚔ Cure Wounds'));
check(
  "inventaire trié et poids préremplis",
  damaiaHtml2.indexOf('value="Backpack"') < damaiaHtml2.indexOf('value="Bedroll"') &&
    /class="u" type="number" value="\d+"/.test(damaiaHtml2),
);
check("unités de poids depuis les données (meta.units), pas du thème", damaiaHtml2.includes(">Poids unitaire (lb.)</th>") && damaiaHtml2.includes(">Poids porté (lb.)</label>"));
check("charge maximale et pousser/traîner préremplies depuis le JSON", damaiaHtml2.includes('value="135"') && damaiaHtml2.includes('value="270"'));
check(
  "description physique préremplie (yeux, peau)",
  damaiaHtml2.includes('value="Fuschia"') && damaiaHtml2.includes('value="Claire avec des marques tribal fuschia"'),
);
check(
  "personnalité préremplie (trait, idéal, lien, défaut)",
  damaiaHtml2.includes("Je refuse de passer inaperçue") &&
    damaiaHtml2.includes("L'art et la beauté") &&
    damaiaHtml2.includes("tante Lyra") &&
    damaiaHtml2.includes("peur du rejet"),
);
check("histoire préremplie", damaiaHtml2.includes("troupe d’artistes itinérants"));
check(
  "« Apparence, tenue, voix, attitude » : titre de boîte (comme les autres), pas un label",
  damaiaHtml2.includes(">Apparence, tenue, voix, attitude</h3>") && !damaiaHtml2.includes(">Apparence, tenue, voix, attitude</label>"),
);
check("jets contre la mort : Échecs avant Réussites (ligne inversée en CSS)", damaiaHtml2.includes('block-fillBox death') && damaiaHtml2.indexOf(">Échecs</small>") < damaiaHtml2.indexOf(">Réussites</small>"));
const themeCss = await readFile(resolve(here, "../themes/default/style.css"), "utf8");
check(
  "css impression : pages extensibles + marges @page (multi-page)",
  themeCss.includes("min-height: 296mm") &&
    !/(^|\n)\s*height: 296mm;/.test(themeCss) &&
    /@page\s*\{[^}]*margin:\s*9mm/.test(themeCss) &&
    !/@media print[\s\S]+min-height: 296mm/.test(themeCss),
);
check("control « Sorts préparés / focaliseur » retiré", !damaiaHtml2.includes("focaliseur") && !damaiaHtml2.includes("Sorts préparés"));

check("description physique sur 3 colonnes", html.includes('Description physique</h3><div class="g3">'));

/** Multiclasse : classes et niveaux joints par « / » dans le même ordre */
const multi = { ...character, classes: [
  { name: "Bard", level: 1, subclass: null },
  { name: "Rogue", level: 1, subclass: "Arcane Trickster" },
] };
const multiHtml = renderTheme(theme, multi);
check("CLASSE multiclasse jointe", multiHtml.includes('value="Bard / Rogue"'));
check("sous-classes jointes (les vides écartées)", multiHtml.includes('value="Arcane Trickster"'));

if (failures > 0) {
  console.error(`\n${failures} échec(s)`);
  process.exit(1);
}
console.log("\ntous les tests passent");

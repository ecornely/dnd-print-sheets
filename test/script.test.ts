/**
 * Test du script d'interaction du thème : jsdom rejoue themes/default/script.js
 * sur le HTML rendu et vérifie les calculs d'initialisation (poids, slots,
 * incantation) et les interactions (ajout/retrait de ligne, ajout de niveau).
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { renderTheme } from "../src/render.js";
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
const script = await readFile(resolve(here, "../themes/default/script.js"), "utf8");

/** Rend la fiche et rejoue le script du thème (comme un navigateur, defer). */
function loadSheet(character: unknown) {
  const html = renderTheme(theme, character);
  const dom = new JSDOM(html, { runScripts: "outside-only" });
  dom.window.eval(script);
  return dom.window.document;
}

function click(doc: Document, selector: string) {
  const target = doc.querySelector(selector);
  target?.dispatchEvent(new (domWindow(doc).MouseEvent)("click", { bubbles: true }));
}
function domWindow(doc: Document) {
  return doc.defaultView as unknown as typeof window;
}

console.log("script.js du thème default (Oros, init)");

const oros = JSON.parse(await readFile(resolve(here, "../fixtures/oros.character.json"), "utf8"));
const doc = loadSheet(oros);

// Poids : chaque ligne a un poid unitaire et une qté depuis le JSON,
// l'init doit remplir output.tw (q × u) puis le total (#wt).
const rows = [...doc.querySelectorAll(".block-fillTable.inventory tbody tr")];
const expected = rows.reduce((sum, tr) => {
  const u = parseFloat(tr.querySelector<HTMLInputElement>("input.u")?.value ?? "");
  const q = parseFloat(tr.querySelector<HTMLInputElement>("input.q")?.value ?? "");
  return isFinite(u) && isFinite(q) ? sum + u * q : sum;
}, 0);
const filledTw = rows
  .map((tr) => tr.querySelector("output.tw"))
  .filter((tw) => (tw?.textContent ?? "") !== "").length;
check("poids total de chaque ligne calculé à l'init", filledTw > 0);
check(
  "poids porté = somme des lignes",
  doc.getElementById("wt")?.textContent === String(+expected.toFixed(2)),
);

// Emplacements de sort : les cases (.bx) suivent les valeurs du JSON.
const slotBoxes = [...doc.querySelectorAll("#slots .sl")];
const expectedBoxes = slotBoxes.reduce((sum, sl) => sum + (parseInt(sl.querySelector<HTMLInputElement>("input")?.value ?? "0", 10) || 0), 0);
const drawnBoxes = slotBoxes.reduce((sum, sl) => sum + sl.querySelectorAll(".bx .cb").length, 0);
check("cases des emplacements dessinées (sum des slots)", expectedBoxes > 0 && drawnBoxes === expectedBoxes);

// Incantation : emplacement prérempli → DD/bonus attendus (niv. 2, WIS).
check(
  "DD/bonus d'incantation calculés à l'init",
  doc.getElementById("dd")?.textContent === "13" && doc.getElementById("ba")?.textContent === "+5",
);

// Autogrow : le plancher (rows) est un min-height inline émis au rendu ;
// la hauteur inline est posée par le script. jsdom ne mesure pas
// scrollHeight (0) et reformule les calc, on vérifie donc la présence
// du plancher et de la hauteur, pas une valeur mesurée.
const persoTa = doc.querySelector<HTMLTextAreaElement>('.block-fillBox textarea.autogrow[rows="4"]');
const persoMin = /^calc\(/.test(persoTa?.style.minHeight ?? "");
check(
  "textarea personnalité : plancher rows (min-height inline) et hauteur ajustée par le script",
  persoMin && typeof persoTa?.style.height === "string" && /px$/.test(persoTa.style.height),
);

console.log("script.js : interactions (clics)");

// + ligne sur les attaques puis retrait
const attacksBefore = doc.querySelectorAll(".block-fillTable.attacks tbody tr").length;
click(doc, ".block-fillTable.attacks .add");
const attacksAfterAdd = doc.querySelectorAll(".block-fillTable.attacks tbody tr").length;
doc.querySelector(".block-fillTable.attacks tbody tr:last-child .rm")!
  .dispatchEvent(new (domWindow(doc).MouseEvent)("click", { bubbles: true }));
const attacksAfterRemove = doc.querySelectorAll(".block-fillTable.attacks tbody tr").length;
check("+ ligne puis × reviennent au nombre initial", attacksBefore === 6 && attacksAfterAdd === 7 && attacksAfterRemove === 6);

// La ligne ajoutée est vierge ; une saisie q/u remplit la ligne et le total
const wtBefore = parseFloat(doc.getElementById("wt")?.textContent ?? "0");
doc.querySelector(".block-fillTable.inventory .add")!.dispatchEvent(new (domWindow(doc).MouseEvent)("click", { bubbles: true }));
const lastInv = doc.querySelector(".block-fillTable.inventory tbody tr:last-child");
const uInput = lastInv!.querySelector<HTMLInputElement>("input.u")!;
const qInput = lastInv!.querySelector<HTMLInputElement>("input.q")!;
uInput.value = "10";
qInput.value = "2";
uInput.dispatchEvent(new (domWindow(doc).Event)("input", { bubbles: true }));
check("saisie u/q remplit le poids total de la ligne", lastInv!.querySelector("output.tw")?.textContent === "20");
check("saisie u/q additionne dans le poids porté", parseFloat(doc.getElementById("wt")?.textContent ?? "0") === +(wtBefore + 20).toFixed(2));

// + Niveau supérieur : clone du gabarit, libellé suivant, retiré via rm-lvl
click(doc, ".add-lvl");
const lvls = [...doc.querySelectorAll("#spells .lvl")];
const nextLvl = lvls[lvls.length - 1];
check("« + Niveau » ajoute une table libellée du niveau suivant", nextLvl?.querySelector("h3")?.textContent === "Niveau 3" && !nextLvl!.classList.contains("lvl-template"));
check("le niveau ajouté a une ligne vierge complète (5 inputs + case Prép.)", (nextLvl!.querySelectorAll("tbody input").length ?? 0) === 5 && (nextLvl!.querySelectorAll("tbody .cb").length ?? 0) === 1);
nextLvl!.querySelector(".rm-lvl")!.dispatchEvent(new (domWindow(doc).MouseEvent)("click", { bubbles: true }));
check("« retirer ce niveau » supprime la section", doc.querySelectorAll("#spells .lvl:not(.lvl-template)").length === 3);

// Damaia : sort de dégâts marqué, préremplissage identique côté heros
const damaia = JSON.parse(await readFile(resolve(here, "../fixtures/damaia.character.json"), "utf8"));
const damaiaDoc = loadSheet(damaia);
check("Damaia : poids et capacité chargés", damaiaDoc.getElementById("wt")?.textContent !== "" && damaiaDoc.getElementById("wt")?.textContent !== "0");

if (failures > 0) {
  console.error(`\n${failures} échec(s)`);
  process.exit(1);
}
console.log("\ntous les tests passent");

/** Client de l'app : charge un thème + un JSON de perso, rend les pages A4,
 * re-rend tout au changement de thème. Importe le moteur compilé (dist/). */
import { renderPages } from "/dist/render.js";

const $ = (id) => document.getElementById(id);

const select = $("theme-select");
const fileInput = $("file-input");
const printButton = $("print-button");
const statusEl = $("status");
const dragOverlay = $("drag-overlay");
const sheet = $("sheet");
const themeStyle = $("theme-style");

let character = null;
let renderToken = 0;

function setStatus(text) {
  statusEl.textContent = text;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

/** Charge le thème demandé et (si un perso est chargé) rend les pages. */
async function applyTheme(themeName) {
  const token = ++renderToken;
  try {
    const [themeJson, css, themeScript] = await Promise.all([
      fetchText(`/themes/${encodeURIComponent(themeName)}/theme.json`),
      fetchText(`/themes/${encodeURIComponent(themeName)}/style.css`),
      fetchText(`/themes/${encodeURIComponent(themeName)}/script.js`).catch(() => ""),
    ]);
    const theme = JSON.parse(themeJson);
    if (token !== renderToken) return; // un thème plus récent a été choisi entre-temps
    themeStyle.textContent = css;
    sheet.innerHTML = renderPages(theme, character ?? {});
    // Le script du thème (calculs de fiche) ne s'exécute pas via innerHTML :
    // on le (ré)injecte dans un nouveau <script> pour qu'il s'exécute,
    // puis on relance son init via window.themeInit.
    let scriptEl = document.getElementById("theme-script");
    if (scriptEl) scriptEl.remove();
    scriptEl = document.createElement("script");
    scriptEl.id = "theme-script";
    scriptEl.textContent = themeScript;
    document.body.append(scriptEl);
    if (typeof window.themeInit === "function") window.themeInit();
    document.title = theme.pages[0]?.title
      ? `${theme.pages[0].title} — dnd-print-sheets`
      : "dnd-print-sheets";
    printButton.disabled = character === null;
    if (character !== null) {
      setStatus(`${theme.pages.length} page(s) — thème « ${themeName} »`);
    }
  } catch (err) {
    setStatus(`Erreur : ${err.message}`);
  }
}

function loadCharacter(jsonText, label) {
  try {
    character = JSON.parse(jsonText);
  } catch (err) {
    setStatus(`JSON invalide : ${err.message}`);
    return;
  }
  sheet.hidden = false;
  setStatus(`${label} chargé`);
  applyTheme(select.value);
}

// ----- Thèmes + dropdown -----

select.addEventListener("change", () => applyTheme(select.value));

const themes = await (await fetch("/api/themes")).json();
if (themes.length === 0) {
  setStatus("Aucun thème trouvé dans themes/");
} else {
  for (const name of themes) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.append(option);
  }
  // « default » par défaut, sinon le premier thème disponible
  select.value = themes.includes("default") ? "default" : themes[0];
}

// ----- Chargement du personnage -----

// Le <label class="file-button"> de la barre ouvre nativement le sélecteur.
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    file.text().then((text) => loadCharacter(text, file.name));
    fileInput.value = "";
  }
});

async function loadFixture(name, label) {
  try {
    const text = await fetchText(`/api/fixtures/${name}.character.json`);
    loadCharacter(text, label);
  } catch (err) {
    setStatus(`Erreur : ${err.message}`);
  }
}
$("fixture-oros").addEventListener("click", () => loadFixture("oros", "Oros"));
$("fixture-damaia").addEventListener("click", () => loadFixture("damaia", "Damaia"));

for (const eventName of ["dragover", "dragenter"]) {
  document.body.addEventListener(eventName, (event) => {
    event.preventDefault();
    dragOverlay.hidden = false;
  });
}
document.body.addEventListener("dragleave", (event) => {
  if (event.relatedTarget === null) dragOverlay.hidden = true;
});
document.body.addEventListener("drop", (event) => {
  event.preventDefault();
  dragOverlay.hidden = true;
  const file = event.dataTransfer?.files?.[0];
  if (file) file.text().then((text) => loadCharacter(text, file.name));
});

// ----- Impression -----

printButton.addEventListener("click", () => window.print());

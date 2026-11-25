#!/usr/bin/env node
/**
 * CLI : dnd-print --theme <nom> <personnage.json> -o sortie.html
 *
 * Charge le thème themes/<nom>/theme.json + themes/<nom>/style.css,
 * rend le personnage en HTML imprimable.
 */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTheme } from "./render.js";
import type { Theme } from "./theme.js";

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function usage(): never {
  console.error(`Usage: dnd-print --theme <nom> <personnage.json> [-o sortie.html]

Options:
  --theme <nom>   Nom du thème (dossier themes/<nom>/). Défaut : default
  -o <fichier>    Fichier HTML de sortie (défaut : dist/<nom-du-perso>.html)`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  let themeName = "default";
  let input: string | undefined;
  let output: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--theme") themeName = args[++i] ?? usage();
    else if (arg === "-o") output = args[++i];
    else if (arg === "-h" || arg === "--help") usage();
    else if (!input) input = arg;
    else usage();
  }
  if (!input) usage();

  const themeDir = resolve(pkgDir, "themes", themeName);
  const theme: Theme = JSON.parse(await readFile(resolve(themeDir, "theme.json"), "utf8"));
  const character = JSON.parse(await readFile(resolve(input), "utf8"));

  const html = renderTheme(theme, character);
  const outPath = resolve(
    output ?? `dist/${resolve(input).replace(/\.json$/, "").split(/[\\/]/).pop()}.html`,
  );
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html, "utf8");
  await copyFile(resolve(themeDir, "style.css"), resolve(dirname(outPath), "style.css"));
  const script = resolve(themeDir, "script.js");
  if (existsSync(script)) {
    await copyFile(script, resolve(dirname(outPath), "script.js"));
  }
  console.log(`✓ ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

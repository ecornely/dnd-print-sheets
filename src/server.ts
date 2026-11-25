/**
 * Petit serveur web zéro-dépendance pour prévisualiser les fiches :
 *
 *   npm run dev   →  http://localhost:5173
 *
 * Routes :
 *   /                         page de l'app (public/)
 *   /app.js, /app.css         scripts/styles de l'app
 *   /dist/*.js                moteur de rendu compilé (utilisé par le navigateur)
 *   /api/themes               liste des noms de thèmes
 *   /themes/:nom/theme.json   structure du thème
 *   /themes/:nom/style.css    feuille de style du thème
 *   /themes/:nom/script.js    script du thème (calculs de fiche)
 *   /api/fixtures/:fichier    personnages d'exemple (fixtures/)
 */
import { createServer } from "node:http";
import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT ?? 5173);

// Le navigateur charge dist/render.js compilé : sans build à jour, l'app est
// cassée (erreur import côté client). On le signale dès le démarrage.
const renderJs = join(root, "dist/render.js");
if (!existsSync(renderJs)) {
  console.warn("⚠ dist/render.js introuvable — lance npm run build (npm run dev le fait automatiquement)");
} else if (!readFileSync(renderJs, "utf8").includes("renderPages")) {
  console.warn("⚠ dist/render.js est périmé (sans renderPages) — relance npm run build");
}

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function listThemes(): Promise<string[]> {
  const entries = await readdir(join(root, "themes"), { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function readThemeFile(name: string, file: string): Promise<string> {
  if (!/^[a-z0-9-]+$/i.test(name)) throw new Error("invalid theme name");
  return readFile(join(root, "themes", name, file), "utf8");
}

async function route(pathname: string): Promise<{ status: number; body: string; type: string }> {
  if (pathname === "/") return { status: 200, body: await readFile(join(root, "public/index.html"), "utf8"), type: mime[".html"] };
  if (pathname === "/app.js") return { status: 200, body: await readFile(join(root, "public/app.js"), "utf8"), type: mime[".js"] };
  if (pathname === "/app.css") return { status: 200, body: await readFile(join(root, "public/app.css"), "utf8"), type: mime[".css"] };
  if (pathname === "/api/themes") return { status: 200, body: JSON.stringify(await listThemes()), type: mime[".json"] };
  if (pathname.startsWith("/api/fixtures/")) {
    const file = pathname.slice("/api/fixtures/".length);
    if (!/^[a-z0-9._-]+\.json$/i.test(file)) return { status: 400, body: "bad fixture name", type: "text/plain" };
    return { status: 200, body: await readFile(join(root, "fixtures", file), "utf8"), type: mime[".json"] };
  }
  if (pathname.startsWith("/dist/")) {
    const rel = normalize(pathname.slice("/dist/".length)).replaceAll("\\", "/");
    if (rel.startsWith("..") || !rel.endsWith(".js")) return { status: 400, body: "bad path", type: "text/plain" };
    return { status: 200, body: await readFile(join(root, "dist", rel), "utf8"), type: mime[".js"] };
  }
  const themeMatch = pathname.match(/^\/themes\/([^/]+)\/(theme\.json|style\.css|script\.js)$/);
  if (themeMatch) {
    return {
      status: 200,
      body: await readThemeFile(themeMatch[1], themeMatch[2]),
      type: mime[extname(themeMatch[2])],
    };
  }
  return { status: 404, body: "not found", type: "text/plain" };
}

createServer(async (req, res) => {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
  try {
    const { status, body, type } = await route(pathname);
    // no-store : la dist et les thèmes changent entre deux builds, on ne veut
    // jamais qu'une version périmée reste collée au navigateur
    res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
    res.end(body);
  } catch (err) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end(`introuvable : ${pathname}${err instanceof Error ? ` (${err.message})` : ""}`);
  }
}).listen(port, () => {
  console.log(`dnd-print-sheets → http://localhost:${port}`);
});

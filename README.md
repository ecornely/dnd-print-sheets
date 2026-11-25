# dnd-print-sheets

Fiches de personnage D&D imprimables en A4 (pur HTML + CSS, rien qu'un Ctrl+P).

Un **moteur de rendu** générique transforme un JSON de personnage (produit par
[dnd-dom-extract](../dnd-dom-extract)) en HTML, selon un **thème** qui décide :

- quelle page contient quoi, dans quel ordre (notion de **blocks**) ;
- les libellés (titres de sections, noms des stats, symboles de maîtrise...) ;
- le style, entièrement dans le CSS du thème.

Le moteur ne connaît aucune donnée : si un chemin est vide ou absent dans le
JSON, le block est rendu vide, sans erreur.

## Structure d'un thème

Un thème vit dans `themes/<nom>/` avec trois fichiers :

- `theme.json` — la liste des pages et de leurs blocks ;
- `style.css` — la feuille de style (imprimée avec le HTML, le CLI la copie
  à côté du fichier de sortie pour que Ctrl+P fonctionne en ouvrant le HTML) ;
- `script.js` *(optionnel)* — script interactif de la fiche (cercles cochables,
  recalculs, emplacements de sorts). Le CLI le copie à côté du HTML ; l'app
  web le (ré)exécute à chaque changement de thème, puis appelle
  `window.themeInit()`.

### Types de blocks

| Block | Rôle | Options principales |
|---|---|---|
| `header` | Titre du personnage | `fields: [{label, path}]` |
| `text` | Valeur simple | `path`, `title` |
| `stats` | Cases de stats (CA, HP...) | `items: [{label, path, suffix}]` (`suffix: "signed"` → `+3`) |
| `abilities` | Les 6 caractéristiques | `path`, `keys`, `labels` |
| `savingThrows` | Jets de sauvegarde | `path`, `labels` |
| `skills` | Compétences (○◐●) | `path`, `proficiencySymbols` |
| `proficiencyGroups` | Armures/armes/outils/langues | `path`, `labels` |
| `defenses` | Résistances / immunités / vulnérabilités (listes vides masquées) | `path`, `labels` |
| `table` | Tableau générique | `path`, `columns: [{field, title}]` |
| `defList` | Liste nom + sous-titres + description | `path`, `nameField`, `subtitleFields`, `descriptionField` |
| `coins` | Bourse | `path`, `labels` |
| `spells` | Sorts groupés par niveau | `path`, `cantripLabel`, `levelLabels` |
| `paragraphs` | Texte long coupé en paragraphes | `path`, `title` |
| `free` | Liste label → valeur libre | `rows: [{label, path}]` |
| `heading` | Grand titre de page (hors données) | `title` |

### Blocs « fiche remplissable » (façon fiche papier)

| Block | Rôle | Options principales |
|---|---|---|
| `identity` | Nom + étoile d'inspiration + grille d'identité (classe, espèce...) | `namePath`, `fields: [{label, path, id, type}]`, `inspiration` |
| `abilitySheet` | 6 encadrés caractéristiques : cercles de maîtrise, score modifiable, jets + compétences | `abilitiesPath`, `savingThrowsPath`, `skillsPath`, `keyLabels`, `skillLabels` |
| `fillBox` | Boîte encadrée d'inputs/textareas/ronds préremplis | `title`, `grid` (colonnes), `cellBox`, `controls: [FillControl]` |
| `fillTable` | Tableau de saisie avec lignes vides préremplies | `path`, `extra`, `columns: [{title, path, width, inputClass, checkbox, control: "output"}]` |
| `spellSlots` | Lignes d'emplacements de sort avec cases cochables | `defaults: [4,3,3,...]` |
| `spellTables` | Tables de sorts par niveau (Prép., Sort, Incantation...) | `path`, `emptyRows`, `levelLabels` |
| `container` | Simple conteneur disposé par le CSS via `className` | `blocks: [...]` |

Tous les chemins sont de la forme `a.b.0.c` (tableaux inclus).

### Exemple

```json
{
  "pages": [
    {
      "title": "Personnage",
      "blocks": [
        { "block": "header", "fields": [{ "label": "Classe", "path": "classes.0.name" }] },
        { "block": "stats", "items": [{ "label": "CA", "path": "armorClass" }] },
        { "block": "abilities", "path": "abilities", "labels": { "STR": "FOR" } },
        { "block": "skills", "path": "skills", "title": "Compétences" }
      ]
    }
  ]
}
```

### CSS d'impression

Le thème layout chaque page en `.sheet-page` (une feuille A4) et gère la
pagination avec `break-after: page` dans `@media print` — voir
`themes/default/style.css` comme référence.

## Usage

### App web (prévisualisation)

```sh
npm install && npm run build
npm run dev            # → http://localhost:5173
```

- **Charger un JSON…** (ou drag & drop du fichier n'importe où) ;
- les **boutons d'exemple** chargent Oros ou Damaia en un clic ;
- le **dropdown « Thème »** recharge la structure complète et le CSS :
  la page se restructure entièrement ;
- **Imprimer** lance Ctrl+P sur les pages A4 (le chrome de l'app est masqué).
- Les exemples Oros et Damaia (`fixtures/*.character.json`) sont chargeables
  en un clic depuis la barre d'outils.

Le moteur (src/render.ts → dist/render.js) tourne ici dans le navigateur :
aucune donnée du personnage ne transite par le serveur, il ne sert que les
thèmes et les fixtures.

### CLI

```sh
npm run render:oros            # fixtures/oros.character.json → dist/oros.html
npx tsx src/cli.ts --theme default mon-personnage.json -o dist/fiche.html
```

Puis ouvrir `dist/fiche.html` dans le navigateur et Ctrl+P (marges « Aucune »,
graphiques d'arrière-plan activés).

## Tests

```sh
npm test
```

## Ajouter un thème

1. Copier `themes/default/` vers `themes/<mon-theme>/`.
2. Réordonner / supprimer / ajouter les blocks dans `theme.json`.
3. Restyler tout dans `style.css` (les classes CSS suivent les types de
   blocks : `.block-stats`, `.stat-box`, `.skill-row`, etc., plus les
   `className` personnalisés posés dans le JSON).

/**
 * Types d'un thème : une liste de pages A4, chacune composée de blocks.
 *
 * Un block = { "block": "<type>", "path": "<chemin dans le json du perso>",
 * ...options selon le type }. Les libellés (titres, colonnes) appartiennent
 * au thème : rien n'est codé en dur dans le moteur.
 */

export type AnyBlock =
  | BlockHeader
  | BlockHeading
  | BlockText
  | BlockStats
  | BlockAbilities
  | BlockSavingThrows
  | BlockSkills
  | BlockProficiencyGroups
  | BlockDefenses
  | BlockTable
  | BlockDefList
  | BlockCoins
  | BlockSpells
  | BlockParagraphs
  | BlockFree
  | BlockIdentity
  | BlockAbilitySheet
  | BlockFillBox
  | BlockFillTable
  | BlockSpellSlots
  | BlockSpellTables
  | BlockContainer;

/** Simple conteneur : permet à un thème de disposer des blocs en colonnes /
 *  grilles sans définir de nouveau comportement. Le CSS du thème décide de
 *  la mise en page via className. */
export interface BlockContainer extends BlockBase {
  block: "container";
  blocks: AnyBlock[];
}

/**
 * Blocs « fiche remplissable » : rendent des inputs / textareas / cercles
 * cochables préremplis depuis le JSON. Ce qui manque dans le JSON reste
 * éditable à la main, comme sur la fiche papier.
 */

export interface BlockIdentity extends BlockBase {
  block: "identity";
  /** Chemin du nom (défaut "name") */
  namePath?: string;
  /** Étoile d'inspiration (pas de donnée DDB → décochée) */
  inspiration?: boolean;
  /** Grille d'identité (Class, Niveau...). template/join pour les arrays
   *  (multiclasse : "{name}" joint par " / "). */
  fields?: { label: string; path?: string; id?: string; type?: "number"; template?: string; join?: string }[];
}

export interface BlockAbilitySheet extends BlockBase {
  block: "abilitySheet";
  abilitiesPath?: string;
  savingThrowsPath?: string;
  skillsPath?: string;
  /** Libellés FR des caractéristiques (STR → Force) */
  keyLabels?: Record<string, string>;
  /** Libellés FR des compétences (Acrobatics → Acrobaties) */
  skillLabels?: Record<string, string>;
}

export interface FillControl {
  label?: string;
  /** Chemin d'une unité dans le personnage, ajoutée au libellé (ex. meta.units.weight) */
  unitPath?: string;
  /** Chemin de préremplissage (input/textarea/output) */
  path?: string;
  /** id DOM pour le script du thème (lvl, init, dd, ba, sca...) */
  id?: string;
  /** Valeur littérale, sans donnée */
  preset?: string;
  placeholder?: string;
  /** input (défaut) · textarea · output (etàditesc) · select · circles · star · note */
  control?: "input" | "textarea" | "output" | "select" | "circles" | "star" | "note";
  rows?: number;
  circleCount?: number;
  circleLabels?: string[];
  /** Chemin d'un nombre → les N premiers cercles cochés */
  onPath?: string;
  options?: { value: string; label: string }[];
  /** Argument informatif sous les cercles (épuisement...) */
  note?: string;
  /** Type d'input HTML (number pour lvl, init…) */
  type?: "number" | "text";
  /** Classe CSS pour l'input lui-même (sm pour une petite taille...) */
  className?: string;
  /** Pour un array/objet : gabarit de mise en forme ({name} — {description}) */
  template?: string;
  /** Séparateur des éléments d'un array (défaut ", " ; "\n" pour un par ligne) */
  join?: string;
  /** Symbole rempli ? */
  signed?: boolean;
}

export interface BlockFillBox extends BlockBase {
  block: "fillBox";
  title?: string;
  /** Disposer les contrôles en grille (.g3) au lieu d'une pile verticale */
  grid?: number;
  /** Encadrer chaque cellule de la grille (cases de stats, monnaie...) */
  cellBox?: boolean;
  controls: FillControl[];
}

export interface FillColumn {
  title: string;
  /** Champ de l'item à préremplir */
  path?: string;
  /** Chemin d'une unité dans le personnage, ajoutée au titre (ex. meta.units.weight) */
  unitPath?: string;
  /** Largeur (style CSS de th : "34%", "22mm") */
  width?: string;
  /** Classe des cellules de données (q/u/tw pour le script) */
  inputClass?: string;
  /** Cellule d'entrée : case à cocher de préparation */
  checkbox?: boolean;
  /** input (défaut) ou output (case calculée par le script du thème) */
  control?: "input" | "output";
  type?: "number";
}

export interface BlockFillTable extends BlockBase {
  block: "fillTable";
  title?: string;
  path?: string;
  /** Lignes vides en plus des données (garde le rythme imprimé de la fiche) */
  extra?: number;
  columns: FillColumn[];
}

export interface BlockSpellSlots extends BlockBase {
  block: "spellSlots";
  title?: string;
  /** Chemin des données `number[]` (sinon "spellSlots"). */
  path?: string;
  /** Valeurs par défaut si le JSON n'a pas de spellSlots.
   *  L'index 0 = niveau 1. */
  defaults?: number[];
}

export interface BlockSpellTables extends BlockBase {
  block: "spellTables";
  path?: string;
  cantripLabel?: string;
  /** Titres des niveaux: "1" → "Niveau 1" */
  levelLabels?: Record<string, string>;
  /** Lignes vides minimales par table (au-dessus des données) */
  emptyRows?: number;
}

export interface BlockBase {
  /** Sélecteur(s) CSS optionnel(s) additionnels sur ce bloc */
  className?: string;
}

export interface BlockHeader extends BlockBase {
  block: "header";
  /** Options affichées dans le header : chemins de données */
  fields?: { label: string; path: string }[];
}

/** Grand titre de page (h1), indépendant des données du personnage. */
export interface BlockHeading extends BlockBase {
  block: "heading";
  title: string;
}

export interface BlockText extends BlockBase {
  block: "text";
  /** Chemin de la valeur à afficher */
  path: string;
  /** Titre optionnel */
  title?: string;
}

export interface BlockStats extends BlockBase {
  block: "stats";
  /** Cases de statistiques : label + chemin (ex. Armor Class).
   *  suffix: texte ajouté ; "signed" affiche la valeur signée (+3).
   *  control: "text" (défaut) | "input" (champ éditable) | "output".
   *  id: id DOM pour le script du thème (lb, pp, init...). */
  items: {
    label: string;
    path?: string;
    suffix?: string;
    id?: string;
    type?: "number";
    control?: "text" | "input" | "output";
  }[];
}

export interface BlockAbilities extends BlockBase {
  block: "abilities";
  /** Chemin d'un objet { STR: {score, modifier}, ... } */
  path: string;
  /** Ordre d'affichage des clés (défaut : STR..CHA) */
  keys?: string[];
  /** Libellés des clés (défaut : la clé elle-même) */
  labels?: Record<string, string>;
}

export interface BlockSavingThrows extends BlockBase {
  block: "savingThrows";
  /** Chemin d'un objet { STR: {value, proficient}, ... } */
  path: string;
  labels?: Record<string, string>;
}

export interface BlockSkills extends BlockBase {
  block: "skills";
  /** Chemin d'un tableau de compétences {name, ability, value, proficiency} */
  path: string;
  /** Symboles de maîtrise par type */
  proficiencySymbols?: Partial<Record<"none" | "half" | "proficient" | "expertise", string>>;
}

export interface BlockProficiencyGroups extends BlockBase {
  block: "proficiencyGroups";
  /** Chemin d'un objet { armor: [], weapons: [], tools: [], languages: [] } */
  path: string;
  labels?: Record<string, string>;
}

export interface BlockDefenses extends BlockBase {
  block: "defenses";
  /** Chemin d'un objet { resistances: [], immunities: [], vulnerabilities: [] }.
   *  Les listes contiennent des strings ou des objets {value} (extraits DDB). */
  path: string;
  /** Titres par catégorie ; les catégories vides sont masquées */
  labels?: Record<string, string>;
}

export interface BlockTable extends BlockBase {
  block: "table";
  /** Chemin d'un tableau d'objets */
  path: string;
  /** Colonnes : nom + champ de l'objet (chemin relatif à l'item) */
  columns: { field: string; title?: string }[];
  title?: string;
}

export interface BlockDefList extends BlockBase {
  block: "defList";
  /** Chemin d'un tableau d'objets {name, description?} ou {name, section?} */
  path: string;
  /** Champ titre (défaut "name") et champs secondaires à afficher */
  nameField?: string;
  subtitleFields?: string[];
  descriptionField?: string;
  title?: string;
}

export interface BlockCoins extends BlockBase {
  block: "coins";
  /** Chemin d'un objet {cp, sp, ep, gp, pp} */
  path: string;
  labels?: Record<string, string>;
}

export interface BlockSpells extends BlockBase {
  block: "spells";
  /** Chemin d'un tableau de sorts {name, level, school, castingTime, range, prepared} */
  path: string;
  /** Symbole affiché pour le tour de magie (level 0) */
  cantripLabel?: string;
  /** Titres des niveaux : "spellLevel.1": "1er niveau", etc. */
  levelLabels?: Record<string, string>;
}

export interface BlockParagraphs extends BlockBase {
  block: "paragraphs";
  /** Chemin d'un texte (ou valeur) long */
  path: string;
  title?: string;
}

/** Bloc à composer librement dans le thème (libellés repris tels quels). */
export interface BlockFree extends BlockBase {
  block: "free";
  title?: string;
  rows: { label: string; path: string }[];
}

export interface ThemePage {
  /** Titre de la page (affiché discret au pied de page) */
  title?: string;
  blocks: AnyBlock[];
}

export interface Theme {
  /** Informations implicites du personnage : nom de classe/espèce affichés */
  headerFields?: NonNullable<BlockHeader["fields"]>;
  pages: ThemePage[];
}

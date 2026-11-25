/**
 * Script du thème "default" — fiche remplissable.
 *
 * Rends les cercles/cases cochables (.t), remplit les emplacements de sort,
 * recalcule bonus de maîtrise, initiative, perception passive, DD/bonus
 * d'attaque de sorts et poids d'inventaire — comme sur la fiche papier
 * d'origine. Les valeurs préremplies depuis le JSON sont conservées au
 * chargement : le recalcul ne se déclenche que sur une action de l'utilisateur
 * (cercle coché, score modifié, manipulateur de slots...).
 *
 * Marche tel quel en CLI (script defer) et dans l'app web : l'app réexécute
 * le script à chaque changement de thème, d'où le garde _bound et
 * window.themeInit() réappelé par l'app.
 */
(function () {
  "use strict";

  var sg = function (n) {
    return (n >= 0 ? "+" : "") + n;
  };

  /* ---------- Calculs ---------- */

  function profBonus() {
    var el = document.getElementById("lvl");
    var raw = (el && el.value) || "";
    // Multiclasse : « 2 / 3 » → on somme les niveaux (PB dépend du total)
    var lvl = 0;
    var parts = String(raw).split("/");
    for (var i = 0; i < parts.length; i++) {
      var n = parseInt(parts[i], 10);
      if (isFinite(n) && n > 0) lvl += n;
    }
    if (lvl === 0) lvl = 1;
    lvl = Math.min(20, Math.max(1, lvl));
    return 2 + Math.floor((lvl - 1) / 4);
  }

  function abilMod(key) {
    var sec = document.querySelector('.ab[data-ability="' + key + '"]');
    var sc = sec && sec.querySelector(".sc");
    var v = parseInt(sc && sc.value, 10);
    if (!isFinite(v)) v = 10;
    return Math.floor((v - 10) / 2);
  }

  /** Valeur d'une ligne : mod. de carac + PB × ronds pleins, + ⌊PB/2⌋ par demi-rond. */
  function recomputeRow(row) {
    var sec = row.closest(".ab");
    var key = sec && sec.getAttribute("data-ability");
    if (!key) return;
    var out = row.querySelector("output");
    if (!out) return;
    var p = profBonus();
    var ons = row.querySelectorAll(".d.on, .d.half.on").length;
    var halves = row.querySelectorAll(".d.half:not(.on)").length;
    var value = abilMod(key) + p * ons + Math.floor(p / 2) * halves;
    out.textContent = sg(Math.round(value));
  }

  function recomputeColumn(sec) {
    var rows = sec.querySelectorAll(".r");
    for (var i = 0; i < rows.length; i++) recomputeRow(rows[i]);
  }

  function recalcPassives() {
    var pbEl = document.getElementById("pb");
    if (pbEl) pbEl.textContent = sg(profBonus());
    var pp = document.getElementById("pp");
    var row = document.querySelector('.r[data-k="Perception"]');
    var out = row && row.querySelector("output");
    var perc = parseInt(out && out.textContent, 10);
    if (pp && isFinite(perc)) pp.textContent = String(10 + perc);
  }

  function recalcInitiative() {
    var init = document.getElementById("init");
    if (init && !init.dataset.m) init.value = sg(abilMod("DEX"));
  }

  function recalcSpellcasting() {
    var sel = document.getElementById("sca");
    var dd = document.getElementById("dd");
    var ba = document.getElementById("ba");
    if (!sel || !dd || !ba) return;
    var key = sel.value;
    if (!key) {
      dd.textContent = "—";
      ba.textContent = "—";
      return;
    }
    var p = profBonus();
    var m = abilMod(key);
    dd.textContent = String(8 + p + m);
    ba.textContent = sg(p + m);
  }

  /* ---------- Poids d'inventaire ---------- */

  function recomputeWeightRow(tr) {
    var tw = tr.querySelector("output.tw");
    if (!tw) return;
    var u = tr.querySelector("input.u");
    var q = tr.querySelector("input.q");
    var uv = parseFloat(u && u.value);
    var qv = parseFloat(q && q.value);
    if (!isFinite(uv)) {
      tw.textContent = "";
      return;
    }
    if (!isFinite(qv)) qv = 1;
    tw.textContent = String(+(uv * qv).toFixed(2));
  }

  function recomputeWeight() {
    var total = 0;
    var rows = document.querySelectorAll(".block-fillTable.inventory tbody tr");
    for (var i = 0; i < rows.length; i++) {
      var tw = rows[i].querySelector("output.tw");
      var t = parseFloat(tw && tw.textContent);
      if (isFinite(t)) total += t;
    }
    var wt = document.getElementById("wt");
    if (wt) wt.textContent = String(+total.toFixed(2));
  }

  /** Recalcule d'abord chaque ligne (q × u), puis le poids porté total. */
  function recomputeAllWeights() {
    var rows = document.querySelectorAll(".block-fillTable.inventory tbody tr");
    for (var i = 0; i < rows.length; i++) recomputeWeightRow(rows[i]);
    recomputeWeight();
  }

  /* ---------- Textareas auto-dimensionnées (.autogrow) ---------- */

  function autogrow(ta) {
    if (!ta.classList.contains("autogrow")) return;
    // Le plancher (rows) est un min-height CSS émis au rendu ; comme
    // scrollHeight >= clientHeight, il sert de minimum tout seul.
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }

  function autogrowAll() {
    var tas = document.querySelectorAll("textarea.autogrow");
    for (var i = 0; i < tas.length; i++) autogrow(tas[i]);
  }

  /* ---------- Emplacements de sort ---------- */

  function fillSlotBoxes(sl) {
    var input = sl.querySelector("input");
    var bx = sl.querySelector(".bx");
    if (!input || !bx) return;
    var n = Math.max(0, Math.min(9, parseInt(input.value, 10) || 0));
    var html = "";
    for (var i = 0; i < n; i++) html += '<i class="t cb"></i>';
    bx.innerHTML = html;
  }

  function fillAllSlots() {
    var slots = document.querySelectorAll("#slots .sl");
    for (var i = 0; i < slots.length; i++) fillSlotBoxes(slots[i]);
  }

  /* ---------- Interactions ---------- */

  function onToggle(el) {
    el.classList.toggle("on");
    var row = el.closest(".r");
    if (row) recomputeRow(row);
    var sec = el.closest(".ab");
    if (sec) recomputeColumn(sec);
    recalcPassives();
  }

  function onAdd(button) {
    var box = button.closest(".box, .lvl");
    var tb = box && box.querySelector("tbody");
    if (!tb || !tb.lastElementChild) return;
    var clone = tb.lastElementChild.cloneNode(true);
    var inputs = clone.querySelectorAll("input");
    for (var i = 0; i < inputs.length; i++) inputs[i].value = "";
    var ons = clone.querySelectorAll(".on");
    for (var j = 0; j < ons.length; j++) ons[j].classList.remove("on");
    var outs = clone.querySelectorAll("output");
    for (var k = 0; k < outs.length; k++) outs[k].textContent = "";
    tb.appendChild(clone);
    recomputeWeight();
  }

  /* ---------- Tables de sorts : niveaux supplémentaires ---------- */

  function onRemoveRow(button) {
    var tr = button.closest("tr");
    if (tr) tr.remove();
    recomputeWeight();
  }

  function onRemoveLevel(button) {
    var lvl = button.closest(".lvl:not(.lvl-template)");
    if (lvl) lvl.remove();
  }

  function onAddLevel(button) {
    var block = button.closest("#spells") || document;
    var template = block.querySelector(".lvl-template") || block.querySelector(".lvl");
    if (!template) return;
    var next = 1;
    var hs = block.querySelectorAll(".lvl:not(.lvl-template) h3");
    for (var i = 0; i < hs.length; i++) {
      var m = /Niveau\s+(\d+)/.exec(hs[i].textContent);
      if (m) next = Math.max(next, parseInt(m[1], 10) + 1);
    }
    var clone = template.cloneNode(true);
    clone.classList.remove("lvl-template", "no-print");
    var h3 = clone.querySelector("h3");
    if (h3) h3.textContent = "Niveau " + next;
    var inputs = clone.querySelectorAll("input");
    for (var j = 0; j < inputs.length; j++) inputs[j].value = "";
    var ons = clone.querySelectorAll(".on");
    for (var k = 0; k < ons.length; k++) ons[k].classList.remove("on");
    var outs = clone.querySelectorAll("output");
    for (var l = 0; l < outs.length; l++) outs[l].textContent = "";
    block.insertBefore(clone, button);
    button.textContent = "+ Niveau " + (next + 1);
  }

  /* ---------- Initialisation (une seule fois par document) ---------- */

  if (!window._dndSheetBound) {
    window._dndSheetBound = true;

    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest(".t") : null;
      if (t) {
        onToggle(t);
        return;
      }
      var add = e.target.closest ? e.target.closest(".add") : null;
      if (add) {
        onAdd(add);
        return;
      }
      var addLvl = e.target.closest ? e.target.closest(".add-lvl") : null;
      if (addLvl) {
        onAddLevel(addLvl);
        return;
      }
      var rmLvl = e.target.closest ? e.target.closest(".rm-lvl") : null;
      if (rmLvl) {
        onRemoveLevel(rmLvl);
        return;
      }
      var rm = e.target.closest ? e.target.closest(".rm") : null;
      if (rm) onRemoveRow(rm);
    });

    document.addEventListener("input", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.tagName === "TEXTAREA") autogrow(t);
      if (t.id === "init") t.dataset.m = "1";
      var sl = t.closest(".sl");
      if (sl) fillSlotBoxes(sl);
      var tr = t.closest("tr");
      if (tr && (t.classList.contains("u") || t.classList.contains("q"))) {
        recomputeWeightRow(tr);
        recomputeWeight();
        return;
      }
      var sec = t.closest(".cir") && t.closest(".ab");
      if (sec) {
        recomputeColumn(sec);
        recalcPassives();
        recalcSpellcasting();
        return;
      }
      if (t.id === "lvl") {
        recalcPassives();
        recalcInitiative();
        recalcSpellcasting();
        return;
      }
      if (t.id === "sca") recalcSpellcasting();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.classList && e.target.classList.contains("star")) {
        e.preventDefault();
        onToggle(e.target);
      }
    });
  }

  /** Réinitialisation du rendu à chaque (re)chargement du thème par l'app. */
  window.themeInit = function () {
    autogrowAll();
    fillAllSlots();
    recomputeAllWeights();
    recalcInitiative();
    recalcPassives();
    recalcSpellcasting();
  };
  window.themeInit();
})();

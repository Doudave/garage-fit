/* GarageFit — logique commune : verdict, plan vu de dessus, calculateur */
(function () {
  "use strict";

  // Seuils fixes en millimètres pour la porte. "ok" = confortable, "juste" = possible mais serré.
  var T = {
    door:   { ok: 200, juste: 80 },   // passage de la porte (largeur carrosserie, rétros rabattus)
    height: { ok: 100, juste: 30 }    // hauteur sous la porte
  };
  // Marges choisies par l'utilisateur (mm) : longueur 0-100 cm, largeur 20-60 cm par côté.
  var DEFAULT_MARGINS = { mL: 400, mW: 400 };
  var RANK = { ok: 0, juste: 1, non: 2 };
  var LABEL = { ok: "Rentre", juste: "Juste", non: "Ne rentre pas" };

  function grade(margin, t) { return margin >= t.ok ? "ok" : margin >= t.juste ? "juste" : "non"; }
  function m(mm) { return (mm / 1000).toFixed(2).replace(".", ",") + " m"; }
  function cm(mm) { var v = Math.round(mm / 10); return (v > 0 ? "+" : "") + v + " cm"; }

  function evaluate(car, g, mg) {
    mg = mg || DEFAULT_MARGINS;
    var checks = [];
    var dl = g.L - car.L;
    var lLevel = dl >= mg.mL ? "ok" : dl >= 0 ? "juste" : "non";
    checks.push({ key: "Longueur", level: lLevel,
      text: dl < 0 ? "La voiture dépasse de " + Math.abs(Math.round(dl / 10)) + " cm."
        : "Il reste " + Math.round(dl / 10) + " cm pour une marge souhaitée de " + Math.round(mg.mL / 10) + " cm." });
    var dd = g.dW - car.W;
    checks.push({ key: "Porte (largeur)", level: grade(dd, T.door),
      text: dd < 0 ? "La carrosserie est plus large que l'ouverture." : cm(dd) + " de passage, rétroviseurs rabattus." });
    var dh = g.dH - car.H;
    checks.push({ key: "Porte (hauteur)", level: grade(dh, T.height),
      text: dh < 0 ? "Trop haute de " + Math.abs(Math.round(dh / 10)) + " cm, sans coffre de toit." : cm(dh) + " sous le linteau, sans coffre de toit." });
    var dx = g.W - car.W, per = Math.round(dx / 20), want = Math.round(mg.mW / 10);
    var xLevel = dx >= 2 * mg.mW ? "ok" : dx >= mg.mW ? "juste" : "non";
    checks.push({ key: "Largeur et sortie", level: xLevel,
      text: dx < 0 ? "Plus large que le garage."
        : xLevel === "ok" ? per + " cm de chaque côté, pour " + want + " cm souhaités : la marge est respectée des deux côtés."
        : xLevel === "juste" ? Math.round(dx / 10) + " cm libres au total : la marge de " + want + " cm tient d'un seul côté, en garant la voiture décalée."
        : "Seulement " + Math.round(dx / 10) + " cm libres au total : moins que la marge de " + want + " cm, même d'un seul côté." });
    var level = checks.reduce(function (acc, c) { return RANK[c.level] > RANK[acc] ? c.level : acc; }, "ok");
    return { level: level, checks: checks };
  }

  function planSVG(car, g, level) {
    var maxW = 150, maxH = 250;
    var s = Math.min(maxW / g.W, maxH / Math.max(g.L, car.L));
    var gw = g.W * s, gl = g.L * s, x0 = 46, y0 = 34;
    var vbW = x0 + gw + 46, vbH = y0 + Math.max(gl, car.L * s) + 52;
    var door = Math.min(g.dW, g.W) * s, dx0 = x0 + (gw - door) / 2;
    var cw = car.W * s, cl = car.L * s, cx = x0 + (gw - cw) / 2;
    var cy = y0 + Math.max(4, (gl - cl) / 2);
    if (cl > gl) cy = y0 + 4;
    var stroke = level === "non" ? "var(--bad)" : "var(--plan-car)";
    var side = Math.round((g.W - car.W) / 2 / 10);
    var wall = "stroke:var(--plan-wall);stroke-width:4;stroke-linecap:square;fill:none";
    var dim = "stroke:var(--muted);stroke-width:1";
    var out = '<svg class="plan-svg" viewBox="0 0 ' + vbW.toFixed(0) + " " + vbH.toFixed(0) + '" role="img" aria-label="Plan vu de dessus : ' +
      car.n + " dans un garage de " + m(g.W) + " sur " + m(g.L) + '">';
    // sol
    out += '<rect x="' + x0 + '" y="' + y0 + '" width="' + gw + '" height="' + gl + '" style="fill:var(--paper)"/>';
    // murs (fond + côtés) et porte en bas
    out += '<path d="M' + x0 + " " + (y0 + gl) + " V" + y0 + " H" + (x0 + gw) + " V" + (y0 + gl) + '" style="' + wall + '"/>';
    out += '<path d="M' + x0 + " " + (y0 + gl) + " H" + dx0 + " M" + (dx0 + door) + " " + (y0 + gl) + " H" + (x0 + gw) + '" style="' + wall + '"/>';
    out += '<line x1="' + dx0 + '" y1="' + (y0 + gl) + '" x2="' + (dx0 + door) + '" y2="' + (y0 + gl) + '" style="stroke:var(--mark);stroke-width:3;stroke-dasharray:4 3"/>';
    // voiture
    out += '<g><rect x="' + cx + '" y="' + cy + '" width="' + cw + '" height="' + cl + '" rx="' + (cw * 0.22) + '" style="fill:var(--plan-car-fill);stroke:' + stroke + ';stroke-width:2"/>';
    out += '<path d="M' + (cx + cw * 0.14) + " " + (cy + cl * 0.30) + " Q" + (cx + cw / 2) + " " + (cy + cl * 0.24) + " " + (cx + cw * 0.86) + " " + (cy + cl * 0.30) + '" style="fill:none;stroke:' + stroke + ';stroke-width:1.5"/>';
    out += '<path d="M' + (cx + cw * 0.18) + " " + (cy + cl * 0.80) + " Q" + (cx + cw / 2) + " " + (cy + cl * 0.84) + " " + (cx + cw * 0.82) + " " + (cy + cl * 0.80) + '" style="fill:none;stroke:' + stroke + ';stroke-width:1.5"/></g>';
    // cotes : largeur en haut, longueur à droite
    out += '<line x1="' + x0 + '" y1="16" x2="' + (x0 + gw) + '" y2="16" style="' + dim + '"/>';
    out += '<line x1="' + x0 + '" y1="11" x2="' + x0 + '" y2="21" style="' + dim + '"/><line x1="' + (x0 + gw) + '" y1="11" x2="' + (x0 + gw) + '" y2="21" style="' + dim + '"/>';
    out += '<text x="' + (x0 + gw / 2) + '" y="12" text-anchor="middle" font-size="10">' + m(g.W) + "</text>";
    var rx = x0 + gw + 16;
    out += '<line x1="' + rx + '" y1="' + y0 + '" x2="' + rx + '" y2="' + (y0 + gl) + '" style="' + dim + '"/>';
    out += '<text transform="translate(' + (rx + 12) + " " + (y0 + gl / 2) + ') rotate(90)" text-anchor="middle" font-size="10">' + m(g.L) + "</text>";
    // espace latéral
    if (side > 0) {
      out += '<text transform="translate(' + (x0 - 8) + " " + (y0 + gl / 2) + ') rotate(-90)" text-anchor="middle" font-size="9">' + side + " cm/côté</text>";
    }
    var bottom = Math.max(y0 + gl, cy + cl);
    out += '<text x="' + (x0 + gw / 2) + '" y="' + (bottom + 18) + '" text-anchor="middle" font-size="10">porte ' + m(g.dW) + " × " + m(g.dH) + "</text>";
    out += "</svg>";
    return out;
  }

  function verdictHTML(car, g, mg) {
    var r = evaluate(car, g, mg);
    var h = '<div class="verdict-title"><span class="pill ' + r.level + '">' + LABEL[r.level] + "</span></div>";
    h += '<ul class="checks">';
    r.checks.forEach(function (c) {
      h += '<li><span class="pill ' + c.level + '">' + LABEL[c.level] + '</span><span><span class="k">' + c.key + '</span> <span class="v">' + c.text + "</span></span></li>";
    });
    return h + "</ul>";
  }

  function readGarage(prefix) {
    function v(id) {
      var el = document.getElementById(prefix + id);
      var n = parseFloat(String(el.value).replace(",", "."));
      return isFinite(n) && n > 0 ? n * 10 : 0;
    }
    return { L: v("len"), W: v("wid"), dW: v("dwid"), dH: v("dhei") };
  }
  function setGarage(prefix, g) {
    ["len", "wid", "dwid", "dhei"].forEach(function (k, i) {
      document.getElementById(prefix + k).value = [g.L, g.W, g.dW, g.dH][i] / 10;
    });
  }
  function readMargins(prefix) {
    function v(id, def) {
      var el = document.getElementById(prefix + id);
      if (!el) return def;
      var n = parseInt(el.value, 10);
      var out = document.getElementById(prefix + id + "-out");
      if (out && isFinite(n)) out.textContent = n + " cm";
      return isFinite(n) ? n * 10 : def;
    }
    return { mL: v("mlen", DEFAULT_MARGINS.mL), mW: v("mwid", DEFAULT_MARGINS.mW) };
  }
  function valid(g) { return g.L > 0 && g.W > 0 && g.dW > 0 && g.dH > 0; }

  var PRESETS = {
    box: { L: 5000, W: 2500, dW: 2250, dH: 1950 },
    standard: { L: 5500, W: 3000, dW: 2400, dH: 2000 },
    grand: { L: 6000, W: 3500, dW: 2500, dH: 2100 }
  };

  function bindPresets(prefix, onChange) {
    document.querySelectorAll("[data-preset]").forEach(function (b) {
      b.addEventListener("click", function () { setGarage(prefix, PRESETS[b.getAttribute("data-preset")]); onChange(); });
    });
  }

  // ---------- Page d'accueil : calculateur sur toute la base ----------
  function initIndex() {
    var list = document.getElementById("results");
    if (!list || !window.CARS) return;
    var cars = window.CARS;
    var filter = "all", query = "", segment = "", selected = null;
    var plan = document.getElementById("plan"), detail = document.getElementById("detail"), title = document.getElementById("detail-title");
    var link = document.getElementById("detail-link");

    var hash = (location.hash || "").replace("#", "");
    if (hash && cars.some(function (c) { return c.s === hash; })) selected = hash;

    function render() {
      var g = readGarage("g-"), mg = readMargins("g-");
      if (!valid(g)) {
        list.innerHTML = '<li class="empty">Saisissez les quatre mesures du garage, en centimètres.</li>';
        return;
      }
      var rows = cars.map(function (c) { return { c: c, r: evaluate(c, g, mg) }; });
      var counts = { all: rows.length, ok: 0, juste: 0, non: 0 };
      rows.forEach(function (x) { counts[x.r.level]++; });
      Object.keys(counts).forEach(function (k) {
        var el = document.querySelector('[data-filter="' + k + '"] .count');
        if (el) el.textContent = counts[k];
      });
      var q = query.trim().toLowerCase();
      var shown = rows.filter(function (x) {
        return (filter === "all" || x.r.level === filter) && (!segment || x.c.seg === segment) &&
          (!q || x.c.n.toLowerCase().indexOf(q) !== -1);
      }).sort(function (a, b) { return RANK[a.r.level] - RANK[b.r.level] || b.c.L - a.c.L; });

      if (!shown.length) { list.innerHTML = '<li class="empty">Aucun modèle ne correspond à ces filtres.</li>'; }
      else {
        list.innerHTML = shown.map(function (x) {
          var c = x.c;
          return '<li><div class="row" role="button" tabindex="0" data-slug="' + c.s + '"' + (c.s === selected ? ' aria-current="true"' : "") + '>' +
            '<span class="name"><a href="modeles/' + c.s + '.html">' + c.n + '</a> <span class="muted" style="font-weight:400">· ' + c.seg + "</span></span>" +
            '<span class="pill ' + x.r.level + '">' + LABEL[x.r.level] + "</span>" +
            '<span class="dims">' + m(c.L) + " × " + m(c.W) + " × " + m(c.H) + "</span></div></li>";
        }).join("");
      }
      if (!selected || !cars.some(function (c) { return c.s === selected; })) selected = shown.length ? shown[0].c.s : cars[0].s;
      var car = cars.filter(function (c) { return c.s === selected; })[0];
      title.textContent = car.n;
      link.href = "modeles/" + car.s + ".html";
      var brand = document.getElementById("detail-brand");
      if (brand) { brand.href = car.u; brand.textContent = "Voir sur " + car.d + " ↗"; }
      plan.innerHTML = planSVG(car, g, evaluate(car, g, mg).level);
      detail.innerHTML = verdictHTML(car, g, mg);
    }

    function pick(slug) {
      selected = slug;
      render();
    }
    list.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      var row = e.target.closest(".row");
      if (row) pick(row.getAttribute("data-slug"));
    });
    list.addEventListener("keydown", function (e) {
      var row = e.target.closest(".row");
      if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(row.getAttribute("data-slug")); }
    });
    document.querySelectorAll("[data-filter]").forEach(function (b) {
      b.addEventListener("click", function () {
        filter = b.getAttribute("data-filter");
        document.querySelectorAll("[data-filter]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        render();
      });
    });
    document.getElementById("q").addEventListener("input", function (e) { query = e.target.value; render(); });
    document.getElementById("seg").addEventListener("change", function (e) { segment = e.target.value; render(); });
    document.querySelectorAll(".calc input[inputmode], .calc input[type=range]").forEach(function (i) { i.addEventListener("input", render); });
    bindPresets("g-", render);
    render();
  }

  // ---------- Fiche modèle : test avec ses propres mesures ----------
  function initModel() {
    var root = document.getElementById("model-calc");
    if (!root || !window.CARS) return;
    var slug = root.getAttribute("data-slug");
    var car = window.CARS.filter(function (c) { return c.s === slug; })[0];
    if (!car) return;
    var plan = document.getElementById("m-plan"), res = document.getElementById("m-result");
    function render() {
      var g = readGarage("m-"), mg = readMargins("m-");
      if (!valid(g)) { res.innerHTML = '<p class="muted">Saisissez les quatre mesures, en centimètres.</p>'; return; }
      plan.innerHTML = planSVG(car, g, evaluate(car, g, mg).level);
      res.innerHTML = verdictHTML(car, g, mg);
    }
    root.querySelectorAll("input").forEach(function (i) { i.addEventListener("input", render); });
    bindPresets("m-", render);
    render();
  }

  window.GarageFit = { evaluate: evaluate, planSVG: planSVG };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { initIndex(); initModel(); });
  else { initIndex(); initModel(); }
})();

/* aiautomod.com — petit et facultatif : sans lui, le site marche pareil (tout reste visible). */
(() => {
  const root = document.documentElement;
  const calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // En-tête : un filet apparaît dès qu'on a défilé
  const top = document.querySelector(".top");
  if (top) {
    const onScroll = () => top.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Apparitions au défilement : chaque bloc d'information arrive quand il entre à l'écran.
  // Les listes (fonctions, fiche technique, étapes, offres, aide) arrivent élément par élément.
  if (!calm && "IntersectionObserver" in window) {
    // ── Mouvements liés au défilement : chaque élément suivi reçoit --p (0 → 1) selon sa position à l'écran,
    // le CSS en tire de grands mouvements (inclinaison, glissés, mots qui s'allument). Rien n'est caché sans JS.
    const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const track = [];
    // p = 0 quand le haut de l'élément est à `from` × hauteur d'écran, 1 quand il atteint `to`
    const follow = (el, from, to, name = "--p", after = null) => {
      track.push({ el, name, after, last: -1,
                   calc: (h) => clamp((h * from - el.getBoundingClientRect().top) / (h * (from - to))) });
    };
    const hero = document.querySelector(".hero");
    if (hero) track.push({ el: hero, name: "--hp", last: -1, calc: (h) => clamp(window.scrollY / (h * 0.7)) });
    // titres de section : les mots s'allument un à un pendant qu'on défile
    document.querySelectorAll(".sec-head h2, .endcta h2").forEach((h2) => {
      let k = 0;
      const walker = document.createTreeWalker(h2, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const frag = document.createDocumentFragment();
        node.nodeValue.split(/([ \t\r\n]+)/).forEach((part) => {
          if (!part) return;
          if (/^[ \t\r\n]+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement("span");
          w.className = "w";
          w.style.setProperty("--k", String(k++));
          w.textContent = part;
          frag.append(w);
        });
        node.replaceWith(frag);
      });
      h2.style.setProperty("--n", String(k));
      h2.setAttribute("data-words", "");
      follow(h2, 0.95, 0.5);
    });
    document.querySelectorAll(".feat").forEach((el) => follow(el, 1.0, 0.62));
    document.querySelectorAll(".specs").forEach((el) => follow(el, 1.0, 0.5));
    document.querySelectorAll(".plans").forEach((el) => follow(el, 1.0, 0.45));
    document.querySelectorAll(".endcta").forEach((el) => follow(el, 1.0, 0.25));
    document.querySelectorAll(".steps").forEach((el) => {
      const steps = [...el.querySelectorAll(".step")];
      follow(el, 0.85, 0.35, "--p", (p) => {           // chaque numéro s'allume quand la ligne l'atteint
        steps.forEach((s, i) => s.classList.toggle("lit", p >= (steps.length > 1 ? i / (steps.length - 1) : 0) * 0.98));
      });
    });
    let queued = 0;
    const tick = () => {
      queued = 0;
      const h = window.innerHeight;
      track.forEach((t) => {
        const p = Math.round(t.calc(h) * 1000) / 1000;
        if (p === t.last) return;
        t.last = p;
        t.el.style.setProperty(t.name, String(p));
        if (t.after) t.after(p);
      });
    };
    const ask = () => { if (!queued) queued = requestAnimationFrame(tick); };
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    tick();

    // "kids" : les enfants arrivent l'un après l'autre ; "self" : le bloc entier ; "watch" : seulement observé (décor CSS)
    const groups = [
      [".sec-head", "kids"], [".feats", "kids"], [".specs", "kids"], [".steps", "kids"], [".plans", "kids"],
      [".faq", "kids"], [".guide", "kids"], [".endcta .wrap", "kids"], [".endcta", "watch"],
      [".after", "self"], [".plans + .muted", "self"], [".help-more", "self"], [".pn", "self"],
      [".doc > h2", "self"], [".doc > .lead-doc", "self"], [".doc > table", "self"], [".tip", "self"], [".box", "self"],
    ];
    const targets = [];
    groups.forEach(([sel, mode]) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.closest(".hero")) return;
        if (mode === "kids") {
          [...el.children].forEach((c, i) => {
            if (c.hasAttribute("data-words")) return;          // ses mots s'allument déjà au défilement
            c.setAttribute("data-rv", "");
            c.style.setProperty("--i", String(Math.min(i, 8)));
          });
        } else if (mode === "self") {
          el.setAttribute("data-rv", "");
        }
        targets.push(el);
      });
    });
    root.classList.add("motion");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const shown = el.hasAttribute("data-rv") ? [el] : [];
        el.classList.add("in");
        [...el.children].forEach((c) => { if (c.hasAttribute("data-rv")) shown.push(c); });
        shown.forEach((c) => {
          c.classList.add("in");
          // une fois arrivé, l'élément retrouve ses transitions normales (survols sans délai)
          const i = Number(c.style.getPropertyValue("--i")) || 0;
          setTimeout(() => c.removeAttribute("data-rv"), 2400 + i * 260);
        });
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
    // filet de sécurité : rien ne reste caché (impression, ancre lointaine, navigateur capricieux)
    window.addEventListener("beforeprint", () => document.querySelectorAll("[data-rv]").forEach((c) => c.classList.add("in")));
  }

  // Console de verdicts : le sélecteur de sensibilité rejuge les messages d'exemple
  // selon le tableau publié dans l'aide (aucun appel réseau, rien n'est envoyé).
  const con = document.querySelector("[data-console]");
  if (!con) return;
  const sw = con.querySelector(".sens");
  const value = con.querySelector("[data-sval]");
  if (!sw) return;
  sw.hidden = false;
  const set = (v) => {
    sw.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
    con.querySelectorAll(".msg").forEach((m) => {
      const dec = m.querySelector(".dec");
      const del = m.dataset["v" + v] === "del";
      if (dec.classList.contains("dec-del") === del) return;   // verdict inchangé : on n'y touche pas
      dec.classList.remove("stamp", "dec-del", "dec-pass");
      dec.classList.add(del ? "dec-del" : "dec-pass");
      dec.textContent = del ? con.dataset.del : con.dataset.pass;
      if (!calm) {                                  // le verdict qui change est « retamponné »
        void dec.offsetWidth;
        dec.classList.add("stamp");
      }
    });
    if (value) value.textContent = v + " %";
  };
  sw.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (b) set(b.dataset.v);
  });
})();

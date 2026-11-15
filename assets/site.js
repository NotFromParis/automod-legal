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
          [...el.children].forEach((c, i) => { c.setAttribute("data-rv", ""); c.style.setProperty("--i", String(Math.min(i, 8))); });
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

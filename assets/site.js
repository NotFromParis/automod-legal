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

  if (!calm && "IntersectionObserver" in window) {
    // ── Mouvements liés au défilement, PAR BLOCS : un bloc (titre + texte d'une section, une liste entière, une
    // grille entière…) bouge d'un seul tenant. Chaque bloc reçoit --p (0 → 1, adouci) : le mouvement commence quand
    // il entre en bas de l'écran et se termine quand son haut atteint le milieu. Rien n'est caché sans JS.
    const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const ease = (p) => p * p * (3 - 2 * p);               // réparti sur toute la montée (lent → rapide → lent)
    const track = [];
    const follow = (el, from, to, name = "--p") => track.push({
      el, name, last: -1,
      calc: (h) => ease(clamp((h * from - el.getBoundingClientRect().top) / (h * (from - to)))),
    });
    const hero = document.querySelector(".hero");
    if (hero) {
      track.push({ el: hero, name: "--hp", last: -1, calc: (h) => clamp(window.scrollY / (h * 0.7)) });
      // la console est droite dès qu'on a défilé d'un quart d'écran (avant d'arriver au centre)
      track.push({ el: hero, name: "--cp", last: -1, calc: (h) => ease(clamp(window.scrollY / (h * 0.25))) });
    }
    const BLOCKS = [".sec-head", ".feats", ".specs", ".steps", ".plans", ".plans + .muted", ".faq", ".after",
                    ".guide", ".endcta .wrap"];
    let side = 0;                                          // les blocs arrivent par la gauche, puis la droite, etc.
    document.querySelectorAll(BLOCKS.join(",")).forEach((el) => {
      if (el.closest(".hero")) return;
      el.setAttribute("data-blk", side++ % 2 ? "r" : "l");
      follow(el, 0.95, 0.5);                               // bouge pendant qu'il monte du bas au milieu de l'écran
    });
    document.querySelectorAll(".endcta").forEach((el) => follow(el, 1.0, 0.4));   // le coucher de soleil se lève
    let queued = 0;
    const tick = () => {
      queued = 0;
      const h = window.innerHeight;
      track.forEach((t) => {
        const p = Math.round(t.calc(h) * 1000) / 1000;
        if (p === t.last) return;
        t.last = p;
        t.el.style.setProperty(t.name, String(p));
      });
    };
    const ask = () => { if (!queued) queued = requestAnimationFrame(tick); };
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    root.classList.add("motion");
    tick();

    // ── Pages de lecture (aide, légal) : chaque bloc de texte apparaît une fois en entrant à l'écran
    const once = [...document.querySelectorAll(".doc > h2, .doc > .lead-doc, .doc > table, .tip, .box, .pn")]
      .filter((el) => !el.closest("[data-blk]"));
    once.forEach((el) => el.setAttribute("data-rv", ""));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
        setTimeout(() => e.target.removeAttribute("data-rv"), 1200);   // ensuite, transitions normales
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    once.forEach((el) => io.observe(el));
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

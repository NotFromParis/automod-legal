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
    // ── Blocs déclenchés au défilement : un bloc (titre + texte d'une section, une liste entière, une grille
    // entière…) lance une animation fluide à durée fixe quand son haut passe au-dessus de 82 % de l'écran, en
    // arrivant par la gauche ou la droite (en alternance). Si on remonte et qu'il repasse sous ce seuil, il joue
    // l'animation à l'envers et ressort. Le défilement déclenche, il ne pilote pas la position : pas d'à-coups.
    const BLOCKS = [".sec-head", ".feats", ".specs", ".steps", ".plans", ".plans + .muted", ".faq", ".after",
                    ".guide", ".endcta .wrap", ".endcta"];
    let side = 0;
    const blocks = [];
    document.querySelectorAll(BLOCKS.join(",")).forEach((el) => {
      if (el.closest(".hero")) return;
      if (!el.matches(".endcta")) el.setAttribute("data-blk", side++ % 2 ? "r" : "l");   // .endcta : décor seul
      blocks.push(el);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("in");
        else if (e.boundingClientRect.top > 0) e.target.classList.remove("in");   // repassé sous le seuil : il ressort
        // sorti par le haut (on descend) : il reste en place
      });
    }, { rootMargin: "0px 0px -18% 0px", threshold: 0 });
    blocks.forEach((el) => io.observe(el));

    // Accueil : la console se redresse dès qu'on commence à défiler, se recouche si on revient tout en haut
    const hero = document.querySelector(".hero");
    if (hero) {
      const onHero = () => hero.classList.toggle("hero-on", window.scrollY > 24);
      window.addEventListener("scroll", onHero, { passive: true });
      onHero();
    }
    root.classList.add("motion");

    // ── Pages de lecture (aide, légal) : chaque bloc de texte apparaît une fois en entrant à l'écran
    const once = [...document.querySelectorAll(".doc > h2, .doc > .lead-doc, .doc > table, .tip, .box, .pn")]
      .filter((el) => !el.closest("[data-blk]"));
    once.forEach((el) => el.setAttribute("data-rv", ""));
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io2.unobserve(e.target);
        setTimeout(() => e.target.removeAttribute("data-rv"), 1200);   // ensuite, transitions normales
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    once.forEach((el) => io2.observe(el));
    window.addEventListener("beforeprint", () => document.querySelectorAll("[data-rv], [data-blk]")
      .forEach((c) => c.classList.add("in")));
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

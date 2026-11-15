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

  // ── Compte Discord sur le site (même session que le tableau de bord : aiautomod.com/dash) ──────────────────
  // Pas connecté : « Ajouter à Discord » ouvre la connexion Discord puis ramène sur la page d'origine.
  // Connecté : l'avatar remplace le bouton de l'en-tête, avec un menu Tableau de bord / Ajouter le bot / Déconnexion.
  // Si le tableau de bord ne répond pas (bot hors ligne, copie du site ailleurs), rien ne change : liens d'origine.
  (async () => {
    const acts = document.querySelector(".top .acts");
    const head = acts && acts.querySelector(".btn-sm");
    if (!acts || !head) return;
    const invite = head.href;
    const adds = [...document.querySelectorAll('a[href^="https://discord.com/oauth2/authorize"]')];
    let me;
    try {
      const r = await fetch("/dash/api/me", { credentials: "same-origin", headers: { Accept: "application/json" } });
      if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) return;
      me = await r.json();
    } catch (e) { return; }
    const fr = (document.documentElement.lang || "").startsWith("fr");
    const L = fr ? { dash: "Tableau de bord", add: "Ajouter le bot", out: "Se déconnecter", acct: "Mon compte" }
                 : { dash: "Dashboard", add: "Add the bot", out: "Log out", acct: "My account" };
    if (!me || !me.logged) {
      const login = "/dash/login?next=" + encodeURIComponent(location.pathname + location.search + location.hash);
      adds.forEach((a) => { a.href = login; });
      return;
    }
    const user = me.user || {};
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
    const box = el("div", "acct");
    const btn = el("button", "acct-btn");
    btn.type = "button";
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", L.acct + " : " + (user.name || ""));
    if (user.avatar && /^https:\/\/cdn\.discordapp\.com\//.test(user.avatar)) {
      const img = el("img");
      img.src = user.avatar; img.alt = ""; img.width = 34; img.height = 34; img.referrerPolicy = "no-referrer";
      btn.append(img);
    } else {
      btn.append(el("span", "acct-ini", (user.name || "?").trim().charAt(0).toUpperCase()));
    }
    const menu = el("div", "acct-menu");
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    menu.append(el("p", "acct-name", user.name || ""));
    const item = (tag, label, href) => {
      const n = el(tag, "acct-item", label);
      n.setAttribute("role", "menuitem");
      if (href) n.href = href; else n.type = "button";
      menu.append(n);
      return n;
    };
    item("a", L.dash, "/dash/#/servers");
    item("a", L.add, invite);
    const out = item("button", L.out);
    box.append(btn, menu);
    head.replaceWith(box);
    const open = (v) => { menu.hidden = !v; btn.setAttribute("aria-expanded", String(v)); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); open(menu.hidden); });
    document.addEventListener("click", (e) => { if (!box.contains(e.target)) open(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { open(false); btn.focus(); } });
    out.addEventListener("click", async () => {
      out.disabled = true;
      try {
        await fetch("/dash/api/logout", { method: "POST", credentials: "same-origin",
                                          headers: { "X-CSRF-Token": me.csrf || "" } });
      } catch (e) { /* on recharge quand même */ }
      location.reload();
    });
  })();

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

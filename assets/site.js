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

  // ── Formulaire d'aide (page Support) : connexion Discord obligatoire, envoi au bot (/dash/api/help) ────────
  // Le bot l'envoie en MP au créateur et le range dans sa page Créateur, par priorité (plan du serveur).
  const hf = document.querySelector("[data-helpform]");
  if (hf) (async () => {
    const fr = (document.documentElement.lang || "").startsWith("fr");
    const T = fr ? {
      other: "Un autre serveur…", none: "Pas de serveur",
      prio: { max: "Serveur Max : ta demande passera en priorité haute.", pro: "Serveur Pro : ta demande passera en priorité.",
              free: "" },
      sending: "Envoi…", send: "Envoyer la demande",
      err: { missing: "Remplis l'objet et le message.", files_count: "4 fichiers au plus.",
             files_size: "Les pièces jointes dépassent 8 Mo au total.",
             file_type: "Type de fichier refusé : images, vidéos, PDF, texte ou zip seulement.",
             rate: "Tu as déjà envoyé plusieurs demandes : réessaie un peu plus tard.",
             login: "Ta session a expiré : reconnecte-toi.", generic: "L'envoi a échoué. Réessaie, ou passe par le serveur support." },
    } : {
      other: "Another server…", none: "No server",
      prio: { max: "Max server: your request gets high priority.", pro: "Pro server: your request gets priority.", free: "" },
      sending: "Sending…", send: "Send the request",
      err: { missing: "Fill in the subject and the message.", files_count: "Up to 4 files.",
             files_size: "The attachments exceed 8 MB in total.",
             file_type: "File type refused: images, videos, PDF, text or zip only.",
             rate: "You have already sent several requests: try again a bit later.",
             login: "Your session has expired: log in again.", generic: "Sending failed. Try again, or use the support server." },
    };
    const show = (name) => hf.querySelectorAll("[data-hf]").forEach((n) => { n.hidden = n.getAttribute("data-hf") !== name; });
    let info;
    try {
      const r = await fetch("/dash/api/help", { credentials: "same-origin", headers: { Accept: "application/json" } });
      if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) throw new Error("off");
      info = await r.json();
    } catch (e) {
      // Le bot ne connaît pas encore le formulaire (ancienne version) : si on n'est pas connecté, on propose
      // quand même la connexion ; sinon, le serveur support.
      try {
        const r2 = await fetch("/dash/api/me", { credentials: "same-origin", headers: { Accept: "application/json" } });
        const me = r2.ok && (r2.headers.get("content-type") || "").includes("json") ? await r2.json() : null;
        info = me && !me.logged ? { logged: false } : null;
      } catch (e2) { info = null; }
      if (!info) { show("off"); return; }
    }
    if (!info.logged) {
      hf.querySelector("[data-hf-login]").href = "/dash/login?next=" + encodeURIComponent(location.pathname);
      show("login");
      return;
    }
    const form = hf.querySelector("form");
    const sel = form.elements.server, other = hf.querySelector("[data-hf-other]"), prio = hf.querySelector("[data-hf-prio]");
    const errBox = hf.querySelector("[data-hf-err]"), submit = form.querySelector('button[type="submit"]');
    const opt = (value, label) => { const o = document.createElement("option"); o.value = value; o.textContent = label; sel.append(o); };
    (info.servers || []).forEach((s) => opt(s.id, `${s.name} · ${s.plan_label}`));
    opt("other", T.other);
    opt("", T.none);
    form.elements.name.value = (info.user && info.user.name) || "";
    const onServer = () => {
      other.hidden = sel.value !== "other";
      const s = (info.servers || []).find((x) => x.id === sel.value);
      prio.textContent = s ? T.prio[s.plan] || "" : "";
      prio.hidden = !prio.textContent;
    };
    sel.addEventListener("change", onServer);
    onServer();
    show("form");
    // ── Mes demandes : état de chaque demande et, si le support a ouvert un ticket, le chat ─────────────────
    const M = fr ? {
      title: "Mes demandes", waiting: "En attente de réponse", done: "Traitée", open: "Ticket ouvert",
      resolved: (d) => `Traité · se ferme le ${d} si tu ne le rouvres pas`, closed: "Ticket fermé",
      me: "Toi", support: "Support AI Automod", reply: "Ta réponse…", send: "Envoyer", reopen: "Rouvrir le ticket",
      none: "Le support ne t'a pas encore répondu : tu recevras un MP du bot dès qu'il ouvre un ticket.",
      first: "Ta demande", err: "L'envoi a échoué. Réessaie.",
    } : {
      title: "My requests", waiting: "Waiting for a reply", done: "Done", open: "Ticket open",
      resolved: (d) => `Solved · closes on ${d} unless you reopen it`, closed: "Ticket closed",
      me: "You", support: "AI Automod support", reply: "Your reply…", send: "Send", reopen: "Reopen the ticket",
      none: "Support hasn't replied yet: the bot will DM you as soon as a ticket is opened.",
      first: "Your request", err: "Sending failed. Try again.",
    };
    const mine = hf.querySelector("[data-hf-mine]"), list = hf.querySelector("[data-hf-list]");
    const when = (iso) => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString(fr ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }); };
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
    const drafts = {};
    let requests = info.requests || [];
    const post = async (body) => {
      const r = await fetch("/dash/api/help/ticket", { method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": info.csrf || "" }, body: JSON.stringify(body) });
      const out = await r.json().catch(() => null);
      if (!r.ok || !out || !out.ok) throw new Error((out && out.error) || "generic");
      requests = requests.map((x) => (x.id === out.request.id ? out.request : x));
      draw();
    };
    const card = (q) => {
      const c = el("article", "hf-req");
      c.id = "ticket-" + q.id;
      const top = el("div", "hf-req-top");
      top.append(el("span", "hf-state-badge " + q.state, q.state === "resolved" ? M.resolved(when(q.closes)) : M[q.state] || q.state),
                 el("span", "muted small", when(q.at)));
      c.append(top, el("h3", null, q.subject));
      const chat = el("div", "hf-chat");
      const bubble = (by, at, text) => {
        const b = el("div", "hf-msg " + (by === "support" ? "them" : "me"));
        b.append(el("div", "hf-msg-meta", (by === "support" ? M.support : (by === "first" ? M.first : M.me)) + " · " + when(at)),
                 el("div", "hf-msg-text", text));
        chat.append(b);
      };
      bubble("first", q.at, q.message);
      (q.msgs || []).forEach((m) => bubble(m.by, m.at, m.text));
      c.append(chat);
      if (q.state === "waiting") c.append(el("p", "muted small", M.none));
      if (q.state === "open" || q.state === "resolved") {
        const ta = el("textarea");
        ta.maxLength = 2000; ta.rows = 3; ta.placeholder = M.reply; ta.value = drafts[q.id] || "";
        ta.setAttribute("aria-label", M.reply);
        const err = el("p", "hf-err"); err.hidden = true; err.setAttribute("role", "alert");
        const send = el("button", "btn btn-sm", M.send); send.type = "button"; send.disabled = !ta.value.trim();
        ta.addEventListener("input", () => { drafts[q.id] = ta.value; send.disabled = !ta.value.trim(); });
        send.addEventListener("click", async () => {
          send.disabled = true;
          try { await post({ id: q.id, action: "message", text: ta.value }); delete drafts[q.id]; draw(); }
          catch (e) { err.textContent = T.err[e.message] || M.err; err.hidden = false; send.disabled = false; }
        });
        const row = el("div", "hf-req-acts");
        if (q.state === "resolved") {
          const re = el("button", "btn btn-ghost btn-sm", M.reopen); re.type = "button";
          re.addEventListener("click", async () => { re.disabled = true; try { await post({ id: q.id, action: "reopen" }); } catch (e) { re.disabled = false; } });
          row.append(re);
        }
        row.append(send);
        c.append(ta, err, row);
      }
      setTimeout(() => { chat.scrollTop = chat.scrollHeight; });
      return c;
    };
    const draw = () => {
      mine.hidden = !requests.length;
      list.replaceChildren(...requests.map(card));
    };
    mine.querySelector("h2").textContent = M.title;
    draw();
    if (location.hash.startsWith("#ticket-")) {
      const t = document.getElementById(location.hash.slice(1));
      if (t) setTimeout(() => t.scrollIntoView({ behavior: "instant", block: "start" }), 300);
    }
    const refresh = async () => {
      try {
        const r = await fetch("/dash/api/help", { credentials: "same-origin", headers: { Accept: "application/json" } });
        const d = r.ok ? await r.json() : null;
        if (d && d.logged) { requests = d.requests || []; draw(); }
      } catch (e) { /* réessaie au prochain tour */ }
    };
    setInterval(() => {
      if (document.hidden || (document.activeElement && document.activeElement.tagName === "TEXTAREA")) return;
      if (requests.some((q) => q.state !== "closed" && q.state !== "done")) refresh();
    }, 20000);
    const lim = info.limits || {};
    const fail = (code) => { errBox.textContent = T.err[code] || T.err.generic; errBox.hidden = false; };
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      errBox.hidden = true;
      if (!form.elements.subject.value.trim() || !form.elements.message.value.trim()) return fail("missing");
      const files = [...form.elements.files.files];
      if (files.length > (lim.files || 4)) return fail("files_count");
      if (files.reduce((n, f) => n + f.size, 0) > (lim.total || 8388608)) return fail("files_size");
      const ext = lim.ext || [];
      if (ext.length && files.some((f) => !ext.includes((f.name.split(".").pop() || "").toLowerCase()))) return fail("file_type");
      const data = new FormData(form);
      if (sel.value === "other") data.set("server", "");
      data.set("lang", fr ? "fr" : "en");
      submit.disabled = true; submit.textContent = T.sending;
      try {
        const r = await fetch("/dash/api/help", { method: "POST", credentials: "same-origin", body: data,
                                                  headers: { "X-CSRF-Token": info.csrf || "" } });
        let out = null;
        try { out = await r.json(); } catch (e) { /* réponse vide */ }
        if (!r.ok || !out || !out.ok) {
          const code = r.status === 401 ? "login" : (out && out.error) || "generic";
          if (code === "login") hf.querySelector("[data-hf-login]").href = "/dash/login?next=" + encodeURIComponent(location.pathname);
          return fail(code);
        }
        show("sent");
        refresh();
        const done = hf.querySelector('[data-hf="sent"]');
        done.focus({ preventScroll: true });
        if (done.getBoundingClientRect().top < 80) done.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {
        fail("generic");
      } finally {
        submit.disabled = false; submit.textContent = T.send;
      }
    });
  })();

  // ── Réseau AI Automod (accueil) : le bot au centre, les derniers serveurs du réseau en orbite. Les icônes
  // viennent du bot (/dash/api/network) ; sans réponse, des cercles vides gardent le dessin.
  (() => {
    const orbit = document.querySelector("[data-orbit]");
    if (!orbit) return;
    const rings = [orbit.querySelector('[data-ring="1"]'), orbit.querySelector('[data-ring="2"]')];
    const draw = (icons) => {
      rings.forEach((r) => (r.textContent = ""));
      const n = icons.length;
      const inner = n <= 4 ? n : Math.round(n * 5 / 12);
      [icons.slice(0, inner), icons.slice(inner)].forEach((list, k) => {
        list.forEach((src, j) => {
          const a = (360 / list.length) * j + (k ? 180 / list.length : -90);
          const sat = document.createElement("span");
          sat.className = "orb-sat";
          sat.style.setProperty("--a", a + "deg");
          sat.style.setProperty("--i", String(k ? inner + j : j));
          const disc = document.createElement("span");
          if (src) {
            const img = new Image();
            img.alt = ""; img.decoding = "async"; img.loading = "lazy"; img.width = 64; img.height = 64;
            img.addEventListener("error", () => img.remove());
            img.src = src;
            disc.append(img);
          }
          sat.append(disc);
          rings[k].append(sat);
        });
      });
    };
    draw(new Array(9).fill(null));
    fetch("/dash/api/network", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.bot) {
          const core = orbit.querySelector("[data-orb-core]");
          const pre = new Image();
          pre.addEventListener("load", () => { core.src = d.bot; });
          pre.src = d.bot;
        }
        if (Array.isArray(d.icons) && d.icons.length) draw(d.icons.slice(0, 12));
        const cap = orbit.querySelector("[data-orb-cap]");
        if (d.servers > 1 && cap) {
          cap.textContent = orbit.dataset.cap.replace("{0}", d.servers);
          cap.hidden = false;
        }
      })
      .catch(() => {});
  })();

  if (!calm && "IntersectionObserver" in window) {
    // ── Blocs déclenchés au défilement : un bloc (titre + texte d'une section, une liste entière, une grille
    // entière…) lance une animation fluide à durée fixe quand son haut passe au-dessus de 82 % de l'écran, en
    // arrivant par la gauche ou la droite (en alternance). Si on remonte et qu'il repasse sous ce seuil, il joue
    // l'animation à l'envers et ressort. Le défilement déclenche, il ne pilote pas la position : pas d'à-coups.
    const BLOCKS = [".sec-head", ".net-more", ".orbit", ".feats", ".specs", ".steps", ".plans", ".plans + .muted", ".faq", ".after",
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

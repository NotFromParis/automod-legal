"""Génère le site aiautomod.com (pages statiques FR + EN) à partir de src/pages/.

    python src/build.py            → écrit les pages à la racine du dépôt (servi par GitHub Pages)
    python src/build.py --cname    → écrit aussi le fichier CNAME (à faire seulement quand le domaine pointe ici)

Chaque fragment commence par un bloc <!-- title: … / description: … / label: … --> puis le contenu.
Liens dans les fragments : {{url:help/ai}} (page du site, même langue), {{url:dash}}, {{url:invite}},
{{url:support}}, {{asset:banner.jpg}}, {{plans}}, {{faq}}. Les liens sont relatifs : le site marche aussi bien
sous notfromparis.github.io/automod-legal/ que sous aiautomod.com.
"""
from __future__ import annotations

import datetime
import hashlib
import html
import json
import os
import posixpath
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "pages")
SITE = "https://aiautomod.com"
INVITE = ("https://discord.com/oauth2/authorize?client_id=1476525696980357241&permissions=8"
          "&scope=bot+applications.commands")
LANGS = ("fr", "en")
BRAND = "AI Automod"
DISCOVERY = "https://discord.com/discovery/applications/1476525696980357241"
LISTINGS = [DISCOVERY, "https://discordbotlist.com/bots/ai-automod"]   # fiches publiques du bot (ajouter Top.gg une fois validé)
INDEXNOW_KEY = "5f0c8e2a9b7d4c61a3e8f1b2d6c4a907"     # fichier /<clé>.txt : prouve à Bing/IndexNow que le site est à nous
TODAY = datetime.date.today().isoformat()

HELP = ["setup", "controls", "protection", "ai", "sanctions", "community", "permissions", "dashboard", "plans"]
# Pages : clé → chemin FR (le chemin EN est préfixé par en/)
PAGES = {"home": "", "help": "help/", **{f"help/{k}": f"help/{k}/" for k in HELP}, "terms": "terms/",
         "policy": "policy/", "discord-automod": "discord-automod/"}
ARTICLES = ("terms", "policy", "discord-automod")
SPECIAL = {"dash": "dash/", "support": "support/"}             # servis par le Worker (pas par ce site)
UPDATED = {"terms": {"fr": "Dernière mise à jour : 10 novembre 2026 (version 2026-11-10)",
                     "en": "Last updated: November 10, 2026 (version 2026-11-10)"},
           "policy": {"fr": "Dernière mise à jour : 13 novembre 2026", "en": "Last updated: November 13, 2026"},
           "discord-automod": {"fr": "Mis à jour le 14 novembre 2026", "en": "Updated November 14, 2026"}}

UI = {
    "fr": {"nav": [("home#fonctions", "Fonctions"), ("help", "Aide"), ("help/ai", "IA"), ("help/plans", "Offres"),
                   ("dash", "Tableau de bord")],
           "cta": "Ajouter à Discord", "skip": "Aller au contenu", "crumbs": "Fil d'Ariane", "help": "Aide", "in_help": "Dans l'aide",
           "prev": "Précédent", "next": "Suivant", "other": "English", "other_short": "EN",
           "foot": [("Produit", [("home#fonctions", "Fonctions"), ("help/plans", "Offres"), ("dash", "Tableau de bord"),
                                 ("invite", "Ajouter à Discord"),
                                 ("discord-automod", "AI Automod ou AutoMod de Discord ?")]),
                    ("Aide", [("help", "Mode d'emploi"), ("help/ai", "L'IA d'AI Automod"), ("support", "Serveur support")]),
                    ("Légal", [("terms", "Conditions d'utilisation"), ("policy", "Confidentialité")])],
           "disclaimer": "AI Automod est un bot indépendant, non affilié à Discord Inc. ni à sa fonction AutoMod.",
           "locale": "fr_FR", "home": "Accueil", "nf_title": "Page introuvable", "nf_text": "Cette page n'existe pas (ou plus).",
           "nf_home": "Retour à l'accueil", "redirect": "Cette page a déménagé :"},
    "en": {"nav": [("home#fonctions", "Features"), ("help", "Help"), ("help/ai", "AI"), ("help/plans", "Pricing"),
                   ("dash", "Dashboard")],
           "cta": "Add to Discord", "skip": "Skip to content", "crumbs": "Breadcrumb", "help": "Help", "in_help": "In the help",
           "prev": "Previous", "next": "Next", "other": "Français", "other_short": "FR",
           "foot": [("Product", [("home#fonctions", "Features"), ("help/plans", "Pricing"), ("dash", "Dashboard"),
                                 ("invite", "Add to Discord"),
                                 ("discord-automod", "AI Automod vs Discord AutoMod")]),
                    ("Help", [("help", "User guide"), ("help/ai", "AI Automod's AI"), ("support", "Support server")]),
                    ("Legal", [("terms", "Terms of Service"), ("policy", "Privacy Policy")])],
           "disclaimer": "AI Automod is an independent bot, not affiliated with Discord Inc. or its AutoMod feature.",
           "locale": "en_GB", "home": "Home", "nf_title": "Page not found", "nf_text": "This page doesn't exist (anymore).",
           "nf_home": "Back to home", "redirect": "This page has moved:"},
}

PLANS = {
    "fr": [("🆓", "Free", "Gratuit", "pour toujours", 0,
            ["Commandes de base (ban, kick, mute, warn…)",
             "Modération auto par règles : insultes, contenu sexuel, données perso, arnaques, spam, mentions, liens",
             "Sensibilité standard", "Anti-raid, anti-nuke, anti bot, anti comptes récents",
             "Logs et tableau de bord web", "Bienvenue, rôles, absences, suggestions", "Support standard (24-48 h)"]),
           ("⭐", "Pro", "2,99 €", "pour 30 jours", 2.99,
            ["<strong>Tout le plan Free</strong>", "Sensibilité réglable pour chaque module", "Captcha à l'arrivée",
             "Protection critique du serveur", "Convocations", "Smartlog : logs avec boutons d'action",
             "Sanctions groupées", "Support prioritaire (12-24 h)"]),
           ("💎", "Max", "9,99 €", "pour 30 jours", 9.99,
            ["<strong>Tout le plan Pro</strong>", "Mode IA (bêta) sur les modules de contenu",
             "Fait la différence entre humour et insulte", "Moins de faux positifs", "Support personnel"])],
    "en": [("🆓", "Free", "Free", "forever", 0,
            ["Basic commands (ban, kick, mute, warn…)",
             "Rule-based auto-moderation: insults, sexual content, personal data, scams, spam, mentions, links",
             "Standard sensitivity", "Anti-raid, anti-nuke, anti bot, anti new accounts",
             "Logs and web dashboard", "Welcome, roles, absences, suggestions", "Standard support (24-48 h)"]),
           ("⭐", "Pro", "€2.99", "for 30 days", 2.99,
            ["<strong>Everything in Free</strong>", "Adjustable sensitivity for each module", "Captcha on join",
             "Critical server protection", "Convocations", "Smartlog: logs with action buttons",
             "Bulk sanctions", "Priority support (12-24 h)"]),
           ("💎", "Max", "€9.99", "for 30 days", 9.99,
            ["<strong>Everything in Pro</strong>", "AI mode (beta) on content modules",
             "Tells a joke from an insult", "Fewer false positives", "Personal support"])],
}
PLANS_NOTE = {"fr": "Sans renouvellement automatique : un rappel arrive avant la fin. Paiement par carte sur la page "
                    "sécurisée du prestataire, activé en moins d'une minute. Ou branche ta propre clé d'IA pour "
                    "le mode IA sans abonnement.",
              "en": "No automatic renewal: you get a reminder before it ends. Card payment on the provider's secure "
                    "page, active within a minute. Or plug in your own AI key for AI mode without a subscription."}

FAQ = {
    "fr": [("Automod est-il gratuit ?",
            "Oui. Le plan Free comprend les commandes de base, toute la modération automatique par règles (insultes, "
            "contenu sexuel, données perso, arnaques, spam…), l'anti-raid, l'anti-nuke, les logs et le tableau de bord, "
            "sans limite de temps. Pro (2,99 €) ajoute la sensibilité réglable, le captcha, la protection critique du "
            "serveur, Smartlog et les convocations ; Max (9,99 €) ajoute l'IA. 30 jours, sans renouvellement "
            "automatique."),
           ("Comment l'IA fait-elle la différence entre une blague et une insulte ?",
            "Pour chaque message, l'IA donne la catégorie (insulte, contenu sexuel, données perso, arnaque), la gravité "
            "et le ton : humour ou sérieux. Une vanne entre potes avec « mdr » ou 😂 compte un cran de moins qu'une "
            "vraie attaque, et c'est la sensibilité choisie par le serveur qui décide de sanctionner ou non."),
           ("Comment installer Automod ?",
            "Ajoute le bot avec le bouton « Ajouter à Discord », puis tape /setup sur ton serveur : le mode rapide crée "
            "les salons de logs, détecte les rôles du staff et active les protections recommandées en un clic."),
           ("Quelle différence avec l'AutoMod intégré à Discord ?",
            "AutoMod, l'outil de Discord, bloque des mots-clés et du spam avant publication, avec des listes toutes "
            "prêtes en anglais. AI Automod est un bot indépendant qui ajoute la modération en français, la "
            "compréhension du ton par IA, les sanctions avec historique, l'anti-raid, l'anti-nuke, le captcha et les "
            "logs. Les deux peuvent tourner ensemble."),
           ("Automod parle-t-il anglais ?",
            "Oui. Au premier /setup, tu choisis le français ou l'anglais pour tout le serveur : messages, panneaux, logs "
            "et tableau de bord."),
           ("Que fait Automod de mes messages ?",
            "Il les analyse pour modérer le serveur et garde l'historique des sanctions. Le texte d'un message n'est "
            "envoyé à une IA que si le serveur a activé le mode IA. Aucune donnée n'est vendue."),
           ("J'ai été sanctionné sur un serveur, que faire ?",
            "Chaque serveur décide de ses propres règles et sanctions : contacte le staff de ce serveur (le message "
            "privé de sanction contient son lien d'appel s'il en a un). L'équipe d'Automod ne peut pas lever une "
            "sanction à sa place.")],
    "en": [("Is Automod free?",
            "Yes. The Free plan includes basic commands, all rule-based automatic moderation (insults, sexual content, "
            "personal data, scams, spam…), anti-raid, anti-nuke, logs and the web dashboard, with no time limit. Pro "
            "(€2.99) adds adjustable sensitivity, captcha, critical server protection, Smartlog and convocations; Max "
            "(€9.99) adds AI. 30 days, no automatic renewal."),
           ("How does the AI tell a joke from an insult?",
            "For each message, the AI gives the category (insult, sexual content, personal data, scam), the severity "
            "and the tone: joke or serious. Banter between friends with “lol” or 😂 counts one level lower than a real "
            "attack, and the sensitivity chosen by the server decides whether to sanction."),
           ("How do I install Automod?",
            "Add the bot with the “Add to Discord” button, then type /setup on your server: quick mode creates the log "
            "channels, detects staff roles and turns on the recommended protections in one click."),
           ("What's the difference with Discord's built-in AutoMod?",
            "AutoMod, Discord's tool, blocks keywords and spam before they are posted, with ready-made lists in "
            "English. AI Automod is an independent bot that adds French moderation, AI tone understanding, sanctions "
            "with history, anti-raid, anti-nuke, captcha and logs. Both can run together."),
           ("Does Automod speak French?",
            "Yes. On the first /setup you choose English or French for the whole server: messages, panels, logs and "
            "dashboard."),
           ("What does Automod do with my messages?",
            "It analyses them to moderate the server and keeps the sanction history. A message's text is only sent to "
            "an AI if the server turned on AI mode. No data is ever sold."),
           ("I was sanctioned on a server, what can I do?",
            "Each server sets its own rules and sanctions: contact that server's staff (the sanction DM includes their "
            "appeal link if they have one). The Automod team can't lift a sanction for them.")],
}


# ══════════════════════════════════════════════════════════════════════════════
#  Outils
# ══════════════════════════════════════════════════════════════════════════════

def path_of(key: str, lang: str) -> str:
    base = PAGES.get(key, SPECIAL.get(key))
    if base is None:
        raise KeyError(key)
    return base if (lang == "fr" or key in SPECIAL) else "en/" + base


def rel(from_path: str, to_path: str) -> str:
    """Lien relatif entre deux chemins de dossier (« help/ai/ » → « ../setup/ »)."""
    start = from_path.rstrip("/") or "."
    target = to_path.rstrip("/") or "."
    r = posixpath.relpath(target, start)
    return "./" if r == "." else r + "/"


def link(key: str, lang: str, here: str) -> str:
    if key == "invite":
        return INVITE
    anchor = ""
    if "#" in key:
        key, anchor = key.split("#", 1)
        anchor = "#" + anchor
    return rel(here, path_of(key, lang)) + anchor


def asset(name: str, here: str) -> str:
    return rel(here, "assets/").rstrip("/") + "/" + name if here else "assets/" + name


def read_fragment(lang: str, name: str) -> tuple[dict, str]:
    raw = open(os.path.join(SRC, lang, name + ".html"), encoding="utf-8").read()
    meta = {}
    m = re.match(r"\s*<!--(.*?)-->\s*", raw, re.S)
    if m:
        for line in m.group(1).strip().splitlines():
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
        raw = raw[m.end():]
    return meta, raw


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def plans_html(lang: str) -> str:
    cards = []
    for emoji, name, price, per, _amount, perks in PLANS[lang]:
        cards.append(f'<div class="plan{" plan-hi" if name == "Pro" else ""}"><h3>{emoji} {name}</h3>'
                     f'<p class="price">{price} <span>{per}</span></p><ul>'
                     + "".join(f"<li>{p}</li>" for p in perks) + "</ul></div>")
    return f'<div class="plans">{"".join(cards)}</div><p class="muted small">{PLANS_NOTE[lang]}</p>'


def faq_html(lang: str) -> str:
    return '<div class="faq">' + "".join(f"<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>"
                                          for q, a in FAQ[lang]) + "</div>"


def expand(body: str, lang: str, here: str) -> str:
    body = re.sub(r"\{\{url:([^}]+)\}\}", lambda m: esc(link(m.group(1), lang, here)), body)
    body = re.sub(r"\{\{asset:([^}]+)\}\}", lambda m: asset(m.group(1), here), body)
    body = body.replace("{{plans}}", plans_html(lang)).replace("{{faq}}", faq_html(lang))
    body = body.replace("{{invite}}", esc(INVITE))
    left = re.findall(r"\{\{[^}]*\}\}", body)
    if left:
        raise ValueError(f"marqueur inconnu dans {lang}/{here}: {left}")
    return body


def jsonld(obj) -> str:
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + "</script>"


# ══════════════════════════════════════════════════════════════════════════════
#  Gabarit
# ══════════════════════════════════════════════════════════════════════════════

def layout(key: str, lang: str, meta: dict, content: str, css_v: str, extra_head: str = "") -> str:
    here = path_of(key, lang)
    ui = UI[lang]
    other = "en" if lang == "fr" else "fr"
    url = SITE + "/" + here
    alt = {lg: SITE + "/" + path_of(key, lg) for lg in LANGS}
    title = meta["title"]
    desc = meta["description"]
    nav = "".join(f'<a href="{esc(link(k, lang, here))}"{" aria-current=\"page\"" if k == key else ""}>{esc(t)}</a>'
                  for k, t in ui["nav"])
    foot = "".join(f'<div><h2>{esc(h)}</h2>' + "".join(f'<a href="{esc(link(k, lang, here))}">{esc(t)}</a>'
                                                       for k, t in items) + "</div>"
                   for h, items in ui["foot"])
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="fr" href="{alt['fr']}">
<link rel="alternate" hreflang="en" href="{alt['en']}">
<link rel="alternate" hreflang="x-default" href="{alt['en']}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/assets/og-{lang}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{BRAND}">
<meta property="og:locale" content="{ui['locale']}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0612">
<link rel="icon" href="{asset('logo.svg', here)}" type="image/svg+xml">
<link rel="apple-touch-icon" href="{asset('icon-192.png', here)}">
<link rel="stylesheet" href="{asset('site.css', here)}?v={css_v}">
{extra_head}</head>
<body>
<a class="skip" href="#main">{esc(ui['skip'])}</a>
<header class="top">
  <div class="wrap bar">
    <a class="brand" href="{esc(link('home', lang, here))}"><img src="{asset('logo.svg', here)}" width="30" height="30" alt=""><span>{BRAND}</span></a>
    <nav class="menu" aria-label="Menu">{nav}</nav>
    <div class="acts">
      <a class="lang" href="{esc(link(key, other, here))}" hreflang="{other}" lang="{other}" title="{esc(ui['other'])}">{ui['other_short']}</a>
      <a class="btn btn-sm" href="{esc(INVITE)}">{esc(ui['cta'])}</a>
    </div>
  </div>
</header>
<main id="main">
{content}
</main>
<footer class="foot">
  <div class="wrap cols">
    <div class="fbrand"><a class="brand" href="{esc(link('home', lang, here))}"><img src="{asset('logo.svg', here)}" width="26" height="26" alt=""><span>{BRAND}</span></a>
      <p>{esc(ui['disclaimer'])}</p></div>
    {foot}
  </div>
  <p class="wrap copy">© 2026 {BRAND} · <a href="{esc(link(key, other, here))}" hreflang="{other}" lang="{other}">{esc(ui['other'])}</a></p>
</footer>
</body>
</html>
"""


def help_page(key: str, lang: str, meta: dict, body: str) -> str:
    here = path_of(key, lang)
    ui = UI[lang]
    name = key.split("/", 1)[1]
    i = HELP.index(name)
    labels = {k: read_fragment(lang, "help/" + k)[0].get("label", k) for k in HELP}
    side = "".join(f'<li><a href="{esc(link("help/" + k, lang, here))}"{" aria-current=\"page\"" if k == name else ""}>'
                   f'{esc(labels[k])}</a></li>' for k in HELP)
    prev = (f'<a class="pn-prev" href="{esc(link("help/" + HELP[i - 1], lang, here))}"><span>{ui["prev"]}</span>'
            f'{esc(labels[HELP[i - 1]])}</a>') if i > 0 else "<span></span>"
    nxt = (f'<a class="pn-next" href="{esc(link("help/" + HELP[i + 1], lang, here))}"><span>{ui["next"]}</span>'
           f'{esc(labels[HELP[i + 1]])}</a>') if i < len(HELP) - 1 else "<span></span>"
    return f"""<div class="wrap page">
  <nav class="crumbs" aria-label="{esc(ui['crumbs'])}"><a href="{esc(link('home', lang, here))}">{esc(ui['home'])}</a> <span aria-hidden="true">›</span> <a href="{esc(link('help', lang, here))}">{esc(ui['help'])}</a> <span aria-hidden="true">›</span> {esc(labels[name])}</nav>
  <div class="help-grid">
    <article class="doc">
      <h1>{esc(meta.get('h1', meta['title'].split(' — ')[0]))}</h1>
{body}
      <nav class="pn" aria-label="{esc(ui['prev'])} / {esc(ui['next'])}">{prev}{nxt}</nav>
    </article>
    <aside class="side" aria-label="{esc(ui['in_help'])}"><h2>{esc(ui['in_help'])}</h2><ol>{side}</ol></aside>
  </div>
</div>"""


def simple_page(key: str, lang: str, meta: dict, body: str) -> str:
    sub = UPDATED.get(key, {}).get(lang)
    here, ui = path_of(key, lang), UI[lang]
    crumbs = (f'<nav class="crumbs" aria-label="{esc(ui["crumbs"])}"><a href="{esc(link("home", lang, here))}">'
              f'{esc(ui["home"])}</a> <span aria-hidden="true">›</span> {esc(meta.get("label", meta["title"]))}</nav>'
              if key == "discord-automod" else "")
    return (f'<div class="wrap page narrow doc">{crumbs}<h1>{esc(meta.get("h1", meta["title"].split(" — ")[0]))}</h1>'
            + (f'<p class="muted">{esc(sub)}</p>' if sub else "") + f"\n{body}\n</div>")


def crumbs_for(key: str, lang: str, meta: dict) -> list[tuple[str, str]]:
    out = [("home", UI[lang]["home"])]
    if key.startswith("help/"):
        out.append(("help", UI[lang]["help"]))
    out.append((key, meta.get("label") or meta.get("h1") or meta["title"].split(" — ")[0]))
    return out


FEATURES = {
    "fr": ["Modération automatique par règles : insultes, contenu sexuel, données personnelles, arnaques",
           "Mode IA qui fait la différence entre humour et insulte", "Anti-spam, anti-mass-ping, anti-liens",
           "Anti-raid et mode raid automatique", "Anti-nuke : régulation des salons, des rôles et de la modération de masse",
           "Captcha à l'arrivée", "Logs et Smartlog", "Tableau de bord web", "Sanctions, historique et récidive",
           "Bienvenue, rôles par réaction, suggestions et absences"],
    "en": ["Rule-based automatic moderation: insults, sexual content, personal data, scams",
           "AI mode that tells a joke from an insult", "Anti-spam, anti mass ping, anti-links",
           "Anti-raid and automatic raid mode", "Anti-nuke: channel, role and mass moderation limits",
           "Captcha on join", "Logs and Smartlog", "Web dashboard", "Sanctions, history and repeat offences",
           "Welcome, reaction roles, suggestions and absences"],
}


def head_for(key: str, lang: str, meta: dict) -> str:
    page = SITE + "/" + path_of(key, lang)
    if key == "home":
        org, site = SITE + "/#org", SITE + "/#website"
        plans_url = SITE + "/" + path_of("help/plans", lang)
        offers = [{"@type": "Offer", "name": p[1], "price": f"{p[4]:.2f}", "priceCurrency": "EUR", "url": plans_url,
                   "availability": "https://schema.org/InStock"} for p in PLANS[lang]]
        graph = [
            # Nom du site affiché par Google : le balisage WebSite doit être sur la page d'accueil
            {"@type": "WebSite", "@id": site, "url": SITE + "/", "name": BRAND,
             "alternateName": ["Automod", "aiautomod.com"], "inLanguage": ["fr", "en"], "publisher": {"@id": org}},
            {"@type": "Organization", "@id": org, "name": BRAND, "url": SITE + "/",
             "logo": {"@type": "ImageObject", "url": SITE + "/assets/icon-192.png", "width": 192, "height": 192},
             "sameAs": LISTINGS},
            {"@type": "SoftwareApplication", "@id": SITE + "/#app", "name": BRAND, "alternateName": "Automod",
             "url": page, "applicationCategory": "CommunicationApplication", "operatingSystem": "Discord",
             "description": meta["description"], "image": f"{SITE}/assets/og-{lang}.png", "inLanguage": ["fr", "en"],
             "featureList": FEATURES[lang], "offers": offers, "publisher": {"@id": org}, "installUrl": INVITE},
            # FAQ identique à celle affichée sur la page (Google ne l'affiche plus en résultat enrichi pour ce type
            # de site, mais elle reste lue par les moteurs et les assistants)
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ[lang]]},
        ]
        return jsonld({"@context": "https://schema.org", "@graph": graph}) + "\n"
    crumbs = crumbs_for(key, lang, meta)
    graph = [{"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + "/" + path_of(k, lang)}
        for i, (k, n) in enumerate(crumbs)]}]
    if key == "discord-automod":
        graph.append({"@type": "Article", "headline": meta.get("h1", meta["title"]), "description": meta["description"],
                      "inLanguage": lang, "url": page, "image": f"{SITE}/assets/og-{lang}.png",
                      "datePublished": meta.get("published", TODAY), "dateModified": last_modified(key, lang),
                      "author": {"@type": "Organization", "name": BRAND, "url": SITE + "/"},
                      "publisher": {"@type": "Organization", "name": BRAND, "url": SITE + "/",
                                    "logo": {"@type": "ImageObject", "url": SITE + "/assets/icon-192.png"}}})
    return jsonld({"@context": "https://schema.org", "@graph": graph}) + "\n"


def last_modified(key: str, lang: str) -> str:
    """Date de la dernière vraie modification de la page (git), pas la date du build : Google ignore un lastmod
    qui change à chaque fois."""
    import subprocess
    name = "home" if key == "home" else key
    files = [os.path.join("src", "pages", lang, name + ".html")]
    if key in ("home", "help/plans"):
        files.append(os.path.join("src", "build.py"))           # offres et FAQ sont définies ici
    try:
        dirty = subprocess.run(["git", "status", "--porcelain", "--", *files], cwd=ROOT, capture_output=True,
                               text=True, timeout=10).stdout.strip()
        if dirty:
            return TODAY
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", *files], cwd=ROOT, capture_output=True,
                             text=True, timeout=10).stdout.strip()
        return out or TODAY
    except (OSError, subprocess.SubprocessError):
        return TODAY


# ══════════════════════════════════════════════════════════════════════════════
#  Construction
# ══════════════════════════════════════════════════════════════════════════════

def write(rel_path: str, text: str):
    out = os.path.join(ROOT, *rel_path.split("/"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8", newline="\n").write(text)


def redirect_page(target_key: str, lang: str, old: str) -> str:
    to = link(target_key, lang, old)
    full = SITE + "/" + path_of(target_key, lang)
    return f"""<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<link rel="canonical" href="{full}"><meta http-equiv="refresh" content="0; url={to}">
<title>Automod</title></head>
<body><p>{esc(UI[lang]['redirect'])} <a href="{to}">{full}</a></p></body></html>
"""


def not_found() -> str:
    ui_fr, ui_en = UI["fr"], UI["en"]
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>{ui_fr['nf_title']} — Automod</title>
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/site.css">
</head><body><main id="main" class="wrap page narrow nf">
<img src="/assets/logo.svg" width="72" height="72" alt="">
<h1>404</h1><p>{ui_fr['nf_text']}<br><span lang="en">{ui_en['nf_text']}</span></p>
<p><a class="btn" href="/">{ui_fr['nf_home']}</a> <a class="btn btn-ghost" href="/en/" lang="en">{ui_en['nf_home']}</a></p>
</main></body></html>
"""


def sitemap(urls: list[tuple[str, dict]]) -> str:
    items = []
    for key, alts in urls:
        for lang in LANGS:
            links = "".join(f'<xhtml:link rel="alternate" hreflang="{lg}" href="{SITE}/{p}"/>' for lg, p in alts.items())
            links += f'<xhtml:link rel="alternate" hreflang="x-default" href="{SITE}/{alts["en"]}"/>'
            items.append(f"<url><loc>{SITE}/{alts[lang]}</loc><lastmod>{last_modified(key, lang)}</lastmod>{links}</url>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(items) + "\n</urlset>\n")


def main():
    css = open(os.path.join(ROOT, "assets", "site.css"), "rb").read()
    css_v = hashlib.sha1(css).hexdigest()[:8]
    built = []
    for key in PAGES:
        for lang in LANGS:
            name = "home" if key == "home" else key
            meta, body = read_fragment(lang, name)
            here = path_of(key, lang)
            body = expand(body, lang, here)
            if key.startswith("help/"):
                content = help_page(key, lang, meta, body)
            elif key in ARTICLES:
                content = simple_page(key, lang, meta, body)
            else:
                content = body
            write(here + "index.html", layout(key, lang, meta, content, css_v, head_for(key, lang, meta)))
        built.append((key, {lg: path_of(key, lg) for lg in LANGS}))
    # anciennes adresses → nouvelles
    write("guide/index.html", redirect_page("help", "fr", "guide/"))
    write("privacy/index.html", redirect_page("policy", "fr", "privacy/"))
    write("404.html", not_found())
    write("sitemap.xml", sitemap(built))
    write("robots.txt", f"User-agent: *\nAllow: /\nDisallow: /dash/\n\nSitemap: {SITE}/sitemap.xml\n")
    write(".nojekyll", "")
    write(f"{INDEXNOW_KEY}.txt", INDEXNOW_KEY)
    if "--cname" in sys.argv:
        write("CNAME", SITE.split("://", 1)[1] + "\n")
    print(f"{len(built) * len(LANGS)} pages · sitemap · robots · 404 · redirections · css {css_v}")


if __name__ == "__main__":
    main()

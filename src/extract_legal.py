"""Une seule fois : découpe les anciennes pages terms/ et privacy/ (FR + EN sur la même page) en fragments séparés,
sans changer le texte juridique. Usage : python src/extract_legal.py"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def split(old, new):
    html = open(os.path.join(ROOT, old, "index.html"), encoding="utf-8").read()
    updated = re.search(r"<header>.*?<p>(.*?)</p>", html, re.S).group(1).strip()
    main = re.search(r"<main>(.*)</main>", html, re.S).group(1)
    fr, en = main.split('<hr id="english">', 1)
    fr = fr.replace('<span class="lang">Français</span>', "").strip()
    en = en.replace('<span class="lang">English</span>', "").strip()
    for lang, body in (("fr", fr), ("en", en)):
        body = (body.replace('href="../privacy/"', 'href="{{url:policy}}"')
                    .replace('href="../terms/"', 'href="{{url:terms}}"')
                    .replace('href="../guide/"', 'href="{{url:help}}"'))
        out = os.path.join(ROOT, "src", "pages", lang, new + ".html")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "w", encoding="utf-8", newline="\n").write(body + "\n")
    return updated


for old, new in (("terms", "terms"), ("privacy", "policy")):
    print(new, "→", split(old, new))

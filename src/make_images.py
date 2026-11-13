"""Images du site : icône 192 px (même bouclier que logo.svg) et aperçus de partage og-fr.png / og-en.png (1200×630).
Usage : python src/make_images.py"""
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets")
FONTS = r"C:\Windows\Fonts"


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def gradient(w, h, stops, horizontal=True):
    """Dégradé linéaire entre plusieurs couleurs (stops = [(pos 0-1, (r, g, b)), …])."""
    img = Image.new("RGB", (w, h))
    px = img.load()
    n = w if horizontal else h
    line = []
    for i in range(n):
        t = i / max(1, n - 1)
        for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
            if p0 <= t <= p1:
                k = (t - p0) / max(1e-9, p1 - p0)
                line.append(tuple(int(c0[j] + (c1[j] - c0[j]) * k) for j in range(3)))
                break
    for x in range(w):
        for y in range(h):
            px[x, y] = line[x if horizontal else y]
    return img


GRAD = [(0, (143, 140, 240)), (.55, (228, 132, 200)), (1, (244, 183, 173))]


def bezier(p0, p1, p2, p3, n=24):
    out = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
        out.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return out


def shield(size):
    """Le bouclier de logo.svg (viewBox 64), dessiné en 4× puis réduit pour l'anticrénelage."""
    s = size * 4 / 64
    pts = [(32, 4), (8, 13), (8, 30)] + bezier((8, 30), (8, 44.5), (18.2, 56.6), (32, 60)) \
        + bezier((32, 60), (45.8, 56.6), (56, 44.5), (56, 30)) + [(56, 13)]
    big = size * 4
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).polygon([(x * s, y * s) for x, y in pts], fill=255)
    fill = gradient(big, big, GRAD)
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    img.paste(fill, (0, 0), mask)
    d = ImageDraw.Draw(img)
    check = [(22 * s, 32 * s), (29 * s, 39 * s), (43 * s, 24 * s)]
    w = int(5 * s)
    d.line(check, fill=(27, 12, 46, 255), width=w, joint="curve")
    for x, y in (check[0], check[-1]):
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=(27, 12, 46, 255))
    return img.resize((size, size), Image.LANCZOS)


def icon():
    bg = Image.new("RGBA", (192, 192), (11, 6, 18, 255))
    sh = shield(150)
    bg.alpha_composite(sh, (21, 21))
    bg.convert("RGB").save(os.path.join(A, "icon-192.png"), optimize=True)


def og(lang):
    W, H = 1200, 630
    img = gradient(W, H, [(0, (22, 10, 36)), (1, (11, 6, 18))], horizontal=False).convert("RGBA")
    banner = Image.open(os.path.join(A, "banner.jpg")).convert("RGB")
    if lang == "en":                       # remplace « MODÉRATION AUTOMATIQUE » par la version anglaise
        px = banner.load()
        for y in range(150, 188):
            for x in range(40, 372):
                px[x, y] = px[388, y]
        ImageDraw.Draw(banner).text((52, 158), "AUTOMATIC MODERATION", font=font("bahnschrift.ttf", 20),
                                    fill=(236, 230, 245))
    img.paste(banner, (0, 0))
    d = ImageDraw.Draw(img)
    lines = {"fr": ["Le bot de modération Discord qui fait", "la différence entre une vanne et une insulte"],
             "en": ["The Discord moderation bot that knows", "a joke from an insult"]}[lang]
    f1 = font("segoeuib.ttf", 46)
    d.text((60, 338), lines[0], font=f1, fill=(255, 255, 255))
    # 2e ligne en dégradé (texte → masque)
    mask = Image.new("L", (W, 70), 0)
    ImageDraw.Draw(mask).text((60, 0), lines[1], font=f1, fill=255)
    img.paste(gradient(W, 70, GRAD), (0, 398), mask)
    tags = {"fr": "Anti-raid · Anti-nuke · Captcha · IA · Logs · Gratuit", "en": "Anti-raid · Anti-nuke · Captcha · AI · Logs · Free"}
    d.text((60, 490), tags[lang], font=font("segoeui.ttf", 28), fill=(169, 155, 189))
    d.text((60, 552), "aiautomod.com", font=font("segoeuib.ttf", 30), fill=(228, 132, 200))
    sh = shield(64)
    img.alpha_composite(sh, (W - 60 - 64, 540))
    img.convert("RGB").save(os.path.join(A, f"og-{lang}.png"), optimize=True)


if __name__ == "__main__":
    icon()
    og("fr")
    og("en")
    print("icon-192.png, og-fr.png, og-en.png")

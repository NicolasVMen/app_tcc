from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"C:\Users\Nicolas Venciguerra\Desktop\app_tcc")
OUT = ROOT / "docs" / "imagens_montagem" / "02-circuito-completo.png"

W, H = 2000, 1250
BG = "#F7F9FC"
INK = "#111827"
MUTED = "#475569"
RED = "#E5252A"
BLACK = "#171717"
BLUE = "#1677D2"
YELLOW = "#E5A900"
PURPLE = "#7337B8"
GREEN = "#198754"
ORANGE = "#E86D12"
BOARD = "#20262E"
GOLD = "#D9A72E"


def font(size, bold=False):
    name = "seguisb.ttf" if bold else "segoeui.ttf"
    path = Path(r"C:\Windows\Fonts") / name
    return ImageFont.truetype(str(path), size)


F_TITLE = font(56, True)
F_SUB = font(25)
F_H = font(28, True)
F_LABEL = font(24, True)
F_SMALL = font(20)
F_TINY = font(17)


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)


def rounded(box, radius=18, fill="white", outline="#CBD5E1", width=3):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def line(points, fill, width=12, joint="curve"):
    d.line(points, fill=fill, width=width, joint=joint)


def node(x, y, color, r=10):
    d.ellipse((x-r, y-r, x+r, y+r), fill=color, outline="white", width=3)


def label(x, y, text, fill, bg="white", anchor="mm", pad=10, fs=F_LABEL):
    bbox = d.textbbox((0, 0), text, font=fs)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    if anchor == "mm":
        box = (x-tw/2-pad, y-th/2-pad, x+tw/2+pad, y+th/2+pad)
        tx, ty = x-tw/2, y-th/2-2
    elif anchor == "lm":
        box = (x-pad, y-th/2-pad, x+tw+pad, y+th/2+pad)
        tx, ty = x, y-th/2-2
    else:
        box = (x-tw-pad, y-th/2-pad, x+pad, y+th/2+pad)
        tx, ty = x-tw, y-th/2-2
    d.rounded_rectangle(box, radius=12, fill=bg, outline=fill, width=3)
    d.text((tx, ty), text, font=fs, fill=fill)


def resistor(x1, y1, x2, y2, bands, caption, color):
    # Horizontal resistor, with short leads.
    cy = y1
    line([(x1, cy), (x1+45, cy)], color, 8)
    line([(x2-45, cy), (x2, cy)], color, 8)
    body = (x1+45, cy-25, x2-45, cy+25)
    d.rounded_rectangle(body, radius=18, fill="#D8B07B", outline="#7C5A2C", width=3)
    bx = x1 + 70
    for band in bands:
        d.rectangle((bx, cy-24, bx+12, cy+24), fill=band)
        bx += 26
    d.text(((x1+x2)//2, cy-64), caption, font=F_SMALL, fill=color, anchor="mm")


def resistor_v(x, y1, y2, bands, caption, color):
    # Vertical resistor used for the base-to-emitter pull-down.
    line([(x, y1), (x, y1+45)], color, 8)
    line([(x, y2-45), (x, y2)], BLACK, 8)
    body = (x-25, y1+45, x+25, y2-45)
    d.rounded_rectangle(body, radius=18, fill="#D8B07B", outline="#7C5A2C", width=3)
    by = y1 + 67
    for band in bands:
        d.rectangle((x-24, by, x+24, by+12), fill=band)
        by += 26
    d.text((x+48, (y1+y2)//2-20), caption, font=F_SMALL, fill=color, anchor="lm")
    d.text((x+48, (y1+y2)//2+18), "marrom-preto-laranja-dourado", font=F_TINY, fill=color, anchor="lm")


# Header
d.text((W//2, 45), "ESCOLTA UNITAU — CIRCUITO COMPLETO", font=F_TITLE, fill=INK, anchor="ma")
d.text((W//2, 115), "Referência visual para conferência antes da soldagem do protótipo", font=F_SUB, fill=MUTED, anchor="ma")

# Main white work area
rounded((35, 160, 1965, 1035), radius=28, fill="white", outline="#D7DEE8", width=3)

# XIAO board
bx1, by1, bx2, by2 = 760, 350, 1260, 775
d.rounded_rectangle((bx1+10, by1+14, bx2+10, by2+14), radius=34, fill="#DDE3EA")
d.rounded_rectangle((bx1, by1, bx2, by2), radius=34, fill=BOARD, outline="#0B0F14", width=5)

# Castellated pads for visual identity
for px in range(810, 1220, 58):
    d.ellipse((px-13, by1-8, px+13, by1+18), fill=GOLD, outline="#F6D675", width=2)
    d.ellipse((px-13, by2-18, px+13, by2+8), fill=GOLD, outline="#F6D675", width=2)

# USB-C at left
d.rounded_rectangle((700, 458, 815, 645), radius=22, fill="#B8BEC7", outline="#606872", width=5)
d.rounded_rectangle((712, 485, 800, 618), radius=18, fill="#59616C")
d.text((875, 455), "seeed studio", font=F_H, fill="white")
d.text((875, 500), "XIAO nRF52840 Sense", font=F_SMALL, fill="#D7E0EA")
d.text((875, 545), "PROTÓTIPO ESCOLTA", font=F_LABEL, fill="#6DE2FF")

# Clearly labeled logical pads; locations are diagrammatic, not a physical pin map.
p3v3 = (835, 350)
pd3 = (1030, 350)
pd1 = (1260, 525)
pgnd = (1130, 775)
pbatp = (900, 775)
pbatn = (1015, 775)

label(p3v3[0]-58, 305, "3V3", RED)
label(pd3[0]+58, 305, "D3", BLUE)
label(1308, pd1[1], "D1", YELLOW, anchor="lm")
label(pgnd[0], 825, "GND", BLACK)
label(pbatp[0], 825, "BAT+", RED)
label(pbatn[0], 825, "BAT−", BLACK)

# Buzzer top-left: exactly two terminals.
cx, cy, rr = 305, 295, 105
d.ellipse((cx-rr, cy-rr, cx+rr, cy+rr), fill="#1D2229", outline="#050607", width=6)
d.ellipse((cx-22, cy-22, cx+22, cy+22), fill="#090B0D", outline="#454D57", width=4)
d.text((cx, cy-62), "BUZZER", font=F_LABEL, fill="white", anchor="mm")
d.text((cx, cy+60), "ATIVO", font=F_SMALL, fill="#C9D1DA", anchor="mm")
buzz_plus = (420, 245)
buzz_minus = (420, 345)
node(*buzz_plus, RED)
node(*buzz_minus, PURPLE)
d.text((449, 220), "+", font=F_H, fill=RED, anchor="mm")
d.text((449, 370), "−", font=F_H, fill=PURPLE, anchor="mm")
line([(cx+rr, 245), buzz_plus], RED, 8)
line([(cx+rr, 345), buzz_minus], PURPLE, 8)

# 3V3 to buzzer positive.
line([p3v3, (835, 205), (500, 205), (500, 245), buzz_plus], RED, 12)
node(*p3v3, RED)

# Diode in parallel, left of buzzer.
dx = 125
line([buzz_plus, (dx, 245)], RED, 8)
line([(dx, 245), (dx, 275)], RED, 8)
d.rounded_rectangle((101, 275, 149, 360), radius=18, fill="#161A20", outline="#050608", width=3)
d.rectangle((101, 283, 149, 297), fill="#C9CED4")  # cathode stripe near positive
line([(dx, 360), (dx, 345), buzz_minus], PURPLE, 8)
d.text((125, 400), "1N4007", font=F_LABEL, fill=INK, anchor="mm")
d.text((125, 435), "FAIXA → +", font=F_SMALL, fill=RED, anchor="mm")

# Transistor lower-left.
tx, ty = 300, 600
d.rounded_rectangle((tx, ty, tx+180, ty+165), radius=14, fill="#15191F", outline="#050607", width=5)
d.text((tx+90, ty+42), "P2N", font=F_LABEL, fill="#E4E7EB", anchor="mm")
d.text((tx+90, ty+78), "2222A", font=F_LABEL, fill="#E4E7EB", anchor="mm")
d.text((tx+90, ty+119), "FACE PLANA", font=F_TINY, fill="#AEB6C1", anchor="mm")
c_pin = (340, 825)
b_pin = (390, 825)
e_pin = (440, 825)
for px in (c_pin[0], b_pin[0], e_pin[0]):
    line([(px, ty+165), (px, 835)], "#A9ADB4", 9)
for px, name in ((c_pin[0], "C"), (b_pin[0], "B"), (e_pin[0], "E")):
    d.text((px, 872), name, font=F_H, fill=INK, anchor="mm")
d.text((390, 900), "face escrita: C — B — E", font=F_SMALL, fill=MUTED, anchor="mm")

# Collector to buzzer negative.
line([c_pin, (340, 535), (520, 535), (520, 345), buzz_minus], PURPLE, 12)
node(*c_pin, PURPLE)
node(*buzz_minus, PURPLE)

# D3 -> 1k -> base, with one unambiguous route.
line([pd3, (1030, 445), (740, 445)], BLUE, 12)
resistor(560, 445, 740, 445,
         ["#6B3518", "#111111", "#C92828", "#D6B24C"],
         "1 kΩ  •  marrom-preto-vermelho-dourado", BLUE)
line([(560, 445), (390, 445), b_pin], BLUE, 12)
node(*pd3, BLUE)
node(*b_pin, BLUE)

# 10k branches from the base node and returns to the same GND node as E.
line([(390, 585), (555, 585), (555, 625)], ORANGE, 8)
node(390, 585, ORANGE)
resistor_v(555, 625, 875,
           ["#6B3518", "#111111", "#E66B16", "#D6B24C"],
           "10 kΩ entre B e E/GND", ORANGE)

# Common GND bus: E, 10k, XIAO GND, button return.
gnd_y = 975
line([e_pin, (485, gnd_y), (1650, gnd_y)], BLACK, 12)
line([(555, 875), (555, gnd_y)], BLACK, 10)
line([pgnd, (1130, gnd_y)], BLACK, 12)
node(*e_pin, BLACK)
node(555, gnd_y, BLACK)
node(*pgnd, BLACK)
label(865, gnd_y, "GND COMUM", BLACK)

# Button on right.
button_box = (1570, 420, 1765, 610)
d.rounded_rectangle(button_box, radius=20, fill="#D5D8DD", outline="#656B73", width=5)
d.ellipse((1620, 470, 1715, 565), fill="#22272D", outline="#08090B", width=5)
for px, py in ((1555, 455), (1780, 455), (1555, 575), (1780, 575)):
    d.rounded_rectangle((px-22, py-10, px+22, py+10), radius=5, fill="#B3B7BD", outline="#6B7078", width=2)
d.text((1668, 650), "BOTÃO DE EMERGÊNCIA", font=F_LABEL, fill=INK, anchor="mm")
button_in = (1555, 455)
button_gnd = (1780, 575)
line([pd1, button_in], YELLOW, 12)
line([button_gnd, (1840, 575), (1840, gnd_y), (1650, gnd_y)], BLACK, 12)
node(*pd1, YELLOW)
node(*button_in, YELLOW)
node(*button_gnd, BLACK)

# Battery and detachable connector.
conn_x, conn_y = 960, 885
d.rounded_rectangle((conn_x-62, conn_y-35, conn_x+62, conn_y+35), radius=9, fill="#F2F2EF", outline="#90959C", width=4)
d.line((conn_x, conn_y-34, conn_x, conn_y+34), fill="#A3A7AD", width=3)
d.ellipse((conn_x-31, conn_y-7, conn_x-17, conn_y+7), fill=GOLD)
d.ellipse((conn_x+17, conn_y-7, conn_x+31, conn_y+7), fill=GOLD)
d.text((960, 845), "CONECTOR 2 VIAS", font=F_SMALL, fill=GREEN, anchor="mm")

# Board BAT pads to upper connector half.
line([pbatp, (900, 850), (929, 850), (929, conn_y-35)], RED, 11)
line([pbatn, (1015, 850), (991, 850), (991, conn_y-35)], BLACK, 11)
node(*pbatp, RED)
node(*pbatn, BLACK)

# Battery body.
bat = (1120, 845, 1460, 980)
d.rounded_rectangle(bat, radius=22, fill="#E9ECEF", outline="#8A9199", width=5)
d.rectangle((1120, 845, 1165, 980), fill="#E6A019")
d.text((1305, 884), "LiPo 501520", font=F_LABEL, fill=INK, anchor="mm")
d.text((1305, 925), "3,7 V  •  180 mAh", font=F_SMALL, fill=MUTED, anchor="mm")
d.text((1305, 960), "PCM/BMS integrado", font=F_TINY, fill=GREEN, anchor="mm")

# Lower connector to battery wires.
line([(929, conn_y+35), (929, 930), (1120, 930)], RED, 11)
line([(991, conn_y+35), (991, 965), (1120, 965)], BLACK, 11)

# Callout cards.
rounded((1335, 205, 1915, 340), radius=18, fill="#FFF9E8", outline="#E9B400", width=3)
d.text((1365, 228), "BOTÃO", font=F_LABEL, fill="#A46F00")
d.text((1365, 270), "D1 lê o botão; ao pressionar, D1 é ligado ao GND.", font=F_SMALL, fill=INK)
d.text((1365, 303), "Use lados elétricos opostos do botão de 4 pernas.", font=F_TINY, fill=MUTED)

rounded((1450, 675, 1905, 810), radius=18, fill="#ECF8F2", outline=GREEN, width=3)
d.text((1480, 698), "BATERIA REMOVÍVEL", font=F_LABEL, fill=GREEN)
d.text((1480, 738), "Vermelho → BAT+", font=F_SMALL, fill=INK)
d.text((1480, 770), "Preto → BAT−", font=F_SMALL, fill=INK)

# Bottom safety strip.
d.rounded_rectangle((35, 1065, 1965, 1205), radius=24, fill="#FFD83D", outline="#1A1A1A", width=5)
d.polygon([(78, 1170), (122, 1090), (166, 1170)], fill="#111111")
d.polygon([(90, 1158), (122, 1105), (154, 1158)], fill="#FFD83D")
d.text((122, 1143), "!", font=F_H, fill="#111111", anchor="mm")
d.text((190, 1093), "ATENÇÃO: SOLDAR E CONFERIR SEM USB E SEM BATERIA.", font=F_H, fill="#111111")
d.text((190, 1142), "CONECTAR A BATERIA SOMENTE NO TESTE FINAL.", font=F_H, fill="#111111")
d.text((1510, 1150), "USB-C deve permanecer acessível", font=F_SMALL, fill="#111111")

# Small note to prevent treating the drawing as an exact physical pin-map.
d.text((1960, 1225), "Diagrama funcional: confira os nomes impressos nos pads antes de soldar.", font=F_TINY, fill=MUTED, anchor="ra")

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, quality=96)
print(OUT)

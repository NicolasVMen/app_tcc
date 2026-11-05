"""Pranchas de inspeção de páginas já renderizadas do PDF, sem editar fotos."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
folder = root / '.expo/tcc-revisao-2026-11-04/paginas'
files = sorted(folder.glob('final-*.png')) or sorted(folder.glob('p-*.png'))
assert len(files) >= 40, 'Renderizar todas as páginas antes de inspecionar.'
for start in range(0,len(files),15):
    canvas = Image.new('RGB',(1300,1170),'#c9c9c9')
    draw = ImageDraw.Draw(canvas)
    for j,file in enumerate(files[start:start+15]):
        page=Image.open(file).convert('RGB')
        page.thumbnail((245,350))
        x=(j%5)*260+8; y=(j//5)*390+28
        canvas.paste(page,(x,y))
        draw.text((x,y-18),file.stem,fill='black')
    target=folder/f'contato-{start+1:02}.png'
    canvas.save(target)
    print(target)

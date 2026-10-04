from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json
root=Path(__file__).resolve().parent
out=root/'screenshots'/'slices'
out.mkdir(exist_ok=True)
records=[]
for source in sorted((root/'screenshots').glob('*-full.jpg')):
    im=Image.open(source).convert('RGB')
    height=1800 if im.width>800 else 1500
    step=height-150
    slices=[]
    for index,y in enumerate(range(0,im.height,step),1):
        name=f'{source.stem}-{index:02d}.jpg'
        crop=im.crop((0,y,im.width,min(y+height,im.height)))
        crop.save(out/name,quality=94)
        slices.append({'file':'screenshots/slices/'+name,'top':y,'bottom':min(y+height,im.height),'width':im.width})
        if y+height>=im.height:break
    records.append({'source':'screenshots/'+source.name,'width':im.width,'height':im.height,'slices':slices})
(root/'data'/'slices.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
sources=sorted((root/'screenshots').glob('*-viewport.jpg'))
thumbw,thumbh=320,225
sheet=Image.new('RGB',(4*thumbw,((len(sources)+3)//4)*(thumbh+42)), '#e8edf3')
draw=ImageDraw.Draw(sheet)
for i,p in enumerate(sources):
    im=Image.open(p).convert('RGB')
    im.thumbnail((thumbw-16,thumbh-10))
    x=(i%4)*thumbw+(thumbw-im.width)//2;y=(i//4)*(thumbh+42)
    sheet.paste(im,(x,y))
    draw.text(((i%4)*thumbw+8,y+thumbh+4),p.stem.replace('-viewport','')[:45],fill='#142f4c')
sheet.save(root/'CONTACT-SHEET.jpg',quality=94)
print(json.dumps({'full_page_files':len(records),'slices':sum(len(x['slices']) for x in records),'contact_sheet_thumbnails':len(sources)}))

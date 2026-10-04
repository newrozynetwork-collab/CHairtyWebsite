from pathlib import Path
from PIL import Image
from zipfile import ZipFile, ZIP_DEFLATED
from io import BytesIO
root=Path(__file__).resolve().parent
target=root.parent/'hrw-ai-handoff-compact-2026-10-04.zip'
with ZipFile(target,'w',ZIP_DEFLATED,compresslevel=6) as z:
    for p in root.rglob('*'):
        if not p.is_file():continue
        name='hrw-inspiration/'+p.relative_to(root).as_posix()
        if p.suffix.lower()=='.jpg':
            im=Image.open(p).convert('RGB')
            if im.width>960:im=im.resize((960,round(im.height*960/im.width)),Image.Resampling.LANCZOS)
            buf=BytesIO();im.save(buf,format='JPEG',quality=55,optimize=True)
            z.writestr(name,buf.getvalue())
        else:z.write(p,name)
    z.writestr('COMPACT-PACK-NOTE.txt','This compact edition contains the same report, data, and image filenames as the full reference pack. JPEGs wider than 960px were resized and all JPEGs were recompressed. Recorded measurements describe the original browser capture, not the compressed file. Use the full pack for original screenshot dimensions and better image detail. All 270 overlapping slices are retained.\n')
print(f'{target.name}: {target.stat().st_size/1024/1024:.2f} MiB')

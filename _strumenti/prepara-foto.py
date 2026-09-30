#!/usr/bin/env python3
"""Prepara le foto del sito.

Prende la foto che trovi in ogni cartella di _foto-originali/ e crea la versione
leggera per il web in assets/img/foto/<pagina>/<posto>.jpg, poi aggiorna
assets/img/foto/manifest.json: il sito mostra solo le foto elencate lì.

Uso, dalla cartella del sito:   python3 _strumenti/prepara-foto.py
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '_foto-originali')
DST = os.path.join(ROOT, 'assets', 'img', 'foto')
EXT = ('.jpg', '.jpeg', '.png', '.heic', '.tif', '.tiff', '.webp')
MAX = 2200  # lato lungo massimo in pixel (le foto più piccole non vengono ingrandite)

def clean(name):  # "01-carosello-wedding__VERTICALE" -> "carosello-wedding"
    return re.sub(r'^\d+-', '', name).split('__')[0]

def size(path):
    out = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', path], capture_output=True, text=True).stdout
    return max(int(n) for n in re.findall(r'pixel\w+: (\d+)', out))

manifest, fatte, vuote = {}, 0, []
for page in sorted(os.listdir(SRC)):
    pdir = os.path.join(SRC, page)
    if not os.path.isdir(pdir): continue
    for slot in sorted(os.listdir(pdir)):
        sdir = os.path.join(pdir, slot)
        if not os.path.isdir(sdir): continue
        files = sorted(f for f in os.listdir(sdir) if f.lower().endswith(EXT) and not f.startswith('.'))
        key = f'{clean(page)}/{clean(slot)}'
        if not files: vuote.append(key); continue
        src = os.path.join(sdir, files[0])
        out = os.path.join(DST, key + '.jpg')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if not os.path.exists(out) or os.path.getmtime(src) > os.path.getmtime(out):
            cmd = ['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80']
            if size(src) > MAX: cmd += ['-Z', str(MAX)]
            subprocess.run(cmd + [src, '--out', out], check=True, capture_output=True)
            print(f'✓ {key}  ({files[0]})'); fatte += 1
        manifest[key] = int(os.path.getmtime(out))

# rimuovi le foto pubblicate la cui cartella ora è vuota
for dirpath, _, names in os.walk(DST):
    for n in names:
        if n.endswith('.jpg'):
            key = os.path.relpath(os.path.join(dirpath, n), DST)[:-4]
            if key not in manifest: os.remove(os.path.join(dirpath, n)); print(f'✗ rimossa {key}')

json.dump(manifest, open(os.path.join(DST, 'manifest.json'), 'w'), indent=1, sort_keys=True)
print(f'\nFatto: {fatte} foto preparate, {len(manifest)} foto sul sito, {len(vuote)} posti ancora vuoti.')

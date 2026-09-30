#!/usr/bin/env python3
"""Aggiorna il "numero di versione" di CSS e JS in tutte le pagine.

I browser (soprattutto su iPhone) tengono in memoria stile e script: cambiando
?v=... nell'indirizzo li costringiamo a scaricare la versione nuova.
Va lanciato prima di ogni pubblicazione:   python3 _strumenti/versione.py
"""
import glob, os, re, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = time.strftime('%Y%m%d%H%M')
pat = re.compile(r'((?:href|src)="/?assets/(?:css|js)/[^"?]+\.(?:css|js))(?:\?v=\w+)?"')
for f in glob.glob(os.path.join(ROOT, '*.html')):
    s = open(f).read()
    n = pat.sub(lambda m: f'{m.group(1)}?v={v}"', s)
    if n != s:
        open(f, 'w').write(n)
print(f'Versione aggiornata: {v}')

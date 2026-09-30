#!/bin/zsh
# Crea le versioni leggere per il sito a partire da _foto-originali/.
# Uso (dalla cartella del sito):  zsh _strumenti/prepara-foto.sh
# - lato lungo max 2200 px (le foto più piccole non vengono ingrandite), JPG qualità 80 (circa 300-600 KB per foto)
# - salta le foto già preparate, a meno che l'originale sia più recente
set -e
cd "$(dirname "$0")/.."
SRC=_foto-originali
DST=assets/img/foto
n=0
for dir in "$SRC"/*(/); do
  name=${dir:t}; out="$DST/${name#[0-9][0-9]-}"
  mkdir -p "$out"
  for f in "$dir"/*.(jpg|jpeg|JPG|JPEG|png|PNG|heic|HEIC|tif|tiff|TIF)(N); do
    base=${f:t:r:l}; base=${base// /-}
    target="$out/$base.jpg"
    if [[ ! -f "$target" || "$f" -nt "$target" ]]; then
      w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}'); h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
      if (( w > 2200 || h > 2200 )); then resize=(-Z 2200); else resize=(); fi   # mai ingrandire
      sips -s format jpeg -s formatOptions 80 $resize "$f" --out "$target" >/dev/null
      echo "✓ $target"; n=$((n+1))
    fi
  done
done
echo "Fatto: $n foto preparate in $DST"

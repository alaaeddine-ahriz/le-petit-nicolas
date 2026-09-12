#!/usr/bin/env sh
# Regenerates the mascot SVGs from DiceBear (style "Adventurer" by Lisa Wischofsky, CC BY 4.0).
# Change BASE to change the look; each mood below only changes eyes/mouth.
set -e
BASE="seed=petit&hair=short16&hairColor=562306&skinColor=f2d3b1&features=blush&featuresProbability=100&earringsProbability=0&glassesProbability=0&size=512"
cd "$(dirname "$0")/../public/avatar"
get() { curl -fsS -o "$1.svg" "https://api.dicebear.com/9.x/adventurer/svg?$BASE&eyes=$2&mouth=$3"; echo "$1.svg"; }
get hello variant13 variant19
get talk  variant13 variant30
get think variant16 variant09
get cheer variant13 variant26
get wink  variant22 variant23

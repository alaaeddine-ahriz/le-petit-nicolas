#!/usr/bin/env sh
# The one mascot image: DiceBear "Notionists" style by Zoish (CC0). Edit LOOK to change the character.
set -e
LOOK="seed=alice&hair=variant25&lips=variant25&beardProbability=0&glassesProbability=0&bodyIconProbability=0&size=512"
cd "$(dirname "$0")/../public/avatar"
curl -fsS -o nicolas.svg "https://api.dicebear.com/9.x/notionists/svg?$LOOK&gestureProbability=100&gesture=waveLongArm"
echo nicolas.svg

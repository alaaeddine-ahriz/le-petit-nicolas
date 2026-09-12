#!/usr/bin/env sh
# Regenerates the mascot from DiceBear, style "Notionists" by Zoish (CC0). https://www.dicebear.com/styles/notionists/
# LOOK fixes the character (hair, mouth, eyes…); each pose below only changes the hand gesture.
set -e
LOOK="seed=alice&hair=variant25&lips=variant25&beardProbability=0&glassesProbability=0&bodyIconProbability=0&size=512"
cd "$(dirname "$0")/../public/avatar"
pose() { curl -fsS -o "$1.svg" "https://api.dicebear.com/9.x/notionists/svg?$LOOK&gestureProbability=100&gesture=$2"; echo "$1.svg"; }
pose hello waveLongArm
pose phone handPhone
pose point pointLongArm
pose ok    okLongArm
pose cheer waveLongArms
pose think hand
# no gesture: cropped to the head by CSS for the header and the chat avatar
curl -fsS -o face.svg "https://api.dicebear.com/9.x/notionists/svg?$LOOK&gestureProbability=0"; echo face.svg

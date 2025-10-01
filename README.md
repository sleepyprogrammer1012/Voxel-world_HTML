# Welcome all! I just wanted to try my hand at making things, my nephew loves MineCraft, so naturally, I decided to try to make a Voxel Engine/World.

# 🪄 Voxel Game Engine — Medieval Edition

Welcome to the tiny blocky kingdom! This is a minimalist Minecraft-style voxel engine built with Three.js and Simplex Noise. It’s playful, pixelated, and perfect for tinkering — drop it in a GitHub repo, enable Pages, and share your world with friends.

[Click here to Test the world in your browser!](https://sleepyprogrammer1012.github.io/Voxel-world_HTML/) -  **Please allow a few moments for it to load, Thank you!**

---

## 🎮 Quick demo / TL;DR

  Run locally:

    python -m http.server 8000
  then open http://localhost:8000/ (or /Minecraft-attempt.html)


Make sure minecraft_atlas.png is in the same folder as your HTML (or update atlasPath in the code).

---

## ✨ Features

* Procedural terrain with chunks (Simplex noise)

* Day/night cycle + lighting

* Block placement & destruction

* Texture atlas (4×4) for block types

* Simple player physics and collisions

* Block selector UI

---

## ⌨️ Controls (how to play)

* Click the page to lock the mouse

* Move: W A S D

* Jump: Space

* Look: Mouse

* Break block: Left click

* Place block: Right click (context menu is disabled in-game)

* Switch block material: click a block in the block selector UI

---

    🧰 File layout (recommended)
    / (repo root)
    ├─ index.html                
    ├─ minecraft_atlas.png      
    ├─ README.md                 


---
## 🐞 Troubleshooting & tips

Block placement not working? Confirm you’ve clicked to lock pointer first (mouse must be locked).

Want prettier blocks? Replace minecraft_atlas.png with higher-fidelity tiles (keep 4×4 layout or adjust UV mapping).

---

## ✨ Credits & shoutouts

Built with love using Three.js and simplex-noise.

Atlas generated programmatically (you can replace it with your own art).

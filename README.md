## 🌟 Developer’s Journey

This is my very first real game project (unless you count a Flappy Bird tutorial 😅).  
I only started coding in 2024, and before this I tinkered with things like a lithophane generator for 3D printing and a royalty‑tracking system. None of those ever made it to the finish line.

So why jump straight into building a voxel sandbox game?  
Because one day I asked myself: *“Why not? If RuneScape could run in a browser, why can’t I build something wild on a GitHub Page?”*  

That single thought flipped the switch. Suddenly, what felt impossible, hosting a game on a static page, became the challenge I wanted to chase. I don’t have servers, I don’t have funding, but I do have curiosity, stubbornness, and the belief that games should be as open and creative as the people who play them.

This repo is me learning in public, building step by step, and sharing the process.  
It might be rough around the edges, but it’s also proof that you don’t need decades of experience or a big studio to start shaping the next evolution of gaming.  

Follow along, contribute if you’d like, and let’s see how far this can go 🚀

---

# 🪄 Voxel Game Engine — Medieval Edition

<p float="left">
  <img src="./images/Screenshot-2025-10-05%20215242.png" width="250" />
  <img src="./images/Screenshot-2025-10-05%20215306.png" width="250" />
  <img src="./images/Screenshot-2025-10-05%20215415.png" width="250" />
</p>

Welcome to the tiny blocky kingdom! This is a minimalist Minecraft-style voxel engine built with Three.js and Simplex Noise. It’s playful, pixelated, and perfect for tinkering — drop it in a GitHub repo, enable Pages, and share your world with friends.

[Click here to Test the world in your browser!](https://sleepyprogrammer1012.github.io/Voxel-world_HTML/) -  **Please allow a few moments for it to load, Thank you!**

---

## 🎮 Quick demo / TL;DR

  Run locally (after downloading and unzipping the repo contents):

    python -m http.server 8000
  then open http://localhost:8000/ (or /index.html)


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

---

## 🤝 Contributing

Contributions are what make this project grow and improve!  
Whether it’s fixing a bug, adding new features, designing textures, or creating blueprints — all help is welcome.

Please read the [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, the process for submitting pull requests, and the rules for community content.

Together we can build something amazing 🚀

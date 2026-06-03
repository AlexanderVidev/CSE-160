# CSE 160 Assignment 5 - Three.js Crystal Island: Portal Quest

## How to run
Because this project loads local textures, a skybox, and a local `.glb` file, run it with a local server instead of opening `index.html` directly.

Option 1:
```bash
python3 -m http.server 8000
```
Then open:
```text
http://localhost:8000
```

Option 2: Use the VS Code Live Server extension.

## Rubric checklist
- Basic scene: yes. Uses a Three.js scene, perspective camera, directional light, and many primary shapes.
- At least 3 primary shape kinds: yes. Uses cylinder, cone, sphere, box, torus, dodecahedron, etc.
- Animated primary shape: yes. Crystals rotate/float, the flame flickers, beacon rings rotate, floating particles orbit, aurora waves, a shooting star moves, and the portal activation effects animate.
- Textured primary shape: yes. Island ground and wooden crates use texture images.
- Custom textured 3D model: yes. `assets/models/beacon_drone.glb` is loaded with `GLTFLoader`.
- Camera controls: yes. Uses `OrbitControls` with mouse orbit/zoom/pan.
- At least 3 light sources: yes. AmbientLight, HemisphereLight, DirectionalLight, PointLight, and SpotLight are included.
- Skybox: yes. Uses six local skybox PNGs loaded through `CubeTextureLoader`.
- At least 20 primary shapes: yes. The scene has far more than 20 primary meshes.
- Extra Feature / Wow Point: yes. Raycasting crystal-collection mini-game activates the central beacon, changes the portal into its activated state, and unlocks the chest. The scene also includes floating particles, an upgraded cosmic skybox, aurora, nebula clouds spread around the island, multiple sky planets, constellations on every side, drifting sky clouds, a meteor shower, floating sky crystals, ground portal stones, ocean-style foam rings, moon/reflection effects, an in-world instruction sign, a reward chest that opens after the portal activates, a day/night toggle, a reset button, and a cinematic camera tour.

## Submission comment note
My Wow Feature is an expanded interactive mini-game and visual effects system. The player clicks five animated glowing crystals using raycasting. When all five are collected, the central beacon powers up, the beam changes color, the orbiting energy rings speed up, the floating particles move faster, the portal changes into its activated state, and the reward chest opens. I also added an upgraded cosmic skybox, animated aurora ribbons, colorful nebula clouds around the full sky, multiple sky planets, visible constellations on every side, drifting sky clouds, a meteor shower, floating sky crystals, a star field, a shooting star, ground portal stones, ocean foam rings, moon/reflection effects, an in-world instruction sign, crystal burst particles, a day/night lighting toggle, a reset button, and a cinematic camera tour.


## Important note about the editor/resources
This project was coded manually. It does not use the Three.js editor export, because the assignment says editor-created scenes do not fulfill the code requirement. The custom `.glb` model is included locally in `assets/models/beacon_drone.glb`, so Poly Pizza / Free3D are optional resources, not required for this version.

## If the page stays on Loading
Do not double-click `index.html`. Open a terminal in this exact project folder and run:
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000`. Also make sure you have internet access because Three.js itself is loaded from jsDelivr CDN.


Latest polish fix: The portal now keeps the same size when activated, and the floating portal fragments were raised higher above the portal.

Latest sky upgrade: Spread the sky content across the whole scene by adding more nebula planes around all directions, multiple planets/moons, more constellations, a full ring of drifting clouds, more meteors, and floating sky crystals.


Latest cloud upgrade: Rebuilt the sky-cloud system so the clouds are not copy-pasted. Clouds now use varied sizes, puff counts, shapes, tints, heights, layered wispy clouds, different drift speeds, and subtle individual puff animation.


Latest UI text update: The side panel was rewritten to explain what the program does instead of labeling it as a Wow Feature. The in-world sign also now says Interactive Three.js Scene.

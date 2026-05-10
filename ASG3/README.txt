ASG3 Virtual World

Controls:
Use W/A/S/D to move, Q/E to turn, and drag the mouse left or right to rotate the camera. You can also use the arrow keys for movement and turning. Press R to place a block and F to remove a block. The glowing blue preview shows the block or empty cell you are currently targeting.

Goal:
Explore the randomly generated maze, collect all 5 glowing blue crystals, and avoid the moving guardian tigers. The tigers patrol the maze and chase you when you get close. If a tiger catches you, you are sent back to the start. Collect all crystals to win. Each refresh creates a new maze with different wall heights, crystal locations, and tiger spawn points.

How to run:
1. Open the asg3_virtual_world folder in VS Code.
2. Use Live Preview / Live Server, or run:
   python3 -m http.server 8000
3. Open http://localhost:8000/asg3.html

Detailed controls:
- W/A/S/D: move camera
- Arrow keys: move forward/back and turn left/right
- Q/E: turn camera left/right
- Mouse drag left/right on canvas: rotate camera
- R or Add Block button: add a block at the glowing blue preview cell
- F or Delete Block button: remove the targeted block shown by the glowing blue preview
- Generate New Random Map button: creates a new randomized maze

Features included:
- Perspective camera with view/projection matrices
- Camera class in camera.js
- 32x32 JavaScript height map with randomized maze generation and wall heights 0-4
- Ground cube and skybox cube
- Textured walls/ground/wood using multiple texture units
- Solid-color objects and texture objects working together
- Add/delete blocks using a glowing blue preview that shows the target cell
- Moving guardian tigers that patrol/chase the player
- Simple story/game: collect 5 crystals while avoiding the guardian tigers
- Randomized map, crystal locations, and tiger spawn positions each run

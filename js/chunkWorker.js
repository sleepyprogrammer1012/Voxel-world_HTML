// chunkWorker.js

importScripts('./simplex-noise.js');

// Create one noise generator instance
const simplex = new NOISE.Simplex();
simplex.init();
simplex.noiseDetail(4, 0.5); // octaves + persistence

function getBlockKey(x, y, z) {
  return `${x},${y},${z}`;
}

// Terrain + Trees
function generateChunkData(chunkX, chunkZ, chunkSize, worldHeight) {
  const blocks = {};
  const seaLevel = 62;
  const terrainScale = 0.05;
  const treeNoiseScale = 0.08;

  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      const worldX = chunkX * chunkSize + x;
      const worldZ = chunkZ * chunkSize + z;

      const terrainHeight =
        Math.floor(simplex.noise(worldX * terrainScale, worldZ * terrainScale) * 20) + 64;

      for (let y = 0; y < worldHeight; y++) {
        const key = getBlockKey(worldX, y, worldZ);

        if (y > terrainHeight) {
          if (y <= seaLevel) blocks[key] = "glass"; // water placeholder
        } else if (y === terrainHeight) {
          blocks[key] = (y < seaLevel) ? "sand" : "grass";
        } else if (y >= terrainHeight - 4) {
          blocks[key] = "dirt";
        } else if (y === 0) {
          blocks[key] = "bedrock";
        } else {
          blocks[key] = "stone";
        }
      }

      // 🌲 Try to spawn a tree on grass blocks
      const treeNoise = simplex.noise(worldX * treeNoiseScale, worldZ * treeNoiseScale);
      if (treeNoise > 0.50 && Math.random() > 0.7) { // lower threshold = more trees
        const groundKey = getBlockKey(worldX, terrainHeight, worldZ);
        if (blocks[groundKey] === "grass") {
          const treeHeight = Math.floor(Math.random() * 3) + 4;

          // Logs
          for (let i = 1; i <= treeHeight; i++) {
            blocks[getBlockKey(worldX, terrainHeight + i, worldZ)] = "oak_log";
          }

          // Leaves
          for (let tx = -2; tx <= 2; tx++) {
            for (let ty = -2; ty <= 2; ty++) {
              for (let tz = -2; tz <= 2; tz++) {
                if (tx === 0 && tz === 0 && ty < 0) continue;
                const distSq = tx * tx + ty * ty + tz * tz;
                if (distSq <= 5) {
                  const leafX = worldX + tx;
                  const leafY = terrainHeight + treeHeight - 2 + ty;
                  const leafZ = worldZ + tz;
                  const leafKey = getBlockKey(leafX, leafY, leafZ);
                  if (!blocks[leafKey]) {
                    blocks[leafKey] = "leaves";
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return blocks;
}


// Worker handler
self.onmessage = (e) => {
  const { type, chunkX, chunkZ, chunkSize, worldHeight } = e.data;

  if (type === "generateChunk") {
    const blocks = generateChunkData(chunkX, chunkZ, chunkSize, worldHeight);
    console.log(`Chunk ${chunkX},${chunkZ} generated with ${Object.keys(blocks).length} blocks`);
    self.postMessage({ type: "chunkGenerated", chunkX, chunkZ, blocks });
  }
};

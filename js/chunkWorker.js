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
  const treeNoiseScale = 0.1;

  // --- TERRAIN GENERATION ---
  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      const worldX = chunkX * chunkSize + x;
      const worldZ = chunkZ * chunkSize + z;

      const n = simplex.noise(worldX * terrainScale, worldZ * terrainScale);
      const height = Math.floor(n * 20) + 64;

      for (let y = 0; y < worldHeight; y++) {
        const key = getBlockKey(worldX, y, worldZ);

        if (y > height) {
          if (y <= seaLevel) blocks[key] = "glass"; // placeholder water
        } else if (y === height) {
          blocks[key] = (y < seaLevel) ? "sand" : "grass";
        } else if (y >= height - 4) {
          blocks[key] = "dirt";
        } else if (y === 0) {
          blocks[key] = "bedrock";
        } else {
          blocks[key] = "stone";
        }
      }
    }
  }

  // --- TREE GENERATION ---
  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      const worldX = chunkX * chunkSize + x;
      const worldZ = chunkZ * chunkSize + z;

      // Get surface height again
      const n = simplex.noise(worldX * terrainScale, worldZ * terrainScale);
      const height = Math.floor(n * 20) + 64;

      // Check block type and tree noise
      const belowKey = getBlockKey(worldX, height, worldZ);
      const blockBelow = blocks[belowKey];
      const treeNoise = simplex.noise(worldX * treeNoiseScale, worldZ * treeNoiseScale);

      // Only spawn trees on grass with enough noise value
      if (blockBelow === "grass" && treeNoise > 0.6) {
        const treeHeight = Math.floor(Math.random() * 3) + 4;

        // Trunk
        for (let i = 1; i <= treeHeight; i++) {
          blocks[getBlockKey(worldX, height + i, worldZ)] = "oak_log";
        }

        // Leaves
        for (let tx = -2; tx <= 2; tx++) {
          for (let ty = -2; ty <= 2; ty++) {
            for (let tz = -2; tz <= 2; tz++) {
              if (tx === 0 && tz === 0 && ty < 0) continue;
              const radius = tx * tx + ty * ty + tz * tz;
              if (radius <= 5) {
                const lx = worldX + tx;
                const ly = height + treeHeight - 2 + ty;
                const lz = worldZ + tz;
                const leafKey = getBlockKey(lx, ly, lz);
                if (!blocks[leafKey]) blocks[leafKey] = "leaves";
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

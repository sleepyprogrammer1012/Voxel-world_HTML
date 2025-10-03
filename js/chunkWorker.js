// chunkWorker.js

// Import noise library into the worker
importScripts('./simplex-noise.js');

// Create one noise generator instance
const simplex = new SimplexNoise();

// Utility
function getBlockKey(x, y, z) {
  return `${x},${y},${z}`;
}

// Generate chunk voxel data
function generateChunkData(chunkX, chunkZ, chunkSize, worldHeight) {
  const blocks = {};
  const seaLevel = 62;

  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      const worldX = chunkX * chunkSize + x;
      const worldZ = chunkZ * chunkSize + z;

      // ✅ Calculate terrain height for this column
      const scale = 0.05;
      const n = simplex.noise2D(worldX * scale, worldZ * scale); // returns [-1,1]
      const height = Math.floor((n * 0.5 + 0.5) * 20) + 64;      // normalize to [0,1], scale, offset

      // Fill blocks in this column
      for (let y = 0; y < worldHeight; y++) {
        const key = getBlockKey(worldX, y, worldZ);

        if (y > height) {
          if (y <= seaLevel) blocks[key] = "glass"; // placeholder for water
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

  return blocks;
}

// Worker message handler
self.onmessage = (e) => {
  const { type, chunkX, chunkZ, chunkSize, worldHeight } = e.data;

  if (type === "generateChunk") {
    const blocks = generateChunkData(chunkX, chunkZ, chunkSize, worldHeight);

    // Send back to main thread
    self.postMessage({
      type: "chunkGenerated",
      chunkX,
      chunkZ,
      blocks
    });
  }
};

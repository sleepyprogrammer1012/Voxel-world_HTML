// chunkWorker.js

// Import noise if needed (workers can use importScripts)
importScripts('./simplex-noise.js');
const simplex = new SimplexNoise();

// Utility
function getBlockKey(x, y, z) {
  return `${x},${y},${z}`;
}

// Generate chunk voxel data
function generateChunkData(chunkX, chunkZ, chunkSize, worldHeight) {
  const blocks = {};
  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      const worldX = chunkX * chunkSize + x;
      const worldZ = chunkZ * chunkSize + z;

      // Simple heightmap
      const height = Math.floor(simplex.noise2D(worldX * 0.05, worldZ * 0.05) * 10) + 64;

      for (let y = 0; y < height; y++) {
        let type = "stone";
        if (y === height - 1) type = "grass";
        else if (y > height - 5) type = "dirt";
        blocks[getBlockKey(worldX, y, worldZ)] = type;
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

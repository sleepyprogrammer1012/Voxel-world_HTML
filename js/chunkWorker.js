// chunkWorker.js

// Import noise if needed (workers can use importScripts)
importScripts('./simplex-noise.js');
const simplex = new NOISE.Simplex();
simplex.init();
simplex.noiseDetail(4, 0.5); // 4 octaves, persistence 0.5

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

     for (let y = 0; y < worldHeight; y++) {
       const key = `${worldX},${y},${worldZ}`;

       if (y > height) {
         if (y <= 62) blocks[key] = "glass"; // placeholder for water
       } else if (y === height) {
         blocks[key] = (y < 63) ? "sand" : "grass";
       } else if (y > height - 5) {
         blocks[key] = "dirt";
       } else if (y === 0) {
         blocks[key] = "bedrock";
       } else {
         blocks[key] = "stone";
       }
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

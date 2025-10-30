
         // Multiplayer connection 
        const WS_URL = (location.hostname === "localhost")
          ? "ws://localhost:8080"
          : "wss://usr-IDnumber.onrender.com";

        const ws = new WebSocket(WS_URL);

        ws.onopen = () => console.log("✅ Connected to multiplayer server");
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          console.log("📩 Multiplayer event:", msg);
  // TODO: handle updates (like other players moving, placing blocks, etc.)
        };
        ws.onclose = () => console.log("❌ Disconnected from multiplayer server");

// Example function: send block placement
        function sendBlockUpdate(type, pos) {
          ws.send(JSON.stringify({ type, pos }));
        }

      // === Basic Setup ===
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x7ab5ff, 32, 128);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);

        // === Lighting & Day/Night Cycle ===
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -150;
        directionalLight.shadow.camera.right = 150;
        directionalLight.shadow.camera.top = 150;
        directionalLight.shadow.camera.bottom = -150;
        scene.add(directionalLight);

        const sunGeometry = new THREE.SphereGeometry(20, 32, 32);
        const sunMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00, emissive: 0xffff00 });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        scene.add(sun);

        let timeOfDay = Math.PI / 4;
        const dayDuration = 60 * 5; // 5 minutes
        const skyColors = {
          day: new THREE.Color('#7ab5ff'),
          sunset: new THREE.Color('#ff8c00'),
          night: new THREE.Color('#000033')
        };

        // === World & Chunk Management ===
        const world = new Map();
        const chunks = new Map();
        const chunkSize = 16, worldHeight = 256, waterLevel = 62, renderDistance = 3;
        const simplex = new SimplexNoise();

        const faces = [
          { uvRow: 'side', dir: [-1, 0, 0], corners: [{ pos: [0, 1, 0], uv: [0, 1] }, { pos: [0, 0, 0], uv: [0, 0] }, { pos: [0, 1, 1], uv: [1, 1] }, { pos: [0, 0, 1], uv: [1, 0] }] },
          { uvRow: 'side', dir: [1, 0, 0], corners: [{ pos: [1, 1, 1], uv: [0, 1] }, { pos: [1, 0, 1], uv: [0, 0] }, { pos: [1, 1, 0], uv: [1, 1] }, { pos: [1, 0, 0], uv: [1, 0] }] },
          { uvRow: 'bottom', dir: [0, -1, 0], corners: [{ pos: [1, 0, 1], uv: [1, 1] }, { pos: [0, 0, 1], uv: [0, 1] }, { pos: [1, 0, 0], uv: [1, 0] }, { pos: [0, 0, 0], uv: [0, 0] }] },
          { uvRow: 'top', dir: [0, 1, 0], corners: [{ pos: [0, 1, 1], uv: [0, 1] }, { pos: [1, 1, 1], uv: [1, 1] }, { pos: [0, 1, 0], uv: [0, 0] }, { pos: [1, 1, 0], uv: [1, 0] }] },
          { uvRow: 'side', dir: [0, 0, -1], corners: [{ pos: [1, 1, 0], uv: [0, 1] }, { pos: [1, 0, 0], uv: [0, 0] }, { pos: [0, 1, 0], uv: [1, 1] }, { pos: [0, 0, 0], uv: [1, 0] }] },
          { uvRow: 'side', dir: [0, 0, 1], corners: [{ pos: [0, 1, 1], uv: [0, 1] }, { pos: [0, 0, 1], uv: [0, 0] }, { pos: [1, 1, 1], uv: [1, 1] }, { pos: [1, 0, 1], uv: [1, 0] }] }
        ];

       // === Morton/Peano Index Helpers ===

      // Encode 3D block coordinates into a single integer (base-3 interleave)
        function getBlockKey(x, y, z, order = 6) {
        // order = number of base-3 digits (enough to cover worldHeight and chunkSize)
          function toBase3(n, digits) {
            const arr = [];
            for (let i = 0; i < digits; i++) {
              arr.push(n % 3);
              n = Math.floor(n / 3);
            }
            return arr;
          }
          function fromDigits(digits) {
            return digits.reduce((acc, d, i) => acc + d * (3 ** i), 0);
          }

          const xb = toBase3(x, order);
          const yb = toBase3(y, order);
          const zb = toBase3(z, order);

          const interleaved = [];
          for (let i = order - 1; i >= 0; i--) {
            interleaved.push(xb[i], yb[i], zb[i]);
          }

          return fromDigits(interleaved);
        }

        // Encode 2D chunk coordinates into a single integer (base-3 interleave)
        function getChunkKey(x, z, order = 6) {
          function toBase3(n, digits) {
            const arr = [];
            for (let i = 0; i < digits; i++) {
              arr.push(n % 3);
              n = Math.floor(n / 3);
            }
            return arr;
          }
          function fromDigits(digits) {
            return digits.reduce((acc, d, i) => acc + d * (3 ** i), 0);
          }

          const xb = toBase3(x, order);
          const zb = toBase3(z, order);

          const interleaved = [];
          for (let i = order - 1; i >= 0; i--) {
            interleaved.push(xb[i], zb[i]);
          }

          return fromDigits(interleaved);
        }

        // === Texture & Block Setup ===
        const textureLoader = new THREE.TextureLoader();
        const atlasTexture = textureLoader.load(
          "./assets/minecraft_atlas.png",
          () => console.log("Atlas loaded successfully"),
          undefined,
          (err) => console.error("Atlas failed to load:", err)
        );
        atlasTexture.magFilter = THREE.NearestFilter;
        atlasTexture.minFilter = THREE.NearestFilter;
        atlasTexture.wrapS = atlasTexture.wrapT = THREE.RepeatWrapping;

        const atlasMaterial = new THREE.MeshLambertMaterial({ map: atlasTexture, side: THREE.FrontSide });
        const transparentAtlasMaterial = new THREE.MeshLambertMaterial({ map: atlasTexture, side: THREE.DoubleSide, transparent: true });

        const tileSize = 16, atlasSize = 64, tileUvWidth = tileSize / atlasSize;

        const blockTypes = {
            'grass': { transparent: false, uv: { top: [0,0], bottom: [2,0], side: [1,0] } },
            'dirt': { transparent: false, uv: { all: [2,0] } },
            'stone': { transparent: false, uv: { all: [3,0] } },
            'cobblestone': { transparent: false, uv: { all: [0,1] } },
            'oak_plank': { transparent: false, uv: { all: [1,1] } },
            'oak_log': { transparent: false, uv: { top: [3,1], bottom: [3,1], side: [2,1] } },
            'sand': { transparent: false, uv: { all: [0,2] } },
            'gravel': { transparent: false, uv: { all: [1,2] } },
            'coal_ore': { transparent: false, uv: { all: [2,2] } },
            'iron_ore': { transparent: false, uv: { all: [3,2] } },
            'leaves': { transparent: false, uv: { all: [0,3] } },
            'glass': { transparent: true, uv: { all: [1,3] } },
            'stone_brick': { transparent: false, uv: { all: [2,3] } },
            'mossy_stone': { transparent: false, uv: { all: [3,3] } },
            'bedrock': { transparent: false, uv: { all: [0,0] } }
        };

        let selectedBlockType = 'cobblestone';

        // === Block Interaction Highlight ===
        const highlightGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
        const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.8 });
        const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
        scene.add(highlightMesh);

        const raycaster = new THREE.Raycaster();

        // === Chunk Mesh Generation ===
        function generateChunkMesh(chunkX, chunkZ) {
          const key = getChunkKey(chunkX, chunkZ);
          const chunk = { solid: { positions: [], normals: [], uvs: [], indices: [] }, transparent: { positions: [], normals: [], uvs: [], indices: [] } };

          for (let y = 0; y < worldHeight; y++) {
            for (let z = 0; z < chunkSize; z++) {
              for (let x = 0; x < chunkSize; x++) {
                const worldX = chunkX * chunkSize + x;
                const worldZ = chunkZ * chunkSize + z;
                const blockKey = getBlockKey(worldX, y, worldZ);
                const blockType = world.get(blockKey);
                if (blockType) {
                  const { transparent } = blockTypes[blockType];
                  const meshData = transparent ? chunk.transparent : chunk.solid;
                  for (const { dir, corners, uvRow } of faces) {
                    const neighborKey = getBlockKey(worldX + dir[0], y + dir[1], worldZ + dir[2]);
                    const neighborType = world.get(neighborKey);
                    const neighborIsTransparent = neighborType && blockTypes[neighborType].transparent;
                    if (!neighborType || (neighborIsTransparent && blockType !== 'glass')) {
                      const ndx = meshData.positions.length / 3;
                      for (const { pos, uv } of corners) {
                        meshData.positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                        meshData.normals.push(...dir);
                        const blockUVs = blockTypes[blockType].uv;
                        const uvData = blockUVs.all || blockUVs[uvRow];
                        meshData.uvs.push((uvData[0] + uv[0]) * tileUvWidth, 1 - (uvData[1] + uv[1]) * tileUvWidth);
                      }
                      meshData.indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
                    }
                  }
                }
              }
            }
          }

          const createMesh = (data, material) => {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.positions), 3));
            geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.normals), 3));
            geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(data.uvs), 2));
            geometry.setIndex(data.indices);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(chunkX * chunkSize, 0, chunkZ * chunkSize);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            return mesh;
          };

          if (chunk.solid.positions.length > 0)
            chunks.set(key, { ...chunks.get(key), solidMesh: createMesh(chunk.solid, atlasMaterial) });
          if (chunk.transparent.positions.length > 0)
            chunks.set(key, { ...chunks.get(key), transparentMesh: createMesh(chunk.transparent, transparentAtlasMaterial) });
        }

        // === Worker Setup ===
        const chunkWorker = new Worker("./js/chunkWorker.js");
        chunkWorker.onmessage = (e) => {
          const { type, chunkX, chunkZ, blocks } = e.data;
          if (type === "chunkGenerated") {
            Object.entries(blocks).forEach(([key, value]) => {
              world.set(Number(key), value);
            });
            generateChunkMesh(chunkX, chunkZ);
          }
        };

        function requestChunk(chunkX, chunkZ) {
          chunkWorker.postMessage({
            type: "generateChunk",
            chunkX,
            chunkZ,
            chunkSize,
            worldHeight
          });
        }

        // === Controlled Chunk Loading ===
        const playerChunkX = 0;
        const playerChunkZ = 0;
        const chunkCoords = [];
        for (let x = -renderDistance; x <= renderDistance; x++) {
          for (let z = -renderDistance; z <= renderDistance; z++) {
            chunkCoords.push([x, z]);
          }
        }
        chunkCoords.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
        let queueIndex = 0;

        function queueChunks() {
          if (queueIndex < chunkCoords.length) {
            const [x, z] = chunkCoords[queueIndex++];
            requestChunk(x, z);
            setTimeout(queueChunks, 40);
          } else {
            console.log("✅ All chunks requested.");
          }
        }
        queueChunks();

        // --- Spawn helper (safe to call before `player` is declared) ---
        function spawnPlayer() {
          // spawn coordinates (center)
          const spawnX = 0;
          const spawnZ = 0;

          // find topmost block at (0, z)
          let surfaceY = 64; // fallback
          for (let y = worldHeight - 1; y >= 0; y--) {
            const k = getBlockKey(spawnX, y, spawnZ);
            if (world.has(k)) {
              // prefer non-water blocks (your worker uses "glass" as water placeholder)
              const type = world.get(k);
              if (type !== 'glass') {
                surfaceY = y;
                break;
              } else {
                // if it's water, we still want to spawn on top of it
                surfaceY = y;
                // continue searching below in case there is solid ground underneath
              }
            }
          }

          const spawnY = surfaceY + 2; // a little above the surface
          camera.position.set(spawnX + 0.5, spawnY, spawnZ + 0.5);
          camera.updateMatrixWorld();

          // If player exists, set respawn and reset velocity; otherwise store pending spawn
          if (typeof player !== 'undefined') {
            player.respawn = new THREE.Vector3(spawnX + 0.5, spawnY, spawnZ + 0.5);
            if (player.velocity && player.velocity.set) player.velocity.set(0, 0, 0);
            player.onGround = true;
          } else {
            // temporary global so we can consume it after player is declared
            window.pendingSpawn = new THREE.Vector3(spawnX + 0.5, spawnY, spawnZ + 0.5);
          }

          console.log(`spawnPlayer(): camera placed at (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
        }

        // === Wait for Center Chunk ===
        function waitForCenterChunk() {
          const key = getChunkKey(0, 0);
          if (chunks.has(key)) {
            console.log("🌍 Center chunk loaded, spawning player");
            spawnPlayer();
          } else {
            setTimeout(waitForCenterChunk, 200);
          }
        }
        waitForCenterChunk();

        // === Player & Controls ===
        const player = {
          height: 1.8,
          width: 0.5,
          speed: 5,
          jumpForce: 7,
          velocity: new THREE.Vector3(),
          onGround: false,
          boundingBox: new THREE.Box3()
        };

        // if spawn was already triggered earlier, apply it to the player object now
        if (window.pendingSpawn) {
          player.respawn = window.pendingSpawn.clone();
          camera.position.copy(window.pendingSpawn);
          player.velocity.set(0, 0, 0);
          player.onGround = true;
          delete window.pendingSpawn;
          console.log("Applied pending spawn to player:", player.respawn);
        }

        const gravity = -20;
        camera.position.set(0, 80, 0);

        const controls = { forward: false, backward: false, left: false, right: false, pitch: 0, yaw: 0, euler: new THREE.Euler(0, 0, 0, 'YXZ') };

        function onMouseMove(event) {
          if (!isPointerLocked) return;
          controls.yaw -= event.movementX * 0.002;
          controls.pitch -= event.movementY * 0.002;
          controls.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, controls.pitch));
        }

        let isPointerLocked = false;
        document.body.addEventListener('click', () => document.body.requestPointerLock());
        document.addEventListener('pointerlockchange', () => { isPointerLocked = document.pointerLockElement === document.body; });
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('mousemove', onMouseMove);


        // --- Block Interaction ---
        function getBlockAtPointer() {
            raycaster.setFromCamera({ x: 0, y: 0 }, camera);
            const meshesToIntersect = Array.from(chunks.values()).flatMap(c => [c.solidMesh, c.transparentMesh]).filter(Boolean);
            const intersects = raycaster.intersectObjects(meshesToIntersect);
            if (intersects.length > 0) {
                const intersection = intersects[0];
                if (intersection.distance > 8) return null;
                const worldPoint = intersection.point.clone();

        // IMPORTANT: breakPos is the block that was hit (move slightly *into* the block)
                const breakPos = worldPoint.clone().add(intersection.face.normal.clone().multiplyScalar(-0.5)).floor();

        // placePos is the adjacent block position where a new block would be placed (move slightly *out* from the face)
                const placePos = worldPoint.clone().add(intersection.face.normal.clone().multiplyScalar(0.5)).floor();

                return { placePos, breakPos };
            }
            return null;
        }


        document.addEventListener('mousedown', (event) => {
            if (!isPointerLocked || !highlightMesh.visible) return;
            const target = getBlockAtPointer();
            if (!target) return;

            // Left (0) = break, Right (2) = place
            const pos = (event.button === 0) ? target.breakPos : target.placePos;
            const key = getBlockKey(pos.x, pos.y, pos.z);
            const blockAtPos = world.get(key);

            let worldNeedsUpdate = false;

            if (event.button === 0) { // Break
                if (blockAtPos && blockAtPos !== 'bedrock' && world.delete(key)) {
                    console.log('Broke block at', pos, 'type:', blockAtPos);
                    worldNeedsUpdate = true;
                }
            } else if (event.button === 2) { // Place
                // don't place inside player
                const playerBox = new THREE.Box3().setFromCenterAndSize(
                    new THREE.Vector3(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5),
                    new THREE.Vector3(1, 1, 1)
                );
                if (!blockAtPos && !player.boundingBox.intersectsBox(playerBox)) {
                    world.set(key, selectedBlockType);
                    console.log('Placed', selectedBlockType, 'at', pos);
                    worldNeedsUpdate = true;
                }
            }

            if (worldNeedsUpdate) {
                const chunksToUpdate = new Set();
                const mainChunkX = Math.floor(pos.x / chunkSize);
                const mainChunkZ = Math.floor(pos.z / chunkSize);
                chunksToUpdate.add(getChunkKey(mainChunkX, mainChunkZ));
                if (pos.x % chunkSize === 0) chunksToUpdate.add(getChunkKey(mainChunkX - 1, mainChunkZ));
                if (pos.x % chunkSize === chunkSize - 1) chunksToUpdate.add(getChunkKey(mainChunkX + 1, mainChunkZ));
                if (pos.z % chunkSize === 0) chunksToUpdate.add(getChunkKey(mainChunkX, mainChunkZ - 1));
                if (pos.z % chunkSize === chunkSize - 1) chunksToUpdate.add(getChunkKey(mainChunkX, mainChunkZ + 1));
                chunksToUpdate.forEach(key => {
                    const [cx, cz] = (decodeChunkKey(Number(key));
                    updateChunkMesh(cx, cz);
                });
            }
        });


        function updateChunkMesh(chunkX, chunkZ){
            const key = getChunkKey(chunkX, chunkZ);
            const chunkData = chunks.get(key);
            if (!chunkData) return;
            if (chunkData.solidMesh) { scene.remove(chunkData.solidMesh); chunkData.solidMesh.geometry.dispose(); }
            if (chunkData.transparentMesh) { scene.remove(chunkData.transparentMesh); chunkData.transparentMesh.geometry.dispose(); }
            generateChunkMesh(chunkX, chunkZ);
        }

        // --- Game Loop ---
        const clock = new THREE.Clock();
        let lastPlayerChunkX = Infinity, lastPlayerChunkZ = Infinity;
        function animate(){
            requestAnimationFrame(animate);
            const delta = Math.min(clock.getDelta(), 0.1);
            timeOfDay += (Math.PI * 2 / dayDuration) * delta;
            const sunX = Math.cos(timeOfDay) * 200;
            const sunY = Math.sin(timeOfDay) * 200;
            sun.position.set(camera.position.x + sunX, sunY, camera.position.z - 200);
            directionalLight.position.copy(sun.position);
            const dayFactor = Math.max(0, Math.sin(timeOfDay));
            ambientLight.intensity = dayFactor * 0.7 + 0.1;
            directionalLight.intensity = dayFactor * 0.5 + 0.1;
            if (sunY < 0) scene.background = skyColors.night.clone().lerp(skyColors.sunset, Math.max(0, sunY + 50) / 50);
            else scene.background = skyColors.sunset.clone().lerp(skyColors.day, sunY / 200);
            scene.fog.color.copy(scene.background);
            controls.euler.set(controls.pitch, controls.yaw, 0);
            camera.quaternion.setFromEuler(controls.euler);
            updatePlayer(delta);
            const playerChunkX = Math.floor(camera.position.x / chunkSize);
            const playerChunkZ = Math.floor(camera.position.z / chunkSize);
            if (playerChunkX !== lastPlayerChunkX || playerChunkZ !== lastPlayerChunkZ) {
                updateChunks();
                lastPlayerChunkX = playerChunkX;
                lastPlayerChunkZ = playerChunkZ;
            }
            const targetBlock = getBlockAtPointer();
            if (targetBlock) {
                highlightMesh.position.set(targetBlock.breakPos.x + 0.5, targetBlock.breakPos.y + 0.5, targetBlock.breakPos.z + 0.5);
                highlightMesh.visible = true;
            } else {
                highlightMesh.visible = false;
            }
            if (camera.position.y < -30) {
                camera.position.set(player.respawn.x, player.respawn.y, player.respawn.z);
                player.velocity.set(0,0,0);
            }
            renderer.render(scene, camera);
        }

        function updateChunks() {
          const playerChunkX = Math.floor(camera.position.x / chunkSize);
          const playerChunkZ = Math.floor(camera.position.z / chunkSize);

          for (let x = -renderDistance; x <= renderDistance; x++) {
            for (let z = -renderDistance; z <= renderDistance; z++) {
              const cx = playerChunkX + x;
              const cz = playerChunkZ + z;
              const key = getChunkKey(cx, cz);

              if (!chunks.has(key)) {
                // ✅ Instead of generateChunk + generateChunkMesh, request it from the worker
                requestChunk(cx, cz);

                // Mark this chunk as "reserved" so we don’t spam requests
                chunks.set(key, {});
              }
            }
          }

          // Clean up chunks that are too far away
          chunks.forEach((data, key) => {
            function decodeChunkKey(key, order = 6) {
              const digits = order * 2;
              const base3 = [];
              let n = key;
              for (let i = 0; i < digits; i++) {
                base3.push(n % 3);
                n = Math.floor(n / 3);
              }

              const xb = [], zb = [];
              for (let i = 0; i < digits; i += 2) {
                xb.push(base3[i]);
                zb.push(base3[i + 1]);
              }

              const fromDigits = arr =>
                arr.reduce((acc, d, i) => acc + d * (3 ** i), 0);

              return [fromDigits(xb.reverse()), fromDigits(zb.reverse())];
            }

            // ✅ decode the numeric key into chunk coordinates
            const [cx, cz] = decodeChunkKey(key);

            const dx = Math.abs(cx - playerChunkX);
            const dz = Math.abs(cz - playerChunkZ);

            if (dx > renderDistance + 1 || dz > renderDistance + 1) {
              if (data.solidMesh) {
                scene.remove(data.solidMesh);
                data.solidMesh.geometry.dispose();
              }
              if (data.transparentMesh) {
                scene.remove(data.transparentMesh);
                data.transparentMesh.geometry.dispose();
              }
              chunks.delete(key);
            }
          });
          }
        // --- Initialization & Full Implementations ---
        const fullCodeImplementations = () => {
            document.addEventListener('keydown', (e) => {
                switch (e.code) {
                    case 'KeyW': controls.forward = true; break;
                    case 'KeyA': controls.left = true; break;
                    case 'KeyS': controls.backward = true; break;
                    case 'KeyD': controls.right = true; break;
                    case 'Space': if (player.onGround) player.velocity.y = player.jumpForce; break;
                }
            });
            document.addEventListener('keyup', (e) => {
                switch (e.code) {
                    case 'KeyW': controls.forward = false; break;
                    case 'KeyA': controls.left = false; break;
                    case 'KeyS': controls.backward = false; break;
                    case 'KeyD': controls.right = false; break;
                }
            });
            faces.push(
                { uvRow: 'side', dir: [ -1, 0, 0 ], corners: [ { pos: [0, 1, 0], uv: [0, 1] }, { pos: [0, 0, 0], uv: [0, 0] }, { pos: [0, 1, 1], uv: [1, 1] }, { pos: [0, 0, 1], uv: [1, 0] } ] },
                { uvRow: 'side', dir: [ 1, 0, 0 ], corners: [ { pos: [1, 1, 1], uv: [0, 1] }, { pos: [1, 0, 1], uv: [0, 0] }, { pos: [1, 1, 0], uv: [1, 1] }, { pos: [1, 0, 0], uv: [1, 0] } ] },
                { uvRow: 'bottom', dir: [ 0, -1, 0 ], corners: [ { pos: [1, 0, 1], uv: [1, 1] }, { pos: [0, 0, 1], uv: [0, 1] }, { pos: [1, 0, 0], uv: [1, 0] }, { pos: [0, 0, 0], uv: [0, 0] } ] },
                { uvRow: 'top', dir: [ 0, 1, 0 ], corners: [ { pos: [0, 1, 1], uv: [0, 1] }, { pos: [1, 1, 1], uv: [1, 1] }, { pos: [0, 1, 0], uv: [0, 0] }, { pos: [1, 1, 0], uv: [1, 0] } ] },
                { uvRow: 'side', dir: [ 0, 0, -1 ], corners: [ { pos: [1, 1, 0], uv: [0, 1] }, { pos: [1, 0, 0], uv: [0, 0] }, { pos: [0, 1, 0], uv: [1, 1] }, { pos: [0, 0, 0], uv: [1, 0] } ] },
                { uvRow: 'side', dir: [ 0, 0, 1 ], corners: [ { pos: [0, 1, 1], uv: [0, 1] }, { pos: [0, 0, 1], uv: [0, 0] }, { pos: [1, 1, 1], uv: [1, 1] }, { pos: [1, 0, 1], uv: [1, 0] } ] }
            );
            const blockSelector = document.getElementById('block-selector');
            Object.keys(blockTypes).forEach(type => {
                if(type === 'bedrock') return;
                const option = document.createElement('div');
                option.className = 'block-option';
                option.dataset.type = type;
                const uvData = blockTypes[type].uv.all || blockTypes[type].uv.side;
                option.style.backgroundPosition = `-${uvData[0] * 100}% -${uvData[1] * 100}%`;
                option.style.backgroundImage = 'url("./assets/minecraft_atlas.png")';
                if (type === selectedBlockType) option.classList.add('selected');
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const prev = document.querySelector('.block-option.selected');
                    if (prev) prev.classList.remove('selected');
                    option.classList.add('selected');
                    selectedBlockType = type;
                });
                blockSelector.appendChild(option);
            });

           // window.generateChunk = (chunkX, chunkZ) => {
              //  const terrainDetailScale = 0.05; const terrainHeightScale = 0.01; const treeNoiseScale = 0.08;
              //  for (let x = 0; x < chunkSize; x++) {
                //    for (let z = 0; z < chunkSize; z++) {
                 //       const worldX = chunkX * chunkSize + x; const worldZ = chunkZ * chunkSize + z;
                 //       const heightDetail = simplex.noise2D(worldX * terrainDetailScale, worldZ * terrainDetailScale) * 10;
                 //       const heightBase = simplex.noise2D(worldX * terrainHeightScale, worldZ * terrainHeightScale) * 20;
                        // FIXED: use +64 so terrain is around Y=64 (near camera spawn)
                 //       const height = Math.floor(heightBase + heightDetail) + 64;
                        
                 //       world.set(getBlockKey(worldX, 0, worldZ), 'bedrock');
                  //      if (Math.random() < 0.5) world.set(getBlockKey(worldX, 1, worldZ), 'bedrock');
                        
                   //     for (let y = 2; y < height; y++) {
                   //         let blockType = 'stone';
                   //         if (y > height - 5) blockType = 'dirt';
                   //         if (y === height -1 && y > waterLevel) blockType = 'grass';
                   //         else if (y < waterLevel + 2 && y > waterLevel -4) blockType = 'sand';
                   //         world.set(getBlockKey(worldX, y, worldZ), blockType);
                    //    }

                     //   for (let y = 2; y < height - 5; y++) {
                     //       if(simplex.noise3D(worldX * 0.1, y * 0.1, worldZ * 0.1) > 0.8) world.set(getBlockKey(worldX, y, worldZ), 'coal_ore');
                     //       if(simplex.noise3D(worldX * 0.2, y * 0.2, worldZ * 0.2) > 0.85 && y < 48) world.set(getBlockKey(worldX, y, worldZ), 'iron_ore');
                     //   }
                    //}
               // }

                // Trees
                //for (let x = 0; x < chunkSize; x++) {
                  //  for (let z = 0; z < chunkSize; z++) {
                  //      const worldX = chunkX * chunkSize + x; const worldZ = chunkZ * chunkSize + z;
                   //     const height = Math.floor(simplex.noise2D((worldX) * terrainHeightScale, (worldZ) * terrainHeightScale) * 20 + simplex.noise2D((worldX) * terrainDetailScale, (worldZ) * terrainDetailScale) * 10) + 64;
                    //    const treeNoise = simplex.noise2D(worldX * treeNoiseScale, worldZ * treeNoiseScale);
                     //   if (treeNoise > 0.8 && world.get(getBlockKey(worldX, height - 1, worldZ)) === 'grass') {
                       //     const treeHeight = Math.floor(Math.random() * 3) + 4;
                        //    for (let i = 0; i < treeHeight; i++) world.set(getBlockKey(worldX, height + i, worldZ), 'oak_log');
                        //    for (let tx = -2; tx <= 2; tx++) {
                         //       for (let ty = -2; ty <= 2; ty++) {
                         //           for (let tz = -2; tz <= 2; tz++) {
                          //              if (tx === 0 && tz === 0 && ty < 0) continue;
                            //            const radius = tx*tx + ty*ty + tz*tz;
                            //            if (radius <= 5) {
                             //               const leafPos = { x: worldX + tx, y: height + treeHeight - 2 + ty, z: worldZ + tz };
                              //              if(!world.has(getBlockKey(leafPos.x, leafPos.y, leafPos.z))) {
                              //                  world.set(getBlockKey(leafPos.x, leafPos.y, leafPos.z), 'leaves');
                               //             }
                               //         }
                              //      }
                             //   }
                           // }
                       // }
                    //}
               // }
           

            window.updatePlayer = (delta) => {
                player.onGround = false;
                player.velocity.y += gravity * delta;
                const moveDirection = new THREE.Vector3(
                    (controls.right ? 1 : 0) - (controls.left ? 1 : 0), 0,
                    (controls.backward ? 1 : 0) - (controls.forward ? 1 : 0)
                ).normalize().applyEuler(new THREE.Euler(0, controls.yaw, 0));

                const moveStepX = moveDirection.x * player.speed * delta;
                const moveStepY = player.velocity.y * delta;
                const moveStepZ = moveDirection.z * player.speed * delta;
                
                camera.position.x += moveStepX; checkCollisions('x');
                camera.position.y += moveStepY; checkCollisions('y');
                camera.position.z += moveStepZ; checkCollisions('z');
                player.velocity.x *= 0.9;
                player.velocity.z *= 0.9;
            };

            window.checkCollisions = (axis) => {
                const halfWidth = player.width / 2;
                player.boundingBox.setFromPoints([ new THREE.Vector3(camera.position.x - halfWidth, camera.position.y - player.height, camera.position.z - halfWidth), new THREE.Vector3(camera.position.x + halfWidth, camera.position.y, camera.position.z + halfWidth) ]);
                const minX = Math.floor(player.boundingBox.min.x); const maxX = Math.ceil(player.boundingBox.max.x);
                const minY = Math.floor(player.boundingBox.min.y); const maxY = Math.ceil(player.boundingBox.max.y);
                const minZ = Math.floor(player.boundingBox.min.z); const maxZ = Math.ceil(player.boundingBox.max.z);
                for (let x = minX; x < maxX; x++) {
                    for (let y = minY; y < maxY; y++) {
                        for (let z = minZ; z < maxZ; z++) {
                            if (world.has(getBlockKey(x, y, z))) {
                                const blockBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), new THREE.Vector3(1, 1, 1));
                                if (player.boundingBox.intersectsBox(blockBox)) {
                                    const intersection = player.boundingBox.clone().intersect(blockBox);
                                    const depth = new THREE.Vector3(); intersection.getSize(depth);
                                    if (axis === 'y') {
                                        if (player.velocity.y <= 0 && player.boundingBox.min.y < blockBox.max.y) { player.onGround = true; player.velocity.y = 0; camera.position.y += depth.y; }
                                        else if (player.velocity.y > 0) { player.velocity.y = 0; camera.position.y -= depth.y; }
                                    } else if (axis === 'x') {
                                        if (camera.position.x > x) camera.position.x += depth.x; else camera.position.x -= depth.x;
                                        player.velocity.x = 0;
                                    } else if (axis === 'z') {
                                        if (camera.position.z > z) camera.position.z += depth.z; else camera.position.z -= depth.z;
                                        player.velocity.z = 0;
                                    }
                                }
                            }
                        }
                    }
                }
            };

            };

        fullCodeImplementations();
        player.respawn = new THREE.Vector3(0, 80, 0);
        window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

        // Start
        animate();
      



const WebSocket = require('ws');

// Render sets PORT automatically
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
console.log(`✅ WebSocket server running on port ${PORT}`);

wss.on('connection', (ws) => {
  console.log('👾 New player connected');

  ws.on('message', (message) => {
    console.log('📩 Received:', message.toString());

    // Broadcast to all players except sender
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  ws.on('close', () => console.log('❌ Player disconnected'));
});

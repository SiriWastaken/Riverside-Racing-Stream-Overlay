const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve your local index.html file cleanly
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Memory hub to store the active configuration state for each game/room room code
const rooms = {};

wss.on('connection', (ws) => {
    let currentRoom = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'JOIN') {
                currentRoom = data.room;
                ws.room = currentRoom;

                // Initialize state block for room if it doesn't exist
                if (!rooms[currentRoom]) {
                    rooms[currentRoom] = null; 
                }

                // If a controller joins and we have state, sync it. Otherwise request latest state
                if (rooms[currentRoom]) {
                    ws.send(JSON.stringify({ type: 'SYNC', payload: rooms[currentRoom] }));
                }
            }

            if (data.type === 'UPDATE' && data.room) {
                rooms[data.room] = data.payload;

                // Direct broadcast to every matching room instance across tabs
                wss.clients.forEach((client) => {
                    if (client !== ws && client.room === data.room && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'SYNC', payload: data.payload }));
                    }
                });
            }
        } catch (err) {
            console.error("Error processing packet:", err);
        }
    });

    ws.on('close', () => {
        // Cleaning logic handled automatically by garbage collector
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`\n🏎️  ERLC Racing Server running on http://localhost:${PORT}`);
    console.log(`👉 Control Panel: http://localhost:${PORT}`);
    console.log(`🎥 OBS Overlay Source: http://localhost:${PORT}?obs=true\n`);
});
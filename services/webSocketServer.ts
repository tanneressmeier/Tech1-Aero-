// This is a Node.js backend service. It should be run separately from the frontend application.
// It replaces the functionality of `services/mockSocket.ts` with a real server.

import http from 'http';
// FIX: Import Buffer to resolve type error.
import { Buffer } from 'buffer';
import { WebSocketServer, WebSocket } from 'ws';

// Define the port for the server. Use a different port than the frontend dev server.
const PORT = 8081;

/**
 * --- HOW TO RUN THIS SERVICE ---
 * 1. Ensure you have Node.js and npm/yarn installed.
 * 2. Install dependencies: `npm install typescript ts-node ws @types/ws @types/node`
 * 3. Run the server: `npx ts-node services/webSocketServer.ts`
 *
 * --- HOW TO TEST ---
 * 1. Run the server.
 * 2. Connect a WebSocket client (e.g., using a browser extension) to ws://localhost:8081.
 * 3. Send a POST request to the notification endpoint using a tool like curl:
 *    curl -X POST -H "Content-Type: application/json" -d '{"type": "NEW_REPAIR_ORDER", "payload": {"ro_id": "RO-DEMO-001", "aircraft_tail_number": "N-TEST"}}' http://localhost:8081/api/notify
 * 4. The connected WebSocket client should receive the JSON message.
 *
 * --- FRONTEND INTEGRATION ---
 * To connect the React frontend to this real server, you would replace `mockSocket.ts` and update `hooks/useWebSocket.ts`
 * to use a real WebSocket client.
 *
 * Example `hooks/useWebSocket.ts` modification:
 *
 * import { useEffect, useCallback } from 'react';
 *
 * const socket = new WebSocket('ws://localhost:8081');
 * type MessageHandler = (message: any) => void;
 *
 * export const useWebSocket = (onMessage: MessageHandler) => {
 *     const memoizedOnMessage = useCallback(onMessage, [onMessage]);
 *
 *     useEffect(() => {
 *         const messageListener = (event: MessageEvent) => {
 *             try {
 *                 const messageData = JSON.parse(event.data);
 *                 memoizedOnMessage(messageData);
 *             } catch (e) {
 *                 console.error('Failed to parse WebSocket message', e);
 *             }
 *         };
 *         
 *         socket.addEventListener('open', () => console.log('WebSocket connected to ws://localhost:8081'));
 *         socket.addEventListener('message', messageListener);
 *         socket.addEventListener('error', (err) => console.error('WebSocket Error:', err));
 *         socket.addEventListener('close', () => console.log('WebSocket disconnected.'));
 *
 *         return () => {
 *             socket.removeEventListener('message', messageListener);
 *         };
 *     }, [memoizedOnMessage]);
 * };
 */

// Create a simple HTTP server to handle the internal notification endpoint
const server = http.createServer((req, res) => {
    // Enable CORS for the notify endpoint
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if ( req.method === 'OPTIONS' ) {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/notify') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const { type, payload } = JSON.parse(body);
                if (type && payload) {
                    // Broadcast the message to all connected WebSocket clients
                    broadcast(type, payload);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Notification broadcasted successfully' }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid message format. "type" and "payload" are required.' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found. Use POST /api/notify to send messages.' }));
    }
});

// Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocketServer({ server });

// Store all connected clients in a Set for efficient add/delete operations
const clients = new Set<WebSocket>();

/**
 * Broadcasts a message to all connected and open WebSocket clients.
 * @param type The message type string.
 * @param payload The message payload object.
 */
function broadcast(type: string, payload: any): void {
    const message = JSON.stringify({ type, payload });
    console.log(`Broadcasting message to ${clients.size} clients:`, message);
    clients.forEach(client => {
        // Ensure the connection is still open before attempting to send
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Set up WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
    console.log('A new client has connected.');
    clients.add(ws);

    // Handle messages received from clients (optional for this broadcast-focused service)
    ws.on('message', (message: Buffer) => {
        console.log('Received message from client:', message.toString());
        // This service primarily broadcasts from the HTTP endpoint, but you could
        // add logic here to handle client-to-server messages if needed.
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client has disconnected.');
        clients.delete(ws);
    });

    // Handle any errors that occur
    ws.on('error', (error: Error) => {
        console.error('WebSocket error occurred:', error);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`✅ Real-time service is running on ws://localhost:${PORT}`);
    console.log(`   - Notification Endpoint: http://localhost:${PORT}/api/notify`);
});
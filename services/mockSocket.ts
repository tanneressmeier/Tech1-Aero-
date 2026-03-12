// services/mockSocket.ts

type WebSocketListener = (message: any) => void;

class MockWebSocketServer {
    private listeners: Set<WebSocketListener> = new Set();

    connect(listener: WebSocketListener) {
        console.log("Mock WebSocket client connected.");
        this.listeners.add(listener);

        // Return a disconnect function for cleanup
        return () => {
            console.log("Mock WebSocket client disconnected.");
            this.listeners.delete(listener);
        };
    }

    broadcast(type: string, payload: any) {
        console.log(`Mock WebSocket broadcasting event: ${type}`, payload);
        const message = { type, payload };
        this.listeners.forEach(listener => {
            // Simulate async nature of network
            setTimeout(() => listener(message), 0);
        });
    }
}

// Singleton instance
export const mockSocket = new MockWebSocketServer();

// hooks/useWebSocket.ts
import { useEffect, useCallback } from 'react';
// FIX: Corrected import path for mockSocket by adding file extension.
import { mockSocket } from '../services/mockSocket.ts';

type MessageHandler = (message: any) => void;

export const useWebSocket = (onMessage: MessageHandler) => {
    // useCallback to memoize the handler function
    const memoizedOnMessage = useCallback(onMessage, [onMessage]);

    useEffect(() => {
        // The connect method returns a disconnect function
        const disconnect = mockSocket.connect(memoizedOnMessage);

        // Cleanup on component unmount
        return () => {
            disconnect();
        };
    }, [memoizedOnMessage]); // Re-connect if the onMessage handler changes
};
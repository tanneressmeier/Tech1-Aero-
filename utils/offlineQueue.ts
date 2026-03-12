// A simple offline queue using localStorage to store actions when the user is offline.

export interface QueuedAction {
    type: string; // e.g., 'UPDATE_SQUAWK', 'ADD_REPAIR_ORDER'
    payload: any;
    timestamp: number;
}

const QUEUE_KEY = 'aero-mro-offline-queue';

export const offlineQueue = {
    /**
     * Adds an action to the offline queue.
     * @param action - The action to queue, containing a type and payload.
     */
    async add(action: Omit<QueuedAction, 'timestamp'>): Promise<void> {
        const queue = offlineQueue.get();
        const queuedAction: QueuedAction = {
            ...action,
            timestamp: Date.now(),
        };
        queue.push(queuedAction);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    },

    /**
     * Retrieves all actions from the queue.
     * @returns An array of queued actions.
     */
    get(): QueuedAction[] {
        const queueJson = localStorage.getItem(QUEUE_KEY);
        return queueJson ? JSON.parse(queueJson) : [];
    },

    /**
     * Clears the entire queue.
     */
    clear(): void {
        localStorage.removeItem(QUEUE_KEY);
    },
    
    /**
     * Processes all actions in the queue.
     * @param apiHandler - A function that takes a queued action and executes the corresponding API call.
     *                   It should return a promise that resolves on success and rejects on failure.
     */
    async process(apiHandler: (action: QueuedAction) => Promise<any>): Promise<void> {
        const actions = offlineQueue.get();
        if (actions.length === 0) {
            return;
        }

        console.log(`Processing ${actions.length} queued actions...`);
        let remainingActions: QueuedAction[] = [];

        for (const action of actions) {
            try {
                await apiHandler(action);
                console.log(`Successfully processed action:`, action.type);
            } catch (error) {
                console.error(`Failed to process queued action ${action.type}, it will be retried later:`, error);
                remainingActions.push(action);
            }
        }
        
        if (remainingActions.length > 0) {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingActions));
        } else {
            offlineQueue.clear();
        }
    }
};

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { debugLog, redact } from '../debug';

/**
 * Manages the Yjs Doc instance for a specific project.
 * Handles local persistence and P2P connection binding.
 */
export class ProjectSyncManager {
    public doc: Y.Doc;
    private persistence: IndexeddbPersistence;
    private projectId: string;
    private cleanupP2P: (() => void) | null = null;

    constructor(projectId: string) {
        this.projectId = projectId;
        this.doc = new Y.Doc({ guid: projectId });

        // Persist local changes to IndexedDB immediately
        // We use y-indexeddb which is standard for local-first apps
        // It saves updates incrementally.
        this.persistence = new IndexeddbPersistence(
            `project-yjs-${projectId}`,
            this.doc
        );

        this.persistence.on('synced', () => {
            debugLog('[Sync] Project loaded from disk', redact(projectId));
        });
    }

    /**
     * Binds this Yjs doc to a Trystero room for P2P sync.
     * Uses Trystero's makeAction/onAction or raw data channel if available.
     * Since we might not have a direct y-trystero provider, we implement a custom one 
     * or assume we can hook into the message stream managed by signaling/trystero-client.
     * 
     * For now, we'll design a bind method that takes a simple callback interface 
     * to send updates and an update handler to receive them.
     */
    public bindP2P(
        sendUpdate: (update: Uint8Array) => void,
        onUpdateReceived: (handler: (update: Uint8Array) => void) => void
    ) {
        // 1. Listen for local updates and broadcast them
        const updateHandler = (update: Uint8Array, origin: any) => {
            if (origin !== 'p2p') {
                sendUpdate(update);
            }
        };
        this.doc.on('update', updateHandler);

        // 2. Listen for remote updates and apply them
        onUpdateReceived((update: Uint8Array) => {
            Y.applyUpdate(this.doc, update, 'p2p');
        });

        // Cleanup function
        this.cleanupP2P = () => {
            this.doc.off('update', updateHandler);
        };
    }

    public disconnect() {
        if (this.cleanupP2P) {
            this.cleanupP2P();
            this.cleanupP2P = null;
        }
        this.persistence.destroy();
        this.doc.destroy();
    }

    /**
     * Helper to get the shared map for universal assets
     */
    get assetsMap(): Y.Map<any> {
        return this.doc.getMap('assets');
    }

    /**
     * Helper to get shared cursors map
     */
    get awarenessMap(): Y.Map<any> {
        return this.doc.getMap('awareness');
    }
}

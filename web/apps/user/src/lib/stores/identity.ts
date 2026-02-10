import { getPrimaryIdentity, type Identity } from '../identity/manager';
import { getNostrPublicKey } from '../p2p/nostr';
import { debugWarn } from '../debug';

type Subscriber = (val: IdentityState) => void;

export interface IdentityState {
    identity: Identity | null;
    pubkey: string | null;
    loading: boolean;
}

const state: IdentityState = {
    identity: null,
    pubkey: null,
    loading: true
};

const listeners = new Set<Subscriber>();

let workspaceListenerBound = false;

function notify() {
    listeners.forEach(l => l({ ...state }));
}

export const identityStore = {
    subscribe(cb: Subscriber) {
        cb({ ...state });
        listeners.add(cb);
        return () => listeners.delete(cb);
    },

    get() { return { ...state }; },

    async init() {
        if (!workspaceListenerBound) {
            workspaceListenerBound = true;
            // When a vault is opened/restored, identity may have been auto-created.
            window.addEventListener('workspace-restored', () => {
                void identityStore.reload();
            });
        }
        if (!state.loading && state.identity) return; // Already loaded
        state.loading = true;
        notify();
        try {
            const [id, pk] = await Promise.all([
                getPrimaryIdentity(),
                getNostrPublicKey()
            ]);
            state.identity = id;
            state.pubkey = pk;
        } catch (e) {
            debugWarn('Store init failed', e);
        } finally {
            state.loading = false;
            notify();
        }
    },

    async reload() {
        state.loading = true;
        notify();
        try {
            const [id, pk] = await Promise.all([
                getPrimaryIdentity(),
                getNostrPublicKey()
            ]);
            state.identity = id;
            state.pubkey = pk;
        } finally {
            state.loading = false;
            notify();
        }
    }
};

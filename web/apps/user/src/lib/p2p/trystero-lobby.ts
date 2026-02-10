import { joinTrysteroRoom } from "./trystero-client";
import { debugLog, redact } from "../debug";

type ActionSender = (...args: unknown[]) => unknown;

export type LobbyRole = 'host' | 'guest';

export interface LobbyEvents {
    onKnock?: (peerId: string, payload: { name: string; pubkey: string }) => void;
    onAdmit?: (payload: { encryptedSecret: string }) => void;
}

export class TrysteroLobbyManager {
    private roomId: string;
    private room: any;
    private role: LobbyRole;
    private listeners: LobbyEvents = {};

    // Actions
    private sendKnockAction: ActionSender | null = null;
    private sendAdmitAction: ActionSender | null = null;

    constructor(projectId: string, role: LobbyRole) {
        // Public Lobby ID derived from ProjectID.
        // Everyone with the ProjectID (URL) can find this room to Knock.
        this.roomId = 'lobby-' + projectId;
        this.role = role;
    }

    public setListeners(listeners: LobbyEvents) {
        this.listeners = listeners;
    }

    public async join() {
        debugLog('[Lobby] Joining', { role: this.role });
        this.room = joinTrysteroRoom({ appId: 'holi-lobby' }, this.roomId);

        // Define Actions
        const [sendKnock, getKnock] = this.room.makeAction('knock');
        const [sendAdmit, getAdmit] = this.room.makeAction('admit');

        this.sendKnockAction = sendKnock;
        this.sendAdmitAction = sendAdmit;

        // HOST Logic: Listen for Knocks
        if (this.role === 'host') {
            getKnock((data: any, peerId: string) => {
                debugLog('[Lobby] Received knock', {
                    peerId: redact(peerId),
                    hasName: typeof data?.name === 'string' && data.name.length > 0,
                    pubkeyPrefix: typeof data?.pubkey === 'string' ? data.pubkey.slice(0, 8) : 'unknown',
                });
                // TODO: Check blocked list here
                this.listeners.onKnock?.(peerId, data);
            });
        }

        // GUEST Logic: Listen for Admit
        if (this.role === 'guest') {
            getAdmit((data: any, peerId: string) => {
                debugLog('[Lobby] Received Invite/Admit from', redact(peerId));
                // In a real implementation, we should verify signature or trust first result?
                // For now, assume if we receive an Admit payload in this specific context, it's valid.
                this.listeners.onAdmit?.(data);
            });
        }

        this.room.onPeerJoin((peerId: string) => {
            debugLog('[Lobby] Peer joined:', redact(peerId));
        });
    }

    public knock(name: string, pubkey: string) {
        if (this.role !== 'guest') return;
        debugLog('[Lobby] Sending Knock...');
        // Broadcast knock to everyone (Host will pick it up)
        this.sendKnockAction?.({ name, pubkey });
    }

    public admit(targetPeerId: string, encryptedSecret: string) {
        if (this.role !== 'host') return;
        debugLog('[Lobby] Admitting', redact(targetPeerId));
        // Send strictly to the target peer
        this.sendAdmitAction?.({ encryptedSecret }, targetPeerId);
    }

    public leave() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
    }
}

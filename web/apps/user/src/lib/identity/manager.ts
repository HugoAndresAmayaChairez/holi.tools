/**
 * Identity Manager - Handles creation, storage, and retrieval of user identities
 * Uses IndexedDB for browser persistence
 */
import * as db from "../db/indexeddb";
import { generateRootKey, exportKey, importKey } from "../crypto/keys";

export interface Identity {
    id: string;
    alias: string | null;
    avatar: Blob | null;
    createdAt: number;
}

/**
 * Creates a new identity with a fresh ECDH keypair
 */
export async function createIdentity(alias?: string, avatar: Blob | null = null): Promise<Identity> {
    const keyPair = await generateRootKey();

    const publicJwk = await exportKey(keyPair.publicKey);
    const privateJwk = await exportKey(keyPair.privateKey);

    // Use the public key as the identity ID
    const id = (publicJwk.x || "") + (publicJwk.y || "");
    const privateKeyBlob = JSON.stringify(privateJwk);

    const identity = await db.createIdentity(id, alias || null, privateKeyBlob, avatar);

    return {
        id: identity.id,
        alias: identity.alias,
        avatar: identity.avatar,
        createdAt: identity.createdAt
    };
}

/**
 * Gets all stored identities
 */
export async function getIdentities(): Promise<Identity[]> {
    const identities = await db.getIdentities();
    return identities.map(i => ({
        id: i.id,
        alias: i.alias,
        avatar: i.avatar,
        createdAt: i.createdAt,
    }));
}

export async function updateIdentity(identity: Identity): Promise<void> {
    // We need to fetch the full identity first to preserve privateKeyBlob
    const full = await db.getIdentity(identity.id);
    if (!full) throw new Error("Identity not found");

    full.alias = identity.alias;
    full.avatar = identity.avatar;
    await db.updateIdentity(full);
}

/**
 * Gets the primary (first) identity or null if none exists
 */
export async function getPrimaryIdentity(): Promise<Identity | null> {
    const identities = await getIdentities();
    return identities.length > 0 ? identities[0] : null;
}

/**
 * Ensures a primary identity exists, creating one if needed.
 * Useful to eliminate manual "Create Identity" UX (dev-only).
 */
export async function ensurePrimaryIdentity(opts?: { defaultAlias?: string }): Promise<Identity> {
    const existing = await getPrimaryIdentity();
    if (existing) return existing;
    return await createIdentity(opts?.defaultAlias || 'User');
}

/**
 * Recovers the private key for an identity
 */
export async function getIdentityPrivateKey(id: string): Promise<CryptoKey | null> {
    const identity = await db.getIdentity(id);
    if (!identity) return null;

    const jwk = JSON.parse(identity.privateKeyBlob);
    return await importKey(jwk);
}

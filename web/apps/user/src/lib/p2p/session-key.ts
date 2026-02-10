export async function deriveSessionKeyBytesV1(opts: {
    passphrase: string;
    salt: string;
    iterations?: number;
}): Promise<Uint8Array> {
    const { passphrase, salt } = opts;
    const iterations = opts.iterations ?? 150_000;

    const enc = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt: enc.encode(salt),
            iterations,
        },
        passphraseKey,
        256
    );

    return new Uint8Array(bits);
}

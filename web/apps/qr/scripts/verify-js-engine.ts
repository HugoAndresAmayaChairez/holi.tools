
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import init, { verify_qr_svg } from '../src/wasm/holi_wasm_qr.js';
import { generateSVG, setWasmInstance } from '../src/lib/qr-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WASM_PATH = join(__dirname, '../src/wasm/holi_wasm_qr_bg.wasm');

const SHAPES = {
    body: ['clover', 'hash', 'leaf', 'star', 'diamond', 'tiny-dots', 'classy'],
    eyeFrame: ['double', 'leaf', 'cushion', 'dots-square'],
    eyeBall: ['star', 'bars-h', 'bars-v', 'dots-grid', 'flower', 'clover', 'heart']
};

async function run() {
    console.log("🚀 Starting Pure JS Engine Verification (via TSX)...");

    // 1. Initialize WASM
    const wasmBuffer = readFileSync(WASM_PATH);
    const wasmModule = await init(wasmBuffer);
    setWasmInstance(wasmModule);
    console.log("✅ WASM Verifier Ready & Injected");

    function testCombination(body, frame, ball) {
        const label = `Body:${body} | Frame:${frame} | Ball:${ball}`;

        // Construct Config object matching QRConfig interface
        const config = {
            fg: '#000000',
            bg: '#ffffff',
            bodyShape: body,
            eyeFrameShape: frame,
            eyeBallShape: ball,
            ecc: 'M', // Default
            logoColor: 'original',
            logoBgToggle: true,
            logoSize: 0.2,
            logoX: 0.5,
            logoY: 0.5
        };

        try {
            // Correct Call Signature
            const svg = generateSVG('https://example.com', config);

            // Verify
            verify_qr_svg(svg);
            console.log(`✅ PASS: ${label}`);
            return true;
        } catch (e) {
            console.log(`❌ FAIL: ${label} - ${e}`);
            // Save failure
            try {
                const failSvg = generateSVG('https://example.com', config);
                writeFileSync(`fail-${body}-${frame}-${ball}.svg`, failSvg);
            } catch (ignore) { }
            return false;
        }
    }

    // Test Suite
    console.log('\n📦 Testing Body Shapes (with default eyes)...');
    for (const s of SHAPES.body) testCombination(s, 'square', 'square');

    console.log('\n👁️ Testing Eye Frames (with square body)...');
    for (const s of SHAPES.eyeFrame) testCombination('square', s, 'square');

    console.log('\n🧿 Testing Eye Balls (with square body/frame)...');
    for (const s of SHAPES.eyeBall) testCombination('square', 'square', s);
}

run().catch(e => console.error(e));

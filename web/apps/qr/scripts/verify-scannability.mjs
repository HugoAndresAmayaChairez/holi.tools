#!/usr/bin/env node

import { readFileSync, writeFile } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load WASM machinery
import init, { generate_styled_svg, verify_qr_svg } from '../src/wasm/holi_wasm_qr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WASM_PATH = join(__dirname, '../src/wasm/holi_wasm_qr_bg.wasm');

// Test Configuration
const TEST_TEXT = "https://holi.tools/qr-test-verif";
const TEST_SHAPES = {
    body: ['clover', 'hash', 'leaf', 'star', 'diamond', 'tiny-dots', 'classy'],
    eyeFrame: ['double', 'leaf', 'cushion', 'dots-square'],
    eyeBall: ['star', 'bars-h', 'bars-v', 'dots-grid', 'flower', 'clover', 'heart']
};

async function run() {
    console.log("🚀 Starting Automated Scannability Verification...");

    // Initialize WASM
    const wasmBuffer = readFileSync(WASM_PATH);
    await init(wasmBuffer);
    console.log("✅ WASM Initialized\n");

    let passed = 0;
    let failed = 0;
    const failures = [];

    // Helper to test a config
    function testConfig(name, config) {
        process.stdout.write(`Testing ${name.padEnd(30)}... `);

        try {
            // Generate SVG using Backend Logic
            const svg = generate_styled_svg(TEST_TEXT, JSON.stringify(config));

            // Verify Scannability using Backend Logic (ZBar/internal)
            // verify_qr_svg returns the decoded string on success, or throws/returns error string
            let decoded;
            try {
                decoded = verify_qr_svg(svg);
            } catch (e) {
                decoded = null; // Basic catch
            }

            if (decoded === TEST_TEXT) {
                console.log("✅ PASS");
                passed++;
                return true;
            } else {
                console.log("❌ FAIL (Unreadable)");
                failed++;
                failures.push({ name, config });
                return false;
            }
        } catch (e) {
            console.log(`❌ FAIL (Error: ${e.message})`);
            failed++;
            failures.push({ name, config, error: e.message });
            return false;
        }
    }

    // 1. Test Body Shapes (with default eyes)
    console.log("📦 Testing Body Shapes:");
    for (const shape of TEST_SHAPES.body) {
        testConfig(`Body: ${shape}`, {
            bodyShape: shape,
            eyeFrameShape: 'square',
            eyeBallShape: 'square',
            bg: '#ffffff', fg: '#000000'
        });
    }

    // 2. Test Eye Frame Shapes (with default body/ball)
    console.log("\n👁️  Testing Eye Frames:");
    for (const shape of TEST_SHAPES.eyeFrame) {
        testConfig(`Frame: ${shape}`, {
            bodyShape: 'square',
            eyeFrameShape: shape,
            eyeBallShape: 'square',
            bg: '#ffffff', fg: '#000000'
        });
    }

    // 3. Test Eye Ball Shapes (with default body/frame)
    console.log("\n🧿 Testing Eye Balls:");
    for (const shape of TEST_SHAPES.eyeBall) {
        testConfig(`Ball: ${shape}`, {
            bodyShape: 'square',
            eyeFrameShape: 'square',
            eyeBallShape: shape,
            bg: '#ffffff', fg: '#000000'
        });
    }

    console.log("\n" + "=".repeat(50));
    console.log(`📊 SUMMARY: ${passed} Passed, ${failed} Failed`);

    if (failures.length > 0) {
        console.log("\n❌ Failures detected:");
        failures.forEach(f => console.log(`   - ${f.name}`));
        process.exit(1);
    } else {
        console.log("\n✨ All tested shapes are scannable!");
        process.exit(0);
    }
}

run().catch(e => {
    console.error("Fatal Error:", e);
    process.exit(1);
});

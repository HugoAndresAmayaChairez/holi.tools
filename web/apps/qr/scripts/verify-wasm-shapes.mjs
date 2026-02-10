#!/usr/bin/env node
/**
 * QR Shape Verification Script
 * 
 * Uses the WASM module to generate QR codes with all shape combinations
 * and verifies they render correctly.
 * 
 * Usage: node scripts/verify-wasm-shapes.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Shape definitions (must match Rust enums)
const BODY_SHAPES = [
    'square', 'rounded', 'dots', 'diamond', 'star', 'classy', 'classy-rounded',
    'arrow', 'arrow-left', 'heart', 'hexagon', 'octagon', 'cross', 'plus',
    'blob', 'clover', 'mini-square', 'tiny-dots', 'hash', 'leaf'
];
#!/usr/bin/env node
/**
 * QR WASM (wasm-qr-svg) Verification Script
 *
 * Validates that the current wasm-qr-svg engine can:
 * - initialize successfully
 * - generate a QR matrix
 * - generate an SVG for the supported shape ids
 *
 * Usage: node scripts/verify-wasm-shapes.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// wasm-qr-svg supports a small set of shape ids in Rust (see packages/wasm-qr-svg/src/lib.rs)
// 0 = square, 1 = dots, 2 = rounded, 3 = liquid/connected
const SHAPE_IDS = [0, 1, 2, 3];

async function loadWasm() {
    const wasmJsPath = join(__dirname, '..', '..', '..', 'packages', 'wasm-qr-svg', 'pkg', 'holi_qr_svg.js');

    if (!existsSync(wasmJsPath)) {
        console.error('❌ WASM module not found at:', wasmJsPath);
        console.error('   Run: cd packages/wasm-qr-svg && wasm-pack build --target nodejs');
        process.exit(1);
    }

    const modUrl = pathToFileURL(wasmJsPath).href;
    const mod = await import(modUrl);
    if (typeof mod.default === 'function') {
        await mod.default();
    }
    return mod;
}

function validateSvg(svg) {
    const issues = [];

    if (!svg || svg.length === 0) {
        issues.push('Empty SVG');
        return { valid: false, issues };
    }

    if (!svg.startsWith('<svg')) issues.push('Does not start with <svg');
    if (!svg.includes('</svg>')) issues.push('Missing </svg>');
    if (svg.includes('NaN') || svg.includes('undefined')) issues.push('Contains NaN or undefined');

    const pathCount = (svg.match(/<path/g) || []).length;
    if (pathCount === 0) issues.push('No path elements found');

    return {
        valid: issues.length === 0,
        issues,
        pathCount,
        length: svg.length
    };
}

async function main() {
    console.log('🔍 QR WASM (wasm-qr-svg) Verification\n');
    console.log('='.repeat(60) + '\n');

    console.log('📦 Loading WASM module...');
    const testText = 'https://holi.tools';
    const results = {
        wasm = await loadWasm();
        console.log('✅ WASM loaded\n');
        eyeBall: [],
        console.error('❌ Failed to load WASM:', e?.message || e);
        process.exit(1);


    const testText = 'https://holi.tools';
    const results = { shapes: [], matrix: null };

    const outputDir = join(__dirname, '..', 'test-output', 'wasm-shapes');
    mkdirSync(outputDir, { recursive: true });

    console.log('🧱 MATRIX\n');
    try {
        const raw = wasm.get_qr_matrix(testText, 'M', -1);
        const ok = raw && raw.length > 1;
        const size = ok ? raw[0] : 0;
        console.log(ok ? `✅ Matrix OK (${size}x${size})` : '❌ Matrix failed');
        results.matrix = { ok, size, length: raw?.length ?? 0 };
    } catch (e) {
        console.log(`❌ Matrix ERROR: ${e?.message || e}`);
        results.matrix = { ok: false, error: e?.message || String(e) };
    }

    console.log('\n🧩 SVG (shape ids)\n');
    for (const id of SHAPE_IDS) {
        try {
            const svg = wasm.generate_svg(testText, id, 'M', -1);
            const validation = validateSvg(svg);
            const status = validation.valid ? '✅' : '❌';
            console.log(`${status} shapeId=${id} paths:${validation.pathCount} len:${svg.length}`);
            results.shapes.push({ shapeId: id, valid: validation.valid, issues: validation.issues });
            writeFileSync(join(outputDir, `shape-${id}.svg`), svg);
        } catch (e) {
            console.log(`❌ shapeId=${id} ERROR: ${e?.message || e}`);
            results.shapes.push({ shapeId: id, valid: false, issues: [e?.message || String(e)] });
        }
    }

    writeFileSync(join(outputDir, 'results.json'), JSON.stringify(results, null, 2));
    console.log(`\n📝 Wrote results to ${join('apps', 'qr', 'test-output', 'wasm-shapes')}`);
            });
            const svg = wasm.generate_styled_svg(testText, options);
            const validation = validateSvg(svg);

            const status = validation.valid ? '✅' : '❌';
            console.log(`${status} ${shape.padEnd(18)} paths:${validation.pathCount} len:${svg.length}`);

            results.eyeFrame.push({
                shape,
                valid: validation.valid,
                issues: validation.issues
            });

            writeFileSync(join(outputDir, `eyeframe-${shape}.svg`), svg);

        } catch (e) {
            console.log(`❌ ${shape.padEnd(18)} ERROR: ${e.message}`);
            results.eyeFrame.push({ shape, valid: false, issues: [e.message] });
        }
    }

    console.log('\n👁️ EYE BALL SHAPES\n');
    for (const shape of EYE_BALL_SHAPES) {
        try {
            const options = JSON.stringify({
                eye_ball_shape: shape,
                fg_color: '#000000',
                bg_color: '#FFFFFF'
            });
            const svg = wasm.generate_styled_svg(testText, options);
            const validation = validateSvg(svg);

            const status = validation.valid ? '✅' : '❌';
            console.log(`${status} ${shape.padEnd(18)} paths:${validation.pathCount} len:${svg.length}`);

            results.eyeBall.push({
                shape,
                valid: validation.valid,
                issues: validation.issues
            });

            writeFileSync(join(outputDir, `eyeball-${shape}.svg`), svg);

        } catch (e) {
            console.log(`❌ ${shape.padEnd(18)} ERROR: ${e.message}`);
            results.eyeBall.push({ shape, valid: false, issues: [e.message] });
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY\n');

    const bodyPassed = results.body.filter(r => r.valid).length;
    const framePassed = results.eyeFrame.filter(r => r.valid).length;
    const ballPassed = results.eyeBall.filter(r => r.valid).length;

    console.log(`Body Shapes:      ${bodyPassed}/${BODY_SHAPES.length} passed`);
    console.log(`Eye Frame Shapes: ${framePassed}/${EYE_FRAME_SHAPES.length} passed`);
    console.log(`Eye Ball Shapes:  ${ballPassed}/${EYE_BALL_SHAPES.length} passed`);

    // Generate HTML preview
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>WASM Shape Verification</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; background: #1a1a1a; color: #eee; }
        h1 { color: #4CAF50; }
        h2 { color: #2196F3; border-bottom: 1px solid #333; padding-bottom: 8px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
        .card { background: #2a2a2a; padding: 12px; border-radius: 8px; text-align: center; }
        .card img { width: 100%; background: white; border-radius: 4px; }
        .card .name { margin-top: 8px; font-size: 12px; }
        .pass { border: 2px solid #4CAF50; }
        .fail { border: 2px solid #f44336; }
    </style>
</head>
<body>
    <h1>🔍 WASM Shape Verification</h1>
    <p>Generated by Rust core via WASM</p>
    
    <h2>📦 Body Shapes (${bodyPassed}/${BODY_SHAPES.length})</h2>
    <div class="grid">
        ${BODY_SHAPES.map(s => `
            <div class="card ${results.body.find(r => r.shape === s)?.valid ? 'pass' : 'fail'}">
                <img src="body-${s}.svg" alt="${s}">
                <div class="name">${s}</div>
            </div>
        `).join('')}
    </div>
    
    <h2>🎯 Eye Frame Shapes (${framePassed}/${EYE_FRAME_SHAPES.length})</h2>
    <div class="grid">
        ${EYE_FRAME_SHAPES.map(s => `
            <div class="card ${results.eyeFrame.find(r => r.shape === s)?.valid ? 'pass' : 'fail'}">
                <img src="eyeframe-${s}.svg" alt="${s}">
                <div class="name">${s}</div>
            </div>
        `).join('')}
    </div>
    
    <h2>👁️ Eye Ball Shapes (${ballPassed}/${EYE_BALL_SHAPES.length})</h2>
    <div class="grid">
        ${EYE_BALL_SHAPES.map(s => `
            <div class="card ${results.eyeBall.find(r => r.shape === s)?.valid ? 'pass' : 'fail'}">
                <img src="eyeball-${s}.svg" alt="${s}">
                <div class="name">${s}</div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;

    writeFileSync(join(outputDir, 'index.html'), htmlContent);
    console.log(`\n📁 Preview saved to: ${join(outputDir, 'index.html')}`);

    const allPassed = bodyPassed === BODY_SHAPES.length &&
        framePassed === EYE_FRAME_SHAPES.length &&
        ballPassed === EYE_BALL_SHAPES.length;

    process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});

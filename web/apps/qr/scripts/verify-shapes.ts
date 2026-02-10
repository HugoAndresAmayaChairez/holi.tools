/**
 * Shape Verification Script
 * 
 * This script generates QR codes with each shape combination and saves them as SVG files
 * for visual verification. Run with: npx tsx scripts/verify-shapes.ts
 */

import { generateSVG, initWasm } from '../src/lib/qr-engine';
import * as fs from 'fs';
import * as path from 'path';

// All shape types to test
const BODY_SHAPES = [
    'square', 'rounded', 'dots', 'diamond', 'star', 'classy', 'classy-rounded',
    'arrow', 'arrow-left', 'heart', 'hexagon', 'octagon', 'cross', 'plus',
    'blob', 'clover', 'mini-square', 'tiny-dots', 'hash', 'leaf'
] as const;

const EYE_FRAME_SHAPES = [
    'square', 'rounded', 'circle', 'leaf', 'cushion', 'double', 'fancy',
    'dots-square', 'heavy-rounded', 'clover-frame'
] as const;

const EYE_BALL_SHAPES = [
    'square', 'rounded', 'circle', 'diamond', 'star', 'heart', 'hexagon',
    'bars-h', 'bars-v', 'dots-grid', 'flower', 'clover', 'cushion', 'octagon'
] as const;

interface TestResult {
    shape: string;
    type: 'body' | 'eyeFrame' | 'eyeBall';
    success: boolean;
    hasContent: boolean;
    pathLength: number;
    error?: string;
}

async function verifyShapes() {
    console.log('🔍 QR Shape Verification Script\n');
    console.log('================================\n');

    const outputDir = path.join(__dirname, '../test-output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const results: TestResult[] = [];

    // Test all body shapes
    console.log('📦 Testing BODY SHAPES:\n');
    for (const shape of BODY_SHAPES) {
        const result = await testBodyShape(shape, outputDir);
        results.push(result);
        printResult(result);
    }

    console.log('\n👁️ Testing EYE FRAME SHAPES:\n');
    for (const shape of EYE_FRAME_SHAPES) {
        const result = await testEyeFrameShape(shape, outputDir);
        results.push(result);
        printResult(result);
    }

    console.log('\n🎯 Testing EYE BALL SHAPES:\n');
    for (const shape of EYE_BALL_SHAPES) {
        const result = await testEyeBallShape(shape, outputDir);
        results.push(result);
        printResult(result);
    }

    // Summary
    console.log('\n================================');
    console.log('📊 SUMMARY:\n');

    const failed = results.filter(r => !r.success);
    const passed = results.filter(r => r.success);

    console.log(`✅ Passed: ${passed.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (failed.length > 0) {
        console.log('\n❌ FAILED SHAPES:');
        failed.forEach(f => {
            console.log(`   - ${f.type}: ${f.shape} (path length: ${f.pathLength})`);
            if (f.error) console.log(`     Error: ${f.error}`);
        });
    }

    console.log(`\n📁 SVG files saved to: ${outputDir}`);

    // Generate HTML preview
    generateHtmlPreview(results, outputDir);
}

async function testBodyShape(shape: string, outputDir: string): Promise<TestResult> {
    try {
        const svg = generateSVG('TEST', {
            fg: '#000000',
            bg: '#ffffff',
            bodyShape: shape as any,
            eyeFrameShape: 'square',
            eyeBallShape: 'square',
            ecc: 'M'
        });

        const hasContent = svg.includes('<path') && svg.length > 200;
        const pathMatch = svg.match(/d="([^"]+)"/g);
        const pathLength = pathMatch ? pathMatch.join('').length : 0;

        // Save SVG
        fs.writeFileSync(path.join(outputDir, `body-${shape}.svg`), svg);

        return {
            shape,
            type: 'body',
            success: hasContent && pathLength > 100,
            hasContent,
            pathLength
        };
    } catch (error) {
        return {
            shape,
            type: 'body',
            success: false,
            hasContent: false,
            pathLength: 0,
            error: String(error)
        };
    }
}

async function testEyeFrameShape(shape: string, outputDir: string): Promise<TestResult> {
    try {
        const svg = generateSVG('TEST', {
            fg: '#000000',
            bg: '#ffffff',
            bodyShape: 'square',
            eyeFrameShape: shape as any,
            eyeBallShape: 'square',
            ecc: 'M'
        });

        const hasContent = svg.includes('<path') && svg.length > 200;
        const pathMatch = svg.match(/d="([^"]+)"/g);
        const pathLength = pathMatch ? pathMatch.join('').length : 0;

        fs.writeFileSync(path.join(outputDir, `eyeframe-${shape}.svg`), svg);

        return {
            shape,
            type: 'eyeFrame',
            success: hasContent && pathLength > 100,
            hasContent,
            pathLength
        };
    } catch (error) {
        return {
            shape,
            type: 'eyeFrame',
            success: false,
            hasContent: false,
            pathLength: 0,
            error: String(error)
        };
    }
}

async function testEyeBallShape(shape: string, outputDir: string): Promise<TestResult> {
    try {
        const svg = generateSVG('TEST', {
            fg: '#000000',
            bg: '#ffffff',
            bodyShape: 'square',
            eyeFrameShape: 'square',
            eyeBallShape: shape as any,
            ecc: 'M'
        });

        const hasContent = svg.includes('<path') && svg.length > 200;
        const pathMatch = svg.match(/d="([^"]+)"/g);
        const pathLength = pathMatch ? pathMatch.join('').length : 0;

        fs.writeFileSync(path.join(outputDir, `eyeball-${shape}.svg`), svg);

        return {
            shape,
            type: 'eyeBall',
            success: hasContent && pathLength > 100,
            hasContent,
            pathLength
        };
    } catch (error) {
        return {
            shape,
            type: 'eyeBall',
            success: false,
            hasContent: false,
            pathLength: 0,
            error: String(error)
        };
    }
}

function printResult(result: TestResult) {
    const icon = result.success ? '✅' : '❌';
    const status = result.success ? 'OK' : 'FAIL';
    console.log(`  ${icon} ${result.shape.padEnd(20)} ${status} (path: ${result.pathLength})`);
}

function generateHtmlPreview(results: TestResult[], outputDir: string) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>QR Shape Verification</title>
    <style>
        body { font-family: system-ui; padding: 20px; background: #1a1a2e; color: white; }
        h1, h2 { color: #fff; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .card { background: #16213e; border-radius: 12px; padding: 10px; text-align: center; }
        .card.fail { border: 2px solid #ff4444; }
        .card.pass { border: 2px solid #44ff44; }
        .card img { width: 100%; height: auto; background: white; border-radius: 8px; }
        .card p { margin: 8px 0 0; font-size: 12px; }
        .status { font-size: 10px; opacity: 0.7; }
    </style>
</head>
<body>
    <h1>🔍 QR Shape Verification</h1>
    
    <h2>📦 Body Shapes</h2>
    <div class="grid">
        ${results.filter(r => r.type === 'body').map(r => `
            <div class="card ${r.success ? 'pass' : 'fail'}">
                <img src="body-${r.shape}.svg" alt="${r.shape}">
                <p>${r.shape}</p>
                <p class="status">${r.success ? '✅ OK' : '❌ FAIL'} (${r.pathLength})</p>
            </div>
        `).join('')}
    </div>
    
    <h2>👁️ Eye Frame Shapes</h2>
    <div class="grid">
        ${results.filter(r => r.type === 'eyeFrame').map(r => `
            <div class="card ${r.success ? 'pass' : 'fail'}">
                <img src="eyeframe-${r.shape}.svg" alt="${r.shape}">
                <p>${r.shape}</p>
                <p class="status">${r.success ? '✅ OK' : '❌ FAIL'} (${r.pathLength})</p>
            </div>
        `).join('')}
    </div>
    
    <h2>🎯 Eye Ball Shapes</h2>
    <div class="grid">
        ${results.filter(r => r.type === 'eyeBall').map(r => `
            <div class="card ${r.success ? 'pass' : 'fail'}">
                <img src="eyeball-${r.shape}.svg" alt="${r.shape}">
                <p>${r.shape}</p>
                <p class="status">${r.success ? '✅ OK' : '❌ FAIL'} (${r.pathLength})</p>
            </div>
        `).join('')}
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'index.html'), html);
    console.log(`\n🌐 Open ${path.join(outputDir, 'index.html')} in browser to view results`);
}

// Run
verifyShapes().catch(console.error);


import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import init, { verify_qr_svg } from '../src/wasm/holi_wasm_qr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WASM_PATH = join(__dirname, '../src/wasm/holi_wasm_qr_bg.wasm');

// Ensure WASM is loaded for verification
const wasmBuffer = readFileSync(WASM_PATH);

// Configuration
const APP_URL = 'http://localhost:4321';
const SHAPES = {
    body: ['clover', 'hash', 'leaf', 'star', 'diamond', 'tiny-dots', 'classy'],
    eyeFrame: ['double', 'leaf', 'cushion', 'dots-square'],
    eyeBall: ['star', 'bars-h', 'bars-v', 'dots-grid', 'flower', 'clover', 'heart']
};

async function run() {
    console.log("🚀 Starting UI-Driven Verification (Puppeteer)...");

    await init(wasmBuffer);
    console.log("✅ WASM Verifier Ready");

    const browser = await puppeteer.launch({ headless: "new" }); // "new" headless mode
    const page = await browser.newPage();

    // Capture browser console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err));

    try {
        console.log(`🌐 Navigating to ${APP_URL}...`);
        await page.goto(APP_URL, { waitUntil: 'networkidle0' });

        // Wait for app to be ready and TypeCards to appear
        await page.waitForSelector('.type-card');
        console.log("✅ App Loaded & TypeCards found");

        // Click a type card to start generation mode (URL is default safe choice)
        await page.click('.type-card[data-type="url"]');
        console.log("🖱️ Clicked 'URL' type card");

        // MANUALLY TRIGGER GENERATE to bypass UI event listeners if they are flaky
        await page.evaluate(async () => {
            // Wait a tick for listeners
            await new Promise(r => setTimeout(r, 100));

            if (window.qrControllerApp) {
                console.log("⚡ Found qrControllerApp, forcing update...");
                // Force input value
                const input = document.querySelector('.input-field');
                if (input) {
                    input.value = "https://example.com";
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }

                // Set state directly just in case
                // @ts-ignore
                if (window.qrControllerApp.state) window.qrControllerApp.state.text = "https://example.com";

                // Force Call
                window.qrControllerApp.generateQR(true);
            } else {
                console.error("❌ qrControllerApp not found on window!");
            }
        });
        console.log("⚡ Triggered GenerateQR call");

        // Wait for the QR Frame to appear and render
        try {
            await page.waitForSelector('#qr-frame svg', { visible: true, timeout: 5000 });
            console.log("✅ QR Code Rendered");
        } catch (timeoutErr) {
            console.error("❌ Timeout waiting for SVG.");
            console.log("Page Content Dump (QR Frame):", await page.$eval('#qr-frame', el => el.innerHTML));
            await page.screenshot({ path: 'debug-failure.png' });
            throw timeoutErr;
        }

        // Helper to evaluate and verify
        async function verifyCurrentState(label) {
            // Extract SVG string from DOM
            const svgContent = await page.$eval('#qr-frame svg', el => new XMLSerializer().serializeToString(el));

            try {
                // Verify using local WASM
                const decoded = verify_qr_svg(svgContent);
                if (decoded) {
                    console.log(`✅ PASS: ${label}`);
                    return true;
                }
            } catch (e) {
                console.log(`❌ FAIL: ${label} - ${e}`);
                return false;
            }
        }

        // Test Body Shapes
        console.log("\n📦 Testing Body Shapes (via UI Injection)...");
        for (const shape of SHAPES.body) {
            await page.evaluate((s) => window.setBodyShape(s), shape);
            // Wait for render (debounced usually 400ms)
            await new Promise(r => setTimeout(r, 600));
            await verifyCurrentState(`Body: ${shape}`);
        }

        // Test Eye Frames
        console.log("\n👁️  Testing Eye Frames...");
        await page.evaluate(() => window.setBodyShape('square')); // Reset
        for (const shape of SHAPES.eyeFrame) {
            await page.evaluate((s) => window.setEyeFrame(s), shape);
            await new Promise(r => setTimeout(r, 600));
            await verifyCurrentState(`Frame: ${shape}`);
        }

        // Test Eye Balls
        console.log("\n🧿 Testing Eye Balls...");
        await page.evaluate(() => window.setEyeFrame('square')); // Reset
        for (const shape of SHAPES.eyeBall) {
            await page.evaluate((s) => window.setEyeBall(s), shape);
            await new Promise(r => setTimeout(r, 600));
            await verifyCurrentState(`Ball: ${shape}`);
        }

    } catch (e) {
        console.error("❌ Fatal Error:", e);
    } finally {
        await browser.close();
    }
}

run();

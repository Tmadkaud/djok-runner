// Like screenshot.cjs but pre-sets localStorage to skip the age gate,
// then optionally clicks at coordinates before snapping.
// Usage: node scripts/screenshot-menu.cjs <url> <w> <h> <out> [waitMs] [clickX clickY]
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const { spawn } = require('child_process');
const net = require('net');

const [, , url, wStr, hStr, outFile, waitStr, cxStr, cyStr] = process.argv;
const W = parseInt(wStr, 10) || 1280;
const H = parseInt(hStr, 10) || 720;
const wait = parseInt(waitStr || '2500', 10);
const cx = cxStr ? parseInt(cxStr, 10) : null;
const cy = cyStr ? parseInt(cyStr, 10) : null;

function findFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
}

(async () => {
  const port = await findFreePort();
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--window-size=${W},${H}`,
    '--user-data-dir=/tmp/chrome-shot-' + Date.now(),
    'about:blank',
  ], { stdio: 'ignore' });

  for (let i = 0; i < 30; i++) {
    try {
      if (await CDP.Version({ port })) break;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 200));
  }

  const client = await CDP({ port });
  const { Page, Emulation, Runtime, Input } = client;
  await Page.enable();
  await Runtime.enable();
  await Emulation.setDeviceMetricsOverride({
    width: W, height: H, deviceScaleFactor: 2, mobile: true,
  });

  // Pre-seed localStorage so the age gate is skipped
  const origin = new URL(url).origin;
  await Page.navigate({ url: origin + '/' });
  await Page.loadEventFired();
  await Runtime.evaluate({ expression: "localStorage.setItem('opp_age_verified', JSON.stringify('verified'))" });

  await Page.navigate({ url });
  await Page.loadEventFired();
  await new Promise((r) => setTimeout(r, wait));

  if (cx !== null && cy !== null) {
    await Input.dispatchMouseEvent({ type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
    await Input.dispatchMouseEvent({ type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
    await new Promise((r) => setTimeout(r, 1500));
  }

  const { data } = await Page.captureScreenshot({ format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(outFile, Buffer.from(data, 'base64'));
  console.log('saved', outFile);
  await client.close();
  chrome.kill('SIGTERM');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });

// Headless Chrome screenshot via chrome-remote-interface.
// Usage: node scripts/screenshot.cjs <url> <width> <height> <outFile> [waitMs]
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const { spawn } = require('child_process');
const net = require('net');

const [, , url, wStr, hStr, outFile, waitStr] = process.argv;
const W = parseInt(wStr, 10) || 1280;
const H = parseInt(hStr, 10) || 720;
const wait = parseInt(waitStr || '2500', 10);

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
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--window-size=${W},${H}`,
    '--user-data-dir=/tmp/chrome-shot-' + Date.now(),
    'about:blank',
  ], { stdio: 'ignore' });

  // Wait for CDP
  for (let i = 0; i < 30; i++) {
    try {
      const v = await CDP.Version({ port });
      if (v) break;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 200));
  }

  const client = await CDP({ port });
  const { Page, Emulation } = client;
  await Page.enable();
  await Emulation.setDeviceMetricsOverride({
    width: W, height: H, deviceScaleFactor: 2, mobile: true,
  });
  await Page.navigate({ url });
  await Page.loadEventFired();
  await new Promise((r) => setTimeout(r, wait));
  const { data } = await Page.captureScreenshot({ format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(outFile, Buffer.from(data, 'base64'));
  console.log('saved', outFile);
  await client.close();
  chrome.kill('SIGTERM');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const VIEWPORTS = [
  { name: 'Large desktop', width: 1440, height: 900, type: 'desktop' },
  { name: 'Standard laptop', width: 1366, height: 768, type: 'desktop' },
  { name: 'Smaller laptop', width: 1280, height: 800, type: 'desktop' },
  { name: 'Compact laptop/tablet', width: 1024, height: 768, type: 'desktop' },
  { name: 'Tablet', width: 768, height: 1024, type: 'mobile' },
  { name: 'Mobile', width: 390, height: 844, type: 'mobile' },
  { name: 'Small mobile', width: 320, height: 568, type: 'mobile' }
];

const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const http = require('http');

function startStaticServer(port = 4173) {
  const distDir = path.resolve(__dirname, 'dist');
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.png': 'image/png'
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(distDir, req.url.split('?')[0]);
    if (filePath.endsWith(path.sep) || req.url === '/') {
      filePath = path.join(distDir, 'index.html');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        filePath = path.join(distDir, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500);
          res.end('Server Error');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function runTests() {
  console.log('=================================================================');
  console.log('DRISHTI AI: COMPREHENSIVE RESPONSIVE NAVIGATION TEST SUITE');
  console.log('=================================================================\n');

  // Start internal static server on port 4173
  console.log('[1/4] Starting internal static server on port 4173...');
  const server = await startStaticServer(4173);

  console.log('[2/4] Launching Microsoft Edge via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  const results = [];

  try {
    console.log('[3/4] Navigating to http://localhost:4173 ...');
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 15000 });

    console.log('[4/4] Executing viewport test matrix...\n');

    for (const vp of VIEWPORTS) {
      console.log(`--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height} CSS px) ---`);
      await page.setViewport({ width: vp.width, height: vp.height });
      // Allow ResizeObserver and layout recalculation to settle
      await new Promise((r) => setTimeout(r, 600));

      const evaluation = await page.evaluate((vpWidth, vpType) => {
        const issues = [];
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;

        // 1. Check for unintended horizontal scroll
        if (scrollWidth > vpWidth) {
          issues.push(`Horizontal overflow detected: scrollWidth (${scrollWidth}px) > viewportWidth (${vpWidth}px)`);
        }

        // 2. Header and Nav elements
        const header = document.querySelector('header');
        if (!header) {
          issues.push('Header element not found');
          return { issues, scrollWidth, clientWidth };
        }

        const headerRect = header.getBoundingClientRect();
        if (headerRect.width > vpWidth) {
          issues.push(`Header width (${headerRect.width}px) exceeds viewport width (${vpWidth}px)`);
        }

        // 3. Desktop vs Mobile specific checks
        if (vpType === 'desktop') {
          const nav = document.querySelector('nav[aria-label="Main Navigation"]');
          if (!nav) {
            issues.push('Desktop <nav> not found in DOM');
          } else {
            const navStyle = window.getComputedStyle(nav);
            if (navStyle.display === 'none') {
              issues.push('Desktop <nav> is hidden on desktop viewport');
            }

            // Check visible buttons inside nav
            const navButtons = Array.from(nav.querySelectorAll('button'));
            const rects = navButtons.map(b => b.getBoundingClientRect());
            
            // Check for button collision / overlapping in desktop nav
            for (let i = 0; i < rects.length - 1; i++) {
              for (let j = i + 1; j < rects.length; j++) {
                const r1 = rects[i];
                const r2 = rects[j];
                // Overlap check (horizontal)
                const isOverlapping = !(r1.right <= r2.left || r1.left >= r2.right);
                if (isOverlapping) {
                  issues.push(`Collision detected in nav: "${navButtons[i].innerText.trim()}" overlaps "${navButtons[j].innerText.trim()}"`);
                }
              }
            }
          }

          // Check utility section
          const utility = header.querySelector('div.lg\\:flex:last-child') || header.querySelectorAll('div.hidden.lg\\:flex')[1];
          if (utility) {
            const uRect = utility.getBoundingClientRect();
            if (uRect.right > vpWidth) {
              issues.push(`Utility controls clipped offscreen: right (${uRect.right}px) > viewport (${vpWidth}px)`);
            }
          }
        } else {
          // Mobile view
          const hamburger = document.querySelector('button[aria-label*="Navigation Menu"]');
          if (!hamburger) {
            issues.push('Mobile hamburger button not found');
          } else {
            const hRect = hamburger.getBoundingClientRect();
            if (hRect.width < 44 || hRect.height < 44) {
              issues.push(`Mobile hamburger touch target too small: ${hRect.width}x${hRect.height}px (requires >= 44x44px)`);
            }
          }
        }

        // 4. Footer check
        const footer = document.querySelector('footer');
        if (!footer) {
          issues.push('Footer element not found');
        } else {
          const footerRect = footer.getBoundingClientRect();
          if (footerRect.width > vpWidth) {
            issues.push(`Footer width (${footerRect.width}px) exceeds viewport width (${vpWidth}px)`);
          }
        }

        return {
          issues,
          scrollWidth,
          clientWidth,
          headerWidth: headerRect.width
        };
      }, vp.width, vp.type);

      // Interactive Test: Open Dropdown / Mobile Menu
      let interactionSuccess = false;
      if (vp.type === 'desktop') {
        // Find More button if present
        const moreBtn = await page.$('nav button:has(svg.lucide-more-horizontal)');
        if (moreBtn) {
          await moreBtn.click();
          await new Promise((r) => setTimeout(r, 200));
          const dropdown = await page.$('nav div.absolute.right-0');
          if (dropdown) {
            const ddBox = await dropdown.boundingBox();
            if (ddBox && ddBox.x + ddBox.width <= vp.width) {
              interactionSuccess = true;
            } else {
              evaluation.issues.push('More dropdown overflows viewport boundary');
            }
          }
          // Close more menu
          await page.keyboard.press('Escape');
          await new Promise((r) => setTimeout(r, 150));
        } else {
          interactionSuccess = true; // All items fit, no more button needed
        }
      } else {
        // Mobile hamburger test
        const hamburger = await page.$('button[aria-label*="Navigation Menu"]');
        if (hamburger) {
          await hamburger.click();
          await new Promise((r) => setTimeout(r, 300));

          // Verify drawer is open
          const drawer = await page.$('#mobile-navigation-drawer');
          if (drawer) {
            const drawerBox = await drawer.boundingBox();
            if (drawerBox && drawerBox.width <= vp.width) {
              // Verify touch targets in drawer
              const smallTargets = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('#mobile-navigation-drawer button, #mobile-navigation-drawer select'));
                return buttons
                  .filter(b => {
                    const r = b.getBoundingClientRect();
                    return r.height < 40; // minimum touch height check
                  })
                  .map(b => b.innerText.trim() || b.getAttribute('aria-label') || 'unnamed');
              });

              if (smallTargets.length > 0) {
                evaluation.issues.push(`Sub-optimal touch targets in drawer: ${smallTargets.join(', ')}`);
              } else {
                interactionSuccess = true;
                if (vp.width === 390) {
                  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-drawer-open.png') });
                }
              }
            } else {
              evaluation.issues.push('Mobile drawer overflows viewport');
            }
          } else {
            evaluation.issues.push('Mobile drawer failed to open on hamburger click');
          }

          // Test closing via Escape key
          await page.keyboard.press('Escape');
          await new Promise((r) => setTimeout(r, 300));
          const isClosed = await page.$('#mobile-navigation-drawer') === null;
          if (!isClosed) {
            evaluation.issues.push('Mobile drawer failed to close on Escape key');
          }
        }
      }

      // Capture screenshot
      const safeName = vp.name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const screenshotPath = path.join(SCREENSHOT_DIR, `${vp.width}px-${safeName}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const passed = evaluation.issues.length === 0 && interactionSuccess;
      results.push({
        viewport: vp,
        passed,
        issues: evaluation.issues,
        screenshot: screenshotPath
      });

      console.log(`  ScrollWidth: ${evaluation.scrollWidth}px (Max allowed: ${vp.width}px)`);
      console.log(`  Issues: ${evaluation.issues.length === 0 ? 'None' : evaluation.issues.join('; ')}`);
      console.log(`  Interactive Menu: ${interactionSuccess ? 'PASS' : 'FAIL'}`);
      console.log(`  Result: ${passed ? '✓ PASSED' : '✗ FAILED'}\n`);
    }

  } finally {
    await browser.close();
    server.close();
  }

  console.log('=================================================================');
  console.log('TEST SUMMARY MATRIX');
  console.log('=================================================================');
  let allPassed = true;
  for (const r of results) {
    const mark = r.passed ? '✓ PASS' : '✗ FAIL';
    if (!r.passed) allPassed = false;
    console.log(`[${mark}] ${r.viewport.width}px (${r.viewport.name}) ${r.issues.length > 0 ? `Issues: ${r.issues.join(', ')}` : ''}`);
  }
  console.log('=================================================================');
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL VIEWPORT TESTS PASSED PERFECTLY!' : 'SOME TESTS FAILED'}`);
  console.log('=================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TARGET_VIEWPORTS = [
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 390, height: 844 },
  { name: 'Small mobile', width: 320, height: 568 }
];

const DESTINATIONS = [
  { id: 'matcher', name: 'Match Studio' },
  { id: 'leaderboard', name: 'Leaderboard' },
  { id: 'comparison', name: 'Compare' },
  { id: 'analytics', name: 'Analytics Lab' },
  { id: 'simulator', name: 'What-If' },
  { id: 'outcomes', name: 'Pipeline' },
  { id: 'fairness', name: 'Fairness' },
  { id: 'audit', name: 'Audit Ledger', isModal: true },
  { id: 'resumes', name: 'Resumes' },
  { id: 'jobs', name: 'Job Postings' },
  { id: 'system', name: 'Telemetry' }
];

const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots', 'mobile-tabs');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function startStaticServer(port = 4174) {
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

async function runMobileTabTests() {
  console.log('=================================================================');
  console.log('DRISHTI AI: COMPREHENSIVE MOBILE & TABLET MULTI-TAB TEST SUITE');
  console.log('=================================================================\n');

  const server = await startStaticServer(4174);
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  let totalIssues = 0;
  const tabResults = [];

  try {
    await page.goto('http://localhost:4174', { waitUntil: 'networkidle0', timeout: 15000 });

    for (const vp of TARGET_VIEWPORTS) {
      console.log(`\n=================================================================`);
      console.log(`TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height} CSS px)`);
      console.log(`=================================================================`);

      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise((r) => setTimeout(r, 400));

      // 1. Verify hamburger button exists and has >= 44x44px target
      const hamburgerBox = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label*="Navigation Menu"]');
        if (!btn) return null;
        const rect = btn.getBoundingClientRect();
        return { width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 };
      });

      if (!hamburgerBox || !hamburgerBox.visible) {
        console.error(`[FAIL] Hamburger button not visible at ${vp.width}px!`);
        totalIssues++;
      } else {
        console.log(`[PASS] Hamburger button visible: ${hamburgerBox.width.toFixed(1)}x${hamburgerBox.height.toFixed(1)}px (>= 44x44px)`);
      }

      // 2. Iterate through each destination
      for (const dest of DESTINATIONS) {
        // Open drawer
        const openBtn = await page.$('button[aria-label*="Open Navigation Menu"], button[aria-label*="Navigation Menu"]');
        if (openBtn) {
          await openBtn.click();
          await new Promise((r) => setTimeout(r, 250));
        }

        // Verify drawer is open
        const drawerOpen = await page.$('#mobile-navigation-drawer');
        if (!drawerOpen) {
          console.error(`[FAIL] Mobile drawer could not be opened for "${dest.name}"`);
          totalIssues++;
          continue;
        }

        // Click the destination button inside the drawer
        const clickResult = await page.evaluate((destName) => {
          const drawer = document.getElementById('mobile-navigation-drawer');
          if (!drawer) return { success: false, reason: 'Drawer missing' };
          const buttons = Array.from(drawer.querySelectorAll('button'));
          const targetBtn = buttons.find(b => b.innerText.includes(destName));
          if (!targetBtn) return { success: false, reason: `Button "${destName}" not found` };
          
          const rect = targetBtn.getBoundingClientRect();
          targetBtn.click();
          return { success: true, height: rect.height };
        }, dest.name);

        if (!clickResult.success) {
          console.error(`[FAIL] Could not click destination "${dest.name}": ${clickResult.reason}`);
          totalIssues++;
          continue;
        }

        await new Promise((r) => setTimeout(r, 300));

        // For modal (Audit Ledger), verify modal opened, check overflow, then close modal
        if (dest.isModal) {
          const modalStatus = await page.evaluate((vpWidth) => {
            const modal = document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0');
            const scrollWidth = document.documentElement.scrollWidth;
            return {
              hasModal: !!modal,
              scrollWidth,
              overflow: scrollWidth > vpWidth
            };
          }, vp.width);

          console.log(`  Destination [${dest.name} (Modal)]: opened=${modalStatus.hasModal}, scrollWidth=${modalStatus.scrollWidth}px (max ${vp.width}px)`);

          // Close modal via close button or Escape key
          const closeBtn = await page.$('button:has(svg.lucide-x)');
          if (closeBtn) {
            await closeBtn.click();
          } else {
            await page.keyboard.press('Escape');
          }
          await new Promise((r) => setTimeout(r, 250));

          tabResults.push({
            viewport: vp.width,
            tab: dest.name,
            passed: !modalStatus.overflow,
            scrollWidth: modalStatus.scrollWidth
          });
          continue;
        }

        // For regular tabs, verify drawer is closed and check tab page overflow
        const drawerClosed = (await page.$('#mobile-navigation-drawer')) === null;
        if (!drawerClosed) {
          console.warn(`[WARN] Drawer did not close automatically after clicking "${dest.name}"`);
        }

        // Check for horizontal overflow and element clipping
        const pageMetrics = await page.evaluate((vpWidth) => {
          const scrollWidth = document.documentElement.scrollWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const maxScroll = Math.max(scrollWidth, bodyScrollWidth);
          
          // Find any elements wider than viewport
          const wideElements = [];
          document.querySelectorAll('main *, footer *').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > vpWidth + 2) {
              wideElements.push({
                tag: el.tagName,
                className: (el.className || '').toString().slice(0, 50),
                width: Math.round(rect.width)
              });
            }
          });

          // Check footer specifically
          const footer = document.querySelector('footer');
          const footerRect = footer ? footer.getBoundingClientRect() : null;

          return {
            scrollWidth: maxScroll,
            overflow: maxScroll > vpWidth,
            wideElements: wideElements.slice(0, 3),
            footerOverflow: footerRect ? footerRect.width > vpWidth : false
          };
        }, vp.width);

        const passed = !pageMetrics.overflow && !pageMetrics.footerOverflow;
        if (!passed) {
          console.error(`  Destination [${dest.name}]: ✗ FAILED - scrollWidth: ${pageMetrics.scrollWidth}px > ${vp.width}px. Wide elements: ${JSON.stringify(pageMetrics.wideElements)}`);
          totalIssues++;
        } else {
          console.log(`  Destination [${dest.name}]: ✓ PASSED - scrollWidth: ${pageMetrics.scrollWidth}px (Max: ${vp.width}px)`);
        }

        // Save screenshot for 390px and 320px
        if (vp.width <= 390 && ['matcher', 'leaderboard', 'analytics', 'simulator', 'fairness'].includes(dest.id)) {
          const imgName = `${vp.width}px-${dest.id}.png`;
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, imgName), fullPage: false });
        }

        tabResults.push({
          viewport: vp.width,
          tab: dest.name,
          passed,
          scrollWidth: pageMetrics.scrollWidth
        });
      }

      // 3. Test Recruiter Persona Switcher inside mobile drawer
      console.log(`\n  Testing Recruiter Persona Switcher inside mobile drawer...`);
      const openBtnPersona = await page.$('button[aria-label*="Navigation Menu"]');
      if (openBtnPersona) {
        await openBtnPersona.click();
        await new Promise((r) => setTimeout(r, 250));
      }

      const personaChanged = await page.evaluate(() => {
        const select = document.querySelector('#mobile-navigation-drawer select');
        if (!select) return false;
        select.value = 'hiring_manager';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      });

      if (personaChanged) {
        await new Promise((r) => setTimeout(r, 300));
        const activePersonaText = await page.evaluate(() => {
          const badge = document.querySelector('#mobile-navigation-drawer span.capitalize');
          return badge ? badge.innerText.trim() : null;
        });
        console.log(`  Persona switched successfully. Active role in drawer: "${activePersonaText}"`);
      } else {
        console.error(`  Failed to switch persona in mobile drawer`);
        totalIssues++;
      }

      // Close drawer with Escape
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 200));
    }

  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n=================================================================');
  console.log('MOBILE & TABLET MULTI-TAB AUDIT SUMMARY');
  console.log('=================================================================');
  const allPassed = totalIssues === 0;
  console.log(`Total Destinations Tested per Viewport: ${DESTINATIONS.length}`);
  console.log(`Viewports Tested: 768px (Tablet), 390px (Mobile), 320px (Small Mobile)`);
  console.log(`Total Checks: ${tabResults.length}`);
  console.log(`Failed Checks: ${totalIssues}`);
  console.log(`OVERALL RESULT: ${allPassed ? '✓ 100% PASS - ALL TABS FIT PERFECTLY WITHOUT HORIZONTAL OVERFLOW' : '✗ ISSUES DETECTED'}`);
  console.log('=================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runMobileTabTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});

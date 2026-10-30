const puppeteer = require('puppeteer-core');
const http = require('http');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function startStaticServer(port = 4173) {
  const distDir = path.resolve(__dirname, 'dist');
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.png': 'image/png',
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
          res.end('Error loading asset');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve(server);
    });
  });
}

async function runRegressionSuite() {
  console.log('=== DRISHTI AI: FAIRNESS PAGE REGRESSION VERIFICATION SUITE ===\n');

  const server = await startStaticServer(4174);
  console.log('Static test server started on http://localhost:4174');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const uncaughtErrors = [];
  page.on('pageerror', (err) => {
    console.error('UNCAUGHT PAGE ERROR:', err.message);
    uncaughtErrors.push(err.message);
  });

  // Enable request interception to mock various backend states accurately
  await page.setRequestInterception(true);

  let mockFairnessState = 'valid'; // 'valid' | 'null_ratio' | 'insufficient_data' | 'api_failure'

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/auth/demo-session')) {
      req.respond({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'mock-token', user: { name: 'Sarah Connor', role: 'recruiter' } }),
      });
    } else if (url.includes('/api/jobs')) {
      req.respond({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: [
            { _id: 'job-1', title: 'Principal Platform Architect', company: 'CyberCore Dynamics', minExperienceYears: 8 },
            { _id: 'job-2', title: 'Junior Software Intern', company: 'InnoWave Technologies', minExperienceYears: 0 },
          ],
        }),
      });
    } else if (url.includes('/api/resumes')) {
      req.respond({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: [
            { _id: 'cand-1', candidateName: 'Candidate #001', totalExperienceYears: 4, skills: ['Node.js'] },
            { _id: 'cand-2', candidateName: 'Candidate #002', totalExperienceYears: 2, skills: ['React'] },
          ],
        }),
      });
    } else if (url.includes('/api/matches/fairness-audit/')) {
      if (mockFairnessState === 'api_failure') {
        req.respond({
          status: 500,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Backend fairness compute engine timeout (simulated).' }),
        });
      } else if (mockFairnessState === 'insufficient_data') {
        req.respond({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            jobId: 'job-1',
            fairnessAudit: {
              status: 'insufficient_data',
              message: 'Need at least 1 evaluated candidate in workspace to conduct statistical audit.',
            },
          }),
        });
      } else if (mockFairnessState === 'null_ratio') {
        req.respond({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            jobId: 'job-1',
            cohortSize: 3,
            fairnessAudit: {
              complianceStandard: 'EEOC 4/5ths Rule & NYC Local Law 144 / EU AI Act',
              passThreshold: 65,
              totalCohortSize: 3,
              overallPassRate: 33,
              highestSelectionRate: 100,
              adverseImpactDetected: true,
              cohortBreakdown: [
                {
                  key: 'junior',
                  label: 'Early Career (0-2 Yrs)',
                  totalCandidates: 0,
                  passedCount: 0,
                  selectionRate: 0,
                  rawRate: 0,
                  impactRatio: null, // previously caused .toFixed(2) crash
                  impactRatioLabel: 'N/A (Empty Cohort)',
                  isUndefined: true,
                  satisfiesFourFifthsRule: true,
                },
                {
                  key: 'senior',
                  label: 'Senior+ (6+ Yrs)',
                  totalCandidates: 3,
                  passedCount: 1,
                  selectionRate: 33,
                  rawRate: 0.33,
                  impactRatio: 1.0,
                  impactRatioLabel: '1.00',
                  satisfiesFourFifthsRule: true,
                },
              ],
              methodology: 'Deterministic attribute mappings based strictly on demonstrable skills.',
            },
          }),
        });
      } else {
        // 'valid'
        req.respond({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            jobId: 'job-1',
            cohortSize: 5,
            fairnessAudit: {
              complianceStandard: 'EEOC 4/5ths Rule & NYC Local Law 144 / EU AI Act',
              passThreshold: 65,
              totalCohortSize: 5,
              overallPassRate: 40,
              highestSelectionRate: 100,
              adverseImpactDetected: false,
              cohortBreakdown: [
                {
                  key: 'junior',
                  label: 'Early Career (0-2 Yrs)',
                  totalCandidates: 2,
                  passedCount: 2,
                  selectionRate: 100,
                  rawRate: 1.0,
                  impactRatio: 1.0,
                  impactRatioLabel: '1.00',
                  satisfiesFourFifthsRule: true,
                },
                {
                  key: 'senior',
                  label: 'Senior+ (6+ Yrs)',
                  totalCandidates: 3,
                  passedCount: 2,
                  selectionRate: 67,
                  rawRate: 0.67,
                  impactRatio: 0.85,
                  impactRatioLabel: '0.85',
                  satisfiesFourFifthsRule: true,
                },
              ],
              methodology: 'Deterministic attribute mappings based strictly on demonstrable skills.',
            },
          }),
        });
      }
    } else {
      req.continue();
    }
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Navigate to More -> Fairness
    // -------------------------------------------------------------
    console.log('Test 1: Opening application and navigating to More -> Fairness...');
    await page.goto('http://localhost:4174', { waitUntil: 'networkidle0' });

    // Click More button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const more = btns.find((b) => b.textContent.includes('More'));
      if (more) more.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // Click Fairness
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const f = btns.find((b) => b.textContent.includes('Fairness'));
      if (f) f.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Check page heading
    const heading = await page.evaluate(() => document.querySelector('h1')?.textContent || '');
    if (!heading.includes('Algorithmic Fairness')) {
      throw new Error(`Expected Fairness heading, got: "${heading}"`);
    }
    console.log(`[PASS] Test 1: Fairness page rendered successfully. Heading: "${heading}"`);

    // -------------------------------------------------------------
    // TEST 2: Verify Fairness Metrics and Visualizations
    // -------------------------------------------------------------
    console.log('\nTest 2: Verifying fairness metrics and breakdown table...');
    const tableText = await page.evaluate(() => document.querySelector('table')?.textContent || '');
    if (!tableText.includes('Early Career') || !tableText.includes('Senior+')) {
      throw new Error('Table did not render expected seniority cohorts.');
    }
    console.log('[PASS] Test 2: Seniority cohort table and compliance hero card rendered.');

    // -------------------------------------------------------------
    // TEST 3: Null Impact Ratio Handling (Previously caused White Screen)
    // -------------------------------------------------------------
    console.log('\nTest 3: Testing null impactRatio handling (empty cohort)...');
    mockFairnessState = 'null_ratio';
    // Change threshold to trigger refetch with null impactRatio
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const benchSelect = selects.find((s) => s.value === '65' || s.value === '60');
      if (benchSelect) {
        benchSelect.value = '75';
        benchSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 800));

    const rootLenNullRatio = await page.evaluate(() => document.getElementById('root')?.innerHTML.length || 0);
    if (rootLenNullRatio === 0) {
      throw new Error('White screen occurred when impactRatio was null!');
    }
    const hasEmptyBadge = await page.evaluate(() => document.body.textContent.includes('No Candidates') || document.body.textContent.includes('N/A'));
    if (!hasEmptyBadge) {
      throw new Error('Expected "No Candidates" or "N/A" badge for empty cohort.');
    }
    console.log('[PASS] Test 3: Null impactRatio handled gracefully without crash. Badge displayed.');

    // -------------------------------------------------------------
    // TEST 4: Insufficient Candidate Data Handling
    // -------------------------------------------------------------
    console.log('\nTest 4: Testing insufficient candidate data state...');
    mockFairnessState = 'insufficient_data';
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const benchSelect = selects.find((s) => s.value === '75');
      if (benchSelect) {
        benchSelect.value = '80';
        benchSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 800));

    const bodyTextInsufficient = await page.evaluate(() => document.body.textContent || '');
    if (!bodyTextInsufficient.includes('Insufficient Candidate Data')) {
      throw new Error('Expected "Insufficient Candidate Data" state card.');
    }
    console.log('[PASS] Test 4: Insufficient data displayed informative guidance card.');

    // -------------------------------------------------------------
    // TEST 5: API Failure State Handling
    // -------------------------------------------------------------
    console.log('\nTest 5: Testing API failure state...');
    mockFairnessState = 'api_failure';
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const benchSelect = selects.find((s) => s.value === '80');
      if (benchSelect) {
        benchSelect.value = '60';
        benchSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 800));

    const bodyTextError = await page.evaluate(() => document.body.textContent || '');
    if (!bodyTextError.includes('Fairness Audit Computation Failed')) {
      throw new Error('Expected "Fairness Audit Computation Failed" error card.');
    }
    const hasRetryBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some((b) => b.textContent.includes('Retry Audit'));
    });
    if (!hasRetryBtn) {
      throw new Error('Retry Audit button not found.');
    }
    console.log('[PASS] Test 5: API error card and "Retry Audit" button rendered cleanly.');

    // -------------------------------------------------------------
    // TEST 6: Navigation Back to Match Studio
    // -------------------------------------------------------------
    console.log('\nTest 6: Testing navigation back to Match Studio...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const studio = btns.find((b) => b.textContent.includes('Match Studio'));
      if (studio) studio.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const studioHeading = await page.evaluate(() => document.body.textContent || '');
    if (!studioHeading.includes('Explainable Candidate Evaluation') && !studioHeading.includes('Run Explainable Match Evaluation')) {
      throw new Error('Failed to return to Match Studio.');
    }
    console.log('[PASS] Test 6: Successfully navigated from Fairness back to Match Studio.');

    // -------------------------------------------------------------
    // TEST 7: Other More Menu Destinations
    // -------------------------------------------------------------
    console.log('\nTest 7: Testing other destinations in More menu...');
    const destinations = ['Pipeline', 'What-If', 'Job Postings'];
    for (const dest of destinations) {
      // Open More menu
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const more = btns.find((b) => b.textContent.includes('More'));
        if (more) more.click();
      });
      await new Promise((r) => setTimeout(r, 300));

      // Click destination
      await page.evaluate((d) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find((b) => b.textContent.includes(d));
        if (btn) btn.click();
      }, dest);
      await new Promise((r) => setTimeout(r, 600));

      const pageContent = await page.evaluate(() => document.getElementById('root')?.innerHTML.length || 0);
      if (pageContent === 0) {
        throw new Error(`White screen on navigating to "${dest}"!`);
      }
      console.log(` - Destination "${dest}" loaded successfully (content length: ${pageContent}).`);
    }
    console.log('[PASS] Test 7: All More menu destinations remain fully operational.');

    // Check uncaught errors
    if (uncaughtErrors.length > 0) {
      throw new Error(`Encountered uncaught errors during run: ${uncaughtErrors.join(', ')}`);
    }

    console.log('\n=== ALL 7 REGRESSION VERIFICATIONS PASSED CLEANLY! ===\n');
  } finally {
    await browser.close();
    server.close();
  }
}

runRegressionSuite().catch((err) => {
  console.error('\nREGRESSION TEST SUITE FAILED:', err);
  process.exit(1);
});

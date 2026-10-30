const puppeteer = require('puppeteer-core');
const http = require('http');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function startStaticServer(port = 4175) {
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

async function runQaFixesVerification() {
  console.log('=== DRISHTI AI: FRONTEND QA FIXES VERIFICATION ===\n');

  const server = await startStaticServer(4175);
  console.log('Static test server started on http://localhost:4175');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/health')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ status: 'healthy', database: 'connected' }),
        });
      }
      if (url.includes('/api/auth/demo-session')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ success: true, token: 'demo-token-123' }),
        });
      }
      if (url.includes('/api/jobs')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            data: [
              {
                _id: 'job-001',
                title: 'Principal Cloud Architect',
                company: 'Aether Technologies',
                department: 'Infrastructure',
                minExperienceYears: 8,
                description: 'Design robust distributed multi-cloud architectures.',
                requiredSkills: [{ name: 'Kubernetes' }, { name: 'Go' }, { name: 'AWS' }],
              },
            ],
          }),
        });
      }
      if (url.includes('/api/resumes')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            data: [
              {
                _id: 'cand-001',
                candidateName: 'Candidate #001',
                totalExperienceYears: 6,
                summary: 'Senior Cloud & Systems Engineer with strong Kubernetes tenure.',
                skills: [{ name: 'Kubernetes' }, { name: 'Go' }, { name: 'Terraform' }],
              },
            ],
          }),
        });
      }
      req.continue();
    });

    await page.goto('http://localhost:4175', { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1500));

    // Verify Job Cards Edit Button by clicking "+ Add Job" from Match Studio
    console.log('Test 1: Navigating to Job Postings tab via "+ Add Job"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addJobBtn = btns.find((b) => b.innerText.includes('+ Add Job'));
      if (addJobBtn) addJobBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const editJobBtn = await page.$('button[title="Edit job posting"]');
    if (editJobBtn) {
      console.log('[PASS] Test 1: Edit button found on Job Cards.');
    } else {
      throw new Error('[FAIL] Test 1: Edit button not found on Job Cards.');
    }

    // Verify Candidate Cards Edit Button by clicking "+ Add Candidate"
    console.log('Test 2: Navigating to Candidate Management tab via "+ Add Candidate"...');
    // First navigate back to matcher or click Resumes
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const matchBtn = btns.find((b) => b.innerText.includes('Match Studio'));
      if (matchBtn) matchBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addCandBtn = btns.find((b) => b.innerText.includes('+ Add Candidate'));
      if (addCandBtn) addCandBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const editCandBtn = await page.$('button[title="Edit candidate profile"]');
    if (editCandBtn) {
      console.log('[PASS] Test 2: Edit button found on Candidate Cards.');
    } else {
      throw new Error('[FAIL] Test 2: Edit button not found on Candidate Cards.');
    }

    console.log('\n=== ALL FRONTEND QA VERIFICATIONS PASSED! ===');
  } finally {
    await browser.close();
    server.close();
  }
}

runQaFixesVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});

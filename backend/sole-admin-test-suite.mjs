import assert from 'assert';
import app from './src/app.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import User from './src/models/User.js';
import { provisionSoleAdministrator } from './src/config/migration.js';
import { generateSalt, hashPassword, generateToken } from './src/middleware/auth.middleware.js';

let server;
let baseUrl;
let passedTests = 0;
let totalTests = 0;

await connectDB();
// Clean user collection for clean test isolation
await User.deleteMany({});

server = app.listen(0);
const { port } = server.address();
baseUrl = `http://127.0.0.1:${port}`;

console.log('====================================================');
console.log('DRISHTI AI - SOLE ADMINISTRATOR & STALE TOKEN SUITE');
console.log('====================================================\n');

async function makeRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, options);
  let body = {};
  const text = await response.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

async function test(name, fn) {
  totalTests += 1;
  try {
    await fn();
    passedTests += 1;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

// 1. Safe failure when ADMIN_EMAIL not configured
await test('provisionSoleAdministrator() skips safely when ADMIN_EMAIL is not set', async () => {
  delete process.env.ADMIN_EMAIL;
  const result = await provisionSoleAdministrator();
  assert.strictEqual(result.status, 'skipped');
});

// 2. Safe failure when account does not exist
await test('provisionSoleAdministrator() fails safely when account does not exist', async () => {
  process.env.ADMIN_EMAIL = 'unregistered.owner@example.com';
  const result = await provisionSoleAdministrator();
  assert.strictEqual(result.status, 'account_not_found');
  assert.strictEqual(result.email, 'unregistered.owner@example.com');
  const count = await User.countDocuments({ email: 'unregistered.owner@example.com' });
  assert.strictEqual(count, 0, 'Must NOT auto-create an account');
});

// 3. Safe failure when account is inactive
await test('provisionSoleAdministrator() fails safely when target account is inactive', async () => {
  const salt = generateSalt();
  await User.create({
    name: 'Deactivated Owner',
    email: 'inactive.owner@example.com',
    salt,
    passwordHash: hashPassword('Secret@123', salt),
    role: 'recruiter',
    isActive: false,
  });

  process.env.ADMIN_EMAIL = 'inactive.owner@example.com';
  const result = await provisionSoleAdministrator();
  assert.strictEqual(result.status, 'account_inactive');
});

// 4. Safe failure without explicit confirmation and successful provisioning with approval
await test('provisionSoleAdministrator() requires explicit confirmation and verified ID before promoting', async () => {
  // Create an old admin
  const oldSalt = generateSalt();
  const oldAdmin = await User.create({
    name: 'Previous Admin',
    email: 'old.admin@example.com',
    salt: oldSalt,
    passwordHash: hashPassword('Secret@123', oldSalt),
    role: 'admin',
    isActive: true,
  });

  // Create intended administrator as recruiter
  const targetSalt = generateSalt();
  const targetUser = await User.create({
    name: 'Shivam Gupta',
    email: 'shivamkgupta911@gmail.com',
    salt: targetSalt,
    passwordHash: hashPassword('StrongPassword@2026', targetSalt),
    role: 'recruiter',
    isActive: true,
  });

  process.env.ADMIN_EMAIL = 'shivamkgupta911@gmail.com';
  delete process.env.ADMIN_PROVISION_CONFIRMED;
  delete process.env.ADMIN_VERIFIED_USER_ID;
  delete process.env.ADMIN_DEMOTE_APPROVED;

  // Step A: Without ADMIN_PROVISION_CONFIRMED, must return pending_approval and NOT promote
  const pendingResult = await provisionSoleAdministrator();
  assert.strictEqual(pendingResult.status, 'pending_approval');
  const unpromotedTarget = await User.findById(targetUser._id);
  assert.strictEqual(unpromotedTarget.role, 'recruiter', 'Role must remain recruiter without confirmation');

  // Step B: With mismatched ADMIN_VERIFIED_USER_ID, must abort with id_mismatch
  process.env.ADMIN_PROVISION_CONFIRMED = 'true';
  process.env.ADMIN_VERIFIED_USER_ID = '6ad5df4e21b5225f2e143999'; // bogus ID
  const mismatchResult = await provisionSoleAdministrator();
  assert.strictEqual(mismatchResult.status, 'id_mismatch');

  // Step C: With proper confirmation, matched ID, and demote approval, must succeed
  process.env.ADMIN_VERIFIED_USER_ID = targetUser._id.toString();
  process.env.ADMIN_DEMOTE_APPROVED = 'true';
  const result = await provisionSoleAdministrator();

  assert.strictEqual(result.status, 'success');
  assert.strictEqual(result.adminEmail, 'shivamkgupta911@gmail.com');
  assert.strictEqual(result.demotedAdmins.length, 1);
  assert.strictEqual(result.demotedAdmins[0].email, 'old.admin@example.com');

  // Verify target is now admin and verified
  const updatedTarget = await User.findById(targetUser._id);
  assert.strictEqual(updatedTarget.role, 'admin');
  assert.strictEqual(updatedTarget.isVerified, true);

  // Verify old admin was demoted to recruiter
  const updatedOldAdmin = await User.findById(oldAdmin._id);
  assert.strictEqual(updatedOldAdmin.role, 'recruiter');
});

// 5. Stale JWT rejection for demoted admin
await test('requireAdmin rejects stale JWT from demoted admin in real-time', async () => {
  const oldAdmin = await User.findOne({ email: 'old.admin@example.com' });
  assert.strictEqual(oldAdmin.role, 'recruiter');

  // Forge or use a stale token that claims role: 'admin'
  const staleToken = generateToken({
    id: oldAdmin._id.toString(),
    email: oldAdmin.email,
    name: oldAdmin.name,
    role: 'admin', // Stale claim in JWT!
    isDemo: false,
  });

  // Attempt to call admin seed with stale token
  const res = await makeRequest('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staleToken}` },
  });

  assert.strictEqual(res.status, 403, 'Must be rejected with 403');
  assert.ok(
    res.body.error.includes('Administrative privileges are invalid, revoked, or account is inactive'),
    `Expected invalid/revoked error, got: ${res.body.error}`
  );
});

// 6. Deactivated admin rejection in real-time
await test('requireAdmin rejects deactivated admin account even with valid role', async () => {
  const targetUser = await User.findOne({ email: 'shivamkgupta911@gmail.com' });
  targetUser.isActive = false;
  await targetUser.save();

  const adminToken = generateToken({
    id: targetUser._id.toString(),
    email: targetUser.email,
    name: targetUser.name,
    role: 'admin',
    isDemo: false,
  });

  const res = await makeRequest('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('inactive'));

  // Restore active status
  targetUser.isActive = true;
  await targetUser.save();
});

// 7. Verified administrator succeeds on POST /api/seed
await test('requireAdmin permits designated administrator on POST /api/seed', async () => {
  const targetUser = await User.findOne({ email: 'shivamkgupta911@gmail.com' });
  const adminToken = generateToken({
    id: targetUser._id.toString(),
    email: targetUser.email,
    name: targetUser.name,
    role: 'admin',
    isDemo: false,
  });

  const res = await makeRequest('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);

  // After database seed clears data, restore administrator account for subsequent tests
  const salt = generateSalt();
  await User.create({
    name: 'Shivam Gupta',
    email: 'shivamkgupta911@gmail.com',
    salt,
    passwordHash: hashPassword('StrongPassword@2026', salt),
    role: 'admin',
    isActive: true,
  });
});

// 8. Non-ADMIN_EMAIL account rejected even if role was admin in database
await test('requireAdmin rejects admin whose email does not match ADMIN_EMAIL', async () => {
  const rogueSalt = generateSalt();
  const rogueAdmin = await User.create({
    name: 'Rogue Admin',
    email: 'rogue.admin@example.com',
    salt: rogueSalt,
    passwordHash: hashPassword('Secret@123', rogueSalt),
    role: 'admin',
    isActive: true,
  });

  const rogueToken = generateToken({
    id: rogueAdmin._id.toString(),
    email: rogueAdmin.email,
    name: rogueAdmin.name,
    role: 'admin',
    isDemo: false,
  });

  // process.env.ADMIN_EMAIL is still 'shivamkgupta911@gmail.com'
  const res = await makeRequest('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${rogueToken}` },
  });

  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('Account is not designated as the verified administrator'));
});

// 9. Admin User Inspection (GET /api/auth/users)
await test('GET /api/auth/users permits verified admin and excludes password hashes', async () => {
  const targetUser = await User.findOne({ email: 'shivamkgupta911@gmail.com' });
  const adminToken = generateToken({
    id: targetUser._id.toString(),
    email: targetUser.email,
    name: targetUser.name,
    role: 'admin',
    isDemo: false,
  });

  const res = await makeRequest('/api/auth/users', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.users.length > 0);
  for (const u of res.body.users) {
    assert.strictEqual(u.passwordHash, undefined);
    assert.strictEqual(u.salt, undefined);
  }
});

// 10. Role update restrictions (PATCH /api/auth/users/:id/role)
await test('PATCH /api/auth/users/:id/role blocks non-admin and blocks promoting non-ADMIN_EMAIL to admin', async () => {
  const targetUser = await User.findOne({ email: 'shivamkgupta911@gmail.com' });
  const adminToken = generateToken({
    id: targetUser._id.toString(),
    email: targetUser.email,
    name: targetUser.name,
    role: 'admin',
    isDemo: false,
  });

  const regularUser = await User.findOne({ email: 'recruiter@drishti.ai' });

  // Attempt to promote regularUser to admin when ADMIN_EMAIL is shivamkgupta911@gmail.com
  const res = await makeRequest(`/api/auth/users/${regularUser._id}/role`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'admin' }),
  });

  assert.strictEqual(res.status, 403);
  assert.ok(res.body.error.includes('Only the designated ADMIN_EMAIL'));

  // Updating to hiring_manager succeeds
  const successRes = await makeRequest(`/api/auth/users/${regularUser._id}/role`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'hiring_manager' }),
  });

  assert.strictEqual(successRes.status, 200);
  assert.strictEqual(successRes.body.user.role, 'hiring_manager');
});

server.close(async () => {
  await disconnectDB();
  console.log('\n====================================================');
  console.log(`SOLE ADMINISTRATOR SUITE: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================');
  process.exit(0);
});

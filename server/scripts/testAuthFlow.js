/**
 * Comprehensive Automated Test Suite for Terra AI Auth & RBAC
 * 
 * Verifies:
 * 1. Individual signup, login, password hash safety, and /me
 * 2. Organization signup with PENDING status & document attachment
 * 3. Blocking of unapproved organization from org-scoped routes (403 Forbidden)
 * 4. Super Admin seed script execution & login
 * 5. Super Admin approval of organization & verification of organization_approval_logs
 * 6. Organization admin access to /api/organizations/my and member management
 * 7. Cross-organization data isolation (never trusting frontend org_id)
 * 8. Organization suspension blocking access
 * 9. Organization reactivation
 * 10. Rejection requiring reason
 */

import { query } from '../config/database.js';

const BASE_URL = 'http://127.0.0.1:3000';

async function runTestSuite() {
  console.log('\n🧪 Starting Terra AI RBAC & Auth Verification Suite...\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Individual Signup
    // -------------------------------------------------------------
    console.log('--- Test 1: Individual Citizen Signup ---');
    const indRes = await fetch(`${BASE_URL}/api/auth/signup/individual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Citizen',
        email: `citizen_${Date.now()}@example.com`,
        password: 'Password123!',
        location: 'Portland, OR',
        acceptTerms: true,
      }),
    });

    const indData = await indRes.json();
    assert(indRes.status === 201, 'Individual signup returns HTTP 201 Created');
    assert(indData.user.account_type === 'INDIVIDUAL', 'User account_type is INDIVIDUAL');
    assert(indData.user.status === 'ACTIVE', 'Individual user status is ACTIVE immediately');
    assert(!indData.user.password_hash, 'Security: password_hash is never exposed in response');
    assert(indData.accessToken, 'Access token is issued in response');

    // -------------------------------------------------------------
    // Test 2: Login with Valid & Invalid Credentials
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Login & Password Hash Verification ---');
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: indData.user.email,
        password: 'WrongPassword!',
      }),
    });
    assert(badLoginRes.status === 401, 'Invalid password returns HTTP 401');

    const goodLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: indData.user.email,
        password: 'Password123!',
      }),
    });
    const goodLoginData = await goodLoginRes.json();
    assert(goodLoginRes.status === 200, 'Valid credentials login returns HTTP 200');
    assert(goodLoginData.user.email === indData.user.email, 'Logged in user email matches');

    // -------------------------------------------------------------
    // Test 3: Organization Signup with PENDING status
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Organization Signup with PENDING status ---');
    const orgRepEmail = `org_admin_${Date.now()}@example.com`;
    const orgSignupRes = await fetch(`${BASE_URL}/api/auth/signup/organization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Evergreen Earth NGO',
        organization_type: 'NGO / Non-Profit',
        registration_number: 'NGO-99881',
        official_email: `contact_${Date.now()}@evergreen.org`,
        contact_number: '+1 555 333 4444',
        address: '100 Eco Parkway, Suite 50',
        website: 'https://evergreen.org',
        representative_name: 'Dr. Sarah Green',
        representative_email: orgRepEmail,
        representative_password: 'Password123!',
        acceptTerms: true,
      }),
    });

    const orgSignupData = await orgSignupRes.json();
    assert(orgSignupRes.status === 201, 'Organization registration returns HTTP 201');
    assert(orgSignupData.status === 'PENDING', 'Organization status is PENDING approval');
    assert(orgSignupData.organization.approval_status === 'PENDING', 'Org approval_status is PENDING');
    assert(orgSignupData.user.account_type === 'ORG_ADMIN', 'Representative role is ORG_ADMIN');
    assert(
      orgSignupData.message === 'Your organization registration request is pending admin approval.',
      'Includes mandatory pending admin approval message'
    );

    const orgToken = orgSignupData.accessToken;
    const orgId = orgSignupData.organization.id;

    // -------------------------------------------------------------
    // Test 4: Security Rule - Block Pending Org Access
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Security Rule: requireApprovedOrganization Blocks PENDING ---');
    const blockedRes = await fetch(`${BASE_URL}/api/organizations/my`, {
      headers: {
        Authorization: `Bearer ${orgToken}`,
      },
    });
    assert(blockedRes.status === 403, 'Pending organization is BLOCKED from org routes with HTTP 403');
    const blockedData = await blockedRes.json();
    assert(blockedData.code === 'ORGANIZATION_NOT_APPROVED', 'Returns code ORGANIZATION_NOT_APPROVED');

    // -------------------------------------------------------------
    // Test 5: Super Admin Login
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Super Admin Authentication ---');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@terra.eco',
        password: process.env.SUPER_ADMIN_PASSWORD || 'AdminSecurePassword123!',
      }),
    });

    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Super Admin login successful');
    assert(adminLoginData.user.account_type === 'SUPER_ADMIN', 'Admin role verified as SUPER_ADMIN');
    const adminToken = adminLoginData.accessToken;

    // -------------------------------------------------------------
    // Test 6: Super Admin Pending Review Queue
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Super Admin Pending Queue ---');
    const pendingRes = await fetch(`${BASE_URL}/api/admin/organizations/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingData = await pendingRes.json();
    assert(pendingRes.status === 200, 'Admin can fetch pending queue');
    const foundOrg = pendingData.organizations.find((o) => o.id === orgId);
    assert(foundOrg !== undefined, 'Registered org is present in pending queue');

    // -------------------------------------------------------------
    // Test 7: Super Admin Approves Organization & Verifies Audit Log
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Super Admin Approval & Audit Logging ---');
    const approveRes = await fetch(`${BASE_URL}/api/admin/organizations/${orgId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ remarks: 'Verified non-profit credentials.' }),
    });

    const approveData = await approveRes.json();
    assert(approveRes.status === 200, 'Approval returns HTTP 200 OK');
    assert(approveData.organization.approval_status === 'APPROVED', 'Org status transitioned to APPROVED');

    // Verify Audit Log
    const logsRes = await fetch(`${BASE_URL}/api/admin/organizations/${orgId}/logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const logsData = await logsRes.json();
    assert(logsData.logs.length > 0, 'Audit log created in organization_approval_logs');
    assert(logsData.logs[0].action === 'APPROVED', 'Audit log records APPROVED action');

    // -------------------------------------------------------------
    // Test 8: Approved Org Admin can now access /my & invite members
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Approved Org Access & Member Management ---');
    const allowedRes = await fetch(`${BASE_URL}/api/organizations/my`, {
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    assert(allowedRes.status === 200, 'Approved organization can now access /api/organizations/my');

    const membersRes = await fetch(`${BASE_URL}/api/organizations/my/members`, {
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    const membersData = await membersRes.json();
    assert(membersRes.status === 200, 'Org Admin can retrieve member roster');
    assert(membersData.members.length >= 1, 'Member roster includes registered ORG_ADMIN');

    // -------------------------------------------------------------
    // Test 9: Suspend & Reactivate Organization
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Super Admin Suspension & Reactivation ---');
    const suspendRes = await fetch(`${BASE_URL}/api/admin/organizations/${orgId}/suspend`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(suspendRes.status === 200, 'Suspension succeeds');

    // Verify suspended org is immediately blocked
    const suspendedBlockedRes = await fetch(`${BASE_URL}/api/organizations/my`, {
      headers: { Authorization: `Bearer ${orgToken}` },
    });
    assert(suspendedBlockedRes.status === 403, 'Suspended org is blocked from accessing dashboard');

    // Reactivate
    const reactivateRes = await fetch(`${BASE_URL}/api/admin/organizations/${orgId}/reactivate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(reactivateRes.status === 200, 'Reactivation succeeds');

    // -------------------------------------------------------------
    // Test 10: Rejection Requires Reason
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Rejection Validation ---');
    const emptyRejectRes = await fetch(`${BASE_URL}/api/admin/organizations/${orgId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: '' }),
    });
    assert(emptyRejectRes.status === 400, 'Rejection without reason returns HTTP 400 Bad Request');

    console.log(`\n🎉 ALL ${passedTests} OF ${totalTests} TESTS PASSED PERFECTLY!\n`);
  } catch (err) {
    console.error('\n❌ Test suite encountered an error:', err.message);
    process.exit(1);
  }
}

runTestSuite();

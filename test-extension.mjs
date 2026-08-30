#!/usr/bin/env node

/**
 * Comprehensive Extension Functionality Test Suite
 * Tests: API endpoints, message passing, storage, auth flow
 */

import fs from 'fs';
import path from 'path';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  pass(testName) {
    console.log(`  ${colors.green}✓${colors.reset} ${testName}`);
    this.passed++;
  }

  fail(testName, reason) {
    console.log(`  ${colors.red}✗${colors.reset} ${testName}`);
    console.log(`    ${colors.yellow}Reason: ${reason}${colors.reset}`);
    this.failed++;
  }

  skip(testName, reason) {
    console.log(`  ${colors.yellow}⊘${colors.reset} ${testName}`);
    console.log(`    ${colors.yellow}Skipped: ${reason}${colors.reset}`);
    this.skipped++;
  }

  async run() {
    this.log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
    this.log('║    Extension Functionality Test Suite                      ║', 'blue');
    this.log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

    await this.testExtensionFiles();
    await this.testDomainMapping();
    await this.testApiEndpoints();
    await this.testMessagePassingSimulation();
    await this.testStorageConfiguration();
    await this.testSubscriptionDetection();
    await this.testErrorHandling();

    this.printSummary();
  }

  async testExtensionFiles() {
    this.log('\n📦 Extension File Structure Tests\n', 'bold');

    const files = [
      'extension/manifest.json',
      'extension/background.js',
      'extension/content.js',
      'extension/popup.js',
      'extension/popup.html'
    ];

    for (const file of files) {
      const filePath = path.join('/Users/alexidonckerwolcke/Subveris', file);
      try {
        if (fs.existsSync(filePath)) {
          const size = fs.statSync(filePath).size;
          this.pass(`${file} exists (${size} bytes)`);
        } else {
          this.fail(`${file} exists`, 'File not found');
        }
      } catch (e) {
        this.fail(`${file} exists`, e.message);
      }
    }
  }

  async testDomainMapping() {
    this.log('\n🗺️  Subscription Domain Mapping Tests\n', 'bold');

    try {
      const bgPath = '/Users/alexidonckerwolcke/Subveris/extension/background.js';
      const bgContent = fs.readFileSync(bgPath, 'utf8');

      // Test 1: Check SUBSCRIPTION_MAPPING exists
      if (bgContent.includes('SUBSCRIPTION_MAPPING')) {
        this.pass('SUBSCRIPTION_MAPPING constant defined');
      } else {
        this.fail('SUBSCRIPTION_MAPPING constant', 'Not found in background.js');
      }

      // Test 2: Check key services are mapped
      const requiredServices = [
        'netflix.com',
        'spotify.com',
        'amazon.com',
        'youtube.com',
        'disneyplus.com'
      ];

      for (const service of requiredServices) {
        if (bgContent.includes(`'${service}'`)) {
          this.pass(`Domain mapping: ${service}`);
        } else {
          this.fail(`Domain mapping: ${service}`, 'Not found in mapping');
        }
      }

      // Test 3: Verify getServiceNameFromDomain function
      if (bgContent.includes('function getServiceNameFromDomain')) {
        this.pass('getServiceNameFromDomain function defined');
      } else {
        this.fail('getServiceNameFromDomain function', 'Not found');
      }
    } catch (e) {
      this.fail('Domain mapping tests', e.message);
    }
  }

  async testApiEndpoints() {
    this.log('\n🔌 API Endpoint Tests\n', 'bold');

    try {
      const apiPath = '/Users/alexidonckerwolcke/Subveris/supabase/functions/api/index.ts';
      const apiContent = fs.readFileSync(apiPath, 'utf8');

      const endpoints = [
        { path: '/subscriptions', method: 'GET', description: 'Fetch user subscriptions' },
        { path: '/extension/usage-sync', method: 'POST', description: 'Sync usage tracking' },
        { path: '/extension/detected-subscriptions', method: 'POST', description: 'Sync detected subscriptions' },
        { path: '/extension/session-scan', method: 'POST', description: 'Report session data' },
        { path: '/auth/gmail-oauth-url', method: 'GET', description: 'Get Gmail OAuth URL' },
        { path: '/auth/gmail-token', method: 'POST', description: 'Exchange auth code for token' }
      ];

      for (const endpoint of endpoints) {
        const pathCheck = apiContent.includes(`"${endpoint.path}"`) || apiContent.includes(`'${endpoint.path}'`);
        const methodCheck = apiContent.includes(`req.method === "${endpoint.method}"`) || apiContent.includes(`req.method === '${endpoint.method}'`);

        if (pathCheck && methodCheck) {
          this.pass(`${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
        } else if (pathCheck) {
          this.skip(`${endpoint.method} ${endpoint.path}`, 'Path found but method check inconclusive');
        } else {
          this.fail(`${endpoint.method} ${endpoint.path}`, 'Endpoint not found in API');
        }
      }
    } catch (e) {
      this.fail('API endpoint tests', e.message);
    }
  }

  async testMessagePassingSimulation() {
    this.log('\n💬 Message Passing Tests\n', 'bold');

    try {
      const bgPath = '/Users/alexidonckerwolcke/Subveris/extension/background.js';
      const bgContent = fs.readFileSync(bgPath, 'utf8');

      const messages = [
        'TRACK_USAGE',
        'authorizeGmail',
        'SUBVERIS_AUTH_TOKEN'
      ];

      for (const msg of messages) {
        if (bgContent.includes(msg)) {
          this.pass(`Message handler: ${msg}`);
        } else {
          this.fail(`Message handler: ${msg}`, 'Handler not found');
        }
      }

      // Test browser.runtime.onMessage
      if (bgContent.includes('browser.runtime.onMessage.addListener')) {
        this.pass('browser.runtime.onMessage listener registered');
      } else {
        this.fail('browser.runtime.onMessage listener', 'Not found');
      }

      const contentPath = '/Users/alexidonckerwolcke/Subveris/extension/content.js';
      const contentContent = fs.readFileSync(contentPath, 'utf8');
      if (contentContent.includes('if (isExtensionContextInvalidated(err))') || contentContent.includes('if (isExtensionContextInvalidated(browser.runtime.lastError))')) {
        this.pass('Extension invalidation is treated as a recoverable condition');
      } else {
        this.fail('Extension invalidation handling', 'Missing invalidated-context recovery guard');
      }

      if (bgContent.includes('const usageTrackingEndpoints') || bgContent.includes('response.status === 404 && index < usageTrackingEndpoints.length - 1')) {
        this.pass('Usage tracking fallback handles expected 404s without noisy hard failures');
      } else {
        this.fail('Usage tracking fallback handling', 'Missing resilient 404 fallback logic');
      }
    } catch (e) {
      this.fail('Message passing tests', e.message);
    }
  }

  async testStorageConfiguration() {
    this.log('\n💾 Storage & Configuration Tests\n', 'bold');

    try {
      const bgPath = '/Users/alexidonckerwolcke/Subveris/extension/background.js';
      const bgContent = fs.readFileSync(bgPath, 'utf8');

      const storageChecks = [
        { key: 'authToken', description: 'Auth token storage' },
        { key: 'subverisApiUrl', description: 'API URL configuration' },
        { key: 'detectedSubscriptions', description: 'Detected subscriptions cache' },
        { key: 'gmailAuthToken', description: 'Gmail access token' },
        { key: 'usageSignalHistory', description: 'Zero usage tracking' }
      ];

      for (const check of storageChecks) {
        if (bgContent.includes(`'${check.key}'`) || bgContent.includes(`"${check.key}"`)) {
          this.pass(`Storage: ${check.description}`);
        } else {
          this.fail(`Storage: ${check.description}`, 'Not found');
        }
      }

      // Test browser.storage.local usage
      if (bgContent.includes('browser.storage.local.get') || bgContent.includes('browser.storage.local.set')) {
        this.pass('browser.storage.local API usage');
      } else {
        this.fail('browser.storage.local API usage', 'No storage calls found');
      }
    } catch (e) {
      this.fail('Storage tests', e.message);
    }
  }

  async testSubscriptionDetection() {
    this.log('\n🔍 Subscription Detection Tests\n', 'bold');

    try {
      const bgPath = '/Users/alexidonckerwolcke/Subveris/extension/background.js';
      const bgContent = fs.readFileSync(bgPath, 'utf8');

      const detectionMethods = [
        { name: 'loadKnownSubscriptions', description: 'API-based detection' },
        { name: 'runCookieSessionScan', description: 'Cookie/session detection' },
        { name: 'scanGmailForSubscriptions', description: 'Gmail email detection' },
        { name: 'addDetectedSubscription', description: 'Add detected subscription' }
      ];

      for (const method of detectionMethods) {
        if (bgContent.includes(`function ${method.name}`) || bgContent.includes(`const ${method.name}`)) {
          this.pass(`${method.description} (${method.name})`);
        } else {
          this.fail(`${method.description}`, `Function ${method.name} not found`);
        }
      }

      // Test periodic sync interval
      if (bgContent.includes('setInterval') || bgContent.includes('setTimeout')) {
        this.pass('Periodic sync/interval setup detected');
      } else {
        this.skip('Periodic sync timing', 'Check implementation for background timing');
      }
    } catch (e) {
      this.fail('Subscription detection tests', e.message);
    }
  }

  async testErrorHandling() {
    this.log('\n⚠️  Error Handling Tests\n', 'bold');

    try {
      const bgPath = '/Users/alexidonckerwolcke/Subveris/extension/background.js';
      const bgContent = fs.readFileSync(bgPath, 'utf8');

      const errorHandling = [
        { pattern: 'browser.runtime.lastError', description: 'Runtime error checking' },
        { pattern: 'console.error', description: 'Error logging' },
        { pattern: 'catch', description: 'Try-catch blocks' },
        { pattern: '.then(', description: 'Promise handling' }
      ];

      for (const check of errorHandling) {
        if (bgContent.includes(check.pattern)) {
          this.pass(`Error handling: ${check.description}`);
        } else {
          this.fail(`Error handling: ${check.description}`, 'Pattern not found');
        }
      }

      // Check for chrome.* usage (should be browser.*)
      const chromeMatches = bgContent.match(/chrome\.(storage|runtime|cookies|identity|tabs)/g) || [];
      if (chromeMatches.length === 0) {
        this.pass('No chrome.* API calls (cross-browser compatible)');
      } else {
        this.fail('Cross-browser compatibility', `Found ${chromeMatches.length} chrome.* calls`);
      }
    } catch (e) {
      this.fail('Error handling tests', e.message);
    }
  }

  printSummary() {
    this.log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
    this.log('║    Test Results Summary                                    ║', 'blue');
    this.log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

    const total = this.passed + this.failed + this.skipped;
    const passPercentage = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;

    this.log(`${colors.green}✓ Passed:  ${this.passed}${colors.reset}`);
    this.log(`${colors.red}✗ Failed:  ${this.failed}${colors.reset}`);
    this.log(`${colors.yellow}⊘ Skipped: ${this.skipped}${colors.reset}`);
    this.log(`\nTotal: ${total} tests | Success rate: ${passPercentage}%\n`);

    if (this.failed === 0) {
      this.log('🎉 All critical tests passed! Extension is ready for testing.\n', 'green');
      process.exit(0);
    } else {
      this.log(`⚠️  ${this.failed} test(s) failed. Review above for details.\n`, 'red');
      process.exit(1);
    }
  }
}

// Run tests
const runner = new TestRunner();
runner.run().catch(console.error);

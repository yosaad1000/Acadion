#!/usr/bin/env node
/**
 * Test runner for frontend session management tests
 * Runs all session-related tests with proper coverage reporting
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests() {
  console.log('🧪 Running Frontend Session Management Test Suite');
  console.log('='.repeat(50));

  const testFiles = [
    'src/test/services/sessionService.test.ts',
    'src/test/e2e/sessionManagement.test.ts'
  ];

  // Check if test files exist
  const existingTests = testFiles.filter(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    if (!exists) {
      console.log(`⚠️  Test file not found: ${file}`);
    }
    return exists;
  });

  if (existingTests.length === 0) {
    console.log('❌ No test files found!');
    return 1;
  }

  try {
    // Run individual test files
    console.log('\n📋 Running individual test files...');
    for (const testFile of existingTests) {
      console.log(`\n🔍 Running ${testFile}...`);
      try {
        await runCommand('npx', ['vitest', 'run', testFile, '--reporter=verbose']);
        console.log(`✅ ${testFile} - PASSED`);
      } catch (error) {
        console.log(`❌ ${testFile} - FAILED`);
        console.error(error.message);
      }
    }

    // Run all session tests together
    console.log('\n📊 Running all session tests with coverage...');
    await runCommand('npx', [
      'vitest', 
      'run',
      '--coverage',
      '--reporter=verbose',
      'src/test/services/sessionService.test.ts',
      'src/test/e2e/sessionManagement.test.ts'
    ]);

    // Run type checking
    console.log('\n🔍 Running TypeScript type checking...');
    await runCommand('npx', ['tsc', '--noEmit']);

    // Run linting on test files
    console.log('\n🧹 Running ESLint on test files...');
    try {
      await runCommand('npx', [
        'eslint', 
        'src/test/services/sessionService.test.ts',
        'src/test/e2e/sessionManagement.test.ts',
        '--ext', '.ts,.tsx'
      ]);
      console.log('✅ Linting passed');
    } catch (error) {
      console.log('⚠️  Linting issues found (non-blocking)');
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Frontend session management tests completed!');
    return 0;

  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('💥 Some tests failed!');
    console.error(error.message);
    return 1;
  }
}

// Run the tests
runTests().then(code => {
  process.exit(code);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
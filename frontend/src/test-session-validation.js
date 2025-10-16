// Quick test for session time validation fix
// Run this in browser console to test the validation

import { validateSessionDateTime } from './utils/sessionValidation.js';

// Test current time (should pass with grace period)
const now = new Date();
const currentDate = now.toISOString().split('T')[0];
const currentTime = now.toTimeString().slice(0, 5);

console.log('Testing current time validation...');
console.log('Date:', currentDate, 'Time:', currentTime);

const result1 = validateSessionDateTime(currentDate, currentTime);
console.log('Current time result:', result1);

// Test 3 minutes ago (should pass with grace period)
const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);
const pastTime = threeMinutesAgo.toTimeString().slice(0, 5);

console.log('Testing 3 minutes ago...');
console.log('Date:', currentDate, 'Time:', pastTime);

const result2 = validateSessionDateTime(currentDate, pastTime);
console.log('3 minutes ago result:', result2);

// Test 10 minutes ago (should fail - beyond grace period)
const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
const oldTime = tenMinutesAgo.toTimeString().slice(0, 5);

console.log('Testing 10 minutes ago...');
console.log('Date:', currentDate, 'Time:', oldTime);

const result3 = validateSessionDateTime(currentDate, oldTime);
console.log('10 minutes ago result:', result3);

console.log('Test completed!');
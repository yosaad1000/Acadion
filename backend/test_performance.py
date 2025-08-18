#!/usr/bin/env python3
"""
Performance testing script for the attendance management system
Tests database queries, API endpoints, and concurrent user scenarios
"""

import asyncio
import time
import statistics
import httpx
import json
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor
import argparse

class PerformanceTester:
    def __init__(self, base_url: str = "http://localhost:8000", concurrent_users: int = 10):
        self.base_url = base_url
        self.concurrent_users = concurrent_users
        self.results: Dict[str, List[float]] = {}
        
    async def time_request(self, client: httpx.AsyncClient, method: str, url: str, **kwargs) -> float:
        """Time a single HTTP request"""
        start_time = time.time()
        try:
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()
            return time.time() - start_time
        except Exception as e:
            print(f"Request failed: {e}")
            return -1
    
    def record_result(self, test_name: str, duration: float):
        """Record test result"""
        if test_name not in self.results:
            self.results[test_name] = []
        if duration > 0:  # Only record successful requests
            self.results[test_name].append(duration * 1000)  # Convert to milliseconds
    
    async def test_database_queries(self):
        """Test database query performance"""
        print("Testing database query performance...")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Test subject listing
            for i in range(10):
                duration = await self.time_request(
                    client, "GET", f"{self.base_url}/api/subjects",
                    headers={"Authorization": "Bearer test_token"}
                )
                self.record_result("subjects_list", duration)
            
            # Test attendance dashboard (if we have a test subject)
            test_subject_id = "test-subject-id"  # This would need to be a real ID
            for i in range(10):
                duration = await self.time_request(
                    client, "GET", f"{self.base_url}/api/attendance/{test_subject_id}/dashboard",
                    headers={"Authorization": "Bearer test_token"}
                )
                self.record_result("attendance_dashboard", duration)
    
    async def test_concurrent_users(self):
        """Test system under concurrent user load"""
        print(f"Testing with {self.concurrent_users} concurrent users...")
        
        async def simulate_user_session(user_id: int):
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Simulate typical user workflow
                workflows = [
                    ("GET", "/api/subjects", "user_subjects"),
                    ("GET", "/api/profile", "user_profile"),
                ]
                
                for method, endpoint, test_name in workflows:
                    duration = await self.time_request(
                        client, method, f"{self.base_url}{endpoint}",
                        headers={"Authorization": f"Bearer user_{user_id}_token"}
                    )
                    self.record_result(f"concurrent_{test_name}", duration)
        
        # Run concurrent user sessions
        tasks = [simulate_user_session(i) for i in range(self.concurrent_users)]
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def test_cache_performance(self):
        """Test caching effectiveness"""
        print("Testing cache performance...")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # First request (cache miss)
            duration1 = await self.time_request(
                client, "GET", f"{self.base_url}/api/subjects",
                headers={"Authorization": "Bearer test_token"}
            )
            self.record_result("cache_miss", duration1)
            
            # Immediate second request (should be cache hit)
            duration2 = await self.time_request(
                client, "GET", f"{self.base_url}/api/subjects",
                headers={"Authorization": "Bearer test_token"}
            )
            self.record_result("cache_hit", duration2)
            
            print(f"Cache miss: {duration1*1000:.2f}ms, Cache hit: {duration2*1000:.2f}ms")
            if duration2 < duration1:
                print(f"Cache improvement: {((duration1-duration2)/duration1)*100:.1f}%")
    
    async def test_large_dataset_performance(self):
        """Test performance with larger datasets"""
        print("Testing large dataset performance...")
        
        # This would require setting up test data
        # For now, we'll simulate by making multiple requests
        async with httpx.AsyncClient(timeout=30.0) as client:
            for i in range(50):  # Simulate 50 attendance records
                duration = await self.time_request(
                    client, "GET", f"{self.base_url}/api/subjects",
                    headers={"Authorization": "Bearer test_token"}
                )
                self.record_result("large_dataset", duration)
    
    def generate_report(self):
        """Generate performance test report"""
        print("\n" + "="*60)
        print("PERFORMANCE TEST REPORT")
        print("="*60)
        
        for test_name, durations in self.results.items():
            if not durations:
                continue
                
            avg = statistics.mean(durations)
            median = statistics.median(durations)
            min_time = min(durations)
            max_time = max(durations)
            p95 = sorted(durations)[int(len(durations) * 0.95)] if len(durations) > 1 else avg
            
            print(f"\n{test_name.upper()}:")
            print(f"  Requests: {len(durations)}")
            print(f"  Average:  {avg:.2f}ms")
            print(f"  Median:   {median:.2f}ms")
            print(f"  Min:      {min_time:.2f}ms")
            print(f"  Max:      {max_time:.2f}ms")
            print(f"  95th %:   {p95:.2f}ms")
            
            # Performance thresholds
            if avg > 1000:
                print(f"  ⚠️  SLOW: Average response time exceeds 1 second")
            elif avg > 500:
                print(f"  ⚠️  WARNING: Average response time exceeds 500ms")
            else:
                print(f"  ✅ GOOD: Response time within acceptable range")
        
        # Overall system health
        print(f"\n{'='*60}")
        print("SYSTEM HEALTH SUMMARY")
        print(f"{'='*60}")
        
        all_times = []
        for durations in self.results.values():
            all_times.extend(durations)
        
        if all_times:
            overall_avg = statistics.mean(all_times)
            print(f"Overall average response time: {overall_avg:.2f}ms")
            
            if overall_avg < 200:
                print("🟢 EXCELLENT: System performing very well")
            elif overall_avg < 500:
                print("🟡 GOOD: System performing adequately")
            elif overall_avg < 1000:
                print("🟠 WARNING: System performance needs attention")
            else:
                print("🔴 CRITICAL: System performance is poor")
    
    async def run_all_tests(self):
        """Run all performance tests"""
        print("Starting performance tests...")
        start_time = time.time()
        
        try:
            await self.test_cache_performance()
            await self.test_database_queries()
            await self.test_concurrent_users()
            await self.test_large_dataset_performance()
        except Exception as e:
            print(f"Test execution error: {e}")
        
        total_time = time.time() - start_time
        print(f"\nAll tests completed in {total_time:.2f} seconds")
        
        self.generate_report()

async def main():
    parser = argparse.ArgumentParser(description='Performance testing for attendance system')
    parser.add_argument('--url', default='http://localhost:8000', help='Base URL for API')
    parser.add_argument('--users', type=int, default=10, help='Number of concurrent users to simulate')
    parser.add_argument('--output', help='Output file for results (JSON format)')
    
    args = parser.parse_args()
    
    tester = PerformanceTester(base_url=args.url, concurrent_users=args.users)
    await tester.run_all_tests()
    
    # Save results to file if specified
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(tester.results, f, indent=2)
        print(f"\nResults saved to {args.output}")

if __name__ == "__main__":
    asyncio.run(main())
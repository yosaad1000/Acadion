#!/usr/bin/env python3
"""
Comprehensive test runner for Google Calendar Class Scheduling feature.
This script runs all validation tests as specified in task 14.
"""

import subprocess
import sys
import os
import time
from typing import List, Dict, Any
import argparse


class TestRunner:
    """Test runner for comprehensive calendar validation"""
    
    def __init__(self):
        self.test_results = {}
        self.total_start_time = time.time()
    
    def run_test_suite(self, test_file: str, markers: str = None, description: str = None) -> Dict[str, Any]:
        """Run a specific test suite and return results"""
        print(f"\n{'='*60}")
        print(f"Running: {description or test_file}")
        print(f"{'='*60}")
        
        cmd = ["python", "-m", "pytest", f"tests/{test_file}", "-v"]
        
        if markers:
            cmd.extend(["-m", markers])
        
        # Add coverage if available
        try:
            import coverage
            cmd.extend(["--cov=app", "--cov-report=term-missing"])
        except ImportError:
            pass
        
        start_time = time.time()
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            )
            
            duration = time.time() - start_time
            
            # Parse results
            output_lines = result.stdout.split('\n')
            summary_line = None
            
            for line in reversed(output_lines):
                if 'passed' in line or 'failed' in line or 'error' in line:
                    summary_line = line.strip()
                    break
            
            test_result = {
                'success': result.returncode == 0,
                'duration': duration,
                'summary': summary_line or 'No summary available',
                'stdout': result.stdout,
                'stderr': result.stderr,
                'return_code': result.returncode
            }
            
            if test_result['success']:
                print(f"✅ PASSED: {test_result['summary']} ({duration:.2f}s)")
            else:
                print(f"❌ FAILED: {test_result['summary']} ({duration:.2f}s)")
                if result.stderr:
                    print(f"Error output: {result.stderr[:500]}...")
            
            return test_result
            
        except Exception as e:
            print(f"❌ ERROR running tests: {str(e)}")
            return {
                'success': False,
                'duration': time.time() - start_time,
                'summary': f'Error: {str(e)}',
                'stdout': '',
                'stderr': str(e),
                'return_code': -1
            }
    
    def run_all_tests(self):
        """Run all comprehensive test suites"""
        print("🚀 Starting Comprehensive Google Calendar Testing Suite")
        print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test suite definitions
        test_suites = [
            {
                'file': 'test_comprehensive_calendar_validation.py',
                'markers': None,
                'description': 'End-to-End Teacher Workflow Tests'
            },
            {
                'file': 'test_comprehensive_calendar_validation.py',
                'markers': 'integration',
                'description': 'Google Calendar API Integration Tests'
            },
            {
                'file': 'test_performance_load.py',
                'markers': 'performance',
                'description': 'Performance and Bulk Operation Tests'
            },
            {
                'file': 'test_comprehensive_calendar_validation.py',
                'markers': 'security',
                'description': 'Security and OAuth Token Tests'
            },
            {
                'file': 'test_api_endpoint_validation.py',
                'markers': 'api_validation',
                'description': 'API Endpoint Data Validation Tests'
            },
            {
                'file': 'test_api_endpoint_validation.py',
                'markers': 'security_validation',
                'description': 'Security Validation Tests'
            },
            {
                'file': 'test_comprehensive_calendar_validation.py',
                'markers': 'load',
                'description': 'Load and Concurrent Operation Tests'
            },
            {
                'file': 'test_comprehensive_calendar_validation.py',
                'markers': 'requirements',
                'description': 'Requirements Validation Tests'
            }
        ]
        
        # Run each test suite
        for suite in test_suites:
            result = self.run_test_suite(
                suite['file'],
                suite['markers'],
                suite['description']
            )
            self.test_results[suite['description']] = result
        
        # Generate summary report
        self.generate_summary_report()
    
    def run_specific_category(self, category: str):
        """Run tests for a specific category"""
        category_map = {
            'e2e': {
                'file': 'test_comprehensive_calendar_validation.py',
                'markers': 'not integration and not performance and not load and not security',
                'description': 'End-to-End Workflow Tests'
            },
            'integration': {
                'file': 'test_comprehensive_calendar_validation.py',
                'markers': 'integration',
                'description': 'Google Calendar API Integration Tests'
            },
            'performance': {
                'file': 'test_performance_load.py',
                'markers': 'performance',
                'description': 'Performance Tests'
            },
            'security': {
                'file': 'test_comprehensive_calendar_validation.py',
                'markers': 'security',
                'description': 'Security Tests'
            },
            'validation': {
                'file': 'test_api_endpoint_validation.py',
                'markers': 'api_validation or security_validation',
                'description': 'Data Validation Tests'
            },
            'load': {
                'file': 'test_comprehensive_calendar_validation.py',
                'markers': 'load',
                'description': 'Load Tests'
            },
            'requirements': {
                'file': 'test_comprehensive_calendar_validation.py',
                'markers': 'requirements',
                'description': 'Requirements Validation'
            }
        }
        
        if category not in category_map:
            print(f"❌ Unknown category: {category}")
            print(f"Available categories: {', '.join(category_map.keys())}")
            return
        
        suite = category_map[category]
        result = self.run_test_suite(
            suite['file'],
            suite['markers'],
            suite['description']
        )
        self.test_results[suite['description']] = result
        self.generate_summary_report()
    
    def generate_summary_report(self):
        """Generate a comprehensive summary report"""
        total_duration = time.time() - self.total_start_time
        
        print(f"\n{'='*80}")
        print("📊 COMPREHENSIVE TEST SUMMARY REPORT")
        print(f"{'='*80}")
        
        passed_suites = 0
        failed_suites = 0
        total_test_duration = 0
        
        for suite_name, result in self.test_results.items():
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            duration = result['duration']
            total_test_duration += duration
            
            if result['success']:
                passed_suites += 1
            else:
                failed_suites += 1
            
            print(f"{status} | {suite_name:<40} | {duration:>6.2f}s | {result['summary']}")
        
        print(f"\n{'='*80}")
        print(f"📈 OVERALL RESULTS:")
        print(f"   Total Test Suites: {len(self.test_results)}")
        print(f"   Passed: {passed_suites}")
        print(f"   Failed: {failed_suites}")
        print(f"   Success Rate: {passed_suites/len(self.test_results)*100:.1f}%")
        print(f"   Total Duration: {total_duration:.2f}s")
        print(f"   Test Execution Time: {total_test_duration:.2f}s")
        
        # Task 14 completion status
        print(f"\n{'='*80}")
        print("📋 TASK 14 COMPLETION STATUS:")
        print(f"{'='*80}")
        
        task_requirements = [
            ("End-to-end tests for teacher workflow", "End-to-End" in str(self.test_results)),
            ("Integration tests with Google Calendar API", "Integration" in str(self.test_results)),
            ("Performance tests for bulk operations", "Performance" in str(self.test_results)),
            ("Security tests for OAuth and tokens", "Security" in str(self.test_results)),
            ("Data validation tests for API endpoints", "Validation" in str(self.test_results)),
            ("Load tests for concurrent operations", "Load" in str(self.test_results)),
            ("Requirements validation", "Requirements" in str(self.test_results))
        ]
        
        completed_requirements = 0
        for requirement, completed in task_requirements:
            status = "✅" if completed else "❌"
            print(f"   {status} {requirement}")
            if completed:
                completed_requirements += 1
        
        completion_rate = completed_requirements / len(task_requirements) * 100
        print(f"\n   Task 14 Completion: {completion_rate:.1f}% ({completed_requirements}/{len(task_requirements)})")
        
        if completion_rate >= 100:
            print("\n🎉 TASK 14 COMPLETED SUCCESSFULLY!")
            print("   All comprehensive testing requirements have been implemented and validated.")
        elif completion_rate >= 80:
            print("\n⚠️  TASK 14 MOSTLY COMPLETED")
            print("   Most testing requirements implemented. Review failed components.")
        else:
            print("\n❌ TASK 14 INCOMPLETE")
            print("   Significant testing gaps remain. Additional work required.")
        
        # Recommendations
        print(f"\n{'='*80}")
        print("💡 RECOMMENDATIONS:")
        print(f"{'='*80}")
        
        if failed_suites > 0:
            print("   • Review and fix failing test suites")
            print("   • Check test environment setup and dependencies")
            print("   • Verify mock configurations and test data")
        
        if completion_rate < 100:
            print("   • Implement missing test categories")
            print("   • Add more comprehensive test coverage")
            print("   • Consider additional edge cases and scenarios")
        
        print("   • Run tests regularly during development")
        print("   • Integrate tests into CI/CD pipeline")
        print("   • Monitor performance metrics over time")
        
        return passed_suites == len(self.test_results)


def main():
    """Main entry point for test runner"""
    parser = argparse.ArgumentParser(description='Comprehensive Calendar Testing Suite')
    parser.add_argument(
        '--category',
        choices=['e2e', 'integration', 'performance', 'security', 'validation', 'load', 'requirements'],
        help='Run tests for a specific category only'
    )
    parser.add_argument(
        '--list-categories',
        action='store_true',
        help='List available test categories'
    )
    
    args = parser.parse_args()
    
    if args.list_categories:
        print("Available test categories:")
        categories = {
            'e2e': 'End-to-end workflow tests',
            'integration': 'Google Calendar API integration tests',
            'performance': 'Performance and bulk operation tests',
            'security': 'Security and OAuth token tests',
            'validation': 'API endpoint data validation tests',
            'load': 'Load and concurrent operation tests',
            'requirements': 'Requirements validation tests'
        }
        
        for category, description in categories.items():
            print(f"  {category:<12} - {description}")
        return
    
    runner = TestRunner()
    
    if args.category:
        runner.run_specific_category(args.category)
    else:
        runner.run_all_tests()


if __name__ == "__main__":
    main()
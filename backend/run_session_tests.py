#!/usr/bin/env python3
"""
Test runner for session management tests
Runs all session-related tests with proper coverage reporting
"""

import subprocess
import sys
import os
from pathlib import Path

def run_tests():
    """Run all session management tests"""
    
    # Get the backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Test files to run
    test_files = [
        "tests/test_session_service_unit.py",
        "tests/test_session_integration.py", 
        "tests/test_session_error_scenarios.py",
        "tests/test_session_endpoints.py"  # Existing test
    ]
    
    print("🧪 Running Session Management Test Suite")
    print("=" * 50)
    
    # Run each test file
    all_passed = True
    for test_file in test_files:
        if os.path.exists(test_file):
            print(f"\n📋 Running {test_file}...")
            try:
                result = subprocess.run([
                    sys.executable, "-m", "pytest", 
                    test_file, 
                    "-v",
                    "--tb=short"
                ], capture_output=True, text=True)
                
                if result.returncode == 0:
                    print(f"✅ {test_file} - PASSED")
                    print(result.stdout)
                else:
                    print(f"❌ {test_file} - FAILED")
                    print(result.stdout)
                    print(result.stderr)
                    all_passed = False
                    
            except Exception as e:
                print(f"❌ Error running {test_file}: {e}")
                all_passed = False
        else:
            print(f"⚠️  Test file not found: {test_file}")
    
    # Run with coverage if pytest-cov is available
    print(f"\n📊 Running tests with coverage...")
    try:
        coverage_result = subprocess.run([
            sys.executable, "-m", "pytest",
            "tests/test_session_service_unit.py",
            "tests/test_session_integration.py", 
            "tests/test_session_error_scenarios.py",
            "tests/test_session_endpoints.py",
            "--cov=app.services.session_service",
            "--cov=app.routers.sessions",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov",
            "-v"
        ], capture_output=True, text=True)
        
        print(coverage_result.stdout)
        if coverage_result.stderr:
            print("Coverage warnings:", coverage_result.stderr)
            
    except Exception as e:
        print(f"⚠️  Coverage reporting not available: {e}")
    
    # Summary
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All session management tests PASSED!")
        return 0
    else:
        print("💥 Some tests FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())
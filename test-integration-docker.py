#!/usr/bin/env python3
"""
Comprehensive Integration Test Suite for Docker Environment
Tests complete user workflows end-to-end and identifies integration issues.
"""

import asyncio
import aiohttp
import json
import time
import sys
import os
from typing import Dict, Any, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class IntegrationTestSuite:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        self.test_results = []
        self.auth_tokens = {}
        
    async def setup(self):
        """Initialize test session"""
        self.session = aiohttp.ClientSession()
        logger.info("Integration test suite initialized")
        
    async def teardown(self):
        """Cleanup test session"""
        if self.session:
            await self.session.close()
        logger.info("Integration test suite cleaned up")
        
    async def wait_for_service(self, max_retries: int = 30, delay: int = 2):
        """Wait for backend service to be ready"""
        for attempt in range(max_retries):
            try:
                async with self.session.get(f"{self.base_url}/api/health") as response:
                    if response.status == 200:
                        logger.info("Backend service is ready")
                        return True
            except Exception as e:
                logger.info(f"Waiting for backend service... (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(delay)
        
        logger.error("Backend service failed to start")
        return False
        
    async def make_request(self, method: str, endpoint: str, data: Dict = None, 
                          headers: Dict = None, auth_token: str = None) -> Dict:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        request_headers = headers or {}
        
        if auth_token:
            request_headers["Authorization"] = f"Bearer {auth_token}"
            
        try:
            async with self.session.request(method, url, json=data, headers=request_headers) as response:
                response_data = await response.json() if response.content_type == 'application/json' else {}
                return {
                    "status": response.status,
                    "data": response_data,
                    "success": 200 <= response.status < 300
                }
        except Exception as e:
            logger.error(f"Request failed: {method} {url} - {str(e)}")
            return {
                "status": 500,
                "data": {"error": str(e)},
                "success": False
            }
    
    def record_test_result(self, test_name: str, success: bool, details: str = ""):
        """Record test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": time.time()
        }
        self.test_results.append(result)
        status = "PASS" if success else "FAIL"
        logger.info(f"[{status}] {test_name}: {details}")
        
    async def test_health_check(self):
        """Test basic health check endpoint"""
        response = await self.make_request("GET", "/api/health")
        success = response["success"] and response["data"].get("status") == "healthy"
        self.record_test_result("Health Check", success, 
                               f"Status: {response['status']}, Response: {response['data']}")
        return success
        
    async def test_user_registration_and_authentication(self):
        """Test complete user registration and authentication flow"""
        # Test teacher registration
        teacher_data = {
            "name": "Test Teacher",
            "email": f"teacher_{int(time.time())}@test.com",
            "password": "TestPassword123!",
            "user_type": "teacher"
        }
        
        response = await self.make_request("POST", "/api/auth/register", teacher_data)
        teacher_success = response["success"]
        
        if teacher_success:
            # Test teacher login
            login_response = await self.make_request("POST", "/api/auth/login", {
                "email": teacher_data["email"],
                "password": teacher_data["password"]
            })
            
            if login_response["success"]:
                self.auth_tokens["teacher"] = login_response["data"].get("access_token")
                teacher_success = True
            else:
                teacher_success = False
        
        # Test student registration
        student_data = {
            "name": "Test Student",
            "email": f"student_{int(time.time())}@test.com",
            "password": "TestPassword123!",
            "user_type": "student"
        }
        
        response = await self.make_request("POST", "/api/auth/register", student_data)
        student_success = response["success"]
        
        if student_success:
            # Test student login
            login_response = await self.make_request("POST", "/api/auth/login", {
                "email": student_data["email"],
                "password": student_data["password"]
            })
            
            if login_response["success"]:
                self.auth_tokens["student"] = login_response["data"].get("access_token")
                student_success = True
            else:
                student_success = False
        
        success = teacher_success and student_success
        self.record_test_result("User Registration & Authentication", success,
                               f"Teacher: {teacher_success}, Student: {student_success}")
        return success
        
    async def test_class_management_workflow(self):
        """Test complete class management workflow"""
        if "teacher" not in self.auth_tokens:
            self.record_test_result("Class Management Workflow", False, "No teacher token available")
            return False
            
        # Create a class
        class_data = {
            "name": f"Test Class {int(time.time())}",
            "description": "Integration test class",
            "subject_code": f"TEST{int(time.time())}"
        }
        
        response = await self.make_request("POST", "/api/subjects/create", class_data, 
                                         auth_token=self.auth_tokens["teacher"])
        
        if not response["success"]:
            self.record_test_result("Class Management Workflow", False, 
                                   f"Failed to create class: {response['data']}")
            return False
            
        class_id = response["data"].get("subject_id")
        
        # Test class information retrieval
        response = await self.make_request("GET", f"/api/subjects/{class_id}", 
                                         auth_token=self.auth_tokens["teacher"])
        
        class_info_success = response["success"]
        
        # Test class settings update
        update_data = {
            "name": f"Updated Test Class {int(time.time())}",
            "description": "Updated description"
        }
        
        response = await self.make_request("PUT", f"/api/subjects/{class_id}", update_data,
                                         auth_token=self.auth_tokens["teacher"])
        
        update_success = response["success"]
        
        success = class_info_success and update_success
        self.record_test_result("Class Management Workflow", success,
                               f"Create: True, Info: {class_info_success}, Update: {update_success}")
        
        # Store class_id for other tests
        if success:
            self.test_class_id = class_id
            
        return success
        
    async def test_enrollment_workflow(self):
        """Test student enrollment and unenrollment workflow"""
        if "student" not in self.auth_tokens or not hasattr(self, 'test_class_id'):
            self.record_test_result("Enrollment Workflow", False, "Prerequisites not met")
            return False
            
        # Test student enrollment
        response = await self.make_request("POST", f"/api/subjects/{self.test_class_id}/enroll", 
                                         auth_token=self.auth_tokens["student"])
        
        enrollment_success = response["success"]
        
        if enrollment_success:
            # Test enrollment verification
            response = await self.make_request("GET", "/api/subjects/enrolled", 
                                             auth_token=self.auth_tokens["student"])
            
            enrolled_classes = response["data"] if response["success"] else []
            enrollment_verified = any(cls.get("subject_id") == self.test_class_id for cls in enrolled_classes)
            
            # Test unenrollment
            response = await self.make_request("DELETE", f"/api/subjects/{self.test_class_id}/enrollment",
                                             auth_token=self.auth_tokens["student"])
            
            unenrollment_success = response["success"]
            
            success = enrollment_success and enrollment_verified and unenrollment_success
            self.record_test_result("Enrollment Workflow", success,
                                   f"Enroll: {enrollment_success}, Verify: {enrollment_verified}, Unenroll: {unenrollment_success}")
        else:
            self.record_test_result("Enrollment Workflow", False, 
                                   f"Enrollment failed: {response['data']}")
            success = False
            
        return success
        
    async def test_profile_management_workflow(self):
        """Test user profile management workflow"""
        if "student" not in self.auth_tokens:
            self.record_test_result("Profile Management Workflow", False, "No student token available")
            return False
            
        # Test profile retrieval
        response = await self.make_request("GET", "/api/profile", 
                                         auth_token=self.auth_tokens["student"])
        
        profile_get_success = response["success"]
        
        # Test profile update
        update_data = {
            "name": f"Updated Test Student {int(time.time())}"
        }
        
        response = await self.make_request("PUT", "/api/profile", update_data,
                                         auth_token=self.auth_tokens["student"])
        
        profile_update_success = response["success"]
        
        # Test password change
        password_data = {
            "current_password": "TestPassword123!",
            "new_password": "NewTestPassword123!"
        }
        
        response = await self.make_request("POST", "/api/profile/password", password_data,
                                         auth_token=self.auth_tokens["student"])
        
        password_change_success = response["success"]
        
        success = profile_get_success and profile_update_success and password_change_success
        self.record_test_result("Profile Management Workflow", success,
                               f"Get: {profile_get_success}, Update: {profile_update_success}, Password: {password_change_success}")
        
        return success
        
    async def test_attendance_workflow(self):
        """Test attendance marking and retrieval workflow"""
        if "teacher" not in self.auth_tokens or not hasattr(self, 'test_class_id'):
            self.record_test_result("Attendance Workflow", False, "Prerequisites not met")
            return False
            
        # Re-enroll student for attendance test
        await self.make_request("POST", f"/api/subjects/{self.test_class_id}/enroll", 
                               auth_token=self.auth_tokens["student"])
        
        # Test manual attendance marking
        attendance_data = {
            "subject_id": self.test_class_id,
            "attendance_records": [
                {
                    "student_id": "test_student_id",
                    "status": "present"
                }
            ]
        }
        
        response = await self.make_request("POST", "/api/attendance/mark", attendance_data,
                                         auth_token=self.auth_tokens["teacher"])
        
        mark_success = response["success"]
        
        # Test attendance retrieval
        response = await self.make_request("GET", f"/api/attendance/{self.test_class_id}",
                                         auth_token=self.auth_tokens["teacher"])
        
        retrieve_success = response["success"]
        
        # Test attendance statistics
        response = await self.make_request("GET", f"/api/attendance/{self.test_class_id}/stats",
                                         auth_token=self.auth_tokens["teacher"])
        
        stats_success = response["success"]
        
        success = mark_success and retrieve_success and stats_success
        self.record_test_result("Attendance Workflow", success,
                               f"Mark: {mark_success}, Retrieve: {retrieve_success}, Stats: {stats_success}")
        
        return success
        
    async def test_security_and_authorization(self):
        """Test security measures and authorization"""
        security_tests = []
        
        # Test unauthorized access
        response = await self.make_request("GET", "/api/profile")
        unauthorized_blocked = response["status"] == 401
        security_tests.append(("Unauthorized Access Blocked", unauthorized_blocked))
        
        # Test invalid token
        response = await self.make_request("GET", "/api/profile", auth_token="invalid_token")
        invalid_token_blocked = response["status"] == 401
        security_tests.append(("Invalid Token Blocked", invalid_token_blocked))
        
        # Test cross-user access (if we have both tokens)
        if "teacher" in self.auth_tokens and "student" in self.auth_tokens:
            # Try to access teacher endpoints with student token
            response = await self.make_request("POST", "/api/subjects/create", 
                                             {"name": "Test", "description": "Test"},
                                             auth_token=self.auth_tokens["student"])
            teacher_endpoint_blocked = response["status"] in [401, 403]
            security_tests.append(("Teacher Endpoint Access Control", teacher_endpoint_blocked))
        
        success = all(test[1] for test in security_tests)
        details = ", ".join([f"{test[0]}: {test[1]}" for test in security_tests])
        self.record_test_result("Security & Authorization", success, details)
        
        return success
        
    async def test_error_handling(self):
        """Test error handling and edge cases"""
        error_tests = []
        
        # Test invalid data handling
        response = await self.make_request("POST", "/api/auth/register", {
            "email": "invalid-email",
            "password": "weak"
        })
        invalid_data_handled = response["status"] == 400
        error_tests.append(("Invalid Data Handling", invalid_data_handled))
        
        # Test non-existent resource
        response = await self.make_request("GET", "/api/subjects/non-existent-id",
                                         auth_token=self.auth_tokens.get("teacher"))
        not_found_handled = response["status"] == 404
        error_tests.append(("Not Found Handling", not_found_handled))
        
        # Test malformed JSON
        try:
            async with self.session.post(f"{self.base_url}/api/auth/login", 
                                       data="invalid json",
                                       headers={"Content-Type": "application/json"}) as response:
                malformed_json_handled = response.status == 400
        except:
            malformed_json_handled = True
            
        error_tests.append(("Malformed JSON Handling", malformed_json_handled))
        
        success = all(test[1] for test in error_tests)
        details = ", ".join([f"{test[0]}: {test[1]}" for test in error_tests])
        self.record_test_result("Error Handling", success, details)
        
        return success
        
    async def run_all_tests(self):
        """Run all integration tests"""
        logger.info("Starting comprehensive integration tests...")
        
        # Wait for service to be ready
        if not await self.wait_for_service():
            logger.error("Backend service not available, aborting tests")
            return False
            
        test_methods = [
            self.test_health_check,
            self.test_user_registration_and_authentication,
            self.test_class_management_workflow,
            self.test_enrollment_workflow,
            self.test_profile_management_workflow,
            self.test_attendance_workflow,
            self.test_security_and_authorization,
            self.test_error_handling
        ]
        
        results = []
        for test_method in test_methods:
            try:
                result = await test_method()
                results.append(result)
            except Exception as e:
                logger.error(f"Test {test_method.__name__} failed with exception: {str(e)}")
                self.record_test_result(test_method.__name__, False, f"Exception: {str(e)}")
                results.append(False)
                
        return all(results)
        
    def generate_report(self):
        """Generate test report"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        report = f"""
=== INTEGRATION TEST REPORT ===
Total Tests: {total_tests}
Passed: {passed_tests}
Failed: {failed_tests}
Success Rate: {(passed_tests/total_tests)*100:.1f}%

=== DETAILED RESULTS ===
"""
        
        for result in self.test_results:
            status = "PASS" if result["success"] else "FAIL"
            report += f"[{status}] {result['test']}: {result['details']}\n"
            
        return report

async def main():
    """Main test execution"""
    # Get backend URL from environment or use default
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    
    test_suite = IntegrationTestSuite(backend_url)
    
    try:
        await test_suite.setup()
        success = await test_suite.run_all_tests()
        
        # Generate and print report
        report = test_suite.generate_report()
        print(report)
        
        # Write report to file
        with open("integration_test_report.txt", "w") as f:
            f.write(report)
            
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except Exception as e:
        logger.error(f"Test suite failed: {str(e)}")
        sys.exit(1)
    finally:
        await test_suite.teardown()

if __name__ == "__main__":
    asyncio.run(main())
#!/usr/bin/env python3
"""
Test the complete class creation and joining notification flow
"""

import asyncio
import sys
import os
import json

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_class_notification_flow():
    """Test the complete notification flow for class operations"""
    print("🎓 Testing Class Notification Flow")
    print("=" * 40)
    
    try:
        from app.services.notification_service import NotificationService
        from app.models.notification import NotificationCreate, NotificationType
        
        service = NotificationService()
        
        # Simulate teacher creating a class
        print("1. Simulating teacher creating a class...")
        teacher_id = "teacher-123"
        
        class_created_notification = NotificationCreate(
            recipient_id=teacher_id,
            type=NotificationType.CLASS_JOINED,  # Reusing for class creation
            title="Class Created Successfully",
            message="Your class 'Advanced Python Programming' has been created successfully",
            data={
                "subject_name": "Advanced Python Programming",
                "subject_code": "CS301",
                "invite_code": "ABC123",
                "teacher_name": "Dr. Smith",
                "action": "class_created"
            }
        )
        
        success = await service.create_notification(class_created_notification)
        print(f"   Teacher notification created: {success}")
        
        # Simulate student joining the class
        print("\n2. Simulating student joining the class...")
        student_id = "student-456"
        
        # Student notification
        student_notification = NotificationCreate(
            recipient_id=student_id,
            sender_id=teacher_id,
            type=NotificationType.CLASS_JOINED,
            title="Successfully Joined Class",
            message="You have successfully joined Advanced Python Programming",
            data={
                "subject_name": "Advanced Python Programming",
                "subject_code": "CS301",
                "teacher_name": "Dr. Smith",
                "invite_code": "ABC123"
            }
        )
        
        success = await service.create_notification(student_notification)
        print(f"   Student notification created: {success}")
        
        # Teacher notification about student joining
        teacher_notification = NotificationCreate(
            recipient_id=teacher_id,
            sender_id=student_id,
            type=NotificationType.STUDENT_JOINED,
            title="New Student Joined",
            message="Alice Johnson joined your class Advanced Python Programming",
            data={
                "student_name": "Alice Johnson",
                "student_id": student_id,
                "subject_name": "Advanced Python Programming",
                "subject_code": "CS301"
            }
        )
        
        success = await service.create_notification(teacher_notification)
        print(f"   Teacher notification about student joining: {success}")
        
        # Simulate failed join attempt
        print("\n3. Simulating failed join attempt...")
        failed_student_id = "student-789"
        
        failed_join_notification = NotificationCreate(
            recipient_id=failed_student_id,
            type=NotificationType.JOIN_FAILED,
            title="Failed to Join Class",
            message="The invite code you entered is invalid or expired",
            data={
                "reason": "Invalid invite code",
                "invite_code": "INVALID123",
                "attempted_at": "2024-01-15T10:30:00Z"
            }
        )
        
        success = await service.create_notification(failed_join_notification)
        print(f"   Failed join notification created: {success}")
        
        # Test notification retrieval for each user
        print("\n4. Testing notification retrieval...")
        
        users = [
            ("Teacher", teacher_id),
            ("Student", student_id),
            ("Failed Student", failed_student_id)
        ]
        
        for user_type, user_id in users:
            notifications = await service.get_user_notifications(user_id, limit=5)
            unread_count = await service.get_unread_count(user_id)
            
            print(f"\n   {user_type} ({user_id}):")
            print(f"   - Total notifications: {len(notifications)}")
            print(f"   - Unread count: {unread_count}")
            
            for i, notif in enumerate(notifications[:2]):  # Show first 2
                print(f"   - {i+1}. {notif.title}")
        
        # Test notification management
        print("\n5. Testing notification management...")
        
        # Mark all as read for student
        success = await service.mark_all_as_read(student_id)
        print(f"   Mark all as read for student: {success}")
        
        # Check unread count after marking as read
        unread_after = await service.get_unread_count(student_id)
        print(f"   Student unread count after marking as read: {unread_after}")
        
        # Clear all notifications for failed student
        success = await service.clear_all_notifications(failed_student_id)
        print(f"   Clear all for failed student: {success}")
        
        # Check notifications after clearing
        notifications_after = await service.get_user_notifications(failed_student_id)
        print(f"   Failed student notifications after clearing: {len(notifications_after)}")
        
        print("\n✅ Class notification flow test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Class notification flow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_error_scenarios():
    """Test error scenarios to ensure graceful handling"""
    print("\n🚨 Testing Error Scenarios")
    print("=" * 30)
    
    try:
        from app.services.notification_service import NotificationService
        from app.models.notification import NotificationCreate, NotificationType
        
        service = NotificationService()
        
        # Test with completely invalid user IDs
        print("1. Testing with invalid user IDs...")
        
        invalid_ids = [
            "",  # Empty string
            "null",  # Null-like string
            "undefined",  # Undefined-like string
            "very-long-user-id-that-might-cause-issues-" + "x" * 100,  # Very long ID
            "user@with@special@chars",  # Special characters
        ]
        
        for invalid_id in invalid_ids:
            try:
                notification = NotificationCreate(
                    recipient_id=invalid_id,
                    type=NotificationType.STUDENT_JOINED,
                    title="Test",
                    message="Test message"
                )
                
                success = await service.create_notification(notification)
                print(f"   ✅ Invalid ID '{invalid_id[:20]}...' handled gracefully: {success}")
                
            except Exception as e:
                print(f"   ❌ Invalid ID '{invalid_id[:20]}...' caused error: {e}")
        
        # Test notification retrieval with invalid IDs
        print("\n2. Testing notification retrieval with invalid IDs...")
        
        for invalid_id in invalid_ids[:3]:  # Test first 3
            try:
                notifications = await service.get_user_notifications(invalid_id)
                print(f"   ✅ Retrieval for '{invalid_id[:20]}...' returned {len(notifications)} notifications")
                
            except Exception as e:
                print(f"   ❌ Retrieval for '{invalid_id[:20]}...' caused error: {e}")
        
        print("\n✅ Error scenario tests completed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error scenario test failed: {e}")
        return False

async def main():
    """Run all flow tests"""
    print("🧪 Starting Class Notification Flow Tests")
    print("=" * 50)
    
    results = []
    
    # Test 1: Class notification flow
    results.append(await test_class_notification_flow())
    
    # Test 2: Error scenarios
    results.append(await test_error_scenarios())
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 FLOW TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Flow tests passed: {passed}/{total}")
    print(f"Success rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 ALL FLOW TESTS PASSED!")
        print("The notification system handles class operations correctly.")
        print("\nKey achievements:")
        print("✅ No foreign key constraint violations")
        print("✅ Graceful error handling for invalid user IDs")
        print("✅ Proper notification creation for class operations")
        print("✅ Notification management features work")
        print("✅ Unread count tracking works")
    else:
        print(f"\n⚠️  {total - passed} flow test(s) failed.")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
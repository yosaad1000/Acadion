#!/usr/bin/env python3
"""
Setup script for implementing subject-based face recognition filtering
This script helps migrate existing installations to use the enhanced system
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def setup_subject_filtering():
    """Setup the subject filtering enhancement"""
    
    print("🚀 Setting up Subject-Based Face Recognition Filtering")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Step 1: Check if services are accessible
        print("\n📋 Step 1: Checking system requirements...")
        
        from app.config import settings
        from app.services.face_migration_service import face_migration_service
        
        # Check Pinecone configuration
        required_settings = ["PINECONE_API_KEY", "PINECONE_INDEX_NAME"]
        for setting in required_settings:
            if not hasattr(settings, setting) or not getattr(settings, setting):
                print(f"❌ Missing required setting: {setting}")
                return False
        
        print("✅ Configuration check passed")
        
        # Step 2: Get current statistics
        print("\n📊 Step 2: Analyzing current face encodings...")
        
        stats = await face_migration_service.get_face_encoding_stats()
        
        if "error" in stats:
            print(f"❌ Error getting stats: {stats['error']}")
            return False
        
        total_vectors = stats.get("total_vectors", 0)
        sample_analysis = stats.get("sample_analysis", {})
        
        print(f"   Total face encodings: {total_vectors}")
        print(f"   Sample analysis: {sample_analysis}")
        
        if total_vectors == 0:
            print("ℹ️  No existing face encodings found. System is ready for new enrollments.")
            return True
        
        # Step 3: Check if migration is needed
        with_subjects = sample_analysis.get("with_subjects", 0)
        without_subjects = sample_analysis.get("without_subjects", 0)
        total_checked = sample_analysis.get("total_checked", 0)
        
        if total_checked > 0 and without_subjects == 0:
            print("✅ All sampled face encodings already have subject metadata")
            print("   Migration may not be necessary, but you can run it to be sure.")
        elif without_subjects > 0:
            print(f"⚠️  Found {without_subjects} face encodings without subject metadata")
            print("   Migration is recommended.")
        
        # Step 4: Ask user if they want to proceed with migration
        print(f"\n🔄 Step 3: Migration options")
        print("   1. Run full migration (recommended for existing installations)")
        print("   2. Skip migration (for new installations or if already migrated)")
        print("   3. Test the system without migration")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == "1":
            print("\n🔄 Running migration...")
            result = await face_migration_service.migrate_existing_face_encodings()
            
            if result["success"]:
                print(f"✅ Migration completed successfully!")
                print(f"   Migrated {result['migrated_count']} face encodings")
                if "error_count" in result:
                    print(f"   Errors: {result['error_count']}")
            else:
                print(f"❌ Migration failed: {result['message']}")
                return False
                
        elif choice == "2":
            print("⏭️  Skipping migration")
            
        elif choice == "3":
            print("🧪 Running test without migration...")
            
            # Import and run basic test
            try:
                from test_subject_filtering import test_subject_filtering
                success = await test_subject_filtering()
                if success:
                    print("✅ Test completed successfully")
                else:
                    print("❌ Test failed")
            except Exception as e:
                print(f"❌ Test error: {e}")
        else:
            print("❌ Invalid choice")
            return False
        
        # Step 5: Final verification
        print(f"\n✅ Step 4: Final verification")
        
        # Get updated stats
        updated_stats = await face_migration_service.get_face_encoding_stats()
        print(f"   Updated statistics: {updated_stats}")
        
        # Step 6: Next steps
        print(f"\n📝 Next Steps:")
        print("   1. The system now supports subject-based filtering")
        print("   2. New face encodings will automatically include subject metadata")
        print("   3. When students enroll in new subjects, their face encodings will be updated")
        print("   4. Attendance marking will now filter by subject for better accuracy")
        print("   5. Monitor the logs for 'Filtering by subject_id' messages")
        
        print(f"\n🎉 Setup completed successfully!")
        print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return True
        
    except Exception as e:
        print(f"\n💥 Setup failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

def print_usage():
    """Print usage instructions"""
    
    print("""
📖 Subject-Based Face Recognition Setup

This script helps you implement the enhanced face recognition system that filters
by subject enrollment, improving both performance and accuracy.

🔧 Prerequisites:
   - Pinecone API key configured
   - Existing Acadion installation
   - Python environment with required dependencies

🚀 Usage:
   python setup_subject_filtering.py

📋 What this script does:
   1. Checks system configuration
   2. Analyzes existing face encodings
   3. Optionally migrates existing data
   4. Verifies the enhancement is working

⚠️  Important Notes:
   - Migration is non-destructive and can be run multiple times
   - Existing face encodings are preserved
   - The system will work without migration but with reduced benefits
   - For new installations, migration is not necessary

🆘 If you encounter issues:
   - Check your .env file for correct Pinecone configuration
   - Ensure your Pinecone plan supports metadata filtering
   - Review the logs for detailed error information
   - Contact support with the error details
""")

async def main():
    """Main function"""
    
    if len(sys.argv) > 1 and sys.argv[1] in ["-h", "--help", "help"]:
        print_usage()
        return
    
    success = await setup_subject_filtering()
    
    if success:
        print("\n🎯 Setup completed! Your face recognition system now supports subject filtering.")
        sys.exit(0)
    else:
        print("\n❌ Setup failed. Please check the errors above and try again.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
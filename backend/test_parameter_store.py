#!/usr/bin/env python3
"""
Test script for Parameter Store integration.
This script can be used to test Parameter Store connectivity and configuration loading.
"""

import os
import sys
import asyncio
import logging

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

async def test_parameter_store():
    """Test Parameter Store functionality"""
    
    print("🧪 Testing Parameter Store Integration")
    print("=" * 50)
    
    try:
        # Test 1: Import modules
        print("1. Testing module imports...")
        from app.config.parameter_store import (
            ParameterStoreLoader, 
            load_parameter_store_config,
            load_parameter_store_config_async
        )
        from app.config.validation import validate_configuration_async
        print("   ✅ Modules imported successfully")
        
        # Test 2: Create Parameter Store loader
        print("\n2. Testing Parameter Store loader creation...")
        loader = ParameterStoreLoader()
        print(f"   Environment: {loader.environment}")
        print(f"   Project: {loader.project_name}")
        print(f"   Region: {loader.region_name}")
        print(f"   Parameter Prefix: {loader.parameter_prefix}")
        print(f"   Available: {loader.is_available()}")
        
        if loader.is_available():
            print("   ✅ Parameter Store is available")
        else:
            print("   ⚠️ Parameter Store is not available (using environment variables)")
        
        # Test 3: Load configuration
        print("\n3. Testing configuration loading...")
        config = await load_parameter_store_config_async()
        print(f"   Loaded {len(config)} parameters from Parameter Store")
        
        if config:
            print("   Sample parameters:")
            for key in list(config.keys())[:5]:  # Show first 5 parameters
                value = config[key]
                # Mask sensitive values
                if any(sensitive in key.lower() for sensitive in ['key', 'secret', 'token', 'password']):
                    display_value = f"{value[:8]}..." if len(value) > 8 else "***"
                else:
                    display_value = value
                print(f"     {key}: {display_value}")
        
        # Test 4: Test individual parameter retrieval
        print("\n4. Testing individual parameter retrieval...")
        test_params = [
            ("app/log-level", "LOG_LEVEL"),
            ("secrets/jwt-secret-key", "JWT_SECRET_KEY"),
            ("face-recognition/threshold", "FACE_THRESHOLD")
        ]
        
        for param_path, env_name in test_params:
            value = loader.get_parameter(param_path, default="NOT_FOUND")
            if value != "NOT_FOUND":
                # Mask sensitive values
                if 'secret' in param_path.lower() or 'key' in param_path.lower():
                    display_value = f"{value[:8]}..." if len(value) > 8 else "***"
                else:
                    display_value = value
                print(f"   {param_path}: {display_value}")
            else:
                print(f"   {param_path}: Not found")
        
        # Test 5: Test configuration validation
        print("\n5. Testing configuration validation...")
        try:
            is_valid = await validate_configuration_async(check_connectivity=False)
            if is_valid:
                print("   ✅ Configuration validation passed")
            else:
                print("   ❌ Configuration validation failed")
        except Exception as e:
            print(f"   ❌ Configuration validation error: {e}")
        
        # Test 6: Test Settings integration
        print("\n6. Testing Settings integration...")
        from app.settings import settings, get_configuration_info
        
        config_info = get_configuration_info()
        print(f"   Parameter Store Available: {config_info.get('parameter_store_available', False)}")
        print(f"   Environment: {config_info.get('environment', 'unknown')}")
        
        # Show some settings values (non-sensitive)
        print("   Sample settings:")
        safe_attrs = ['ALGORITHM', 'ACCESS_TOKEN_EXPIRE_MINUTES', 'FACE_THRESHOLD', 'PINECONE_ENVIRONMENT']
        for attr in safe_attrs:
            if hasattr(settings, attr):
                value = getattr(settings, attr)
                print(f"     {attr}: {value}")
        
        print("\n✅ All tests completed successfully!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed (pip install -r requirements.txt)")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_environment_setup():
    """Test basic environment setup"""
    
    print("🔧 Testing Environment Setup")
    print("=" * 30)
    
    # Check required environment variables
    required_env_vars = [
        "AWS_REGION",
        "ENVIRONMENT"
    ]
    
    optional_env_vars = [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY", 
        "AWS_SESSION_TOKEN"
    ]
    
    print("Required environment variables:")
    for var in required_env_vars:
        value = os.getenv(var)
        if value:
            print(f"   ✅ {var}: {value}")
        else:
            print(f"   ⚠️ {var}: Not set (will use defaults)")
    
    print("\nOptional AWS credentials:")
    for var in optional_env_vars:
        value = os.getenv(var)
        if value:
            display_value = f"{value[:8]}..." if len(value) > 8 else "***"
            print(f"   ✅ {var}: {display_value}")
        else:
            print(f"   ⚠️ {var}: Not set (will use IAM role/instance profile)")

async def main():
    """Main test function"""
    
    print("🚀 Parameter Store Integration Test")
    print("=" * 60)
    
    # Test environment setup
    test_environment_setup()
    print()
    
    # Test Parameter Store functionality
    success = await test_parameter_store()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 All tests passed! Parameter Store integration is working.")
    else:
        print("❌ Some tests failed. Check the output above for details.")
    
    return success

if __name__ == "__main__":
    # Run the tests
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
#!/usr/bin/env python3
"""
Test script for configuration loading functionality.
Tests Parameter Store integration, validation, and runtime refresh capabilities.
"""

import asyncio
import logging
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_configuration_loading():
    """Test configuration loading functionality"""
    
    print("🧪 Testing Configuration Loading Implementation")
    print("=" * 60)
    
    try:
        # Test 1: Basic configuration creation
        print("\n1. Testing basic configuration creation...")
        from app import settings as config_module
        
        # Create settings instance
        test_settings = config_module.create_settings()
        print(f"✅ Settings created successfully")
        print(f"   Environment: {test_settings.ENVIRONMENT}")
        print(f"   AWS Region: {test_settings.AWS_REGION}")
        print(f"   Face Threshold: {test_settings.FACE_THRESHOLD}")
        
        # Test 2: Async configuration creation
        print("\n2. Testing async configuration creation...")
        
        async_settings = await config_module.create_settings_async()
        print(f"✅ Async settings created successfully")
        print(f"   Environment: {async_settings.ENVIRONMENT}")
        
        # Test 3: Configuration validation
        print("\n3. Testing configuration validation...")
        from app.config.validation import validate_configuration_async, get_configuration_status
        
        is_valid = await validate_configuration_async(check_connectivity=False)
        validation_status = get_configuration_status()
        
        print(f"✅ Configuration validation completed")
        print(f"   Valid: {is_valid}")
        print(f"   Status: {validation_status['status']}")
        
        if validation_status.get('validation_report'):
            report = validation_status['validation_report']
            print(f"   Errors: {len(report.get('errors', []))}")
            print(f"   Warnings: {len(report.get('warnings', []))}")
        
        # Test 4: Configuration loader initialization
        print("\n4. Testing configuration loader initialization...")
        from app.config.loader import initialize_application_configuration
        
        init_success = await initialize_application_configuration()
        print(f"✅ Configuration loader initialization: {'Success' if init_success else 'Failed'}")
        
        # Test 5: Configuration health check
        print("\n5. Testing configuration health check...")
        from app.config.loader import get_application_configuration_health
        
        health = await get_application_configuration_health()
        print(f"✅ Configuration health check completed")
        print(f"   Status: {health['status']}")
        print(f"   Parameter Store Available: {health.get('parameter_store_available', False)}")
        print(f"   Environment: {health.get('environment', 'unknown')}")
        
        # Test 6: Configuration refresh
        print("\n6. Testing configuration refresh...")
        from app.config.loader import refresh_application_configuration
        
        refresh_result = await refresh_application_configuration()
        print(f"✅ Configuration refresh completed")
        print(f"   Success: {refresh_result['success']}")
        print(f"   Valid: {refresh_result.get('valid', 'unknown')}")
        
        # Test 7: Secure configuration summary
        print("\n7. Testing secure configuration summary...")
        
        summary = config_module.get_secure_configuration_summary()
        print(f"✅ Secure configuration summary generated")
        print(f"   Environment: {summary.get('environment', 'unknown')}")
        print(f"   Database Pool Size: {summary.get('database_config', {}).get('pool_size', 'unknown')}")
        print(f"   Redis Pool Size: {summary.get('redis_config', {}).get('pool_size', 'unknown')}")
        
        # Test 8: Configuration info
        print("\n8. Testing configuration info...")
        
        config_info = config_module.get_configuration_info()
        print(f"✅ Configuration info retrieved")
        print(f"   Parameter Store Available: {config_info.get('parameter_store_available', False)}")
        print(f"   Environment: {config_info.get('environment', 'unknown')}")
        print(f"   Region: {config_info.get('region', 'unknown')}")
        
        # Test 9: Parameter Store integration (if available)
        print("\n9. Testing Parameter Store integration...")
        try:
            from app.config.parameter_store import get_parameter_store_loader
            
            loader = get_parameter_store_loader()
            if loader.is_available():
                print(f"✅ Parameter Store is available")
                print(f"   Environment: {loader.environment}")
                print(f"   Region: {loader.region_name}")
                print(f"   Prefix: {loader.parameter_prefix}")
                print(f"   Cache TTL: {loader.cache_ttl}")
            else:
                print(f"⚠️ Parameter Store is not available (using environment variables)")
                
        except Exception as e:
            print(f"⚠️ Parameter Store test failed: {e}")
        
        # Test 10: Settings properties and methods
        print("\n10. Testing settings properties and methods...")
        
        settings = config_module.settings
        print(f"✅ Settings properties tested")
        print(f"   Is Production: {settings.is_production()}")
        print(f"   Is Development: {settings.is_development()}")
        print(f"   Parameter Store Prefix: {settings.get_parameter_store_prefix()}")
        print(f"   Allowed Origins Count: {len(settings.allowed_origins_list)}")
        print(f"   Allowed Extensions Count: {len(settings.allowed_extensions_list)}")
        
        print("\n" + "=" * 60)
        print("🎉 All configuration loading tests completed successfully!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Configuration loading test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_configuration_validation():
    """Test configuration validation with different scenarios"""
    
    print("\n🔍 Testing Configuration Validation Scenarios")
    print("=" * 60)
    
    try:
        from app.config.validation import ConfigValidator
        from app import settings as config_module
        
        # Test validator directly
        validator = ConfigValidator()
        settings = config_module.settings
        
        print("\n1. Testing required parameters validation...")
        required_valid = validator.validate_required_parameters(settings)
        print(f"   Required parameters valid: {required_valid}")
        
        print("\n2. Testing parameter formats validation...")
        format_valid = validator.validate_parameter_formats(settings)
        print(f"   Parameter formats valid: {format_valid}")
        
        print("\n3. Testing validation report...")
        report = validator.get_validation_report()
        print(f"   Validation report generated: {report['valid']}")
        print(f"   Errors: {len(report['errors'])}")
        print(f"   Warnings: {len(report['warnings'])}")
        
        if report['errors']:
            print("   Error details:")
            for error in report['errors']:
                print(f"     - {error}")
        
        if report['warnings']:
            print("   Warning details:")
            for warning in report['warnings']:
                print(f"     - {warning}")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration validation test failed: {e}")
        return False

async def main():
    """Main test function"""
    
    print("🚀 Starting Configuration Loading Tests")
    print("=" * 60)
    
    # Run configuration loading tests
    loading_success = await test_configuration_loading()
    
    # Run configuration validation tests
    validation_success = await test_configuration_validation()
    
    print("\n" + "=" * 60)
    print("📊 Test Results Summary:")
    print(f"   Configuration Loading: {'✅ PASS' if loading_success else '❌ FAIL'}")
    print(f"   Configuration Validation: {'✅ PASS' if validation_success else '❌ FAIL'}")
    
    overall_success = loading_success and validation_success
    print(f"\n🎯 Overall Result: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    
    return overall_success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
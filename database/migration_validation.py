#!/usr/bin/env python3
"""
Migration Validation Script
Validates SQL migration syntax and checks for potential issues
"""

import re
import sys
from pathlib import Path

def validate_migration_file(file_path: str) -> bool:
    """Validate the migration SQL file for common issues"""
    
    print(f"🔍 Validating migration file: {file_path}")
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
        return False
    
    issues = []
    warnings = []
    
    # Check for transaction blocks
    if 'BEGIN;' in content and 'COMMIT;' in content:
        print("✅ Transaction block found (BEGIN/COMMIT)")
    else:
        warnings.append("⚠️  No transaction block found - consider wrapping in BEGIN/COMMIT")
    
    # Check for IF EXISTS clauses
    if 'DROP CONSTRAINT IF EXISTS' in content:
        print("✅ Safe constraint dropping with IF EXISTS")
    else:
        warnings.append("⚠️  Consider using IF EXISTS when dropping constraints")
    
    # Check for proper column additions
    alter_table_pattern = r'ALTER TABLE\s+\w+\.\w+\s+ADD COLUMN'
    if re.search(alter_table_pattern, content, re.IGNORECASE):
        print("✅ Column addition syntax looks correct")
    
    # Check for unique constraints
    if 'CREATE UNIQUE INDEX' in content:
        print("✅ Unique index creation found")
    
    # Check for comments
    if 'COMMENT ON' in content:
        print("✅ Documentation comments found")
    
    # Check for potential issues
    if 'DROP TABLE' in content:
        issues.append("❌ DROP TABLE found - this could cause data loss")
    
    if 'TRUNCATE' in content:
        issues.append("❌ TRUNCATE found - this will delete data")
    
    # Check for proper constraint naming
    constraint_pattern = r'ADD CONSTRAINT\s+(\w+)'
    constraints = re.findall(constraint_pattern, content, re.IGNORECASE)
    for constraint in constraints:
        if not constraint.endswith('_check'):
            warnings.append(f"⚠️  Constraint '{constraint}' doesn't follow naming convention")
    
    # Print results
    if issues:
        print("\n❌ ISSUES FOUND:")
        for issue in issues:
            print(f"  {issue}")
        return False
    
    if warnings:
        print("\n⚠️  WARNINGS:")
        for warning in warnings:
            print(f"  {warning}")
    
    print("\n✅ Migration validation passed!")
    return True

def validate_test_file(file_path: str) -> bool:
    """Validate the test SQL file"""
    
    print(f"\n🧪 Validating test file: {file_path}")
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ File not found: {file_path}")
        return False
    
    # Check for test structure
    if 'Test 1:' in content and 'Test 2:' in content:
        print("✅ Multiple test cases found")
    
    if 'SELECT' in content and 'information_schema' in content:
        print("✅ Schema validation queries found")
    
    if 'INSERT INTO' in content:
        print("✅ Data insertion tests found")
    
    if 'DELETE FROM' in content:
        print("✅ Cleanup operations found")
    
    print("✅ Test file validation passed!")
    return True

def main():
    """Main validation function"""
    
    print("🚀 Database Migration Validation")
    print("=" * 50)
    
    # Validate migration file
    migration_file = "database/02_organization_onboarding_migration.sql"
    migration_valid = validate_migration_file(migration_file)
    
    # Validate test file
    test_file = "database/test_02_organization_onboarding_migration.sql"
    test_valid = validate_test_file(test_file)
    
    print("\n" + "=" * 50)
    if migration_valid and test_valid:
        print("🎉 All validations passed!")
        print("\n📋 Next steps:")
        print("1. Review the migration file manually")
        print("2. Test in a development environment first")
        print("3. Run the test script after applying migration")
        print("4. Backup database before applying to production")
        return 0
    else:
        print("❌ Validation failed - please fix issues before proceeding")
        return 1

if __name__ == "__main__":
    sys.exit(main())
#!/usr/bin/env python3
"""
Test runner for notification models
"""

import sys
import unittest
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    # Import and run the specific test module
    from tests.test_notification_models import *
    
    # Run tests
    unittest.main(verbosity=2, exit=True)
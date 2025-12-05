---
inclusion: always
---

# Supabase Client Proxy Issue - Definitive Fix

## Problem
When creating new services that use the Supabase Python client, you may encounter this error:
```
Error creating Supabase client: __init__() got an unexpected keyword argument 'proxy'
```

## Root Cause
This happens because:
- System proxy environment variables (HTTP_PROXY, HTTPS_PROXY, etc.) interfere with Supabase client initialization
- The Supabase Python client doesn't expect proxy parameters in certain versions
- This is a persistent issue in development environments with proxy configurations
- **Environment variable clearing approaches often fail to resolve the underlying issue**

## ✅ RECOMMENDED SOLUTION: Use HTTP Requests Instead

**The most reliable solution is to avoid the Supabase Python client entirely and use direct HTTP requests like the existing LocalSupabase service.**

### Pattern to Follow:
```python
class YourService:
    def __init__(self):
        try:
            # Use direct HTTP requests like LocalSupabase to avoid proxy issues
            self.base_url = settings.SUPABASE_URL
            self.api_key = settings.SUPABASE_SERVICE_KEY
            self.headers = {
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            self._connection_healthy = True
            logger.info("✅ Service initialized successfully with HTTP client")
        except Exception as e:
            logger.error(f"❌ Error initializing service: {e}")
            self._connection_healthy = False
            raise Exception(f"Failed to initialize service: {e}")
    
    async def example_method(self):
        """Example of using HTTP requests instead of Supabase client"""
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/rest/v1/your_table",
                headers=self.headers,
                params={"column": f"eq.{value}"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"API Error: {response.status_code} - {response.text}")
                return []
```

### Benefits of HTTP Approach:
- ✅ **No proxy issues** - Works in all environments
- ✅ **Consistent with existing code** - Matches LocalSupabase pattern
- ✅ **More reliable** - Direct HTTP control
- ✅ **Better error handling** - Clear HTTP status codes
- ✅ **Easier debugging** - Can see exact requests/responses

## ⚠️ Fallback Solution (Less Reliable)
If you must use the Supabase Python client, try this pattern:

```python
def __init__(self):
    try:
        # Temporarily clear proxy environment variables
        import os
        proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
        original_values = {}
        for var in proxy_vars:
            if var in os.environ:
                original_values[var] = os.environ[var]
                del os.environ[var]
        
        try:
            self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        finally:
            # Restore original proxy environment variables
            for var, value in original_values.items():
                os.environ[var] = value
        
        self._connection_healthy = True
        logger.info("Service initialized successfully")
    except Exception as e:
        logger.error(f"Error creating Supabase client: {e}")
        self._connection_healthy = False
        raise Exception(f"Failed to initialize Supabase client: {e}")
```

**Note:** This approach may still fail in some environments.

## When to Apply
- **Always prefer HTTP requests** for new Supabase services
- Use the fallback only if HTTP approach is not suitable
- When you see the proxy parameter error in logs

## Files That Use HTTP Pattern
- `backend/app/services/local_supabase.py` ✅ (Original working example)
- `backend/app/services/notification_service.py` ✅ (Fixed with HTTP approach)

## Migration Guide
If you have existing services using Supabase client that are failing:

1. **Replace Supabase client calls** with HTTP requests
2. **Use httpx.AsyncClient()** for async operations
3. **Follow LocalSupabase patterns** for consistency
4. **Handle HTTP status codes** explicitly
5. **Test thoroughly** in your environment
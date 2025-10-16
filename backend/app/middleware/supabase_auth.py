from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from app.settings import settings
from app.services.local_supabase import LocalSupabase
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()
db = LocalSupabase()

async def get_current_user_supabase(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify Supabase JWT token and get user from our users table
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        logger.info(f"🔑 Received token: {credentials.credentials[:50]}...")
        
        # Decode the Supabase JWT token
        # Note: In production, you should verify the signature with Supabase's public key
        payload = jwt.decode(
            credentials.credentials, 
            key="", # Empty key for development
            algorithms=["HS256"],
            options={
                "verify_signature": False,  # For development only
                "verify_aud": False,        # Skip audience verification
                "verify_exp": False         # Skip expiration verification for now
            }
        )
        
        logger.info(f"🔓 JWT payload: {payload}")
        
        auth_user_id: str = payload.get("sub")
        if auth_user_id is None:
            logger.error("❌ No 'sub' field in JWT payload")
            raise credentials_exception
        
        logger.info(f"👤 Looking up user with auth_user_id: {auth_user_id}")
        
        # Get user from our users table using auth_user_id
        user_data = await db.get_user_by_auth_id(auth_user_id)
        if not user_data:
            logger.error(f"❌ No user found for auth_user_id: {auth_user_id}")
            raise credentials_exception
        
        logger.info(f"✅ Found user: {user_data.get('email')} with role: {user_data.get('active_role')}")
        
        # Convert to UserResponse format that the routers expect
        from app.models.user import UserResponse, UserType, AuthProvider
        
        user_response = UserResponse(
            user_id=user_data["user_id"],
            auth_user_id=user_data["auth_user_id"],  # Pass as proper field
            email=user_data["email"],
            name=user_data["name"],
            user_type=UserType(user_data.get("active_role", "student")),  # Use active_role from new schema
            auth_provider=AuthProvider(user_data.get("auth_provider", "email")),
            is_face_registered=user_data.get("is_face_registered", False),
            created_at=user_data["created_at"]
        )
        
        logger.info(f"✅ Returning user: {user_response.email} as {user_response.user_type}")
        return user_response
        
    except jwt.JWTError as e:
        logger.error(f"❌ JWT decode error: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"❌ Auth error: {e}")
        raise credentials_exception
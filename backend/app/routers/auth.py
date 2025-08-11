from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings
from app.models.user import UserCreate, UserLogin, UserResponse
from app.services.local_supabase import LocalSupabase
import logging
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = LocalSupabase()

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # Get user from database
        user_data = await db.get_user_by_id(user_id)
        if not user_data:
            raise credentials_exception
            
        return UserResponse(**user_data)
    except JWTError:
        raise credentials_exception

@router.post("/register", response_model=Token)
async def register(user: UserCreate):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await db.get_user_by_email(user.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password
        hashed_password = get_password_hash(user.password)
        
        # Create user data
        user_data = {
            "user_id": str(uuid.uuid4()),
            "email": user.email,
            "name": user.name,
            "user_type": user.user_type.value,
            "password_hash": hashed_password,
            "is_face_registered": False
        }
        
        # Insert user into database
        success = await db.create_user(user_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_data["user_id"], "user_type": user.user_type.value}, 
            expires_delta=access_token_expires
        )
        
        user_response = UserResponse(
            user_id=user_data["user_id"],
            email=user.email,
            name=user.name,
            user_type=user.user_type,
            is_face_registered=False,
            created_at=datetime.now()
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    """Login user"""
    try:
        # Get user from database
        user_data = await db.get_user_by_email(user.email)
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
        if not verify_password(user.password, user_data["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_data["user_id"], "user_type": user_data["user_type"]}, 
            expires_delta=access_token_expires
        )
        
        user_response = UserResponse(
            user_id=user_data["user_id"],
            email=user_data["email"],
            name=user_data["name"],
            user_type=user_data["user_type"],
            is_face_registered=user_data.get("is_face_registered", False),
            created_at=datetime.fromisoformat(user_data["created_at"].replace('Z', '+00:00')) if user_data.get("created_at") else datetime.now()
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.post("/logout")
async def logout():
    """Logout user"""
    return {"message": "Successfully logged out"}

@router.post("/register-face")
async def register_face(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """Register face for student (first-time setup)"""
    try:
        if current_user.user_type != "student":
            raise HTTPException(status_code=403, detail="Only students can register faces")
        
        if current_user.is_face_registered:
            raise HTTPException(status_code=400, detail="Face already registered")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Process face encoding with Pinecone
        from app.services.face_recognition import face_recognition_service
        result = face_recognition_service.process_student_photo(current_user.user_id, image_data)
        
        if result["success"]:
            # Update user's face registration status
            await db.update_user_face_status(current_user.user_id, True)
            
            return {
                "message": "Face registered successfully and stored in Pinecone",
                "user_id": current_user.user_id,
                "encoding_stored": True
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face registration error: {e}")
        raise HTTPException(status_code=500, detail="Face registration failed")
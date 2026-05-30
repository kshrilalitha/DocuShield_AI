from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, security

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if username or email already exists
    existing_user = db.query(models.User).filter(
        (models.User.username == user_in.username) | 
        (models.User.email == user_in.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or Email already registered"
        )
    
    # Create new user
    db_user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True,
        otp_secret="MOCK_OTP_SECRET_KEY"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Audit log
    db.add(models.AuditLog(
        username="System",
        event=f"User {db_user.username} registered with role {db_user.role}",
        status="Success"
    ))
    db.commit()
    
    return db_user

@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == credentials.username).first()
    if not user or not security.verify_password(credentials.password, user.hashed_password):
        # Audit log failure
        db.add(models.AuditLog(
            username=credentials.username,
            event="Failed login attempt - invalid credentials",
            status="Failure"
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Return JWT indicating OTP is required to complete authentication
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    
    # Log successful login (stage 1)
    db.add(models.AuditLog(
        username=user.username,
        event="User logged in - OTP challenge issued",
        status="Success"
    ))
    db.commit()

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        username=user.username,
        otp_required=True # Forces UI to present OTP sheet
    )

@router.post("/verify-otp", response_model=schemas.Token)
def verify_otp(otp_in: schemas.OTPVerify, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == otp_in.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Seed mock accepted OTP codes (e.g. 123456 is valid, or matches time calculation)
    if otp_in.otp_code != "123456":
        db.add(models.AuditLog(
            username=user.username,
            event="MFA OTP code validation failed",
            status="Failure"
        ))
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP code. Enter '123456' for demonstration.")
        
    user.otp_verified = True
    db.add(models.AuditLog(
        username=user.username,
        event="MFA OTP verification successful",
        status="Success"
    ))
    db.commit()
    
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    
    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        username=user.username,
        otp_required=False # Complete clearance granted
    )

@router.post("/forgot-password")
def forgot_password(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.add(models.AuditLog(
        username=username,
        event="Password reset requested. Simulating verification link.",
        status="Success"
    ))
    db.commit()
    return {"message": "Verification link sent to user email."}

# Admin endpoints
@router.get("/users")
def get_users(
    current_user: models.User = Depends(security.RoleChecker(["Admin"])),
    db: Session = Depends(get_db)
):
    users = db.query(models.User).all()
    return users

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int, 
    role: str,
    current_user: models.User = Depends(security.RoleChecker(["Admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_role = user.role
    user.role = role
    
    # Audit log
    db.add(models.AuditLog(
        username=current_user.username,
        event=f"Modified user {user.username} role from {old_role} to {role}",
        status="Success"
    ))
    db.commit()
    
    return {"message": f"Successfully updated user {user.username} to {role}"}

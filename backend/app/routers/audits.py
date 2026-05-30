from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas, security

router = APIRouter(prefix="/audits", tags=["audits"])

@router.get("/", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: models.User = Depends(security.RoleChecker(["Admin", "Auditor"])),
    db: Session = Depends(get_db)
):
    """
    Returns audit logs sorted by timestamp (newest first).
    Accessible only to Admin and Auditor roles.
    """
    logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs

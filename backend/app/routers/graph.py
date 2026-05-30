from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, security

router = APIRouter(prefix="/graph", tags=["graph"])

@router.get("/network")
def get_fraud_graph_network(
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Simulates Neo4j Graph Data Science query result.
    Returns nodes and edges mapping a loan fraud syndicate ring.
    """
    nodes = [
        # Applicants
        {"id": "A1", "label": "Ramesh Kumar", "type": "Applicant", "status": "Clean", "details": "Credit Score: 780 | Low Risk"},
        {"id": "A2", "label": "Sunita Kumar", "type": "Applicant", "status": "Critical", "details": "Linked to Tampered Salary Slip | Critical Risk"},
        {"id": "A3", "label": "Vijay Mallya", "type": "Applicant", "status": "Critical", "details": "Blacklisted Applicant | High Risk"},
        
        # Properties
        {"id": "P1", "label": "45 Residency Rd, Bng", "type": "Property", "status": "Suspicious", "details": "Shared by 3 independent loan requests"},
        {"id": "P2", "label": "12 M.G. Road, Bng", "type": "Property", "status": "Clean", "details": "Verified title deed"},
        
        # Loans
        {"id": "L1", "label": "Loan #5892 (INR 50L)", "type": "Loan", "status": "Clean", "details": "Status: Under Review"},
        {"id": "L2", "label": "Loan #9102 (INR 85L)", "type": "Loan", "status": "Critical", "details": "Status: Suspended (Tampering detected)"},
        {"id": "L3", "label": "Loan #2214 (INR 1.2Cr)", "type": "Loan", "status": "Critical", "details": "Status: Flagged"},
        
        # Branches
        {"id": "B1", "label": "Canara Bank - MG Road", "type": "Branch", "status": "Clean", "details": "Bangalore Urban"},
        {"id": "B2", "label": "Canara Bank - Indiranagar", "type": "Branch", "status": "Clean", "details": "Bangalore East"},
        
        # Co-applicants / Associates
        {"id": "C1", "label": "Karan Malhotra", "type": "Co-applicant", "status": "Suspicious", "details": "Linked to 4 defaulted loans"},
    ]
    
    links = [
        # Ramesh Kumar links
        {"source": "A1", "target": "L1", "relation": "APPLIED_FOR"},
        {"source": "A1", "target": "P1", "relation": "COLLATERAL_OWNER"},
        {"source": "L1", "target": "B1", "relation": "ORIGINATED_AT"},
        
        # Sunita Kumar links (Fraud ring)
        {"source": "A2", "target": "L2", "relation": "APPLIED_FOR"},
        {"source": "A2", "target": "P1", "relation": "COLLATERAL_OWNER"}, # Fraud Ring Signal: Sharing P1 property
        {"source": "A2", "target": "C1", "relation": "CO_APPLICANT"},
        {"source": "L2", "target": "B2", "relation": "ORIGINATED_AT"},
        
        # Vijay Mallya links (Blacklisted connections)
        {"source": "A3", "target": "L3", "relation": "APPLIED_FOR"},
        {"source": "A3", "target": "P1", "relation": "COLLATERAL_OWNER"}, # Fraud Ring Signal: Sharing P1 property
        {"source": "A3", "target": "C1", "relation": "CO_APPLICANT"}, # Shared co-applicant Karan Malhotra
        {"source": "L3", "target": "B1", "relation": "ORIGINATED_AT"},
    ]
    
    # Identify indicators
    fraud_alerts = [
        "Multiple independent applicants (Ramesh Kumar, Sunita Kumar, Vijay Mallya) sharing the exact same property collateral (45 Residency Rd, Bng).",
        "Co-applicant Karan Malhotra is linked to multiple critical risk loan applications across different branches (MG Road, Indiranagar)."
    ]
    
    return {
        "nodes": nodes,
        "links": links,
        "fraud_alerts": fraud_alerts
    }

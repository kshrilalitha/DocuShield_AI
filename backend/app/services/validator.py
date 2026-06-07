import re
from typing import List, Dict, Any

def perform_cross_validation(documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compares extracted fields (applicant name, address, property ID, and income) between multiple uploaded files.
    Identifies discrepancies dynamically.
    """
    report = {
        "name_match": True,
        "address_match": True,
        "property_match": True,
        "financial_match": True,
        "income_match": True, # Explicitly requested
        "discrepancies": []
    }
    
    if len(documents) < 2:
        return report

    doc1, doc2 = documents[0], documents[1]
    
    # 1. Compare Names
    name1 = doc1.get("applicant_name", "").strip().lower()
    name2 = doc2.get("applicant_name", "").strip().lower()
    if not name1 or not name2:
        report["name_match"] = False
        report["discrepancies"].append({
            "category": "Name Mismatch",
            "details": f"Missing applicant name in one or both documents ('{doc1.get('name')}' / '{doc2.get('name')}')."
        })
    elif name1 != name2 and name1 not in name2 and name2 not in name1:
        report["name_match"] = False
        report["discrepancies"].append({
            "category": "Name Mismatch",
            "details": f"Applicant name '{name1.upper()}' in {doc1.get('name')} does not match '{name2.upper()}' in {doc2.get('name')}."
        })

    # 2. Compare Addresses
    addr1 = doc1.get("property_address", "").strip().lower()
    addr2 = doc2.get("property_address", "").strip().lower()
    # Normalize address string formatting
    clean_addr1 = re.sub(r'[\s,\-\.]', '', addr1)
    clean_addr2 = re.sub(r'[\s,\-\.]', '', addr2)
    
    if not clean_addr1 or not clean_addr2:
        report["address_match"] = False
        report["discrepancies"].append({
            "category": "Address Mismatch",
            "details": f"Missing property address in one or both documents."
        })
    elif clean_addr1 != clean_addr2 and clean_addr1 not in clean_addr2 and clean_addr2 not in clean_addr1:
        report["address_match"] = False
        report["discrepancies"].append({
            "category": "Address Mismatch",
            "details": f"Property address listed in {doc1.get('name')} ('{doc1.get('property_address')}') is different from the address registered in {doc2.get('name')} ('{doc2.get('property_address')}')."
        })

    # 3. Compare Property IDs
    prop1 = doc1.get("property_id", "").strip().lower()
    prop2 = doc2.get("property_id", "").strip().lower()
    if prop1 and prop2 and prop1 != prop2:
        report["property_match"] = False
        report["discrepancies"].append({
            "category": "Property ID Mismatch",
            "details": f"Property ID '{prop1.upper()}' in {doc1.get('name')} does not match '{prop2.upper()}' in {doc2.get('name')}."
        })

    # 4. Compare Financials (ITR vs Salary Slips / Bank statement closing balance)
    inc1 = doc1.get("monthly_income", 0.0)
    inc2 = doc2.get("monthly_income", 0.0)
    
    if inc1 > 0.0 and inc2 > 0.0:
        # Check for significant difference (> 10% discrepancy)
        diff_ratio = abs(inc1 - inc2) / max(inc1, 1.0)
        if diff_ratio > 0.10:
            report["financial_match"] = False
            report["income_match"] = False
            report["discrepancies"].append({
                "category": "Financial Mismatch",
                "details": f"Monthly income in {doc1.get('name')} (INR {inc1:,.2f}) deviates by {diff_ratio*100:.1f}% from {doc2.get('name')} (INR {inc2:,.2f})."
            })
    elif inc1 != inc2:  # one is zero and one is non-zero
        report["financial_match"] = False
        report["income_match"] = False
        report["discrepancies"].append({
            "category": "Financial Mismatch",
            "details": f"Extracted monthly incomes do not match (INR {inc1:,.2f} vs INR {inc2:,.2f})."
        })

    return report

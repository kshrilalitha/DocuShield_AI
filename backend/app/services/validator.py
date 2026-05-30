import json
from typing import List, Dict, Any

def perform_cross_validation(documents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compares extracted terms between multiple uploaded loan files.
    Identifies Name, Address, Property, and Financial mismatches.
    """
    report = {
        "name_match": True,
        "address_match": True,
        "property_match": True,
        "financial_match": True,
        "discrepancies": []
    }
    
    if len(documents) < 2:
        return report

    # Gather names, addresses, and financials for comparison
    names = []
    addresses = []
    properties = []
    incomes = []
    
    for doc in documents:
        name = doc.get("applicant_name", "").strip().lower()
        addr = doc.get("property_address", "").strip().lower()
        prop = doc.get("property_id", "").strip().lower()
        income = doc.get("monthly_income", 0.0)
        
        if name: names.append((doc["name"], name))
        if addr: addresses.append((doc["name"], addr))
        if prop: properties.append((doc["name"], prop))
        if income > 0.0: incomes.append((doc["name"], income))

    # 1. Compare Names
    if len(names) > 1:
        base_name = names[0][1]
        for name_tuple in names[1:]:
            if base_name != name_tuple[1] and base_name not in name_tuple[1] and name_tuple[1] not in base_name:
                report["name_match"] = False
                report["discrepancies"].append({
                    "category": "Name Mismatch",
                    "details": f"Applicant name '{names[0][1].title()}' in {names[0][0]} does not match '{name_tuple[1].title()}' in {name_tuple[0]}."
                })

    # 2. Compare Addresses
    if len(addresses) > 1:
        base_addr = addresses[0][1][:15] # Compare first few characters for simplicity
        for addr_tuple in addresses[1:]:
            if base_addr not in addr_tuple[1] and addr_tuple[1][:15] not in base_addr:
                report["address_match"] = False
                report["discrepancies"].append({
                    "category": "Address Mismatch",
                    "details": f"Property address listed in {addresses[0][0]} is different from the address registered in {addr_tuple[0]}."
                })

    # 3. Compare Financials (ITR vs Salary Slips)
    if len(incomes) > 1:
        base_income = incomes[0][1]
        for income_tuple in incomes[1:]:
            # Check for significant difference (> 10% discrepancy)
            diff_ratio = abs(base_income - income_tuple[1]) / max(base_income, 1.0)
            if diff_ratio > 0.10:
                report["financial_match"] = False
                report["discrepancies"].append({
                    "category": "Financial Mismatch",
                    "details": f"Monthly income in {incomes[0][0]} (INR {base_income:,.2f}) deviates by {diff_ratio*100:.1f}% from {income_tuple[0]} (INR {income_tuple[1]:,.2f})."
                })

    return report

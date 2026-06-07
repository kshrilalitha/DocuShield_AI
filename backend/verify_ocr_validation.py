import sys
import os
import json

# Ensure backend directory is in path
sys.path.append(os.path.abspath("backend"))

# Import PyTorch first to prevent DLL loading WinError 127
try:
    import torch
except ImportError:
    pass

from app.services import ocr, validator

def run_test():
    print("=" * 60)
    print("      DOCUSHIELD AI - OCR & CROSS-VALIDATION VERIFICATION      ")
    print("=" * 60)

    # Resolve absolute paths relative to project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    genuine_path = os.path.join(project_root, "document_forensics", "test_files", "sample_genuine.jpg")
    print(f"\n[Test] Running OCR on Genuine Image: {genuine_path}")
    gen_ocr = ocr.analyze_ocr_layout(genuine_path)
    gen_text = gen_ocr["extracted_text"]
    gen_fields = ocr.extract_fields_from_text(gen_text)
    
    print("\n[Test] Genuine Extracted Text Preview:")
    print(gen_text)
    print("\n[Test] Genuine Extracted Fields:")
    print(json.dumps(gen_fields, indent=4))

    # 2. OCR extract and parse fields for tampered file
    tampered_path = os.path.join(project_root, "document_forensics", "test_files", "sample_tampered.jpg")
    print(f"\n[Test] Running OCR on Tampered Image: {tampered_path}")
    tamp_ocr = ocr.analyze_ocr_layout(tampered_path)
    tamp_text = tamp_ocr["extracted_text"]
    tamp_fields = ocr.extract_fields_from_text(tamp_text)
    
    print("\n[Test] Tampered Extracted Text Preview:")
    print(tamp_text)
    print("\n[Test] Tampered Extracted Fields:")
    print(json.dumps(tamp_fields, indent=4))

    # 3. Perform Cross-Document Validation
    print("\n[Test] Running Cross-Document Validation...")
    doc1_payload = {
        "name": "sample_genuine.jpg",
        "applicant_name": gen_fields["applicant_name"],
        "property_address": gen_fields["address"],
        "property_id": gen_fields["property_id"],
        "monthly_income": gen_fields["monthly_income"]
    }
    
    doc2_payload = {
        "name": "sample_tampered.jpg",
        "applicant_name": tamp_fields["applicant_name"],
        "property_address": tamp_fields["address"],
        "property_id": tamp_fields["property_id"],
        "monthly_income": tamp_fields["monthly_income"]
    }

    report = validator.perform_cross_validation([doc1_payload, doc2_payload])
    print("\n[Test] Cross-Validation Report:")
    print(json.dumps(report, indent=4))

    # 4. Check assertion
    print("\n[Test] Assertions Checklist:")
    
    # Check name match
    if gen_fields["applicant_name"] == tamp_fields["applicant_name"]:
        print("  - Name comparison check: PASSED")
    else:
        print("  - Name comparison check: WARNING (Names differ)")
        
    # Check income mismatch
    if not report["income_match"]:
        print("  - Income mismatch check: PASSED (Correctly flagged mismatch)")
    else:
        print("  - Income mismatch check: FAILED (Failed to flag income mismatch)")
        
    print("=" * 60)

if __name__ == "__main__":
    run_test()

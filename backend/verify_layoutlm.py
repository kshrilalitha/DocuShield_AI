import sys
import os
import json

# Ensure backend directory is in path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# Import PyTorch first to prevent DLL loading WinError 127
try:
    import torch
except ImportError:
    pass

from app.services import ocr, layoutlmv3_service, validator
from app.database import SessionLocal, Base, engine, run_db_migrations
from app import models

def run_test():
    print("=" * 70)
    print("      DOCUSHIELD AI - LAYOUTLMV3 INTEGRATION VERIFICATION      ")
    print("=" * 70)

    # 1. Run migrations to ensure layoutlm_intelligence column is created
    print("[Test 1/4] Running DB migrations for layoutlm_intelligence column...")
    Base.metadata.create_all(bind=engine)
    run_db_migrations()
    print("-> DB Migrations completed.")

    # 2. Extract OCR layouts for testing LayoutLMv3 input
    project_root = os.path.dirname(os.path.abspath(__file__))
    genuine_path = os.path.join(project_root, "..", "document_forensics", "test_files", "sample_genuine.jpg")
    tampered_path = os.path.join(project_root, "..", "document_forensics", "test_files", "sample_tampered.jpg")

    print(f"\n[Test 2/4] Testing LayoutLMv3 extraction on Genuine Image: {genuine_path}")
    gen_ocr = ocr.analyze_ocr_layout(genuine_path)
    gen_intel = layoutlmv3_service.extract_document_intelligence(genuine_path, gen_ocr["text_blocks"])
    
    print("\n[Test] Genuine LayoutLMv3 Extraction Output:")
    print(json.dumps(gen_intel, indent=4))
    
    # Assertions on Genuine fields
    assert "applicant_name" in gen_intel
    assert "address" in gen_intel
    assert "income" in gen_intel
    assert "property_id" in gen_intel
    assert "document_type" in gen_intel
    print("-> Genuine extraction field assertions passed.")

    print(f"\n[Test 2b/4] Testing LayoutLMv3 extraction on Tampered Image: {tampered_path}")
    tamp_ocr = ocr.analyze_ocr_layout(tampered_path)
    tamp_intel = layoutlmv3_service.extract_document_intelligence(tampered_path, tamp_ocr["text_blocks"])
    
    print("\n[Test] Tampered LayoutLMv3 Extraction Output:")
    print(json.dumps(tamp_intel, indent=4))
    
    # Assertions on Tampered fields
    assert "applicant_name" in tamp_intel
    assert "address" in tamp_intel
    assert "income" in tamp_intel
    assert "property_id" in tamp_intel
    assert "document_type" in tamp_intel
    print("-> Tampered extraction field assertions passed.")

    # 3. Test Database storage & retrieval
    print("\n[Test 3/4] Verifying database schema & insert/retrieve operations...")
    db = SessionLocal()
    try:
        # Create a test document record
        test_doc = models.Document(
            file_name="test_layoutlm.png",
            file_type="PNG",
            file_path="media/uploads/test_layoutlm.png",
            file_hash="test_layoutlm_hash_12345",
            fraud_score=10.0,
            confidence_score=90.0,
            risk_level="Low",
            layoutlm_intelligence=json.dumps(gen_intel)
        )
        # Delete if already exists
        existing = db.query(models.Document).filter(models.Document.file_hash == "test_layoutlm_hash_12345").first()
        if existing:
            db.delete(existing)
            db.commit()
            
        db.add(test_doc)
        db.commit()
        db.refresh(test_doc)
        
        # Read it back and parse column
        retrieved = db.query(models.Document).filter(models.Document.id == test_doc.id).first()
        assert retrieved.layoutlm_intelligence is not None
        parsed_intel = json.loads(retrieved.layoutlm_intelligence)
        print("Retrieved layoutlm_intelligence:", json.dumps(parsed_intel, indent=2))
        assert parsed_intel["applicant_name"]["value"] == gen_intel["applicant_name"]["value"]
        
        # Clean up
        db.delete(retrieved)
        db.commit()
        print("-> Database serialization & retrieval passed.")
    except Exception as e:
        print(f"-> Database test FAILED: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

    # 4. Verify Integration with validator.py (using simulated documents payload)
    print("\n[Test 4/4] Verifying validator.py cross-validation integration...")
    doc1_payload = {
        "name": "sample_genuine.jpg",
        "applicant_name": gen_intel["applicant_name"]["value"],
        "property_address": gen_intel["address"]["value"],
        "property_id": gen_intel["property_id"]["value"],
        "monthly_income": gen_intel["income"]["value"]
    }
    
    doc2_payload = {
        "name": "sample_tampered.jpg",
        "applicant_name": tamp_intel["applicant_name"]["value"],
        "property_address": tamp_intel["address"]["value"],
        "property_id": tamp_intel["property_id"]["value"],
        "monthly_income": tamp_intel["income"]["value"]
    }

    report = validator.perform_cross_validation([doc1_payload, doc2_payload])
    print("\n[Test] Cross-Validation Report Using LayoutLMv3 outputs:")
    print(json.dumps(report, indent=4))
    
    # Assert income mismatch is flagged
    if not report["income_match"]:
        print("-> Validator test passed (income mismatch correctly identified).")
    else:
        print("-> Validator test FAILED (failed to flag income mismatch).")
        assert False

    print("\n" + "=" * 70)
    print("      ALL LAYOUTLMV3 INTEGRATION TESTS COMPLETED SUCCESSFULLY!      ")
    print("=" * 70)

if __name__ == "__main__":
    run_test()

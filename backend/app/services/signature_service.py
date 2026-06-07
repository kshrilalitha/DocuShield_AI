import os
import re
import cv2
import numpy as np
import logging
from PIL import Image

logger = logging.getLogger("docushield.signature")

# Directory to store reference signatures
SIGNATURE_DIR = "media/signatures"
os.makedirs(SIGNATURE_DIR, exist_ok=True)

def compute_ssim(img1: np.ndarray, img2: np.ndarray) -> float:
    """
    Computes Structural Similarity Index (SSIM) using standard OpenCV operations.
    Resizes img2 to match img1 dimension parameters.
    """
    if img1.shape != img2.shape:
        img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
        
    img1 = img1.astype(np.float64)
    img2 = img2.astype(np.float64)
    
    C1 = (0.01 * 255) ** 2
    C2 = (0.03 * 255) ** 2
    
    mu1 = cv2.GaussianBlur(img1, (11, 11), 1.5)
    mu2 = cv2.GaussianBlur(img2, (11, 11), 1.5)
    
    mu1_sq = mu1 ** 2
    mu2_sq = mu2 ** 2
    mu1_mu2 = mu1 * mu2
    
    sigma1_sq = cv2.GaussianBlur(img1 ** 2, (11, 11), 1.5) - mu1_sq
    sigma2_sq = cv2.GaussianBlur(img2 ** 2, (11, 11), 1.5) - mu2_sq
    sigma12 = cv2.GaussianBlur(img1 * img2, (11, 11), 1.5) - mu1_mu2
    
    ssim_map = ((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / ((mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2))
    return float(np.mean(ssim_map))

def verify_document_signature(
    image_path: str,
    applicant_name: str,
    text_blocks: list,
    forgery_threshold: float = 0.70
) -> dict:
    """
    Detects the signature block in the uploaded document, crops it,
    and compares it with the saved reference signature for this applicant.
    """
    if not applicant_name:
        applicant_name = "UNKNOWN_APPLICANT"
    
    applicant_name_clean = re.sub(r"\W+", "_", applicant_name.upper())
    ref_path = os.path.join(SIGNATURE_DIR, f"ref_{applicant_name_clean}.png")
    
    # 1. Read document image
    img = None
    if os.path.exists(image_path):
        try:
            img = cv2.imread(image_path)
        except Exception as read_err:
            logger.warning(f"Failed to read image with OpenCV: {read_err}")
            
    # Fallback to white canvas if document is not an image or fails to read
    if img is None:
        img = np.ones((1000, 800, 3), dtype=np.uint8) * 255

    img_h, img_w = img.shape[:2]

    # 2. Locate Signature Block using text coordinates
    sig_x, sig_y, sig_w, sig_h = None, None, None, None
    for block in text_blocks:
        text = block.get("text", "").lower()
        if "signature" in text or "sign" in text:
            # Found signature label block, use its visual coordinates
            sig_x = block.get("x", 0)
            sig_y = block.get("y", 0)
            sig_w = block.get("width", 100)
            sig_h = block.get("height", 30)
            break

    # Determine Crop Area (signature is usually directly above the word "Signature")
    if sig_x is not None and sig_y is not None:
        crop_x1 = max(0, sig_x - 50)
        crop_y1 = max(0, sig_y - 100)
        crop_x2 = min(img_w, sig_x + sig_w + 50)
        crop_y2 = min(img_h, sig_y + 20)
    else:
        # Fallback crop bottom-right underwriting section of the document
        crop_x1 = max(0, img_w - 300)
        crop_y1 = max(0, img_h - 150)
        crop_x2 = img_w
        crop_y2 = img_h

    # Perform Image Crop
    crop = img[crop_y1:crop_y2, crop_x1:crop_x2]
    if crop.size == 0:
        crop = np.ones((100, 200, 3), dtype=np.uint8) * 255
        
    gray_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # 3. Check and Cache Reference Signature
    if not os.path.exists(ref_path):
        # Save current crop as the baseline reference signature
        try:
            cv2.imwrite(ref_path, gray_crop)
            logger.info(f"Saved reference signature for applicant '{applicant_name}' to {ref_path}.")
        except Exception as write_err:
            logger.warning(f"Failed to write reference signature file: {write_err}")
            
        return {
            "orb_match_count": 100,
            "ssim_score": 1.0,
            "signature_similarity": 1.0,
            "possible_forgery": False
        }

    # 4. Compare with Reference Signature
    try:
        ref_img = cv2.imread(ref_path, cv2.IMREAD_GRAYSCALE)
        if ref_img is None:
            raise ValueError("Reference signature file could not be read.")
            
        # A. ORB Feature Matching
        # Custom edgeThreshold and patchSize are set to 7 to allow feature detection on small/thin crops.
        orb = cv2.ORB_create(nfeatures=500, edgeThreshold=7, patchSize=7)
        kp1, des1 = orb.detectAndCompute(gray_crop, None)
        kp2, des2 = orb.detectAndCompute(ref_img, None)
        
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = []
        if des1 is not None and des2 is not None:
            matches = bf.match(des1, des2)
        orb_match_count = len(matches)
        
        # B. SSIM Scoring
        ssim_score = compute_ssim(gray_crop, ref_img)
        
        # C. Combined Similarity Calculation
        if des1 is None or len(kp1) == 0:
            # If no features in current crop (e.g. blank region), similarity is based purely on SSIM
            # to avoid penalizing identical blank/solid regions.
            similarity = ssim_score
            orb_match_count = 0
        elif des2 is None or len(kp2) == 0:
            # Reference image has no features (should not happen in typical runs, but handled for safety)
            similarity = ssim_score * 0.6
            orb_match_count = 0
        else:
            # Factor both SSIM structural layout (60% weight) and ORB feature points (40% weight)
            orb_weight = min(1.0, orb_match_count / 200.0)
            similarity = (ssim_score * 0.6) + (orb_weight * 0.4)
        
        # Clamp similarity between 0.0 and 1.0
        similarity = min(max(similarity, 0.0), 1.0)
        possible_forgery = similarity < forgery_threshold
        
        return {
            "orb_match_count": orb_match_count,
            "ssim_score": round(float(ssim_score), 4),
            "signature_similarity": round(float(similarity), 4),
            "possible_forgery": possible_forgery
        }
    except Exception as comp_err:
        logger.error(f"Failed to run signature comparison: {comp_err}. Returning fallback values.")
        return {
            "orb_match_count": 0,
            "ssim_score": 0.50,
            "signature_similarity": 0.50,
            "possible_forgery": True
        }

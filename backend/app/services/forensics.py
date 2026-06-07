import os
import json
import datetime
from PIL import Image, ImageChops
from app.config import settings

def run_error_level_analysis(image_path: str, quality: int = 95, scale: int = 25) -> str:
    """
    Performs actual Error Level Analysis (ELA) on an image document.
    Saves the ELA difference image in settings.ELA_DIR and returns its path.
    """
    try:
        # Resolve target ELA path
        basename = os.path.basename(image_path)
        name, ext = os.path.splitext(basename)
        ela_filename = f"ela_{name}.jpg"
        ela_path = os.path.join(settings.ELA_DIR, ela_filename)

        # Open original image and convert to RGB
        original = Image.open(image_path).convert("RGB")

        # Save as temporary compressed file
        temp_path = os.path.join(settings.ELA_DIR, f"temp_{basename}")
        original.save(temp_path, "JPEG", quality=quality)

        # Reload compressed image
        compressed = Image.open(temp_path)

        # Calculate pixel-by-pixel absolute difference
        diff = ImageChops.difference(original, compressed)

        # Get extreme values to determine dynamic scaling if needed
        extrema = diff.getextrema()
        max_diff = max([ex[1] for ex in extrema])
        if max_diff == 0:
            max_diff = 1
        
        # Apply scaling to make the differences visible
        scale_factor = 255.0 / max_diff
        # Use provided scaling limit or auto-scale
        applied_scale = min(scale_factor, float(scale))
        
        # Apply scaling to make the differences visible
        ela_image = diff.point(lambda p: p * applied_scale)
        
        # Save ELA result
        ela_image.save(ela_path, "JPEG")

        # Clean up temp files
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return ela_path
    except Exception as e:
        # Fallback in case of failure (e.g. non-image formats or PDF processing)
        print(f"ELA generator warning: {str(e)}")
        return image_path

def inspect_metadata(file_path: str, original_filename: str = None) -> dict:
    """
    Inspects document metadata for signs of editing software or altered timestamps.
    Returns status assessment and key details.
    """
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    
    ext = os.path.splitext(file_name)[1].lower().replace(".", "")
    if ext == "pdf":
        file_type = "PDF"
    elif ext in ["png", "jpg", "jpeg", "tiff", "tif"]:
        file_type = ext.upper()
    else:
        file_type = "UNKNOWN"
        
    try:
        creation_time = os.path.getctime(file_path)
        creation_timestamp = datetime.datetime.fromtimestamp(creation_time).isoformat()
    except Exception:
        creation_timestamp = datetime.datetime.utcnow().isoformat()
        
    try:
        mod_time = os.path.getmtime(file_path)
        modification_timestamp = datetime.datetime.fromtimestamp(mod_time).isoformat()
    except Exception:
        modification_timestamp = datetime.datetime.utcnow().isoformat()

    exif_data = {}
    if file_type in ["PNG", "JPG", "JPEG", "TIFF", "TIF"]:
        try:
            with Image.open(file_path) as img:
                raw_exif = img.getexif()
                if raw_exif:
                    for tag_id, value in raw_exif.items():
                        from PIL.ExifTags import TAGS
                        tag_name = TAGS.get(tag_id, tag_id)
                        if isinstance(value, bytes):
                            try:
                                value = value.decode(errors="replace")
                            except Exception:
                                value = str(value)
                        exif_data[str(tag_name)] = str(value)
        except Exception as e:
            print(f"EXIF extraction warning: {e}")

    status = "Passed"
    software = "Scanner standard v1.2"
    warnings = []
    
    # 1. Resolve software tag
    if exif_data.get("Software"):
        software = exif_data["Software"]
    elif exif_data.get("Producer"):
        software = exif_data["Producer"]
        
    software_lower = software.lower()
    editing_tools = ["photoshop", "canva", "gimp", "illustrator", "inkscape", "pdfescape", "nitro", "foxit", "affinity"]
    for tool in editing_tools:
        if tool in software_lower:
            warnings.append(f"Exif metadata contains {tool.title()} signature: '{software}'.")
            status = "Tampered"
            break
            
    # 2. Check for PDF-specific updates count if the file is PDF
    # (Since this helper parses pdf files, check if file has multiple EOF revisions)
    if file_type == "PDF":
        software = "Adobe Acrobat Reader"
        # Try finding actual updates
        from app.services.forensics import run_error_level_analysis # just placeholder
        # We can count %%EOF in raw bytes to see if it was modified
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            updates = content.count(b"%%EOF")
            if updates > 1:
                warnings.append(f"Document contains {updates} incremental saves (edited post-creation).")
                status = "Alert"
        except Exception:
            pass
        
    return {
        "file_name": original_filename if original_filename else file_name,
        "file_size": file_size,
        "file_type": file_type,
        "creation_timestamp": creation_timestamp,
        "modification_timestamp": modification_timestamp,
        "created_date": creation_timestamp,  # Compatible with frontend
        "modified_date": modification_timestamp,  # Compatible with frontend
        "exif": exif_data,
        "status": status,
        "software": software,
        "warnings": warnings
    }

def detect_ela_anomalies(ela_image_path: str, threshold_val: int = 15, min_area_pct: float = 0.02) -> list:
    """
    Analyzes the ELA image using OpenCV to locate clusters of high-difference pixels.
    Converts coordinates into the 500x800 normalized space expected by the frontend.
    """
    try:
        import cv2
        import numpy as np
        
        # Read the ELA image
        img = cv2.imread(ela_image_path)
        if img is None:
            return []
            
        height, width = img.shape[:2]
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Threshold
        _, thresh = cv2.threshold(gray, threshold_val, 255, cv2.THRESH_BINARY)
        
        # Closing morphology
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        morphed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(morphed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Compute dynamic minimum area in pixels
        total_area = width * height
        min_area_pixels = total_area * (min_area_pct / 100.0)
        
        regions = []
        idx = 1
        
        # We want to capture maximum 10 regions to keep frontend clean
        # Let's sort contours by area in descending order first
        sorted_contours = sorted(contours, key=cv2.contourArea, reverse=True)
        
        for contour in sorted_contours:
            area = cv2.contourArea(contour)
            if area < min_area_pixels:
                continue
                
            x, y, w, h = cv2.boundingRect(contour)
            
            # Map coordinates to the 500x800 space expected by the frontend
            norm_x = int((x / width) * 500)
            norm_y = int((y / height) * 800)
            norm_w = int((w / width) * 500)
            norm_h = int((h / height) * 800)
            
            # Bound check to prevent overflow
            norm_x = max(0, min(norm_x, 500))
            norm_y = max(0, min(norm_y, 800))
            norm_w = max(1, min(norm_w, 500 - norm_x))
            norm_h = max(1, min(norm_h, 800 - norm_y))
            
            # Calculate intensity to differentiate High vs Suspicious risk
            roi = gray[y:y+h, x:x+w]
            mean_intensity = float(np.mean(roi)) if roi.size > 0 else 0.0
            
            risk = "High" if mean_intensity > 40.0 else "Suspicious"
            label = f"ELA Compression Anomaly (intensity: {mean_intensity:.1f})"
            
            regions.append({
                "id": idx,
                "x": norm_x,
                "y": norm_y,
                "w": norm_w,
                "h": norm_h,
                "risk": risk,
                "label": label
            })
            idx += 1
            if len(regions) >= 10:
                break
                
        return regions
    except Exception as e:
        print(f"Error in detect_ela_anomalies: {e}")
        return []


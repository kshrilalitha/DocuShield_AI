import os
import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms, models

_MODEL = None
_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Preprocessing transforms matching the training setup exactly
_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def get_model():
    """
    Loads and caches the trained ResNet18 model weights from models/model.pth.
    """
    global _MODEL
    if _MODEL is not None:
        return _MODEL

    # Resolve absolute path to model.pth
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.abspath(os.path.join(current_dir, "..", "..", "models", "model.pth"))
    
    # Initialize architecture
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, 2)
    
    if os.path.exists(model_path):
        try:
            state_dict = torch.load(model_path, map_location=_DEVICE)
            model.load_state_dict(state_dict)
            print(f"[Model Inference] Loaded model checkpoint from: {model_path}")
        except Exception as e:
            print(f"[Model Inference] Warning: Failed to load state dict from {model_path}: {e}")
    else:
        print(f"[Model Inference] Warning: Trained weights not found at '{model_path}'. Using random initialization.")
        
    model.eval()
    model = model.to(_DEVICE)
    _MODEL = model
    return _MODEL

def predict_document(image_path: str) -> dict:
    """
    Predicts whether a document image is genuine or tampered.
    
    Parameters:
        image_path (str): Filepath to the document scan.
        
    Returns:
        dict: {"prediction": "genuine|tampered", "confidence": float}
    """
    try:
        if not os.path.exists(image_path):
            return {"prediction": "genuine", "confidence": 0.5, "error": f"File '{image_path}' not found"}

        # Attempt to load document scan as an image
        try:
            img = Image.open(image_path).convert("RGB")
        except Exception:
            # Fallback for PDFs or other non-raster formats
            return {
                "prediction": "genuine", 
                "confidence": 0.5,
                "note": "Document format not supported directly by image classifier"
            }

        # Load cached model
        model = get_model()

        # Apply transforms and add batch dimension
        input_tensor = _TRANSFORM(img).unsqueeze(0).to(_DEVICE)

        # Run forward pass
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            confidence, predicted_idx = torch.max(probabilities, 1)

        # Map predictions (0 is genuine, 1 is tampered)
        prediction = "genuine" if predicted_idx.item() == 0 else "tampered"

        return {
            "prediction": prediction,
            "confidence": round(float(confidence.item()), 4)
        }
    except Exception as e:
        print(f"[Model Inference] Error during inference on '{image_path}': {e}")
        return {
            "prediction": "genuine",
            "confidence": 0.5,
            "error": str(e)
        }

import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ocr_extractor import extractor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OCRServer")

app = FastAPI(
    title="PaddleOCR Local API Server",
    description="Extract text and table data from uploaded images using PaddleOCR.",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from Vite dashboard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/status")
def get_status():
    """Simple status check endpoint."""
    return {
        "status": "ready",
        "engine": "PaddleOCR & PP-Structure",
        "device": "CPU (default)"
    }

@app.post("/extract")
async def extract_data(
    file: UploadFile = File(...),
    mode: str = Form("text") # "text" or "table"
):
    """
    Receives an uploaded image file, processes it, and returns the extracted content.
    """
    logger.info(f"Received request: filename={file.filename}, mode={mode}")
    
    # Verify file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/octet-stream"]
    if file.content_type not in allowed_types and not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type: {file.content_type}. Please upload an image (PNG, JPG, WEBP)."
        )
    
    try:
        # Read raw image bytes
        content = await file.read()
        
        if mode == "table":
            logger.info("Running table structure extraction...")
            tables = extractor.extract_table_from_bytes(content)
            return {
                "success": True,
                "mode": "table",
                "filename": file.filename,
                "data": tables
            }
        else:
            logger.info("Running standard text lines extraction...")
            lines = extractor.extract_text_from_bytes(content)
            return {
                "success": True,
                "mode": "text",
                "filename": file.filename,
                "data": lines
            }
            
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

if __name__ == "__main__":
    logger.info("Starting PaddleOCR local server on http://localhost:8000")
    uvicorn.run("app_server:app", host="127.0.0.1", port=8000, reload=True)

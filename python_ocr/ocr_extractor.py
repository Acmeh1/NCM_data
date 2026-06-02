import os

# Disable MKL-DNN to avoid PaddlePaddle OneDNN runtime crash
os.environ["FLAGS_use_mkldnn"] = "0"

import cv2
import numpy as np
import logging
from paddleocr import PaddleOCR

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PaddleOCREngine")

# Clear paddlex dependency cache to ensure newly installed packages are detected on live-reload
try:
    import paddlex.utils.deps as deps
    deps.is_extra_available.cache_clear()
    deps.is_dep_available.cache_clear()
    logger.info("Successfully cleared paddlex dependency checking cache.")
except Exception as e:
    pass

try:
    from paddleocr import PPStructureV3
    logger.info("Successfully imported PPStructureV3 from paddleocr.")
except ImportError:
    PPStructureV3 = None
    logger.warning("PPStructureV3 not found in paddleocr. Table structure extraction will be disabled.")

class OCRExtractor:
    def __init__(self):
        self._ocr = None
        self._table_engine = None

    @property
    def ocr(self):
        """Lazy loader for standard text-detection/recognition OCR."""
        if self._ocr is None:
            logger.info("Initializing PaddleOCR model (this might take a few seconds on first run)...")
            # use_textline_orientation=True enables orientation classification (e.g. if the image is rotated)
            # lang='fr' is useful if tables have French headings, or 'en' for English
            self._ocr = PaddleOCR(use_textline_orientation=True, lang="fr", enable_mkldnn=False)
        return self._ocr

    @property
    def table_engine(self):
        """Lazy loader for PP-StructureV3 (table structure detection)."""
        if self._table_engine is None:
            if PPStructureV3 is None:
                raise RuntimeError(
                    "PPStructureV3 could not be imported. This might be due to an incompatible "
                    "PaddleOCR version."
                )
            logger.info("Initializing PP-StructureV3 table model (this might take a few seconds on first run)...")
            try:
                # PP-StructureV3 handles table recognition and layout parsing
                self._table_engine = PPStructureV3(use_table_recognition=True, lang="fr", enable_mkldnn=False)
            except Exception as e:
                logger.exception("Error during PPStructureV3 model creation")
                raise RuntimeError(
                    f"PP-StructureV3 failed to initialize: {str(e)}. "
                    "If you are seeing dependency errors, please make sure you have restarted your server "
                    'after running: pip install "paddlex[ocr]"'
                ) from e
        return self._table_engine

    def extract_text_from_bytes(self, img_bytes: bytes):
        """
        Runs OCR on raw image bytes.
        Returns a list of dictionaries with bounding box, text content, and confidence.
        """
        # Convert bytes to numpy array
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image bytes.")

        # Run OCR using the new PaddleOCR v3 predict() API
        # Text orientation is already handled by use_textline_orientation=True set at init
        results = self.ocr.predict(img)
        
        extracted_lines = []
        for result in results:
            texts = result.get("rec_texts", result.get("rec_text", []))
            scores = result.get("rec_scores", result.get("rec_score", []))
            polys = result.get("dt_polys", result.get("dt_poly", []))
            
            for i in range(len(texts)):
                box = polys[i].tolist() if hasattr(polys[i], 'tolist') else polys[i]
                extracted_lines.append({
                    "box": box,
                    "text": str(texts[i]).strip(),
                    "confidence": float(scores[i])
                })
        
        return extracted_lines

    def extract_table_from_bytes(self, img_bytes: bytes):
        """
        Runs PP-StructureV3 on raw image bytes to identify table layout structures.
        Returns recognized tables as structured rows or HTML strings.
        """
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image bytes.")

        # Run structure analysis using the new predict() API
        results = self.table_engine.predict(img)
        if not results:
            return []
            
        layout_res = results[0]
        parsing_res_list = layout_res.get("parsing_res_list", [])
        table_res_list = layout_res.get("table_res_list", [])
        
        extracted_tables = []
        table_idx = 0
        
        for block in parsing_res_list:
            if block.label == "table":
                # Get predicted HTML
                html_table = block.content if block.content else ""
                
                # Bounding box
                bbox = block.bbox.tolist() if hasattr(block.bbox, 'tolist') else block.bbox
                
                # Cells bounding boxes
                cells = []
                if table_idx < len(table_res_list):
                    table_res = table_res_list[table_idx]
                    raw_cells = table_res.get("cell_box_list", [])
                    for cell in raw_cells:
                        cells.append(cell.tolist() if hasattr(cell, 'tolist') else cell)
                
                extracted_tables.append({
                    "table_index": table_idx,
                    "bbox": bbox,
                    "html": html_table,
                    "cells": cells
                })
                table_idx += 1
                
        return extracted_tables

# Instantiate a single global extractor
extractor = OCRExtractor()

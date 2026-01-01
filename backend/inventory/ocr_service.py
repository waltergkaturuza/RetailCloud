"""
OCR Service for extracting text and serial numbers from images.
"""
import logging
from typing import List, Dict, Any, Optional
import io

logger = logging.getLogger(__name__)


class OCRService:
    """Service for OCR and image-based text extraction."""
    
    @staticmethod
    def extract_text_from_image(image_data: bytes) -> str:
        """
        Extract all text from image using OCR.
        
        Args:
            image_data: Image bytes
            
        Returns:
            Extracted text string
        """
        try:
            import pytesseract
            from PIL import Image
            
            image = Image.open(io.BytesIO(image_data))
            text = pytesseract.image_to_string(image)
            return text.strip()
        except ImportError:
            logger.warning("pytesseract not available")
            return ""
        except Exception as e:
            logger.error(f"OCR text extraction failed: {e}", exc_info=True)
            return ""
    
    @staticmethod
    def extract_serials_from_image(
        image_data: bytes,
        patterns: Optional[List] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract serial numbers from image using OCR and pattern recognition.
        
        Args:
            image_data: Image bytes
            patterns: Optional list of serial patterns to match
            
        Returns:
            List of extracted serials with metadata
        """
        from .pattern_recognition_service import SerialNumberPatternRecognizer, SerialPattern
        
        # Extract text using OCR
        text = OCRService.extract_text_from_image(image_data)
        
        if not text:
            return []
        
        # Use pattern recognizer if patterns provided
        if patterns:
            pattern_list = [
                SerialPattern(
                    name=p.name,
                    pattern_type=p.pattern_type,
                    config=p.pattern_config
                )
                for p in patterns
            ]
            recognizer = SerialNumberPatternRecognizer(pattern_list)
            extracted = recognizer.extract_serials_from_text(text)
            
            return [
                {
                    'serial': e.serial,
                    'confidence': e.confidence,
                    'pattern': e.pattern_matched,
                    'metadata': e.metadata,
                    'source': 'ocr_pattern_match'
                }
                for e in extracted
            ]
        
        # Fallback: extract common formats
        from .pattern_recognition_service import SerialNumberPatternRecognizer
        recognizer = SerialNumberPatternRecognizer([])
        extracted = recognizer._extract_common_formats(text)
        
        return [
            {
                'serial': e.serial,
                'confidence': e.confidence * 0.8,  # Lower confidence for OCR
                'pattern': None,
                'metadata': {**e.metadata, 'source': 'ocr_common_format'},
                'source': 'ocr_common_format'
            }
            for e in extracted
        ]
    
    @staticmethod
    def extract_barcodes_from_image(image_data: bytes) -> List[str]:
        """
        Extract barcodes from image using pyzbar.
        
        Args:
            image_data: Image bytes
            
        Returns:
            List of detected barcode strings
        """
        try:
            from pyzbar import pyzbar
            import cv2
            import numpy as np
            
            # Decode image
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                logger.warning("Failed to decode image")
                return []
            
            # Detect barcodes
            detected_barcodes = pyzbar.decode(image)
            barcodes = []
            
            for barcode in detected_barcodes:
                try:
                    code = barcode.data.decode('utf-8')
                    barcodes.append(code)
                    logger.info(f"Detected barcode: {code} (type: {barcode.type})")
                except Exception as e:
                    logger.warning(f"Failed to decode barcode: {e}")
            
            return barcodes
            
        except ImportError:
            logger.warning("pyzbar not available")
            return []
        except Exception as e:
            logger.error(f"Barcode extraction failed: {e}", exc_info=True)
            return []
    
    @staticmethod
    def process_image(
        image_data: bytes,
        extract_text: bool = True,
        extract_barcodes: bool = True,
        extract_serials: bool = True,
        patterns: Optional[List] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive image processing for inventory operations.
        
        Args:
            image_data: Image bytes
            extract_text: Extract all text using OCR
            extract_barcodes: Extract barcodes using pyzbar
            extract_serials: Extract serial numbers using patterns
            patterns: Serial number patterns for recognition
            
        Returns:
            Dict with extracted data
        """
        result = {
            'text': '',
            'barcodes': [],
            'serials': [],
            'metadata': {}
        }
        
        if extract_text:
            result['text'] = OCRService.extract_text_from_image(image_data)
        
        if extract_barcodes:
            result['barcodes'] = OCRService.extract_barcodes_from_image(image_data)
        
        if extract_serials:
            result['serials'] = OCRService.extract_serials_from_image(image_data, patterns)
        
        result['metadata'] = {
            'text_length': len(result['text']),
            'barcode_count': len(result['barcodes']),
            'serial_count': len(result['serials']),
        }
        
        return result


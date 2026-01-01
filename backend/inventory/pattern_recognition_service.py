"""
Pattern Recognition Service for Serial Numbers and Barcodes.
Uses ML and pattern matching for intelligent bulk capture.
"""
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ExtractedSerial:
    """Extracted serial number with confidence."""
    serial: str
    confidence: float
    pattern_matched: Optional[str] = None
    metadata: Dict[str, Any] = None


@dataclass
class SerialPattern:
    """Serial number pattern definition."""
    name: str
    pattern_type: str
    config: Dict[str, Any]
    

class SerialNumberPatternRecognizer:
    """Recognizes and extracts serial numbers from text using patterns."""
    
    def __init__(self, patterns: List[SerialPattern]):
        self.patterns = patterns
        self.compiled_patterns = self._compile_patterns()
    
    def _compile_patterns(self) -> List[Tuple[SerialPattern, re.Pattern]]:
        """Compile regex patterns for faster matching."""
        compiled = []
        for pattern in self.patterns:
            if pattern.pattern_type == 'regex':
                try:
                    regex = pattern.config.get('regex', '')
                    compiled.append((pattern, re.compile(regex, re.IGNORECASE)))
                except re.error as e:
                    logger.warning(f"Invalid regex pattern {pattern.name}: {e}")
            elif pattern.pattern_type == 'prefix_suffix':
                # Build regex from prefix/suffix config
                prefix = pattern.config.get('prefix', '')
                suffix = pattern.config.get('suffix', '')
                padding = pattern.config.get('padding', 0)
                
                # Build regex: prefix + digits + suffix
                regex_parts = []
                if prefix:
                    regex_parts.append(re.escape(prefix))
                
                if padding:
                    regex_parts.append(f'[0-9]{{{padding}}}')
                else:
                    regex_parts.append('[0-9]+')
                
                if suffix:
                    regex_parts.append(re.escape(suffix))
                
                regex = '^' + ''.join(regex_parts) + '$'
                try:
                    compiled.append((pattern, re.compile(regex, re.IGNORECASE)))
                except re.error as e:
                    logger.warning(f"Error compiling pattern {pattern.name}: {e}")
        
        return compiled
    
    def extract_serials_from_text(self, text: str) -> List[ExtractedSerial]:
        """
        Extract serial numbers from a text block.
        
        Args:
            text: Text containing serial numbers (can be multiline, comma-separated, etc.)
            
        Returns:
            List of extracted serials with confidence scores
        """
        extracted = []
        
        # Normalize text (remove extra whitespace, split by common delimiters)
        # Try multiple extraction methods
        
        # Method 1: Pattern matching
        for pattern, compiled_regex in self.compiled_patterns:
            matches = compiled_regex.findall(text)
            for match in matches:
                serial = match if isinstance(match, str) else match[0] if match else None
                if serial and serial not in [e.serial for e in extracted]:
                    extracted.append(ExtractedSerial(
                        serial=serial.strip(),
                        confidence=0.9,
                        pattern_matched=pattern.name,
                        metadata={'pattern_type': pattern.pattern_type}
                    ))
        
        # Method 2: Generate from range if prefix/suffix pattern found
        for pattern, _ in self.compiled_patterns:
            if pattern.pattern_type == 'prefix_suffix' and 'start' in pattern.config and 'end' in pattern.config:
                generated = self._generate_serials_from_range(pattern, text)
                for serial in generated:
                    if serial not in [e.serial for e in extracted]:
                        extracted.append(ExtractedSerial(
                            serial=serial,
                            confidence=0.7,
                            pattern_matched=pattern.name,
                            metadata={'generated': True}
                        ))
        
        # Method 3: Extract common serial number formats (fallback)
        if not extracted:
            extracted.extend(self._extract_common_formats(text))
        
        return extracted
    
    def _generate_serials_from_range(self, pattern: SerialPattern, text: str) -> List[str]:
        """Generate serial numbers from a range if detected in text."""
        config = pattern.config
        prefix = config.get('prefix', '')
        suffix = config.get('suffix', '')
        padding = config.get('padding', 0)
        
        # Try to detect range in text (e.g., "SN-1000 to SN-1005")
        range_pattern = re.compile(
            rf'{re.escape(prefix)}(\d+)\s*(?:to|-|\.\.)\s*{re.escape(prefix)}(\d+)',
            re.IGNORECASE
        )
        matches = range_pattern.findall(text)
        
        generated = []
        for start_str, end_str in matches:
            try:
                start = int(start_str)
                end = int(end_str)
                for num in range(start, end + 1):
                    serial_num = str(num).zfill(padding) if padding else str(num)
                    generated.append(f"{prefix}{serial_num}{suffix}")
            except ValueError:
                continue
        
        return generated
    
    def _extract_common_formats(self, text: str) -> List[ExtractedSerial]:
        """Extract serial numbers using common format patterns."""
        extracted = []
        
        # Common patterns
        patterns = [
            (r'SN[:\s-]?([A-Z0-9\-]{4,20})', 0.6),  # SN-12345, SN:ABC123
            (r'S\/N[:\s-]?([A-Z0-9\-]{4,20})', 0.6),  # S/N-12345
            (r'SERIAL[:\s-]?([A-Z0-9\-]{4,20})', 0.6),  # SERIAL:12345
            (r'([A-Z]{2,4}[-]?\d{4,10})', 0.5),  # ABC-12345, XY123456
            (r'(\d{6,12})', 0.4),  # Pure numeric (6-12 digits)
        ]
        
        for regex_str, confidence in patterns:
            matches = re.finditer(regex_str, text, re.IGNORECASE)
            for match in matches:
                serial = match.group(1) if match.groups() else match.group(0)
                if serial and len(serial) >= 4:  # Minimum length
                    if serial not in [e.serial for e in extracted]:
                        extracted.append(ExtractedSerial(
                            serial=serial.strip(),
                            confidence=confidence,
                            metadata={'extraction_method': 'common_format'}
                        ))
        
        return extracted
    
    def generate_serial_range(
        self,
        pattern: SerialPattern,
        start: int,
        end: int,
        step: int = 1
    ) -> List[str]:
        """
        Generate a list of serial numbers from a pattern and range.
        
        Args:
            pattern: Serial pattern definition
            start: Start number
            end: End number (inclusive)
            step: Step size
            
        Returns:
            List of generated serial numbers
        """
        if pattern.pattern_type != 'prefix_suffix':
            raise ValueError("Range generation only works with prefix_suffix patterns")
        
        config = pattern.config
        prefix = config.get('prefix', '')
        suffix = config.get('suffix', '')
        padding = config.get('padding', 0)
        
        serials = []
        for num in range(start, end + 1, step):
            serial_num = str(num).zfill(padding) if padding else str(num)
            serials.append(f"{prefix}{serial_num}{suffix}")
        
        return serials


class BarcodeExtractor:
    """Extracts barcodes and product codes from images/text."""
    
    @staticmethod
    def extract_from_text(text: str) -> List[str]:
        """Extract barcode-like codes from text."""
        barcodes = []
        
        # Common barcode patterns
        patterns = [
            r'\b\d{8,14}\b',  # EAN/UPC (8-14 digits)
            r'\b[A-Z0-9]{8,20}\b',  # Alphanumeric codes
            r'[A-Z]{2}\d{6,}',  # Product codes like AB123456
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            barcodes.extend(matches)
        
        # Remove duplicates and return
        return list(set(barcodes))
    
    @staticmethod
    def extract_from_image(image_data: bytes) -> List[str]:
        """
        Extract barcodes from image using OCR/barcode scanning.
        Note: Requires additional libraries like pyzbar, opencv, pytesseract
        
        For now, returns empty list. Can be extended with actual image processing.
        """
        # TODO: Implement image-based barcode extraction
        # Requires: pip install pyzbar opencv-python pytesseract
        # from pyzbar import pyzbar
        # import cv2
        # import numpy as np
        # 
        # # Decode image
        # image = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
        # barcodes = pyzbar.decode(image)
        # return [barcode.data.decode('utf-8') for barcode in barcodes]
        
        logger.warning("Image-based barcode extraction not yet implemented")
        return []


class BulkInventoryProcessor:
    """Processes bulk inventory operations with pattern recognition."""
    
    def __init__(self, tenant):
        self.tenant = tenant
    
    def process_serial_input(
        self,
        input_text: str,
        product_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Process bulk serial number input with pattern recognition.
        
        Args:
            input_text: Text containing serial numbers (multiline, comma-separated, etc.)
            product_id: Optional product ID to filter patterns
            
        Returns:
            Dict with extracted serials, suggested patterns, and statistics
        """
        from .location_models import SerialNumberPattern
        from .models import Product
        
        # Load patterns for this tenant/product
        from django.db import models as django_models
        pattern_query = SerialNumberPattern.objects.filter(
            tenant=self.tenant,
            is_active=True
        )
        if product_id:
            pattern_query = pattern_query.filter(
                django_models.Q(product_id=product_id) | django_models.Q(product__isnull=True)
            )
        
        patterns = [
            SerialPattern(
                name=p.name,
                pattern_type=p.pattern_type,
                config=p.pattern_config
            )
            for p in pattern_query
        ]
        
        # Extract serials
        recognizer = SerialNumberPatternRecognizer(patterns)
        extracted = recognizer.extract_serials_from_text(input_text)
        
        # Statistics
        total_extracted = len(extracted)
        high_confidence = len([e for e in extracted if e.confidence >= 0.8])
        pattern_matched = len([e for e in extracted if e.pattern_matched])
        
        # Suggested improvements
        suggestions = []
        if high_confidence / max(total_extracted, 1) < 0.7:
            suggestions.append("Consider creating a serial number pattern for better recognition")
        
        return {
            'extracted_serials': [e.serial for e in extracted],
            'detailed_results': [
                {
                    'serial': e.serial,
                    'confidence': e.confidence,
                    'pattern': e.pattern_matched,
                    'metadata': e.metadata
                }
                for e in extracted
            ],
            'statistics': {
                'total_extracted': total_extracted,
                'high_confidence_count': high_confidence,
                'pattern_matched_count': pattern_matched,
                'average_confidence': sum(e.confidence for e in extracted) / max(total_extracted, 1),
            },
            'suggestions': suggestions
        }
    
    def process_barcode_input(
        self,
        input_text: str,
        image_data: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """Process barcode input (text or image)."""
        barcodes = []
        
        if input_text:
            barcodes.extend(BarcodeExtractor.extract_from_text(input_text))
        
        if image_data:
            barcodes.extend(BarcodeExtractor.extract_from_image(image_data))
        
        # Remove duplicates
        unique_barcodes = list(set(barcodes))
        
        return {
            'extracted_barcodes': unique_barcodes,
            'count': len(unique_barcodes)
        }


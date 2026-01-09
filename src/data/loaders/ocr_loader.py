"""
OCR Loader Module for Offline Text Extraction

Provides OCR capabilities for image files and scanned PDFs using:
- Primary: PaddleOCR (GPU-accelerated, lightweight, accurate)
- Fallback: Tesseract OCR (CPU)

Supports:
- Image files: PNG, JPG, JPEG
- Scanned PDF pages (detected automatically)
"""

import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
from PIL import Image
import io

logger = logging.getLogger(__name__)


class OCRLoader:
    """
    Offline OCR engine with GPU acceleration support.
    
    Automatically detects GPU availability and selects the best backend:
    - GPU available: PaddleOCR (faster, more accurate)
    - GPU unavailable: Tesseract (CPU fallback)
    
    Attributes:
        use_gpu (bool): Whether GPU acceleration is available
        ocr_engine: The active OCR engine (PaddleOCR or pytesseract)
        backend (str): Current backend name ('paddleocr' or 'tesseract')
    """
    
    def __init__(self, prefer_gpu: bool = True):
        """
        Initialize OCR loader with automatic backend selection.
        
        Args:
            prefer_gpu: If True, attempt GPU acceleration first
        """
        self.use_gpu = False
        self.ocr_engine = None
        self.backend = None
        self.paddle_ocr = None
        
        # Try to initialize OCR backends
        if prefer_gpu:
            self._try_init_paddleocr()
        
        if self.backend is None:
            self._init_tesseract()
    
    def _detect_gpu(self) -> Tuple[bool, str]:
        """
        Detect available GPU acceleration.
        
        Returns:
            Tuple of (gpu_available, device_type)
        """
        try:
            import paddle
            # Check for CUDA
            if paddle.device.cuda.device_count() > 0:
                return True, "cuda"
        except:
            pass
        
        # Check for MPS (Apple Silicon) - PaddlePaddle doesn't support MPS yet
        # but we can try anyway
        try:
            import torch
            if torch.backends.mps.is_available():
                logger.info("MPS available but PaddleOCR may not support it, using CPU mode")
                return False, "cpu"
        except:
            pass
        
        return False, "cpu"
    
    def _try_init_paddleocr(self) -> bool:
        """
        Try to initialize PaddleOCR engine.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            from paddleocr import PaddleOCR
            
            gpu_available, device = self._detect_gpu()
            
            # Initialize PaddleOCR
            # use_angle_cls: detect text angle
            # lang: 'en' for English, 'ch' for Chinese+English
            self.paddle_ocr = PaddleOCR(
                use_angle_cls=True,
                lang='en',
                use_gpu=gpu_available,
                show_log=False,  # Suppress verbose logging
                det_db_score_mode='slow',  # More accurate detection
            )
            
            self.use_gpu = gpu_available
            self.backend = 'paddleocr'
            logger.info(f"Initialized PaddleOCR (GPU: {gpu_available})")
            return True
            
        except ImportError:
            logger.warning("PaddleOCR not installed, will try Tesseract")
            return False
        except Exception as e:
            logger.warning(f"Failed to initialize PaddleOCR: {e}")
            return False
    
    def _init_tesseract(self) -> bool:
        """
        Initialize Tesseract OCR as fallback.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            import pytesseract
            
            # Test if tesseract is available
            pytesseract.get_tesseract_version()
            
            self.backend = 'tesseract'
            self.use_gpu = False
            logger.info("Initialized Tesseract OCR (CPU)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Tesseract: {e}")
            logger.error("Please install Tesseract: brew install tesseract")
            return False
    
    def ocr_image(self, image_source: Any) -> str:
        """
        Extract text from an image using OCR.
        
        Args:
            image_source: Can be a file path (str/Path) or PIL Image
            
        Returns:
            Extracted text as string
        """
        if self.backend is None:
            raise RuntimeError("No OCR backend available")
        
        # Load image if path provided
        if isinstance(image_source, (str, Path)):
            image = Image.open(image_source)
            image_path = str(image_source)
        else:
            image = image_source
            image_path = None
        
        # Convert to RGB if needed (for RGBA images)
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        try:
            if self.backend == 'paddleocr':
                return self._ocr_with_paddle(image, image_path)
            else:
                return self._ocr_with_tesseract(image)
        except Exception as e:
            logger.error(f"OCR failed with {self.backend}: {e}")
            # Try fallback if paddle fails
            if self.backend == 'paddleocr':
                logger.info("Falling back to Tesseract")
                try:
                    return self._ocr_with_tesseract(image)
                except:
                    pass
            raise
    
    def _ocr_with_paddle(self, image: Image.Image, image_path: Optional[str] = None) -> str:
        """
        Perform OCR using PaddleOCR.
        
        Args:
            image: PIL Image object
            image_path: Optional path for direct file loading
            
        Returns:
            Extracted text
        """
        import numpy as np
        
        # PaddleOCR can work with path or numpy array
        if image_path:
            result = self.paddle_ocr.ocr(image_path, cls=True)
        else:
            # Convert PIL to numpy
            img_array = np.array(image)
            result = self.paddle_ocr.ocr(img_array, cls=True)
        
        # Extract text from result
        # Result format: [[[box], (text, confidence)], ...]
        lines = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) >= 2:
                    text = line[1][0]  # Get text from (text, confidence) tuple
                    lines.append(text)
        
        return '\n'.join(lines)
    
    def _ocr_with_tesseract(self, image: Image.Image) -> str:
        """
        Perform OCR using Tesseract.
        
        Args:
            image: PIL Image object
            
        Returns:
            Extracted text
        """
        import pytesseract
        
        # Use best quality settings
        text = pytesseract.image_to_string(
            image,
            lang='eng',
            config='--psm 1'  # Automatic page segmentation with OSD
        )
        
        return text.strip()
    
    def is_scanned_page(self, text_content: str, threshold: int = 50) -> bool:
        """
        Determine if a PDF page is scanned (image-based) vs text-based.
        
        Args:
            text_content: Text extracted from the page
            threshold: Minimum characters to consider as text page
            
        Returns:
            True if page appears to be scanned/image-based
        """
        # Strip whitespace and count meaningful characters
        clean_text = ''.join(text_content.split())
        return len(clean_text) < threshold
    
    def ocr_pdf_page(self, page_image: Image.Image, page_number: int = 1) -> Dict:
        """
        OCR a single PDF page rendered as image.
        
        Args:
            page_image: PIL Image of the page
            page_number: Page number for metadata
            
        Returns:
            Dict with text and metadata
        """
        text = self.ocr_image(page_image)
        
        return {
            'text': text,
            'page_number': page_number,
            'ocr': True
        }
    
    @property
    def is_available(self) -> bool:
        """Check if any OCR backend is available."""
        return self.backend is not None
    
    def get_status(self) -> Dict:
        """Get OCR engine status."""
        return {
            'available': self.is_available,
            'backend': self.backend,
            'gpu_enabled': self.use_gpu
        }


# Singleton instance for reuse
_ocr_loader: Optional[OCRLoader] = None


def get_ocr_loader() -> OCRLoader:
    """
    Get or create the shared OCR loader instance.
    
    Returns:
        OCRLoader instance
    """
    global _ocr_loader
    if _ocr_loader is None:
        _ocr_loader = OCRLoader()
    return _ocr_loader

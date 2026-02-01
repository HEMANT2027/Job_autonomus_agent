"""
Resume Parser Service

Extracts text content from PDF resume files using pdfplumber.
"""

import io
from typing import Optional

import pdfplumber

from app.logging_config import get_logger

logger = get_logger(__name__)

# Maximum file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes


class ResumeParseError(Exception):
    """Exception raised when resume parsing fails."""
    pass


def validate_file_size(file_content: bytes) -> None:
    """
    Validate that the file size is within limits.
    
    Args:
        file_content: The raw bytes of the uploaded file.
        
    Raises:
        ResumeParseError: If file exceeds maximum size.
    """
    file_size = len(file_content)
    if file_size > MAX_FILE_SIZE:
        size_mb = file_size / (1024 * 1024)
        raise ResumeParseError(
            f"File size ({size_mb:.2f}MB) exceeds maximum allowed size (5MB)"
        )


def extract_text_from_pdf(file_content: bytes) -> str:
    """
    Extract text content from a PDF file.
    
    Args:
        file_content: The raw bytes of the PDF file.
        
    Returns:
        Extracted text from all pages of the PDF.
        
    Raises:
        ResumeParseError: If the PDF cannot be parsed.
    """
    try:
        # Validate file size first
        validate_file_size(file_content)
        
        # Create a file-like object from bytes
        pdf_stream = io.BytesIO(file_content)
        
        # Track errors for debugging
        errors = []
        extracted_text = []
        
        # ---------------------------------------------------------
        # Attempt 1: pdfplumber (Best for layout)
        # ---------------------------------------------------------
        try:
            with pdfplumber.open(pdf_stream) as pdf:
                if len(pdf.pages) == 0:
                    errors.append("pdfplumber: PDF has no pages")
                else:
                    for page in pdf.pages:
                        text = page.extract_text()
                        if text:
                            extracted_text.append(text)
                    if extracted_text:
                        logger.info("Successfully extracted text using pdfplumber")
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed: {e}")
            errors.append(f"pdfplumber: {str(e)}")
    
        # ---------------------------------------------------------
        # Attempt 2: pypdf (Best for resilience)
        # ---------------------------------------------------------
        if not extracted_text:
            try:
                import pypdf
                pdf_stream.seek(0)
                reader = pypdf.PdfReader(pdf_stream)
                pypdf_text = []
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        pypdf_text.append(text)
                
                if pypdf_text:
                    extracted_text = pypdf_text
                    logger.info("Successfully extracted text using pypdf fallback")
            except Exception as e:
                logger.warning(f"pypdf extraction failed: {e}")
                errors.append(f"pypdf: {str(e)}")
    
        # ---------------------------------------------------------
        # Attempt 3: pdfminer.six (Deepest extraction)
        # ---------------------------------------------------------
        if not extracted_text:
            try:
                from pdfminer.high_level import extract_text as extract_text_miner
                pdf_stream.seek(0)
                miner_text = extract_text_miner(pdf_stream)
                if miner_text and len(miner_text.strip()) > 10:
                    extracted_text = [miner_text]
                    logger.info("Successfully extracted text using pdfminer.six fallback")
            except Exception as e:
                logger.warning(f"pdfminer extraction failed: {e}")
                errors.append(f"pdfminer: {str(e)}")
    
        # ---------------------------------------------------------
        # Final Validation
        # ---------------------------------------------------------
        if not extracted_text:
            error_details = "; ".join(errors)
            raise ResumeParseError(
                f"Could not extract text. Failed all methods: {error_details}. "
                "Please ensure the file is not encrypted/locked."
            )
        
        # Join all pages with newlines
        full_text = "\n\n".join(extracted_text)
        
        logger.info(f"Successfully extracted {len(full_text)} characters from PDF")
        return full_text
        
    except ResumeParseError:
        raise
    except Exception as e:
        logger.error(f"Failed to parse PDF: {e}")
        raise ResumeParseError(f"Failed to parse PDF: {str(e)}")


def get_text_preview(text: str, max_length: int = 500) -> str:
    """
    Get a preview of the extracted text.
    
    Args:
        text: The full extracted text.
        max_length: Maximum length of the preview.
        
    Returns:
        Truncated text with ellipsis if needed.
    """
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(' ', 1)[0] + "..."

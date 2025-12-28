# MIT License
# Copyright (c) 2024 Arnav Angarkar

from .base import BaseLoader
from .file_loader import FileLoader
from .web_scraper import EnhancedWebLoader
from .file_converter import OfficeConverter

__all__ = ['BaseLoader', 'FileLoader', "EnhancedWebLoader", "OfficeConverter"]

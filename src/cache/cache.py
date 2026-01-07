"""
Cache management for RAG system.
Handles caching of embeddings, BM25 indices, and document chunks.
"""

import os
import pickle
import hashlib
import logging
from typing import Any, Optional
from pathlib import Path


class CacheManager:
    """
    Manages caching of computationally expensive data like embeddings and indices.
    
    Attributes:
        cache_dir (str): Directory path for storing cache files
        logger (logging.Logger): Logger instance for the class
    """
    
    def __init__(self, cache_dir: str):
        """
        Initialize the CacheManager.
        
        Args:
            cache_dir (str): Directory path for storing cache files
        """
        self.cache_dir = cache_dir
        self.logger = logging.getLogger(__name__)
        
        # Create cache directory if it doesn't exist
        Path(self.cache_dir).mkdir(parents=True, exist_ok=True)
        self.logger.info(f"CacheManager initialized with cache_dir: {self.cache_dir}")
    
    def _get_cache_path(self, key: str) -> str:
        """
        Get the full path for a cache file.
        
        Args:
            key (str): Cache key
            
        Returns:
            str: Full path to the cache file
        """
        return os.path.join(self.cache_dir, f"{key}.pkl")
    
    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve cached item by key.
        
        Args:
            key (str): Cache key to retrieve
            
        Returns:
            Optional[Any]: Cached value if exists, None otherwise
        """
        cache_path = self._get_cache_path(key)
        
        if os.path.exists(cache_path):
            try:
                with open(cache_path, 'rb') as f:
                    data = pickle.load(f)
                self.logger.info(f"Cache hit for key: {key}")
                return data
            except Exception as e:
                self.logger.warning(f"Error reading cache for key {key}: {e}")
                return None
        
        self.logger.info(f"Cache miss for key: {key}")
        return None
    
    def set(self, key: str, value: Any) -> None:
        """
        Store item in cache.
        
        Args:
            key (str): Cache key
            value (Any): Value to cache (must be picklable)
        """
        cache_path = self._get_cache_path(key)
        
        try:
            with open(cache_path, 'wb') as f:
                pickle.dump(value, f)
            self.logger.info(f"Cached data with key: {key}")
        except Exception as e:
            self.logger.error(f"Error caching data for key {key}: {e}")
            raise
    
    def exists(self, key: str) -> bool:
        """
        Check if a cache key exists.
        
        Args:
            key (str): Cache key to check
            
        Returns:
            bool: True if cache exists, False otherwise
        """
        return os.path.exists(self._get_cache_path(key))
    
    def delete(self, key: str) -> bool:
        """
        Delete a cached item.
        
        Args:
            key (str): Cache key to delete
            
        Returns:
            bool: True if deleted, False if not found
        """
        cache_path = self._get_cache_path(key)
        
        if os.path.exists(cache_path):
            try:
                os.remove(cache_path)
                self.logger.info(f"Deleted cache for key: {key}")
                return True
            except Exception as e:
                self.logger.error(f"Error deleting cache for key {key}: {e}")
                return False
        return False
    
    def clear(self) -> int:
        """
        Clear all cached items.
        
        Returns:
            int: Number of items cleared
        """
        count = 0
        for filename in os.listdir(self.cache_dir):
            if filename.endswith('.pkl'):
                try:
                    os.remove(os.path.join(self.cache_dir, filename))
                    count += 1
                except Exception as e:
                    self.logger.error(f"Error deleting {filename}: {e}")
        
        self.logger.info(f"Cleared {count} cached items")
        return count
    
    @staticmethod
    def generate_cache_key(content: str) -> str:
        """
        Generate deterministic cache key from content.
        
        Uses first 100 chars of content for efficiency while
        maintaining uniqueness through MD5 hashing.
        
        Args:
            content (str): Content to generate key for
            
        Returns:
            str: MD5 hash as cache key
        """
        # content is hashed fully to ensure uniqueness
        return hashlib.md5(content.encode()).hexdigest()

    def get_cached(self, key: str, cache_type: str = "generic") -> Optional[Any]:
        """
        Retrieve cached content with namespacing.
        
        Args:
            key (str): Base key
            cache_type (str): Type/namespace for the cache
            
        Returns:
            Optional[Any]: Cached content or None
        """
        full_key = f"{cache_type}_{self.generate_cache_key(key)}"
        return self.get(full_key)

    def cache_content(self, key: str, content: Any, cache_type: str = "generic") -> None:
        """
        Cache content with namespacing.
        
        Args:
            key (str): Base key
            content (Any): Content to cache
            cache_type (str): Type/namespace for the cache
        """
        full_key = f"{cache_type}_{self.generate_cache_key(key)}"
        self.set(full_key, content)



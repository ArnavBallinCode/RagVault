"""
Precision Chunk Extractor for Query-Focused Source Evidence

This module provides utilities to extract only the query-relevant portions of 
document chunks for display in source evidence popups.
"""

import re
from typing import List, Tuple, Optional, Set
from collections import Counter
import logging

logger = logging.getLogger(__name__)


def tokenize_sentences(text: str) -> List[str]:
    """
    Split text into sentences using simple rule-based tokenization.
    Handles common abbreviations and edge cases.
    
    Args:
        text: Input text to tokenize
        
    Returns:
        List of sentences
    """
    # Handle common abbreviations that shouldn't split sentences
    abbrevs = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Ph.D.', 'e.g.', 'i.e.', 'etc.', 'vs.', 'Sr.', 'Jr.']
    placeholder = "<<ABBREV_{}>>"
    
    protected_text = text
    for i, abbrev in enumerate(abbrevs):
        protected_text = protected_text.replace(abbrev, placeholder.format(i))
    
    # Split on sentence boundaries
    # Match period/exclamation/question followed by space and capital letter or end
    sentence_pattern = r'(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])$'
    sentences = re.split(sentence_pattern, protected_text)
    
    # Restore abbreviations
    restored_sentences = []
    for sent in sentences:
        for i, abbrev in enumerate(abbrevs):
            sent = sent.replace(placeholder.format(i), abbrev)
        sent = sent.strip()
        if sent:
            restored_sentences.append(sent)
    
    # If no sentence boundaries found, try splitting by newlines or bullet points
    if len(restored_sentences) <= 1 and len(text) > 200:
        # Try splitting by markdown headers, bullets, or double newlines
        alt_pattern = r'\n\n|\n[-*•]\s|\n#+\s'
        alt_sentences = re.split(alt_pattern, text)
        alt_sentences = [s.strip() for s in alt_sentences if s.strip()]
        if len(alt_sentences) > 1:
            return alt_sentences
    
    return restored_sentences if restored_sentences else [text.strip()]


def extract_entities(query: str) -> Set[str]:
    """
    Extract key entities from the query for matching.
    Focuses on proper nouns, quoted terms, and significant keywords.
    
    Args:
        query: User's query string
        
    Returns:
        Set of entity strings to match
    """
    entities = set()
    
    # Extract quoted terms (highest priority)
    quoted = re.findall(r'"([^"]+)"', query)
    entities.update(quoted)
    
    # Extract proper nouns (capitalized words not at sentence start)
    words = query.split()
    for i, word in enumerate(words):
        clean_word = re.sub(r'[^\w]', '', word)
        if len(clean_word) > 1:
            # Check if capitalized and not first word
            if i > 0 and clean_word[0].isupper():
                entities.add(clean_word)
            # Also add words that appear to be names (multiple caps)
            if sum(1 for c in clean_word if c.isupper()) >= 2:
                entities.add(clean_word)
    
    # Extract significant keywords (nouns/verbs, exclude stop words)
    stop_words = {
        'what', 'who', 'where', 'when', 'why', 'how', 'which', 'whom',
        'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'the', 'a', 'an', 'this', 'that', 'these', 'those',
        'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from',
        'and', 'or', 'but', 'if', 'then', 'else', 'so', 'because',
        'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might',
        'do', 'does', 'did', 'done', 'have', 'has', 'had', 'having',
        'about', 'between', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
        'again', 'further', 'once', 'here', 'there', 'any', 'all', 'each',
        'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
        'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also'
    }
    
    for word in words:
        clean_word = re.sub(r'[^\w]', '', word).lower()
        if len(clean_word) > 2 and clean_word not in stop_words:
            entities.add(clean_word)
    
    return entities


def score_sentence(sentence: str, query: str, entities: Set[str]) -> float:
    """
    Score a sentence by its relevance to the query.
    Uses keyword matching and entity presence.
    
    Args:
        sentence: Sentence to score
        query: Original query
        entities: Extracted query entities
        
    Returns:
        Relevance score (0.0 to 1.0)
    """
    if not sentence or not entities:
        return 0.0
    
    sentence_lower = sentence.lower()
    query_lower = query.lower()
    
    score = 0.0
    max_score = len(entities) + 2  # Base max score
    
    # Check for exact entity matches (case-insensitive)
    entity_matches = 0
    for entity in entities:
        entity_lower = entity.lower()
        if entity_lower in sentence_lower:
            entity_matches += 1
            # Bonus for proper case match (likely a name)
            if entity in sentence:
                score += 0.5
    
    # Entity match contribution
    if entities:
        score += (entity_matches / len(entities)) * 2
    
    # Check for key query terms
    query_words = set(w.lower() for w in query.split() if len(w) > 2)
    sentence_words = set(w.lower() for w in re.findall(r'\w+', sentence))
    overlap = query_words & sentence_words
    if query_words:
        score += (len(overlap) / len(query_words))
    
    # Normalize to 0-1
    return min(score / max_score, 1.0)


def extract_table_row(text: str, entities: Set[str]) -> Optional[str]:
    """
    If text appears to be a table, extract only the relevant row(s).
    
    Args:
        text: Text that may contain table data
        entities: Entities to match
        
    Returns:
        Extracted row(s) or None if not a table
    """
    # Check for markdown table pattern
    if '|' in text:
        lines = text.split('\n')
        header = None
        relevant_rows = []
        
        for line in lines:
            if '|' in line:
                # Check if this is the header separator (e.g., |---|---|)
                if re.match(r'^\|[\s\-:]+\|', line):
                    continue
                    
                # Check if any entity appears in this row
                line_lower = line.lower()
                for entity in entities:
                    if entity.lower() in line_lower:
                        if header is None and relevant_rows == []:
                            # Find header (first pipe-delimited line)
                            for h_line in lines:
                                if '|' in h_line and not re.match(r'^\|[\s\-:]+\|', h_line):
                                    header = h_line
                                    break
                        relevant_rows.append(line)
                        break
        
        if relevant_rows:
            result = []
            if header and header not in relevant_rows:
                result.append(header)
            result.extend(relevant_rows[:3])  # Max 3 matching rows
            return '\n'.join(result)
    
    return None


def extract_query_focused_content(
    query: str,
    chunk: str,
    max_sentences: int = 3,
    min_score_threshold: float = 0.15
) -> Tuple[str, List[str]]:
    """
    Extract only the query-relevant portions of a document chunk.
    
    This is the main extraction function that:
    1. Extracts entities from the query
    2. Tokenizes the chunk into sentences
    3. Scores each sentence for relevance
    4. Returns only the top-scoring sentences
    
    Args:
        query: User's original query
        chunk: Document chunk text
        max_sentences: Maximum number of sentences to return
        min_score_threshold: Minimum score to include a sentence
        
    Returns:
        Tuple of (focused_content, matched_entities)
    """
    if not query or not chunk:
        return ("No content available.", [])
    
    # Extract entities from query
    entities = extract_entities(query)
    
    # Check if this is table data - handle specially
    table_content = extract_table_row(chunk, entities)
    if table_content:
        matched = [e for e in entities if e.lower() in table_content.lower()]
        return (table_content.strip(), matched)
    
    # Tokenize into sentences
    sentences = tokenize_sentences(chunk)
    
    # Score each sentence
    scored_sentences: List[Tuple[float, str]] = []
    for sent in sentences:
        if len(sent.strip()) < 10:  # Skip very short fragments
            continue
        score = score_sentence(sent, query, entities)
        if score >= min_score_threshold:
            scored_sentences.append((score, sent))
    
    # Sort by score (highest first)
    scored_sentences.sort(key=lambda x: x[0], reverse=True)
    
    # Take top sentences
    top_sentences = [sent for score, sent in scored_sentences[:max_sentences]]
    
    # If no sentences pass threshold, return a "no match" message
    if not top_sentences:
        # Fall back to first meaningful sentence if available
        for sent in sentences:
            if len(sent.strip()) > 30:
                return (sent[:200] + "..." if len(sent) > 200 else sent, [])
        return ("No specific content matching your query was found in this document.", [])
    
    # Combine sentences, preserving order from original text
    sentence_order = {sent: i for i, sent in enumerate(sentences)}
    top_sentences.sort(key=lambda s: sentence_order.get(s, 999))
    
    focused_content = ' '.join(top_sentences)
    
    # Limit length
    if len(focused_content) > 500:
        focused_content = focused_content[:500] + "..."
    
    # Find which entities were actually matched
    matched_entities = []
    content_lower = focused_content.lower()
    for entity in entities:
        if entity.lower() in content_lower:
            matched_entities.append(entity)
    
    return (focused_content.strip(), matched_entities)


def highlight_entities_html(text: str, entities: List[str]) -> str:
    """
    Wrap matched entities in <mark> tags for frontend highlighting.
    
    Args:
        text: Text to highlight
        entities: List of entities to mark
        
    Returns:
        Text with <mark> tags around matched entities
    """
    if not entities or not text:
        return text
    
    result = text
    # Sort entities by length (longest first) to avoid partial replacements
    sorted_entities = sorted(entities, key=len, reverse=True)
    
    for entity in sorted_entities:
        # Case-insensitive replacement with original case preserved
        pattern = re.compile(re.escape(entity), re.IGNORECASE)
        result = pattern.sub(lambda m: f"<mark>{m.group()}</mark>", result)
    
    return result

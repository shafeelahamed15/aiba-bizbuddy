#!/usr/bin/env python3
"""
Quote Utilities for AIBA
Enhanced prompt parsing for complex steel quotations
"""

import re

def split_items_from_prompt(prompt):
    """
    Enhanced parser for complex steel quotation prompts
    Handles multiple items with dimensions, quantities, and rates
    
    Example input:
    "10x1250x6300- 4nos @84 and 12x1250×2500 - 2 nos @84"
    
    Returns:
    List of item dictionaries with description, quantity, rate, amount
    """
    items = []

    # Preprocess for splitting using 'and' and new lines as soft separators
    parts = re.split(r'\s+and\s+|\n|–', prompt)

    for part in parts:
        # Find rate
        rate_match = re.search(r'@ ?₹?(\d+)', part)
        if not rate_match:
            continue
        rate = float(rate_match.group(1))

        # Detect material grade
        grade = ""
        part_lower = part.lower()
        if "sail hard" in part_lower:
            grade = "Sail Hard Plate"
        elif "sa 515" in part_lower:
            grade = "SA 515 Grade 70"
        elif "plate" in part_lower:
            grade = "MS Plate"
        elif "tmt" in part_lower:
            grade = "TMT Bar"
        elif "angle" in part_lower:
            grade = "MS Angle"
        else:
            grade = "Steel Item"

        # Match dimensions and quantity - try different patterns
        # Pattern 1: "10x1250x6300- 4nos" or "10x1250x6300 - 4 nos"
        match = re.search(r'(\d+)[x×](\d+)[x×](\d+)\s*-?\s*(\d+)\s*(?:nos|pcs|plates?)', part, re.IGNORECASE)
        if not match:
            # Pattern 2: "4nos 10x1250x6300" (quantity first)
            match = re.search(r'(\d+)\s*(?:nos|pcs|plates?)\s*(\d+)[x×](\d+)[x×](\d+)', part, re.IGNORECASE)
            if match:
                nos = int(match.group(1))
                thk = int(match.group(2))
                width = int(match.group(3))
                length = int(match.group(4))
            else:
                continue
        else:
            thk = int(match.group(1))
            width = int(match.group(2))
            length = int(match.group(3))
            nos = int(match.group(4))

        # Calculate weight using steel formula: Weight (kg) = (Thickness × Width × Length × 7.85 × Nos) / 1,000,000
        weight = round((thk * width * length * 7.85 * nos) / 1_000_000, 2)
        amount = round(weight * rate, 2)

        # Format description with improved formatting
        description = f"{grade} – {thk}x{width}x{length} – {nos} Nos"

        items.append({
            "description": description,
            "quantity": weight,
            "rate": rate,
            "amount": amount
        })

    return items

def enhanced_steel_parser(prompt):
    """
    Enhanced steel parser that combines the new split_items_from_prompt
    with the existing AIBA parsing logic for better accuracy
    """
    
    # Try the new enhanced parser first
    items = split_items_from_prompt(prompt)
    
    if items:
        # Calculate totals
        subtotal = sum(item['amount'] for item in items)
        gst_amount = round(subtotal * 0.18, 2)
        grand_total = round(subtotal + gst_amount, 2)
        
        return {
            'success': True,
            'items': items,
            'subtotal': subtotal,
            'gst_amount': gst_amount,
            'grand_total': grand_total,
            'extraction_method': 'enhanced_parser'
        }
    
    # Fallback to basic parsing if enhanced parser doesn't find items
    return None

def format_steel_description(thickness, width, length, nos, grade="Steel Item"):
    """
    Format steel item description in the improved format
    
    Args:
        thickness: Thickness in mm
        width: Width in mm  
        length: Length in mm
        nos: Number of pieces
        grade: Steel grade/type
    
    Returns:
        Formatted description string
    """
    return f"{grade} – {thickness}x{width}x{length} – {nos} Nos"

def calculate_steel_weight(thickness, width, length, nos):
    """
    Calculate steel weight using the standard formula
    Weight (kg) = (Thickness × Width × Length × 7.85 × Nos) / 1,000,000
    
    Args:
        thickness: Thickness in mm
        width: Width in mm
        length: Length in mm  
        nos: Number of pieces
        
    Returns:
        Weight in kg (rounded to 2 decimal places)
    """
    # Formula: Weight = (T × W × L × density × quantity) / 1,000,000
    # Where density of steel = 7.85 g/cm³ = 0.00000785 kg/mm³
    weight = (thickness * width * length * 7.85 * nos) / 1_000_000
    return round(weight, 2)

def parse_dimensions(dimension_str):
    """
    Parse dimension string like "10x1250x6300" or "12x1250×2500"
    
    Args:
        dimension_str: String containing dimensions
        
    Returns:
        Tuple of (thickness, width, length) or None if not found
    """
    match = re.search(r'(\d+)[x×](\d+)[x×](\d+)', dimension_str)
    if match:
        return int(match.group(1)), int(match.group(2)), int(match.group(3))
    return None

def parse_quantity(qty_str):
    """
    Parse quantity string like "4nos", "2 nos", "3 pcs", "5 plates"
    
    Args:
        qty_str: String containing quantity
        
    Returns:
        Integer quantity or None if not found
    """
    match = re.search(r'(\d+)\s*(?:nos|pcs|plates?)', qty_str, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None

def parse_rate(rate_str):
    """
    Parse rate string like "@84", "@ ₹75", "@₹65"
    
    Args:
        rate_str: String containing rate
        
    Returns:
        Float rate or None if not found
    """
    match = re.search(r'@ ?₹?(\d+(?:\.\d+)?)', rate_str)
    if match:
        return float(match.group(1))
    return None 
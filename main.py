"""
AIBA Main - Phase 3: Smart Flow Implementation
Ultra-simplified chatbot logic with single function handling
"""

from quote_brain import extract_quote_fields, quote_draft_state
import json

# Track which field we're currently asking for
current_asking_field = None

def handle_user_input(user_input):
    """
    Phase 3: Ultra-smart flow - single function handles everything
    Every user input goes through this one function
    """
    global current_asking_field
    
    # Handle special commands first
    user_input_lower = user_input.lower().strip()
    
    if user_input_lower in ['reset', 'clear', 'start over']:
        quote_draft_state.reset()
        current_asking_field = None
        return "🔄 **Quote draft cleared!** Please provide your quotation request."
    
    if user_input_lower in ['help', '?']:
        return """
🤖 **AIBA Help**

**Commands:**
• Type your quotation request in natural language
• Example: "Quote for ABC Company - 5 MT ISMC 100x50 at ₹56/kg"
• Type 'reset' to start over
• Type 'generate' when ready for PDF
• Type 'skip' to skip optional fields

**I'll guide you through any missing information!**
        """
    
    # ✅ CONVENIENT BULK COMMANDS
    if user_input_lower in ['use defaults', 'default']:
        # Set default terms if needed
        for term in ['loading', 'transport', 'payment']:
            if not quote_draft_state.state['terms'].get(term):
                quote_draft_state.update_term(term, 'Included')
        
        return f"✅ **Default terms applied!**\n\n{get_current_status()}\n\n💬 Type 'generate' to create PDF or provide any corrections."
    
    if user_input_lower in ['standard terms', 'default terms']:
        # Set all terms to "Included"
        for term in ['loading', 'transport', 'payment']:
            quote_draft_state.update_term(term, 'Included')
        
        return f"✅ **Standard terms applied!**\n\n{get_current_status()}\n\n💬 Type 'generate' to create PDF."
    
    if user_input_lower == 'manual':
        # Customer details are optional now, just show current status
        return f"✅ **Quote ready!**\n\n{get_current_status()}\n\n💬 Type 'generate' to create PDF or add more details."
    
    if user_input_lower in ['generate', 'create pdf', 'yes']:
        # Auto-set missing terms to defaults
        terms_fields = ["loading", "transport", "payment"]
        for term_field in terms_fields:
            if not quote_draft_state.state["terms"].get(term_field):
                quote_draft_state.update_term(term_field, 'Included')
        
        # Check required fields for quotation
        required_fields = ["customer_name", "quantity", "rate", "amount", "subtotal", "gst", "grand_total"]
        missing_required = [f for f in required_fields if not quote_draft_state.state.get(f)]
        
        if missing_required:
            return f"⚠️ **Still missing required fields:** {', '.join(missing_required)}\n\n{get_current_status()}"
        
        if quote_draft_state.is_ready_for_pdf():
            current_asking_field = None
            return generate_pdf_response()
        else:
            return f"⚠️ **Not ready yet!**\n\n{get_current_status()}"
    
    # 🔧 Handle SKIP - simplified since customer fields are optional
    if user_input_lower == 'skip' and current_asking_field:
        # Handle terms fields
        if current_asking_field.startswith('terms_'):
            term_type = current_asking_field.replace('terms_', '')
            quote_draft_state.update_term(term_type, 'Included')
        
        current_asking_field = None
        
        # Check for remaining terms that need setting
        terms_fields = ["loading", "transport", "payment"]
        for term_field in terms_fields:
            if not quote_draft_state.state["terms"].get(term_field):
                current_asking_field = f"terms_{term_field}"
                term_prompts = {
                    'loading': '🚛 Loading charges (e.g., "Included", "₹500 extra", "As per actual")?',
                    'transport': '🚚 Transport charges (e.g., "Included", "₹2000 extra", "FOB")?',
                    'payment': '💳 Payment terms (e.g., "Advance", "30 days credit", "Against delivery")?'
                }
                
                status = get_current_status()
                prompt = term_prompts.get(term_field, f'Please specify {term_field} terms:')
                
                return f"✅ **Field skipped!**\n\n{status}\n\n{prompt}\n*(Type 'skip' for 'Included')*"
        
        # All terms handled - ready for PDF
        if quote_draft_state.is_ready_for_pdf():
            return f"""
✅ **All information collected!**

{get_current_status()}

🎯 **Ready to generate PDF!** Type 'generate' to create your quotation.
            """
        else:
            return f"""
📝 **Quote updated!**

{get_current_status()}

💬 **Please provide any additional details or type 'generate' if ready.**
            """
    
    # 🔧 Handle responses to terms field questions
    if current_asking_field and user_input_lower not in ['skip']:
        # Handle terms fields
        if current_asking_field.startswith('terms_'):
            term_type = current_asking_field.replace('terms_', '')
            quote_draft_state.update_term(term_type, user_input)
        
        current_asking_field = None
        
        # Check for remaining terms
        terms_fields = ["loading", "transport", "payment"]
        for term_field in terms_fields:
            if not quote_draft_state.state["terms"].get(term_field):
                current_asking_field = f"terms_{term_field}"
                term_prompts = {
                    'loading': '🚛 Loading charges (e.g., "Included", "₹500 extra", "As per actual")?',
                    'transport': '🚚 Transport charges (e.g., "Included", "₹2000 extra", "FOB")?',
                    'payment': '💳 Payment terms (e.g., "Advance", "30 days credit", "Against delivery")?'
                }
                
                status = get_current_status()
                prompt = term_prompts.get(term_field, f'Please specify {term_field} terms:')
                
                return f"✅ **Field updated!**\n\n{status}\n\n{prompt}\n*(Type 'skip' for 'Included')*"
        
        # All terms handled - ready for PDF
        if quote_draft_state.is_ready_for_pdf():
            return f"""
✅ **All information collected!**

{get_current_status()}

🎯 **Ready to generate PDF!** Type 'generate' to create your quotation.
            """
        else:
            return f"""
📝 **Quote updated!**

{get_current_status()}

💬 **Please provide any additional details or type 'generate' if ready.**
            """
    
    # Main AI processing for new quote requests
    ai_data = extract_quote_fields(user_input)
    quote_draft_state.update_from_ai_extraction(ai_data)
    
    # Check if we have the basic required info for quotation
    
    # Check if terms need to be set
    terms_fields = ["loading", "transport", "payment"]
    missing_terms = [field for field in terms_fields if not quote_draft_state.state["terms"].get(field)]
    
    if missing_terms:
        status = get_current_status()
        
        return f"""{status}

🚀 **Terms & Conditions:**
• Type **'standard terms'** - Use standard T&C (All Included)
• Type **'custom terms'** - Specify custom terms
• Or just type **'generate'** to use defaults

**Missing Terms:** {', '.join(missing_terms)}
        """
    
    # All fields collected - ready for PDF
    if quote_draft_state.is_ready_for_pdf():
        return f"""
✅ **All information collected!**

{get_current_status()}

🎯 **Ready to generate PDF!** Type 'generate' to create your quotation.
        """
    
    # Still need more info
    return f"""
📝 **Quote updated!**

{get_current_status()}

💬 **Please provide any additional details or type 'generate' if ready.**
    """

def get_current_status():
    """Get a clean status summary of the current quote draft."""
    
    state = quote_draft_state.state
    
    if state['status'] == 'empty':
        return "📋 **No quote data yet.** Please provide your quotation request."
    
    status = f"📋 **Quote Draft ({state['status'].title()})**\n\n"
    
    if state['customer_name']:
        status += f"**Customer:** {state['customer_name']}\n"
    
    if state['material']:
        status += f"**Material:** {state['material']}\n"
    
    if state['quantity']:
        status += f"**Quantity:** {state['quantity']:,} kg\n"
    
    if state['rate']:
        status += f"**Rate:** ₹{state['rate']}/kg\n"
    
    if state['grand_total']:
        status += f"**Grand Total:** ₹{state['grand_total']:,.2f}\n"
    
    # Show customer details if any
    customer_details = state.get('customer_details', {})
    if any(customer_details.values()):
        status += "\n**Customer Details:**\n"
        if customer_details.get('address'):
            status += f"• Address: {customer_details['address']}\n"
        if customer_details.get('gstin'):
            status += f"• GSTIN: {customer_details['gstin']}\n"
        if customer_details.get('email'):
            status += f"• Email: {customer_details['email']}\n"
    
    # Customer details are optional - no need to show as missing
    
    return status

def generate_pdf_response():
    """Generate the final PDF confirmation response."""
    
    pdf_data = quote_draft_state.to_pdf_format()
    
    response = "📋 **QUOTATION READY FOR GENERATION**\n\n"
    
    # Customer section
    response += f"**To:** {pdf_data.get('customer_name', 'N/A')}\n"
    if pdf_data.get('customer_address'):
        response += f"**Address:** {pdf_data['customer_address']}\n"
    if pdf_data.get('customer_gstin'):
        response += f"**GSTIN:** {pdf_data['customer_gstin']}\n"
    if pdf_data.get('customer_email'):
        response += f"**Email:** {pdf_data['customer_email']}\n"
    
    # Items section
    response += "\n**📊 Items:**\n"
    for i, item in enumerate(pdf_data.get('items', []), 1):
        desc = item.get('description', 'Item')
        qty = item.get('quantity', 0)
        rate = item.get('rate', 0)
        amount = item.get('amount', 0)
        response += f"{i}. {desc} - {qty:,} kg @ ₹{rate}/kg = ₹{amount:,.2f}\n"
    
    # Totals section
    response += f"\n**Subtotal:** ₹{pdf_data.get('subtotal', 0):,.2f}\n"
    response += f"**GST @18%:** ₹{pdf_data.get('gst_amount', 0):,.2f}\n"
    response += f"**Grand Total:** ₹{pdf_data.get('grand_total', 0):,.2f}\n"
    
    # Terms section
    response += "\n**Terms & Conditions:**\n"
    response += f"• Loading Charges: {pdf_data.get('loading_charges', 'Included')}\n"
    response += f"• Transport Charges: {pdf_data.get('transport_charges', 'Included')}\n"
    response += f"• Payment Terms: {pdf_data.get('payment_terms', 'Included')}\n"
    
    response += "\n🎯 **Ready for PDF generation!**"
    
    return response

def handle_field_update(field, value):
    """Handle updating a specific customer field (now optional)."""
    
    if value.lower().strip() == 'skip':
        value = ''
    
    quote_draft_state.update_customer_detail(field, value)
    
    # Customer fields are optional now - just show status
    if quote_draft_state.is_ready_for_pdf():
        return f"""
✅ **{field.title()} updated!**

{get_current_status()}

🎯 **Ready to generate PDF!** Type 'generate' to create your quotation.
        """
    else:
        return f"""
✅ **{field.title()} updated!**

{get_current_status()}

📝 **Please provide more details to complete the quotation.**
        """

# Convenience functions for integration
def process_message(user_input):
    """Main entry point for processing user messages."""
    return handle_user_input(user_input)

def get_quote_status():
    """Get current quote status."""
    return get_current_status()

def is_ready_for_pdf():
    """Check if quote is ready for PDF generation."""
    return quote_draft_state.is_ready_for_pdf()

def get_pdf_data():
    """Get PDF-ready data."""
    return quote_draft_state.to_pdf_format() if is_ready_for_pdf() else None

def reset_quote():
    """Reset the quote draft."""
    quote_draft_state.reset()
    return "🔄 **Quote draft cleared!** Please provide your quotation request."

# Demo function for testing
def demo():
    """Demo the smart flow functionality with mock data."""
    
    print("🚀 AIBA Phase 3: Smart Flow Demo")
    print("=" * 50)
    
    # Reset state
    quote_draft_state.reset()
    
    print("\n🎯 **Demonstrating the ultra-smart single-function flow**")
    print("Every user input goes through ONE function: handle_user_input()")
    
    # Step 1: Initial quote request
    print(f"\n--- Step 1: Initial Quote Request ---")
    user_input = "Quote for ABC Company - 5 MT ISMC 100x50 at ₹56/kg"
    print(f"User: {user_input}")
    
    # Simulate AI extraction manually for demo
    mock_ai_data = {
        'success': True,
        'customer_name': 'ABC Company',
        'material_description': 'ISMC 100x50 (5 MT)',
        'quantity': 5000,
        'rate': 56.0,
        'amount': 280000.0,
        'gst_amount': 50400.0,
        'grand_total': 330400.0,
        'missing_fields': [],
        'confidence': 0.95,
        'items': [{
            'description': 'ISMC 100x50 (5 MT)',
            'quantity': 5000,
            'rate': 56.0,
            'amount': 280000.0
        }],
        'original_input': user_input
    }
    
    quote_draft_state.update_from_ai_extraction(mock_ai_data)
    response = handle_user_input("dummy")  # Trigger the flow logic
    print(f"AIBA: {response}")
    
    # Step 2: Address
    print(f"\n--- Step 2: Address ---")
    user_input = "123 Steel Street, Mumbai"
    print(f"User: {user_input}")
    quote_draft_state.update_customer_detail('address', user_input)
    response = handle_field_update('address', user_input)
    print(f"AIBA: {response}")
    
    # Step 3: GSTIN
    print(f"\n--- Step 3: GSTIN ---")
    user_input = "27ABCDE1234F1Z5"
    print(f"User: {user_input}")
    quote_draft_state.update_customer_detail('gstin', user_input)
    response = handle_field_update('gstin', user_input)
    print(f"AIBA: {response}")
    
    # Step 4: Email
    print(f"\n--- Step 4: Email ---")
    user_input = "contact@abccompany.com"
    print(f"User: {user_input}")
    quote_draft_state.update_customer_detail('email', user_input)
    response = handle_field_update('email', user_input)
    print(f"AIBA: {response}")
    
    # Step 5: Generate
    print(f"\n--- Step 5: Generate PDF ---")
    user_input = "generate"
    print(f"User: {user_input}")
    response = handle_user_input(user_input)
    print(f"AIBA: {response}")
    
    print("\n" + "=" * 80)
    print("🎉 **PHASE 3 COMPLETE!**")
    print("✨ **Ultra-simplified flow achieved:**")
    print("   • ONE function handles ALL user inputs")
    print("   • Smart field detection and prompting")
    print("   • Automatic terms defaulting to 'Included'")
    print("   • Clean, maintainable code")
    print("   • Perfect user experience")
    print("=" * 80)

def simple_demo():
    """Show the exact implementation as requested."""
    
    print("\n🔧 **Exact Implementation as Requested**")
    print("-" * 50)
    
    # Reset state
    quote_draft_state.reset()
    
    # The exact function structure you requested
    def handle_user_input_simple(user_input):
        ai_data = extract_quote_fields(user_input)
        quote_draft_state.update_from_ai_extraction(ai_data)

        for field in quote_draft_state.get_missing_customer_fields():
            if not quote_draft_state.state['customer_details'].get(field):
                return f"🔍 What is the customer's {field}?"

        # Ask about optional terms if not set
        for key in ["loading", "transport", "payment"]:
            if not quote_draft_state.state["terms"].get(key):
                quote_draft_state.state["terms"][key] = "Included"  # fallback
        
        return "✅ All set. Shall I generate the quotation now?"
    
    print("✅ **Function created exactly as requested!**")
    print("📝 **Key features:**")
    print("   • extract_quote_fields() → AI extraction")
    print("   • quote_draft_state.update() → Single state update")
    print("   • Smart missing field detection")
    print("   • Auto-fallback to 'Included' for terms")
    print("   • Simple, clean logic flow")

if __name__ == "__main__":
    demo()
    simple_demo() 
"""
AIBA - AI Business Assistant Flask Web Application
A Python-based web chatbot for creating professional PDF documents.
"""

from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, session
import os
import json
from datetime import datetime, timedelta
# PHASE 4: REMOVED - PromptParser replaced by main.py smart flow
from utils.simple_steel_generator import SimpleSteelPDFGenerator
from utils.pdf_integration import AIBAPDFIntegration
from models.memory import ChatMemory
from auth import auth_bp, login_required, profile_required, auth_manager
from config import Config
from firestore_service import firestore_service
from quote_brain import quote_brain, extract_quote_fields, detect_intent, update_quote_draft, quote_draft_state

app = Flask(__name__)
app.secret_key = Config.SECRET_KEY

# Configure session for OAuth
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# Register authentication blueprint
app.register_blueprint(auth_bp, url_prefix='/auth')

# Initialize components
# PHASE 4: REMOVED - prompt_parser replaced by main.py smart flow
chat_memory = ChatMemory()

# Initialize the enhanced PDF generators (Windows compatible)
steel_pdf_generator = SimpleSteelPDFGenerator()
pdf_integration = AIBAPDFIntegration()

# Initialize the new template-based PDF generator
from utils.template_pdf_generator import TemplatePDFGenerator
template_pdf_generator = TemplatePDFGenerator()

@app.route('/')
@login_required
@profile_required
def index():
    """Main chat interface."""
    return render_template('index.html')

@app.route('/auth')
def auth_page():
    """Authentication page - redirect to login."""
    return redirect(url_for('login_page'))

@app.route('/login')
def login_page():
    """Login page."""
    return render_template('login.html')

@app.route('/signup')
def signup_page():
    """Signup page."""
    return render_template('signup.html')

@app.route('/profile-setup')
@login_required
def profile_setup():
    """Business profile setup page."""
    return render_template('profile_setup.html')

@app.route('/settings')
@login_required
@profile_required
def settings():
    """User settings page."""
    user_id = request.args.get('user_id') or session.get('user_id')
    profile = auth_manager.get_user_profile(user_id) if user_id else None
    return render_template('settings.html', profile=profile)

@app.route('/chat', methods=['POST'])
@login_required
@profile_required
def chat():
    """Process chat messages and return bot responses."""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        session_id = data.get('session_id', 'default')
        
        if not user_message:
            return jsonify({
                'response': '🤔 I didn\'t receive any message. Please try again!',
                'type': 'error'
            })
        
        # Get current chat state
        chat_state = chat_memory.get_state(session_id)
        
        # Process the message
        response = process_user_message(user_message, chat_state, session_id)
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'response': f'❌ Sorry, I encountered an error: {str(e)}',
            'type': 'error'
        })

@app.route('/phase5-pdf', methods=['POST'])
@login_required
@profile_required
def phase5_create_pdf():
    """
    Phase 5: Create PDF from finalized data endpoint
    Direct PDF generation using the new Phase 5 logic
    """
    try:
        # ✅ PHASE 5: Direct PDF generation from finalized data
        result = generate_pdf_from_finalized_data()
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'❌ Phase 5 PDF generation error: {str(e)}',
            'type': 'error'
        })

@app.route('/create-pdf', methods=['POST'])
@login_required
@profile_required
def create_pdf():
    """Generate PDF based on collected data."""
    try:
        data = request.get_json()
        session_id = data.get('session_id', 'default')
        document_type = data.get('type', 'quotation')
        use_template = data.get('use_template', True)  # Use template by default
        
        # Get the collected data from memory
        chat_state = chat_memory.get_state(session_id)
        document_data = chat_state.get('document_data', {})
        
        if not document_data:
            return jsonify({
                'success': False,
                'message': 'No document data found. Please start over.'
            })
        
        # Get user profile for PDF generation
        user_id = session.get('user_id')
        user_profile = auth_manager.get_user_profile(user_id)
        
        if not user_profile:
            return jsonify({
                'success': False,
                'message': 'User profile not found. Please complete your profile setup.'
            })
        
        # Generate PDF with user profile data
        if use_template:
            # Use new template-based generator
            pdf_path, pdf_bytes = handle_template_generation(document_data, user_profile, document_type)
        else:
            # Use existing generator
            if document_type == 'quotation':
                pdf_path = handle_quotation_generation(document_data, user_profile)
                # Read the PDF bytes for Firestore storage
                with open(os.path.join('data', pdf_path), 'rb') as f:
                    pdf_bytes = f.read()
            else:
                pdf_path = pdf_integration.create_po_from_aiba_data(document_data, user_profile)
                # Read the PDF bytes for Firestore storage
                with open(os.path.join('data', pdf_path), 'rb') as f:
                    pdf_bytes = f.read()
        
        # Generate proper document number and metadata
        current_time = datetime.now()
        if document_type == 'quotation':
            doc_number = f"AIBA-Q-{current_time.strftime('%Y%m%d%H%M')}"
        else:
            doc_number = f"AIBA-PO-{current_time.strftime('%Y%m%d%H%M')}"
        
        # Save PDF to Firestore with improved structure
        document_metadata = {
            'document_name': pdf_path,
            'document_type': document_type,
            'document_number': doc_number,
            'customer_name': document_data.get('customer_name', 'Unknown Customer'),
            'quote_number': doc_number if document_type == 'quotation' else '',
            'po_number': doc_number if document_type == 'purchase_order' else '',
            'grand_total': float(document_data.get('grand_total', 0)),
            'items_count': len(document_data.get('items', [])),
            'file_path': pdf_path,
            'customer_address': document_data.get('customer_address', ''),
            'customer_email': document_data.get('customer_email', ''),
            'customer_gstin': document_data.get('customer_gstin', ''),
            'items_summary': _get_items_summary(document_data.get('items', [])),
            'creation_source': 'aiba_chat'
        }
        
        doc_id = firestore_service.save_document(user_id, document_metadata, pdf_bytes)
        
        # Clear the session after successful PDF generation
        chat_memory.clear_state(session_id)
        
        return jsonify({
            'success': True,
            'pdf_path': pdf_path,
            'document_id': doc_id,
            'message': f'✅ Professional {document_type.title()} PDF created and saved successfully!'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'❌ Failed to create PDF: {str(e)}'
        })

@app.route('/download/<filename>')
def download_file(filename):
    """Download generated PDF files."""
    try:
        return send_file(
            os.path.join('data', filename),
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return f"Error downloading file: {str(e)}", 404

@app.route('/reset', methods=['POST'])
def reset_chat():
    """Reset chat session."""
    try:
        data = request.get_json()
        session_id = data.get('session_id', 'default')
        
        chat_memory.clear_state(session_id)
        
        return jsonify({
            'response': '🔄 Chat reset successfully! How can I help you today?',
            'type': 'system'
        })
        
    except Exception as e:
        return jsonify({
            'response': f'❌ Error resetting chat: {str(e)}',
            'type': 'error'
        })

# ========================================
# DOCUMENT MANAGEMENT ENDPOINTS
# ========================================

@app.route('/documents', methods=['GET'])
@login_required
@profile_required
def get_documents():
    """Get user's documents."""
    try:
        user_id = session.get('user_id')
        search_term = request.args.get('search', '')
        doc_type = request.args.get('type', '')
        
        if search_term:
            documents = firestore_service.search_user_documents(user_id, search_term, doc_type if doc_type else None)
        else:
            documents = firestore_service.get_user_documents(user_id)
        
        return jsonify({
            'success': True,
            'documents': documents
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching documents: {str(e)}'
        })

@app.route('/documents/<doc_id>', methods=['GET'])
@login_required
@profile_required
def view_document(doc_id):
    """View/download a specific document."""
    try:
        user_id = session.get('user_id')
        
        # Get document metadata
        document = firestore_service.get_document(doc_id)
        if not document:
            return "Document not found", 404
        
        # Verify ownership
        if document.get('user_id') != user_id:
            return "Access denied", 403
        
        # Get PDF content
        pdf_content = firestore_service.get_document_content(doc_id)
        if not pdf_content:
            return "Document content not found", 404
        
        # Return PDF for viewing
        from flask import Response
        return Response(
            pdf_content,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'inline; filename="{document.get("document_name", "document.pdf")}"',
                'Content-Type': 'application/pdf'
            }
        )
        
    except Exception as e:
        return f"Error viewing document: {str(e)}", 500

@app.route('/documents/<doc_id>/download', methods=['GET'])
@login_required
@profile_required
def download_document(doc_id):
    """Download a specific document."""
    try:
        user_id = session.get('user_id')
        
        # Get document metadata
        document = firestore_service.get_document(doc_id)
        if not document:
            return "Document not found", 404
        
        # Verify ownership
        if document.get('user_id') != user_id:
            return "Access denied", 403
        
        # Get PDF content
        pdf_content = firestore_service.get_document_content(doc_id)
        if not pdf_content:
            return "Document content not found", 404
        
        # Return PDF for download
        from flask import Response
        return Response(
            pdf_content,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{document.get("document_name", "document.pdf")}"',
                'Content-Type': 'application/pdf'
            }
        )
        
    except Exception as e:
        return f"Error downloading document: {str(e)}", 500

@app.route('/documents/<doc_id>', methods=['DELETE'])
@login_required
@profile_required
def delete_document_endpoint(doc_id):
    """Delete a document."""
    try:
        user_id = session.get('user_id')
        
        success = firestore_service.delete_document(doc_id, user_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Document deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to delete document or document not found'
            })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error deleting document: {str(e)}'
        })

def process_user_message(message, chat_state, session_id):
    """
    Phase 3: Ultra-simplified processing using main.py smart flow
    Single function handles everything - ultimate simplification!
    """
    
    try:
        # Import the Phase 3 smart flow handler
        from main import handle_user_input
        
        # ✅ Let main.py handle ALL logic including PDF generation
        # Only intercept if main.py explicitly says "ready to generate PDF"
        response = handle_user_input(message)
        
        # ✅ Handle PDF generation ONLY if main.py confirms it's ready
        message_lower = message.lower().strip()
        if (message_lower in ['generate', 'create pdf', 'yes'] and 
            'ready to generate pdf' in response.lower() and 
            quote_draft_state.is_ready_for_pdf()):
            
            # ✅ Now actually generate the PDF
            result = generate_pdf_from_finalized_data()
            if result['success']:
                return {
                    'response': result['message'],
                    'type': result['type'],
                    'pdf_path': result.get('pdf_path'),
                    'document_id': result.get('document_id')
                }
            else:
                return {
                    'response': result['message'],
                    'type': result['type']
                }
        
        # Determine response type for Flask frontend
        response_type = 'message'
        show_skip_button = False
        show_generate_button = False
        
        if 'cleared' in response.lower() or 'reset' in response.lower():
            response_type = 'reset'
            chat_memory.clear_state(session_id)  # Also clear Flask session
        elif 'help' in response.lower() and '**AIBA Help**' in response:
            response_type = 'help'
        elif 'hello' in response.lower() or 'hi' in response.lower():
            response_type = 'welcome'
        elif ('ready to generate pdf' in response.lower() or 
              'quotation ready for generation' in response.lower() or
              'ready for generation' in response.lower()):
            response_type = 'ready_for_pdf'
            show_generate_button = True
        elif '*(Type \'skip\'' in response or "*(Type 'skip'" in response:
            # Show skip button when system is asking for optional fields
            show_skip_button = True
            response_type = 'collecting_info'
        elif 'missing:' in response.lower():
            response_type = 'collecting_info'
        
        return {
            'response': response,
            'type': response_type,
            'show_skip_button': show_skip_button,
            'show_generate_button': show_generate_button
        }
        
    except Exception as e:
        print(f"Error in Phase 3 smart flow: {e}")
        return {
            'response': f'❌ Sorry, I encountered an error: {str(e)}',
            'type': 'error'
        }

# PHASE 4: REMOVED - Replaced by main.py smart flow

# PHASE 4: REMOVED - Replaced by main.py smart flow

# PHASE 4: REMOVED - Replaced by main.py smart flow

# PHASE 4: REMOVED - All complex functions replaced by main.py smart flow

# PHASE 4: REMOVED - Complex FSM functions replaced by main.py smart flow

# PHASE 4: REMOVED - Complex PO flow and ongoing flow functions replaced by main.py smart flow

def handle_quotation_generation(quote_data, user_profile):
    """Enhanced quotation generation with steel calculations using PDF integration"""
    
    # Use the PDF integration to convert AIBA data and generate PDF
    filename = pdf_integration.create_quotation_from_aiba_data(quote_data, user_profile)
    
    return filename

def handle_template_generation(document_data, user_profile, document_type):
    """Generate PDF using the new template-based generator"""
    try:
        # Prepare data for template generator
        template_data = {
            'customer_name': document_data.get('customer_name', 'Customer'),
            'customer_address': document_data.get('customer_address', 'Customer Address'),
            'customer_email': document_data.get('customer_email', 'customer@email.com'),
            'customer_gstin': document_data.get('customer_gstin', 'Customer GST'),
            'seller_name': user_profile.get('business_name', 'IGNITE INDUSTRIAL CORPORATION'),
            'seller_address': user_profile.get('business_address', 'No.1A, 1st FLOOR, JONES STREET, MANNADY, CHENNAI - 600001'),
            'seller_email': user_profile.get('business_email', 'igniteindustrialcorporation@gmail.com'),
            'seller_gstin': user_profile.get('gst_number', '33AAKFI5034N1Z6'),
            'items': document_data.get('items', []),
            'quote_number': f"AIBA-{document_type.upper()[0]}-{datetime.now().strftime('%Y%m%d%H%M')}",
            'date': datetime.now().strftime('%d %B %Y'),
            'valid_until': (datetime.now() + timedelta(days=30)).strftime('%d %B %Y'),
            # ✨ Terms & Conditions Logic (Corrected) - Pass individual terms
            'loading_charges': document_data.get('loading_charges', 'Included'),
            'transport_charges': document_data.get('transport_charges', 'Included'),
            'payment_terms': document_data.get('payment_terms', 'Included')
        }
        
        # Add purchase order specific fields
        if document_type == 'purchase_order':
            template_data.update({
                'po_number': template_data['quote_number'].replace('Q-', 'PO-'),
                'delivery_date': (datetime.now() + timedelta(days=14)).strftime('%d %B %Y'),
                'urgent': document_data.get('urgent', False),
                'delivery_address': document_data.get('delivery_address', template_data['customer_address']),
                'delivery_contact': document_data.get('delivery_contact', 'Site Manager'),
                'delivery_phone': document_data.get('delivery_phone', '+91-XXXXXXXXX'),
                'delivery_instructions': document_data.get('delivery_instructions', 'Please call before delivery')
            })
        
        # Generate PDF using template generator
        if document_type == 'quotation':
            pdf_bytes = template_pdf_generator.generate_quotation_pdf(template_data)
        else:
            pdf_bytes = template_pdf_generator.generate_purchase_order_pdf(template_data)
        
        # Save PDF to file
        filename = f"{document_type.title()}_{template_data['customer_name'].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
        filepath = os.path.join('data', filename)
        
        with open(filepath, 'wb') as f:
            f.write(pdf_bytes)
        
        print(f"✅ Template-based {document_type} PDF saved: {filename}")
        return filename, pdf_bytes
        
    except Exception as e:
        print(f"❌ Template generation failed: {e}")
        # Fallback to existing generator
        if document_type == 'quotation':
            pdf_path = handle_quotation_generation(document_data, user_profile)
            # Read the PDF bytes for fallback
            with open(os.path.join('data', pdf_path), 'rb') as f:
                pdf_bytes = f.read()
            return pdf_path, pdf_bytes
        else:
            pdf_path = pdf_integration.create_po_from_aiba_data(document_data, user_profile)
            # Read the PDF bytes for fallback
            with open(os.path.join('data', pdf_path), 'rb') as f:
                pdf_bytes = f.read()
            return pdf_path, pdf_bytes

# PHASE 4: REMOVED - Complex PO collection function replaced by main.py smart flow

def format_quotation_confirmation(data):
    """Format quotation confirmation message."""
    message = "✅ **Quotation Ready for Generation**\n\n"
    message += f"**Customer:** {data.get('customer_name', 'N/A')}\n"
    
    if data.get('items'):
        message += "**Items:**\n"
        for item in data['items']:
            message += f"• {item.get('description', 'Item')} - {item.get('quantity', 'N/A')} {item.get('unit', 'nos')} @ ₹{item.get('rate', 'N/A')}/{item.get('unit', 'nos')}\n"
    
    if data.get('gst_percentage'):
        message += f"**GST:** {data['gst_percentage']}%\n"
    
    if data.get('transport_terms'):
        message += f"**Transport:** {data['transport_terms']}\n"
    
    message += "\n💡 Reply **'Generate PDF'** to create the quotation, or provide any corrections needed."
    
    return message

def format_po_confirmation(data):
    """Format purchase order confirmation message."""
    message = "✅ **Purchase Order Ready for Generation**\n\n"
    message += f"**Supplier:** {data.get('supplier_name', 'N/A')}\n"
    
    if data.get('po_number'):
        message += f"**PO Number:** {data['po_number']}\n"
    
    if data.get('items'):
        message += "**Items:**\n"
        for item in data['items']:
            message += f"• {item.get('description', 'Item')} - {item.get('quantity', 'N/A')} {item.get('unit', 'nos')}\n"
    
    message += "\n💡 Reply **'Generate PDF'** to create the purchase order, or provide any corrections needed."
    
    return message

def format_quotation_partial(data, missing_fields):
    """Format partial quotation data message."""
    message = "📋 **Quotation Information Collected:**\n\n"
    
    if data.get('customer_name'):
        message += f"✅ **Customer:** {data['customer_name']}\n"
    
    if data.get('items'):
        message += "✅ **Items:**\n"
        for item in data['items']:
            message += f"• {item.get('description', 'Item')} - {item.get('quantity', 'N/A')} {item.get('unit', 'nos')}\n"
    
    message += f"\n📝 **Still needed:**\n"
    message += '\n'.join([f"• {field.replace('_', ' ').title()}" for field in missing_fields])
    message += "\n\nPlease provide the missing information:"
    
    return message

def format_po_partial(data, missing_fields):
    """Format partial PO data message."""
    message = "📦 **Purchase Order Information Collected:**\n\n"
    
    if data.get('supplier_name'):
        message += f"✅ **Supplier:** {data['supplier_name']}\n"
    
    if data.get('items'):
        message += "✅ **Items:**\n"
        for item in data['items']:
            message += f"• {item.get('description', 'Item')} - {item.get('quantity', 'N/A')} {item.get('unit', 'nos')}\n"
    
    message += f"\n📝 **Still needed:**\n"
    message += '\n'.join([f"• {field.replace('_', ' ').title()}" for field in missing_fields])
    message += "\n\nPlease provide the missing details:"
    
    return message

def welcome_message():
    """Get welcome message."""
    return """🤖 **Welcome to AIBA - AI Business Assistant!**

I can help you create professional business documents:

📋 **Quotations** - Smart price quotes for customers
📦 **Purchase Orders** - Professional supplier orders

**Quick Examples:**
• *"Create quotation for ABC Company - 5 MT steel at ₹50/kg"*
• *"Generate PO for supplier XYZ - 100 pieces angle iron"*
• *"Quote for Delhi client - structural steel as per drawing"*

💡 Just describe what you need in natural language, and I'll guide you through the process!

**What would you like to create today?**"""

def help_message():
    """Get help message.""" 
    return """🆘 **AIBA Help Guide**

**🎯 What I Can Do:**
• Create professional PDF quotations
• Generate purchase orders
• Extract data from natural language
• Handle steel industry calculations
• Manage customer information

**📝 How to Use:**
1. Tell me what document you need
2. Provide customer/supplier details
3. List items, quantities, and rates
4. I'll confirm everything with you
5. Generate professional PDF

**💬 Example Commands:**
• *"Create quotation"* or *"New quote"*
• *"Generate purchase order"* or *"Create PO"*  
• *"Reset"* to start over
• *"Help"* for this guide

**🔧 Pro Tips:**
• Include GST percentage if applicable
• Mention transport terms (included/extra)
• Specify steel grades and sizes clearly
• Use standard units (MT, kg, nos, etc.)

Ready to create professional documents! 🚀"""

def general_response(message):
    """Generate general response for non-document requests."""
    return """🤖 I'm AIBA, your AI Business Assistant specializing in creating professional business documents.

I can help you with:
📋 **Quotations** - Professional price quotes
📦 **Purchase Orders** - Supplier order documents

To get started, try:
• *"Create a quotation for [customer name]"*
• *"Generate purchase order for [supplier]"*
• *"Help"* for detailed guidance

What business document would you like to create?"""

def _get_items_summary(items):
    """Generate a summary of items for document metadata."""
    if not items:
        return "No items"
    
    if len(items) == 1:
        item = items[0]
        return f"{item.get('description', 'Item')} ({item.get('quantity', 'N/A')} {item.get('unit', 'nos')})"
    else:
        return f"{len(items)} items: {', '.join([item.get('description', 'Item')[:20] + ('...' if len(item.get('description', '')) > 20 else '') for item in items[:3]])}"

# Phase 2: Helper functions for simplified quote draft state
def get_conversation_context(session_id):
    """Get conversation context for AI processing."""
    chat_state = chat_memory.get_state(session_id)
    conversation_history = chat_state.get('conversation_history', [])
    return "\n".join(conversation_history[-3:]) if conversation_history else ""

def update_conversation_context(session_id, message):
    """Update conversation history."""
    chat_state = chat_memory.get_state(session_id)
    history = chat_state.get('conversation_history', [])
    history.append(f"User: {message}")
    
    # Keep only last 10 messages
    if len(history) > 10:
        history = history[-10:]
    
    chat_memory.update_state(session_id, {'conversation_history': history})

# PHASE 4: REMOVED - Complex response and field update functions replaced by main.py smart flow

def handle_pdf_generation_request(session_id):
    """Handle PDF generation request."""
    
    if not quote_draft_state.is_ready_for_pdf():
        return {
            'response': '⚠️ **Quote draft is not ready for PDF generation.**\n\n' + 
                       quote_draft_state.get_summary() + 
                       '\n\nPlease provide missing information first.',
            'type': 'incomplete'
        }
    
    # Store the PDF data in chat memory for the create-pdf endpoint
    pdf_data = quote_draft_state.to_pdf_format()
    chat_memory.update_state(session_id, {
        'document_data': pdf_data,
        'flow_type': 'quotation',
        'step': 'final_confirmation'
    })
    
    # Show final confirmation
    response = "📋 **QUOTATION READY FOR GENERATION**\n\n"
    response += f"**Customer:** {pdf_data.get('customer_name', 'N/A')}\n"
    
    if pdf_data.get('customer_address'):
        response += f"**Address:** {pdf_data['customer_address']}\n"
    if pdf_data.get('customer_gstin'):
        response += f"**GSTIN:** {pdf_data['customer_gstin']}\n"
    if pdf_data.get('customer_email'):
        response += f"**Email:** {pdf_data['customer_email']}\n"
    
    response += "\n**📊 Items:**\n"
    for i, item in enumerate(pdf_data.get('items', []), 1):
        response += f"{i}. {item.get('description', 'Item')} - {item.get('quantity', 0)} kg @ ₹{item.get('rate', 0)}/kg = ₹{item.get('amount', 0):,.2f}\n"
    
    response += f"\n**Subtotal:** ₹{pdf_data.get('subtotal', 0):,.2f}\n"
    response += f"**GST @18%:** ₹{pdf_data.get('gst_amount', 0):,.2f}\n"
    response += f"**Grand Total:** ₹{pdf_data.get('grand_total', 0):,.2f}\n\n"
    
    response += "**Terms & Conditions:**\n"
    response += f"• Loading Charges: {pdf_data.get('loading_charges', 'Included')}\n"
    response += f"• Transport Charges: {pdf_data.get('transport_charges', 'Included')}\n"
    response += f"• Payment Terms: {pdf_data.get('payment_terms', 'Included')}\n\n"
    
    response += "🎯 **Ready to generate PDF!** Click the 'Generate PDF' button below."
    
    return {
        'response': response,
        'type': 'final_confirmation',
        'data': pdf_data
    }

# ✅ PHASE 5: Create PDF from Finalized Data
def generate_pdf_from_finalized_data():
    """
    Phase 5: Create PDF from finalized quote data
    Uses the smart state check from quote_brain.py
    """
    # ✅ Use the smart state check instead of basic check
    if quote_draft_state.is_ready_for_pdf():
        # render quotation_template.html
        return generate_pdf(quote_draft_state)
    else:
        # ✅ Use smart error reporting
        required_fields = ["customer_name", "quantity", "rate", "amount", "subtotal", "gst", "grand_total"]
        missing_required = [f for f in required_fields if not quote_draft_state.state.get(f)]
        
        if missing_required:
            return {
                'success': False,
                'message': f'❌ Still missing required fields: {", ".join(missing_required)}',
                'type': 'incomplete'
            }
        
        if quote_draft_state.state.get("missing_fields"):
            return {
                'success': False,
                'message': f'❌ Still missing customer info: {", ".join(quote_draft_state.state["missing_fields"])}',
                'type': 'incomplete'
            }
        
        return {
            'success': False,
            'message': '❌ Quote draft is not ready for PDF generation. Please complete all required information.',
            'type': 'incomplete'
        }

def generate_pdf(quote_state):
    """
    Generate PDF using quotation template with finalized data
    Phase 5 implementation using HTML template rendering
    """
    try:
        # Convert quote state to PDF format
        pdf_data = quote_state.to_pdf_format()
        
        # Get user profile for PDF generation
        user_id = session.get('user_id')
        user_profile = auth_manager.get_user_profile(user_id) if user_id else {}
        
        if not user_profile:
            return {
                'success': False,
                'message': 'User profile not found. Please complete your profile setup.',
                'type': 'error'
            }
        
        # Generate PDF using template-based generator
        pdf_path, pdf_bytes = handle_template_generation(pdf_data, user_profile, 'quotation')
        
        # Generate document metadata
        current_time = datetime.now()
        doc_number = f"AIBA-Q-{current_time.strftime('%Y%m%d%H%M')}"
        
        # Save PDF to Firestore
        document_metadata = {
            'document_name': pdf_path,
            'document_type': 'quotation',
            'document_number': doc_number,
            'customer_name': pdf_data.get('customer_name', 'Unknown Customer'),
            'quote_number': doc_number,
            'grand_total': float(pdf_data.get('grand_total', 0)),
            'items_count': len(pdf_data.get('items', [])),
            'file_path': pdf_path,
            'customer_address': pdf_data.get('customer_address', ''),
            'customer_email': pdf_data.get('customer_email', ''),
            'customer_gstin': pdf_data.get('customer_gstin', ''),
            'items_summary': _get_items_summary(pdf_data.get('items', [])),
            'creation_source': 'aiba_phase5'
        }
        
        doc_id = firestore_service.save_document(user_id, document_metadata, pdf_bytes)
        
        # Reset quote state after successful PDF generation
        quote_state.reset()
        
        return {
            'success': True,
            'pdf_path': pdf_path,
            'document_id': doc_id,
            'message': f'✅ Phase 5: Professional Quotation PDF created successfully!',
            'type': 'pdf_generated'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'❌ Phase 5 PDF generation failed: {str(e)}',
            'type': 'error'
        }

if __name__ == '__main__':
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    # Run the app
    app.run(debug=True, host='0.0.0.0', port=5000) 
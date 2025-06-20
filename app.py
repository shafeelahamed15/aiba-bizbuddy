"""
AIBA - AI Business Assistant Flask Web Application
A Python-based web chatbot for creating professional PDF documents.
"""

from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, session
import os
import json
from datetime import datetime, timedelta
from utils.prompt_parser import PromptParser
from utils.simple_steel_generator import SimpleSteelPDFGenerator
from utils.pdf_integration import AIBAPDFIntegration
from models.memory import ChatMemory
from auth import auth_bp, login_required, profile_required, auth_manager
from config import Config
from firestore_service import firestore_service

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
prompt_parser = PromptParser()
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
    """Process user message and return appropriate response."""
    message_lower = message.lower().strip()
    
    # Handle greetings and basic commands
    if message_lower in ['hi', 'hello', 'hey', 'start']:
        return {
            'response': welcome_message(),
            'type': 'welcome'
        }
    
    if message_lower in ['help']:
        return {
            'response': help_message(),
            'type': 'help'
        }
    
    if message_lower in ['reset', 'start over', 'clear']:
        chat_memory.clear_state(session_id)
        return {
            'response': '🔄 Chat cleared! How can I help you today?',
            'type': 'system'
        }
    
    # Check if we're in the middle of collecting data
    current_flow = chat_state.get('flow_type')
    
    if current_flow:
        return handle_ongoing_flow(message, chat_state, session_id)
    else:
        return handle_new_request(message, chat_state, session_id)

def handle_new_request(message, chat_state, session_id):
    """Handle new document creation requests."""
    # Detect intent
    intent = prompt_parser.detect_intent(message)
    
    if intent == 'quotation':
        return start_quotation_flow(message, session_id)
    elif intent == 'purchase_order':
        return start_po_flow(message, session_id)
    else:
        return {
            'response': general_response(message),
            'type': 'general'
        }

def start_quotation_flow(message, session_id):
    """🧠 STEP 1: EXTRACT FIELDS FROM PROMPT - Enhanced conversational quotation flow."""
    # Extract data using intelligent parsing
    extracted_data = prompt_parser.extract_quotation_data(message)
    
    if extracted_data and extracted_data.get('customer_name'):
        # We got basic quotation data, now check for missing customer details
        customer_name = extracted_data.get('customer_name')
        
        # Initialize enhanced chat state with workflow tracking
        chat_memory.update_state(session_id, {
            'flow_type': 'quotation',
            'step': 'checking_customer_details',
            'document_data': extracted_data,
            'original_message': message,
            'missing_fields': [],
            'current_field': None
        })
        
        # Check for missing customer details
        missing_customer_fields = []
        if not extracted_data.get('customer_address'):
            missing_customer_fields.append('address')
        if not extracted_data.get('customer_gstin'):
            missing_customer_fields.append('gstin')
        if not extracted_data.get('customer_email'):
            missing_customer_fields.append('email')
        
        if missing_customer_fields:
            # Ask for missing customer details
            chat_memory.update_state(session_id, {
                'flow_type': 'quotation',
                'step': 'collecting_customer_details',
                'document_data': extracted_data,
                'missing_fields': missing_customer_fields,
                'current_field': missing_customer_fields[0]
            })
            
            # Show extracted data and ask for missing info
            response = f"✅ **Quotation Details Extracted:**\n\n"
            response += f"**Customer:** {customer_name}\n"
            
            if extracted_data.get('items'):
                item = extracted_data['items'][0]
                response += f"**Product:** {item.get('description', 'N/A')}\n"
                response += f"**Quantity:** {item.get('quantity', 'N/A')} kg\n"
                response += f"**Rate:** ₹{item.get('rate', 'N/A')}/kg\n"
                if 'subtotal' in extracted_data:
                    response += f"**Subtotal:** ₹{extracted_data['subtotal']:,.2f}\n"
                    response += f"**GST @18%:** ₹{extracted_data['gst_amount']:,.2f}\n"
                    response += f"**Grand Total:** ₹{extracted_data['grand_total']:,.2f}\n"
            
            response += f"\n🗣️ **To complete the quotation for {customer_name}, I need a few more details:**\n\n"
            
            # Ask for the first missing field
            if 'address' in missing_customer_fields:
                response += "📍 **What is the full address of the customer?**\n"
                response += "*(Type 'skip' to leave blank)*"
            
            return {
                'response': response,
                'type': 'customer_details_collection',
                'data': extracted_data,
                'show_skip_button': True
            }
        else:
            # All customer details present, check terms & conditions
            return check_terms_and_conditions(extracted_data, session_id)
    else:
        # No usable data extracted, ask for basic info
        chat_memory.update_state(session_id, {
            'flow_type': 'quotation',
            'step': 'collecting_basic_info',
            'document_data': {},
            'original_message': message
        })
        
        return {
            'response': '📋 I\'ll help you create a quotation! Let me gather some information:\n\n' +
                       '**Please provide your quotation request in natural language, for example:**\n' +
                       '*"Quote for ABC Company - 5 MT ISMC 100x50 at ₹56/kg"*\n\n' +
                       'Or share the customer name and items needed:',
            'type': 'basic_collection'
        }

def check_terms_and_conditions(extracted_data, session_id):
    """🧾 STEP 3: HANDLE MISSING TERMS & CONDITIONS"""
    # Check if terms are missing
    has_loading = extracted_data.get('loading_charges')
    has_transport = extracted_data.get('transport_charges') 
    has_payment = extracted_data.get('payment_terms')
    
    if not has_loading or not has_transport or not has_payment:
        # Ask for terms & conditions
        chat_memory.update_state(session_id, {
            'flow_type': 'quotation',
            'step': 'collecting_terms',
            'document_data': extracted_data,
            'terms_to_collect': {
                'loading_charges': not has_loading,
                'transport_charges': not has_transport,
                'payment_terms': not has_payment
            },
            'current_term': 'loading_charges' if not has_loading else ('transport_charges' if not has_transport else 'payment_terms')
        })
        
        response = "🗣️ **Would you like to enter the following Terms & Conditions?**\n"
        response += "*(If skipped, they will be set to default: Included)*\n\n"
        
        if not has_loading:
            response += "💰 **Loading Charges** (default: Included)\n"
            response += "Please specify loading charges or click 'Use Default' for 'Included':"
        
        return {
            'response': response,
            'type': 'terms_collection',
            'data': extracted_data,
            'show_skip_button': True,
            'skip_button_text': 'Use Default'
        }
    else:
        # All terms present, show final confirmation
        return show_final_confirmation(extracted_data, session_id)

def show_final_confirmation(extracted_data, session_id):
    """🔁 FINAL CONFIRMATION STEP"""
    chat_memory.update_state(session_id, {
        'flow_type': 'quotation',
        'step': 'final_confirmation',
        'document_data': extracted_data
    })
    
    # Format the complete quotation for confirmation
    response = "📋 **STEP 4: QUOTATION READY FOR GENERATION**\n\n"
    
    # Customer details
    response += f"**To:**\n"
    response += f"{extracted_data.get('customer_name', 'N/A')}\n"
    if extracted_data.get('customer_address'):
        response += f"Address: {extracted_data['customer_address']}\n"
    if extracted_data.get('customer_gstin'):
        response += f"GSTIN: {extracted_data['customer_gstin']}\n"
    if extracted_data.get('customer_email'):
        response += f"Email: {extracted_data['customer_email']}\n"
    
    # Quotation table
    response += "\n**📊 Quotation Table:**\n"
    response += "```\n"
    response += "S.No | Material Description    | Qty (Kg) | Rate (₹/Kg) | Amount (₹)\n"
    response += "-----|-----------------------|----------|-------------|----------\n"
    
    if extracted_data.get('items'):
        for i, item in enumerate(extracted_data['items'], 1):
            desc = item.get('description', 'Item')
            qty = f"{item.get('quantity', 0):,.2f}"
            rate = f"{item.get('rate', 0):.2f}"
            amount = f"{item.get('amount', 0):,.2f}"
            response += f"{i:4} | {desc:21} | {qty:8} | {rate:11} | {amount:9}\n"
    
    response += "```\n\n"
    
    # Totals
    if 'subtotal' in extracted_data:
        response += f"**Subtotal:** ₹{extracted_data['subtotal']:,.2f}\n"
        response += f"**GST @18%:** ₹{extracted_data['gst_amount']:,.2f}\n"
        response += f"**Grand Total:** ₹{extracted_data['grand_total']:,.2f}\n\n"
    
    # Terms & Conditions
    response += "**Terms & Conditions:**\n"
    response += f"• Loading Charges: {extracted_data.get('loading_charges', 'Included')}\n"
    response += f"• Transport Charges: {extracted_data.get('transport_charges', 'Included')}\n"
    response += f"• Payment Terms: {extracted_data.get('payment_terms', 'Included')}\n\n"
    
    response += "**Bank Details:**\n"
    response += "Auto-filled from AIBA memory for IGNITE INDUSTRIAL CORPORATION\n\n"
    
    response += "🗣️ **Shall I generate the Proforma Invoice now?**\n\n"
    response += "✅ **Yes, Generate** - Type 'generate' or 'yes'\n"
    response += "✏️ **Edit** - Type 'edit' to make changes\n"
    response += "❌ **Cancel** - Type 'cancel' to start over"
    
    return {
        'response': response,
        'type': 'final_confirmation',
        'data': extracted_data
    }

def handle_quotation_collection(message, document_data, session_id):
    """Enhanced quotation data collection with step-by-step workflow."""
    chat_state = chat_memory.get_state(session_id)
    current_step = chat_state.get('step', 'collecting')
    
    message_lower = message.lower().strip()
    
    if current_step == 'collecting_basic_info':
        # Try to extract data from the message
        new_data = prompt_parser.extract_quotation_data(message)
        if new_data and new_data.get('customer_name'):
            return start_quotation_flow(message, session_id)
        else:
            return {
                'response': 'I couldn\'t extract quotation details from that. Please try again with format like:\n\n' +
                           '*"Quote for ABC Company - 5 MT ISMC 100x50 at ₹56/kg"*',
                'type': 'basic_collection'
            }
    
    elif current_step == 'collecting_customer_details':
        return handle_customer_details_collection(message, chat_state, session_id)
    
    elif current_step == 'collecting_terms':
        return handle_terms_collection(message, chat_state, session_id)
    
    elif current_step == 'final_confirmation':
        return handle_final_confirmation_response(message, chat_state, session_id)
    
    else:
        # Fallback to original logic
        new_data = prompt_parser.extract_quotation_data(message)
        if new_data:
            for key, value in new_data.items():
                if value:
                    document_data[key] = value
        
        chat_memory.update_state(session_id, {
            'flow_type': 'quotation',
            'step': 'collecting',
            'document_data': document_data
        })
        
        missing_fields = prompt_parser.validate_quotation_data(document_data)
        
        if not missing_fields:
            return {
                'response': format_quotation_confirmation(document_data),
                'type': 'confirmation',
                'data': document_data
            }
        else:
            return {
                'response': f'Great! I have some information. I still need:\n\n' +
                           '\n'.join([f'• {field.replace("_", " ").title()}' for field in missing_fields]) +
                           '\n\nPlease provide the missing details:',
                'type': 'collection'
            }

def handle_customer_details_collection(message, chat_state, session_id):
    """Handle customer details collection step by step."""
    document_data = chat_state.get('document_data', {})
    missing_fields = chat_state.get('missing_fields', [])
    current_field = chat_state.get('current_field')
    
    message_lower = message.lower().strip()
    
    # Handle skip
    if message_lower == 'skip':
        # Skip this field (leave blank)
        pass
    elif message_lower in ['same as last', 'same']:
        # TODO: Implement memory lookup for past customer data
        pass
    else:
        # Store the provided value
        if current_field == 'address':
            document_data['customer_address'] = message.strip()
        elif current_field == 'gstin':
            document_data['customer_gstin'] = message.strip()
        elif current_field == 'email':
            document_data['customer_email'] = message.strip()
    
    # Remove current field from missing fields
    if current_field in missing_fields:
        missing_fields.remove(current_field)
    
    # Check if more fields are needed
    if missing_fields:
        next_field = missing_fields[0]
        chat_memory.update_state(session_id, {
            'flow_type': 'quotation',
            'step': 'collecting_customer_details',
            'document_data': document_data,
            'missing_fields': missing_fields,
            'current_field': next_field
        })
        
        if next_field == 'gstin':
            response = "🧾 **What is the GSTIN?**\n*(Type 'skip' to leave blank)*"
        elif next_field == 'email':
            response = "📧 **What is their email address?**\n*(Type 'skip' to leave blank)*"
        else:
            response = f"Please provide {next_field.replace('_', ' ')}:"
        
        return {
            'response': response,
            'type': 'customer_details_collection',
            'data': document_data,
            'show_skip_button': True
        }
    else:
        # All customer details collected, move to terms & conditions
        return check_terms_and_conditions(document_data, session_id)

def handle_terms_collection(message, chat_state, session_id):
    """Handle terms & conditions collection."""
    document_data = chat_state.get('document_data', {})
    terms_to_collect = chat_state.get('terms_to_collect', {})
    current_term = chat_state.get('current_term')
    
    message_lower = message.lower().strip()
    
    # Handle default or skip
    if message_lower in ['default', 'skip', '']:
        value = 'Included'
    else:
        value = message.strip()
    
    # Store the term
    if current_term == 'loading_charges':
        document_data['loading_charges'] = value
        terms_to_collect['loading_charges'] = False
    elif current_term == 'transport_charges':
        document_data['transport_charges'] = value
        terms_to_collect['transport_charges'] = False
    elif current_term == 'payment_terms':
        document_data['payment_terms'] = value
        terms_to_collect['payment_terms'] = False
    
    # Find next term to collect
    next_term = None
    for term, needed in terms_to_collect.items():
        if needed:
            next_term = term
            break
    
    if next_term:
        chat_memory.update_state(session_id, {
            'flow_type': 'quotation',
            'step': 'collecting_terms',
            'document_data': document_data,
            'terms_to_collect': terms_to_collect,
            'current_term': next_term
        })
        
        if next_term == 'transport_charges':
            response = "🚚 **Transport Charges** (default: Included)\n"
            response += "Please specify transport charges or click 'Use Default' for 'Included':"
        elif next_term == 'payment_terms':
            response = "💳 **Payment Terms** (default: Included)\n"
            response += "Please specify payment terms or click 'Use Default' for 'Included':"
        
        return {
            'response': response,
            'type': 'terms_collection',
            'data': document_data,
            'show_skip_button': True,
            'skip_button_text': 'Use Default'
        }
    else:
        # All terms collected, show final confirmation
        # Set defaults for any missing terms
        if not document_data.get('loading_charges'):
            document_data['loading_charges'] = 'Included'
        if not document_data.get('transport_charges'):
            document_data['transport_charges'] = 'Included'
        if not document_data.get('payment_terms'):
            document_data['payment_terms'] = 'Included'
        
        return show_final_confirmation(document_data, session_id)

def handle_final_confirmation_response(message, chat_state, session_id):
    """Handle final confirmation response."""
    document_data = chat_state.get('document_data', {})
    message_lower = message.lower().strip()
    
    if message_lower in ['generate', 'yes', 'y', 'generate pdf', 'create pdf']:
        # Generate PDF
        return {
            'response': '🎉 Perfect! Generating your professional Proforma Invoice now...\n\n' +
                       'Click the **Generate PDF** button below to create your document.',
            'type': 'confirmation',
            'data': document_data
        }
    elif message_lower in ['edit', 'modify', 'change']:
        # Allow editing
        return {
            'response': '✏️ What would you like to edit? Please specify:\n\n' +
                       '• Customer details (address, GSTIN, email)\n' +
                       '• Product details (quantity, rate)\n' +
                       '• Terms & conditions\n\n' +
                       'Or provide the corrected information:',
            'type': 'editing',
            'data': document_data
        }
    elif message_lower in ['cancel', 'no', 'abort']:
        # Cancel the process
        chat_memory.clear_state(session_id)
        return {
            'response': '❌ Quotation cancelled. How can I help you next?',
            'type': 'system'
        }
    else:
        # Invalid response
        return {
            'response': '🤔 I didn\'t understand that. Please choose:\n\n' +
                       '✅ **Yes, Generate** - Type "generate" or "yes"\n' +
                       '✏️ **Edit** - Type "edit" to make changes\n' +
                       '❌ **Cancel** - Type "cancel" to start over',
            'type': 'final_confirmation',
            'data': document_data
        }

def start_po_flow(message, session_id):
    """Start purchase order creation flow."""
    # Try to extract data from the initial message
    extracted_data = prompt_parser.extract_po_data(message)
    
    # Initialize chat state
    chat_memory.update_state(session_id, {
        'flow_type': 'purchase_order',
        'step': 'collecting', 
        'document_data': extracted_data if extracted_data else {},
        'original_message': message
    })
    
    if extracted_data and extracted_data.get('supplier_name'):
        # We got some data, confirm and ask for missing pieces
        missing_fields = prompt_parser.validate_po_data(extracted_data)
        
        if not missing_fields:
            # All required data is present
            return {
                'response': format_po_confirmation(extracted_data),
                'type': 'confirmation',
                'data': extracted_data
            }
        else:
            # Ask for missing data  
            return {
                'response': format_po_partial(extracted_data, missing_fields),
                'type': 'partial',
                'data': extracted_data
            }
    else:
        # No usable data extracted, ask for basic info
        return {
            'response': '📦 I\'ll help you create a purchase order! Let me gather the details:\n\n' +
                       '**Required Information:**\n' +
                       '• Supplier name\n' +
                       '• Items to purchase\n' +
                       '• Quantities and specifications\n\n' +
                       'Please provide the supplier name and items you want to order:',
            'type': 'collection'
        }

def handle_ongoing_flow(message, chat_state, session_id):
    """Handle ongoing data collection flows."""
    flow_type = chat_state.get('flow_type')
    document_data = chat_state.get('document_data', {})
    
    if flow_type == 'quotation':
        return handle_quotation_collection(message, document_data, session_id)
    elif flow_type == 'purchase_order':
        return handle_po_collection(message, document_data, session_id)
    else:
        # Reset if unknown flow
        chat_memory.clear_state(session_id)
        return {
            'response': '🔄 Something went wrong. Let\'s start over. How can I help you?',
            'type': 'system'
        }

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

def handle_po_collection(message, document_data, session_id):
    """Handle purchase order data collection."""
    # Try to extract additional data from the message
    new_data = prompt_parser.extract_po_data(message)
    
    # Merge with existing data
    if new_data:
        for key, value in new_data.items():
            if value:  # Only update if new value is not empty
                document_data[key] = value
                
    # Update the state with merged data
    chat_memory.update_state(session_id, {
        'flow_type': 'purchase_order',
        'step': 'collecting',
        'document_data': document_data
    })
    
    # Check if we have all required data
    missing_fields = prompt_parser.validate_po_data(document_data)
    
    if not missing_fields:
        # All data collected, show confirmation
        return {
            'response': format_po_confirmation(document_data),
            'type': 'confirmation', 
            'data': document_data
        }
    else:
        # Still missing data, ask for it
        return {
            'response': f'Thanks! I have some details. I still need:\n\n' +
                       '\n'.join([f'• {field.replace("_", " ").title()}' for field in missing_fields]) +
                       '\n\nPlease provide the missing information:',
            'type': 'collection'
        }

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

if __name__ == '__main__':
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    # Run the app
    app.run(debug=True, host='0.0.0.0', port=5000) 
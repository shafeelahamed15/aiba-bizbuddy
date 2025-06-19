"""
AIBA - AI Business Assistant Flask Web Application
A Python-based web chatbot for creating professional PDF documents.
"""

from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, session
import os
import json
from datetime import datetime, timedelta
from utils.prompt_parser import PromptParser
from utils.pdf_generator import PDFGenerator
from models.memory import ChatMemory
from auth import auth_bp, login_required, profile_required, auth_manager
from config import Config

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
pdf_generator = PDFGenerator()
chat_memory = ChatMemory()

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
        if document_type == 'quotation':
            pdf_path = pdf_generator.create_quotation_pdf(document_data, user_profile)
        else:
            pdf_path = pdf_generator.create_po_pdf(document_data, user_profile)
        
        # Clear the session after successful PDF generation
        chat_memory.clear_state(session_id)
        
        return jsonify({
            'success': True,
            'pdf_path': pdf_path,
            'message': f'✅ {document_type.title()} PDF created successfully!'
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
    """Start quotation creation flow."""
    # Try to extract data from the initial message
    extracted_data = prompt_parser.extract_quotation_data(message)
    
    # Initialize chat state
    chat_memory.update_state(session_id, {
        'flow_type': 'quotation',
        'step': 'collecting',
        'document_data': extracted_data if extracted_data else {},
        'original_message': message
    })
    
    if extracted_data and extracted_data.get('customer_name'):
        # We got some data, confirm and ask for missing pieces
        missing_fields = prompt_parser.validate_quotation_data(extracted_data)
        
        if not missing_fields:
            # All required data is present
            return {
                'response': format_quotation_confirmation(extracted_data),
                'type': 'confirmation',
                'data': extracted_data
            }
        else:
            # Ask for missing data
            return {
                'response': format_quotation_partial(extracted_data, missing_fields),
                'type': 'partial',
                'data': extracted_data
            }
    else:
        # No usable data extracted, ask for basic info
        return {
            'response': '📋 I\'ll help you create a quotation! Let me gather some information:\n\n' +
                       '**Customer Details:**\n' +
                       '• Customer name\n' +
                       '• Items and quantities\n' +
                       '• Rates and pricing\n\n' +
                       'You can provide this information in natural language, for example:\n' +
                       '*"Quote for ABC Company - 5 MT steel at ₹50/kg, GST extra"*\n\n' +
                       'Please share the customer name and items needed:',
            'type': 'collection'
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

def handle_quotation_collection(message, document_data, session_id):
    """Handle quotation data collection."""
    # Try to extract additional data from the message
    new_data = prompt_parser.extract_quotation_data(message)
    
    # Merge with existing data
    if new_data:
        for key, value in new_data.items():
            if value:  # Only update if new value is not empty
                document_data[key] = value
    
    # Update the state with merged data
    chat_memory.update_state(session_id, {
        'flow_type': 'quotation',
        'step': 'collecting',
        'document_data': document_data
    })
    
    # Check if we have all required data
    missing_fields = prompt_parser.validate_quotation_data(document_data)
    
    if not missing_fields:
        # All data collected, show confirmation
        return {
            'response': format_quotation_confirmation(document_data),
            'type': 'confirmation',
            'data': document_data
        }
    else:
        # Still missing data, ask for it
        return {
            'response': f'Great! I have some information. I still need:\n\n' +
                       '\n'.join([f'• {field.replace("_", " ").title()}' for field in missing_fields]) +
                       '\n\nPlease provide the missing details:',
            'type': 'collection'
        }

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

if __name__ == '__main__':
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    # Run the app
    app.run(debug=True, host='0.0.0.0', port=5000) 
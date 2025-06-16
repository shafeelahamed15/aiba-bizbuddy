#!/usr/bin/env python3
"""
AIBA - AI Business Assistant
A Python-based chatbot for creating professional PDF documents like Quotations and Purchase Orders.
"""

import sys
import os
from prompt_parser import PromptParser
from pdf_generator import PDFGenerator
from memory import BusinessMemory

class AIBA:
    def __init__(self):
        self.parser = PromptParser()
        self.pdf_generator = PDFGenerator()
        self.memory = BusinessMemory()
        self.running = True
        
    def greet(self):
        """Display welcome message and options."""
        print("=" * 60)
        print("🤖 Hi! I'm AIBA, your AI Business Assistant.")
        print("=" * 60)
        print("\n📄 I can help you create:")
        print("  1. Quotations")
        print("  2. Purchase Orders")
        print("  3. Answer business questions")
        print("\n💡 Type 'help' for commands or 'quit' to exit")
        print("-" * 60)
        
    def show_help(self):
        """Show available commands."""
        print("\n🔧 Available Commands:")
        print("  'quote' or 'quotation' - Create a new quotation")
        print("  'po' or 'purchase order' - Create a new purchase order")
        print("  'help' - Show this help message")
        print("  'quit' or 'exit' - Close AIBA")
        print("  Or just type your request naturally!\n")
        
    def process_input(self, user_input):
        """Process user input and determine what action to take."""
        user_input = user_input.strip().lower()
        
        # Handle commands
        if user_input in ['quit', 'exit', 'bye']:
            print("\n👋 Thanks for using AIBA! Goodbye!")
            self.running = False
            return
            
        if user_input == 'help':
            self.show_help()
            return
            
        # Handle greetings
        if user_input in ['hi', 'hello', 'hey']:
            print("\n😊 Hello! What would you like to create today?")
            return
            
        # Detect intent using the parser
        intent = self.parser.detect_intent(user_input)
        
        if intent == 'quotation':
            self.handle_quotation(user_input)
        elif intent == 'purchase_order':
            self.handle_purchase_order(user_input)
        else:
            self.handle_general_query(user_input)
            
    def handle_quotation(self, user_input):
        """Handle quotation creation process."""
        print("\n📋 Creating a quotation...")
        print("🔍 Let me extract the details from your request...")
        
        # Extract quotation data from user input
        quote_data = self.parser.extract_quotation_data(user_input)
        
        if quote_data:
            print("✅ I found some details! Let me confirm with you:")
            self.confirm_and_generate_quotation(quote_data)
        else:
            print("❓ I need some information to create your quotation.")
            self.collect_quotation_details()
            
    def handle_purchase_order(self, user_input):
        """Handle purchase order creation process."""
        print("\n📦 Creating a purchase order...")
        print("🔍 Let me extract the details from your request...")
        
        # Extract PO data from user input
        po_data = self.parser.extract_po_data(user_input)
        
        if po_data:
            print("✅ I found some details! Let me confirm with you:")
            self.confirm_and_generate_po(po_data)
        else:
            print("❓ I need some information to create your purchase order.")
            self.collect_po_details()
            
    def handle_general_query(self, user_input):
        """Handle general business questions or casual conversation."""
        print("\n🤔 I'm a business document assistant. I specialize in:")
        print("   • Creating quotations")
        print("   • Creating purchase orders")
        print("   • Managing business document workflows")
        print("\n💡 Try saying something like:")
        print("   'Create a quote for ABC Company'")
        print("   'Make a purchase order for steel items'")
        
    def confirm_and_generate_quotation(self, quote_data):
        """Confirm quotation details and generate PDF."""
        # This will be implemented in the next step
        print("📄 Quotation generation coming soon...")
        
    def confirm_and_generate_po(self, po_data):
        """Confirm PO details and generate PDF."""
        # This will be implemented in the next step
        print("📦 Purchase Order generation coming soon...")
        
    def collect_quotation_details(self):
        """Manually collect quotation details from user."""
        # This will be implemented in the next step
        print("📝 Manual quotation collection coming soon...")
        
    def collect_po_details(self):
        """Manually collect PO details from user."""
        # This will be implemented in the next step
        print("📝 Manual PO collection coming soon...")
        
    def run(self):
        """Main chat loop."""
        self.greet()
        
        while self.running:
            try:
                user_input = input("\n💬 You: ").strip()
                if user_input:
                    self.process_input(user_input)
            except KeyboardInterrupt:
                print("\n\n👋 Thanks for using AIBA! Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ Sorry, I encountered an error: {e}")
                print("💡 Please try again or type 'help' for assistance.")

def main():
    """Entry point for AIBA."""
    try:
        aiba = AIBA()
        aiba.run()
    except Exception as e:
        print(f"❌ Failed to start AIBA: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 
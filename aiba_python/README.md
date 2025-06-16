# AIBA - AI Business Assistant (Python Version)

A Python-based command-line chatbot for creating professional PDF documents like Quotations and Purchase Orders.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run AIBA**
   ```bash
   python main.py
   ```

3. **Start Creating Documents**
   - Type "Create a quote for ABC Company" 
   - Type "Make a purchase order for steel items"
   - Or just type "quote" or "po" to start step-by-step

## 📁 Project Structure

```
aiba_python/
├── main.py              # Main chatbot interface
├── prompt_parser.py     # Natural language understanding
├── pdf_generator.py     # PDF creation
├── memory.py            # Data storage
├── data/                # Generated PDFs and saved data
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## 💡 Features

- ✅ Natural language understanding for quotes and POs
- ✅ Professional PDF generation
- ✅ Customer and business data storage
- ✅ Simple command-line interface
- ✅ No React/JavaScript complexity

## 🔧 Commands

- `quote` or `quotation` - Create a new quotation
- `po` or `purchase order` - Create a new purchase order  
- `help` - Show available commands
- `quit` or `exit` - Close AIBA

## 📄 Example Usage

```
💬 You: Create a quote for ABC Industries for ISMC 100x50 – 5 MT at ₹56/kg

🤖 AIBA: ✅ I found some details! Let me confirm with you:
Customer: ABC Industries
Item: ISMC 100x50
Quantity: 5 MT
Rate: ₹56/kg
```

Perfect for beginners - no complex setup required! 
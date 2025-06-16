# AIBA - AI Business Assistant (Flask Web Application)

🤖 **A modern Python-based web chatbot for creating professional PDF quotations and purchase orders through conversational inputs.**

## ✨ Features

- 🎨 **Grok-style Dark UI** - Modern, clean interface with rounded corners
- 💬 **Natural Language Processing** - Understands complex business requests
- 📋 **Smart Quotation Generation** - Extract customer, items, rates, and terms automatically
- 📦 **Purchase Order Creation** - Generate professional PO documents
- 🏗️ **Steel Industry Support** - Built-in weight calculations for steel sections
- 💾 **Customer Management** - Save and reuse customer information
- 📄 **Professional PDFs** - High-quality document generation with reportlab
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Application
```bash
python app.py
```

### 3. Open in Browser
Visit `http://localhost:5000` to start using AIBA!

## 📁 Project Structure

```
aiba-python-chatbot/
├── app.py                 # Main Flask application
├── static/
│   └── styles.css         # Grok-style dark theme
├── templates/
│   └── index.html         # Chat interface
├── utils/
│   ├── prompt_parser.py   # NLP and data extraction
│   └── pdf_generator.py   # Professional PDF creation
├── models/
│   └── memory.py          # Chat state and customer storage
├── data/                  # Generated PDFs and saved data
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## 💡 How to Use

### Creating Quotations

**Method 1: Natural Language**
```
"Quote for ABC Industries - 5 MT ISMC 100x50 at ₹56/kg, GST extra, transport included"
```

**Method 2: Step-by-Step**
```
User: "Create a quotation"
AIBA: "Let's create a quotation! First, what's the customer name?"
User: "ABC Industries"
AIBA: "Great! Now, what items do you want to quote?"
...
```

### Creating Purchase Orders

**Method 1: Natural Language**
```
"Create PO to M/S XYZ Suppliers - PO#12345, reference: RFQ-2024-001"
```

**Method 2: Step-by-Step**
```
User: "Create a purchase order"
AIBA: "Let's create a purchase order! First, what's the supplier name?"
...
```

## 🔧 Advanced Features

### Steel Industry Support
AIBA understands steel terminology and automatically calculates weights:

```
"Quote for Steel Corp - 140 Nos MS Channel 75x40x6mm @ ₹50/kg"
```
- Automatically converts pieces to weight using standard steel tables
- Supports ISMC, ISMB, Angles, Plates, Rounds
- Handles both metric and imperial units

### Smart Data Extraction
AIBA can extract multiple data points from a single message:

```
"Quote to Sri Energy – 45 Nos ISMB 150 @ 75/kg, 30 days payment, transport included, GST 18%"
```

Extracts:
- Customer: Sri Energy  
- Item: ISMB 150
- Quantity: 45 Nos
- Rate: ₹75/kg
- Payment: 30 days
- Transport: Included
- GST: 18%

### Customer Management
- Automatically save customer details after PDF generation
- Reuse saved customers for faster quotation creation
- Search and manage customer database

## 🎨 UI Features

### Dark Theme (Grok-style)
- Modern dark interface with blue accents
- Smooth animations and transitions
- Rounded corners and clean typography
- Responsive design for all devices

### Chat Experience
- Real-time typing indicators
- Message timestamps
- Quick action buttons
- Toast notifications
- Markdown formatting support

## 📄 PDF Generation

### Quotation PDFs Include:
- Company header with contact details
- Customer information
- Itemized list with quantities, rates, amounts
- GST calculations and totals
- Terms and conditions
- Professional formatting

### Purchase Order PDFs Include:
- Company header
- PO number and reference details
- Supplier information
- Item specifications
- Terms and conditions
- Authorized signature section

## 🔧 Commands

### Chat Commands
- `"quote"` or `"quotation"` - Start quotation flow
- `"po"` or `"purchase order"` - Start PO flow
- `"help"` - Show available commands
- `"reset"` - Clear current session

### Quick Actions
- 📋 **Quote** - Quick quotation start
- 📦 **PO** - Quick purchase order start  
- 💡 **Help** - Show help information

## 🏗️ Steel Weight Tables

AIBA includes comprehensive steel weight calculations:

| Section Type | Examples | Auto Weight Calculation |
|-------------|----------|----------------------|
| ISMC | 75, 100, 125, 150, 200, 250, 300 | ✅ |
| ISMB | 100, 150, 200, 250, 300, 400, 500 | ✅ |
| Angles | 25x25x3, 50x50x5, 75x75x6 | ✅ |
| Plates | Various thickness | ✅ |
| Rounds | 8mm to 40mm | ✅ |

## 🔄 Data Flow

1. **User Input** → Natural language processing
2. **Data Extraction** → Customer, items, terms extraction
3. **Validation** → Check for missing required fields
4. **Confirmation** → User confirms extracted data
5. **PDF Generation** → Professional document creation
6. **Download** → PDF ready for download
7. **Customer Save** → Optional customer information storage

## 🛡️ Data Storage

- **Chat Sessions**: Temporary in-memory storage with optional persistence
- **Customer Data**: Local JSON files in `data/` directory
- **Generated PDFs**: Saved in `data/` directory with organized naming
- **Session Management**: Automatic cleanup of old sessions

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-friendly interface
- Optimized input handling for mobile keyboards
- Swipe gestures support

## 🔧 Customization

### Business Information
Update default business details in `utils/pdf_generator.py`:

```python
def _get_default_business_info(self) -> Dict:
    return {
        'company_name': 'Your Business Name',
        'address': 'Your Business Address',
        'phone': '+91-XXXXXXXXXX',
        'email': 'business@example.com',
        'gst_number': 'YOUR_GST_NUMBER',
    }
```

### Steel Weight Tables
Add custom steel sections in `utils/prompt_parser.py`:

```python
self.steel_weights = {
    'custom_section': weight_per_meter,
    # Add more sections...
}
```

## 🚧 Troubleshooting

### Common Issues

**PDF Generation Fails**
- Check if `data/` directory exists and has write permissions
- Ensure reportlab is properly installed

**Chat Not Responding**
- Check Flask server logs for errors
- Verify all Python dependencies are installed

**Mobile Input Issues**
- Clear browser cache
- Ensure JavaScript is enabled

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Built for businesses that need professional document generation with the simplicity of natural language input.**

🔗 **Get started now:** `python app.py` and visit `http://localhost:5000` 
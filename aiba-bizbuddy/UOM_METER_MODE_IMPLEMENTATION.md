# 📏 UOM Per Meter Calculation Mode Implementation

## 🎯 Overview

This implementation adds support for **"per meter"** calculation mode to the quotation system, allowing users to specify that quotations should be calculated based on total meters rather than weight (kg).

## 🔧 Features Implemented

### 1. **Automatic Mode Detection**
- Detects keywords like "UOM to be in mtrs", "rate per meter", "quote in meters"
- Automatically switches calculation mode to `per_mtr`

### 2. **Enhanced Item Parsing**
- Supports format: `MS Channel 75x40x6mm – 6 MTR (Length) – 140 Nos – ₹366.18/mtr`
- Extracts:
  - Item description
  - Length per piece (meters)
  - Number of pieces
  - Rate per meter

### 3. **Smart Calculations**
- **Per Meter Mode**: `total_mtrs = number_of_pieces × length_in_mtrs`
- **Amount**: `estimated_value = total_mtrs × rate_per_mtr`
- **Display**: Shows quantity in "Mtrs" instead of "Nos" or "kg"

## 📂 Files Modified/Created

### 1. **parseQuotationInput.js** (Enhanced)
```javascript
// Added calculation mode detection
const meterModeKeywords = [
  "uom to be in mtrs", "rate per meter", "quote in meters", // ...
];

// Added meter mode parsing pattern
/([A-Za-z\s\-x0-9]+?)\s*–\s*(\d+(?:\.\d+)?)\s*MTR?\s*(?:\(Length\))?\s*–\s*(\d+)\s*Nos?\s*–\s*₹?([0-9.]+)\/mtr/gi
```

### 2. **quotationFormatter.js** (New)
- `formatQuotationWithUOM()` - Handles both kg and meter modes
- `generateQuotationDisplayText()` - Creates formatted output
- `generatePDFData()` - PDF-ready data structure
- `validateQuotationUOM()` - Validation for UOM data

### 3. **testMeterMode.js** (New)
- Complete test suite for meter mode functionality
- Validation against expected output
- Sample data testing

## 🧪 Test Example

### Input Prompt:
```
Create quote to SRI ENERGY , VIRALIMALAI. UOM to be in Mtrs. Transport Included, Loading Charges included.

MS Channel 75 x40 x6mm – 6 MTR (Length) – 140 Nos – ₹366.18/mtr
MS Flat 75 x 10mm – 6 MTR – 10 Nos – ₹308.31/mtr
MS Angle 40x40x6mm – 6 MTR – 35 Nos – ₹189.63/mtr
MS Flat 50 x 06 mm – 6 MTR – 300 Nos – ₹123.12/mtr

Add 18% GST
```

### Expected Output:
| Item Description | Qty (Mtrs) | Rate/mtr | Amount |
|---|---|---|---|
| MS Channel 75x40x6mm | 840 | ₹366.18 | ₹3,07,693.20 |
| MS Flat 75x10mm | 60 | ₹308.31 | ₹18,498.60 |
| MS Angle 40x40x6mm | 210 | ₹189.63 | ₹39,822.30 |
| MS Flat 50x6mm | 1800 | ₹123.12 | ₹2,21,616.00 |
| **Subtotal** | | | **₹6,67,630.10** |
| **GST @ 18%** | | | **₹1,20,173.42** |
| **Grand Total** | | | **₹7,87,803.52** |

### Calculation Logic:
```
MS Channel: 140 pieces × 6m = 840 meters × ₹366.18 = ₹3,07,693.20
MS Flat 75x10: 10 pieces × 6m = 60 meters × ₹308.31 = ₹18,498.60
MS Angle: 35 pieces × 6m = 210 meters × ₹189.63 = ₹39,822.30
MS Flat 50x6: 300 pieces × 6m = 1800 meters × ₹123.12 = ₹2,21,616.00
```

## 🔄 Integration Points

### 1. **ChatBot.jsx Integration**
```javascript
import { formatQuotationWithUOM, generateQuotationDisplayText } from '../utils/quotationFormatter.js';

// In message processing:
const parsedData = parseQuotationPrompt(message);
const formattedQuotation = formatQuotationWithUOM(parsedData);
const displayText = generateQuotationDisplayText(formattedQuotation);
```

### 2. **Intent Router Integration**
```javascript
// The existing quotation intent handler can be enhanced to use the new formatter
if (quotationData.calculationMode === "per_mtr") {
  return formatQuotationWithUOM(quotationData);
}
```

## 🎛️ Configuration Options

### Calculation Modes:
- **`per_kg`** (default) - Traditional weight-based calculations
- **`per_mtr`** - New meter-based calculations

### Trigger Keywords:
- "UOM to be in mtrs"
- "UOM to be in meters"
- "rate per meter"
- "quote in meters"
- "per mtr"
- "per meter"

## 📊 Data Structure

### Parsed Item (Meter Mode):
```javascript
{
  description: "MS Channel 75x40x6mm",
  quantity: 840,              // Total meters
  unit: "Mtrs",
  rate: 366.18,
  rateUnit: "per mtr",
  lengthInMeters: 6,
  numberOfPieces: 140,
  totalMeters: 840,
  amount: 307693.20,
  calculationMode: "per_mtr"
}
```

### Formatted Output:
```javascript
{
  customerName: "SRI ENERGY , VIRALIMALAI",
  items: [...],
  calculationMode: "per_mtr",
  subtotal: 667630.10,
  gstPercent: 18,
  gstAmount: 120173.42,
  grandTotal: 787803.52
}
```

## 🚀 Usage Instructions

### 1. **Basic Usage**
Include "UOM to be in mtrs" in your prompt to activate meter mode.

### 2. **Item Format**
Use format: `Item Description – Length MTR – Quantity Nos – ₹Rate/mtr`

### 3. **Testing**
```javascript
import { runMeterModeTests } from './utils/testMeterMode.js';
runMeterModeTests(); // Runs complete test suite
```

## ✅ Benefits

1. **Automatic Detection** - No manual mode switching required
2. **Accurate Calculations** - Handles piece × length × rate calculations
3. **Flexible Display** - Shows appropriate UOM based on mode
4. **PDF Ready** - Generates proper PDF data structure
5. **Backward Compatible** - Existing kg-based logic remains unchanged

## 🔮 Future Enhancements

1. Support for mixed UOM quotations (some items in kg, some in meters)
2. Additional UOM modes (per square meter, per cubic meter)
3. Custom length specifications per item
4. Integration with weight calculations for verification

---

## 📝 Quick Start

To test the new functionality:

1. Use a prompt with "UOM to be in mtrs"
2. Include items in the format shown above
3. The system will automatically:
   - Detect meter mode
   - Parse item details
   - Calculate total meters
   - Generate proper quotation format

**Example Command:**
```javascript
const result = parseQuotationPrompt("Create quote to ABC Company. UOM to be in mtrs. MS Angle 40x40x6mm – 6 MTR – 100 Nos – ₹180/mtr");
console.log(result.calculationMode); // "per_mtr"
``` 
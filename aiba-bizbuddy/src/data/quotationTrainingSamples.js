/**
 * 🧠 TRAINING SAMPLES: Enhanced Parser Intent Classification
 * Store successful parsing samples to improve future recognition
 */

export const quotationTrainingSamples = [
  {
    prompt: "Create quote to SRI ENERGY, VIRALIMALAI. UOM to be in Mtrs. MS Channel 75x40x6mm – 6 MTR Length, 140 Nos MS Channel 100x50x06 mm – 6 MTR Length, 20 Nos MS Channel 125x65x06 mm – 6 MTR Length, 40 Nos MS Flat 50x06 mm – 6 MTR Length, 60 Nos Transport Included, Loading Charges Included. Add 18% GST",
    intent: "create_quotation",
    uom: "Metres",
    confidence: 0.95,
    products: [
      {
        description: "MS Channel 75x40x6mm",
        length: 6,
        quantity: 140,
        uom: "Metres"
      },
      {
        description: "MS Channel 100x50x06mm", 
        length: 6,
        quantity: 20,
        uom: "Metres"
      },
      {
        description: "MS Channel 125x65x06mm",
        length: 6,
        quantity: 40,
        uom: "Metres"
      },
      {
        description: "MS Flat 50x06mm",
        length: 6,
        quantity: 60,
        uom: "Metres"
      }
    ],
    extractedData: {
      customerName: "SRI ENERGY, VIRALIMALAI",
      uomPreference: "Metres",
      gst: 18,
      transport: "Included",
      loadingCharges: "Included"
    }
  },
  {
    prompt: "Quote for ABC Industries. MS Channel 100x50x6mm - 200 Nos, MS Flat 75x10mm - 150 Nos. GST 18%. Transport extra.",
    intent: "create_quotation", 
    uom: "Nos",
    confidence: 0.9,
    products: [
      {
        description: "MS Channel 100x50x6mm",
        quantity: 200,
        uom: "Nos"
      },
      {
        description: "MS Flat 75x10mm",
        quantity: 150,
        uom: "Nos"
      }
    ],
    extractedData: {
      customerName: "ABC Industries",
      gst: 18,
      transport: "Extra"
    }
  },
  {
    prompt: "Create quotation to DEF Engineering Works, Chennai UOM to be in Metres MS Angle 50x50x6mm – 12 MTR Length, 25 Nos MS Pipe 32mm NB – 6 MTR Length, 50 Nos Loading charges included Add 18% GST",
    intent: "create_quotation",
    uom: "Metres", 
    confidence: 0.92,
    products: [
      {
        description: "MS Angle 50x50x6mm",
        length: 12,
        quantity: 25,
        uom: "Metres"
      },
      {
        description: "MS Pipe 32mm NB",
        length: 6,
        quantity: 50,
        uom: "Metres"
      }
    ],
    extractedData: {
      customerName: "DEF Engineering Works, Chennai",
      uomPreference: "Metres",
      gst: 18,
      loadingCharges: "Included"
    }
  }
];

/**
 * Add new training sample when parsing is successful
 * @param {object} parseResult - Successful parse result
 * @param {string} originalPrompt - Original user prompt
 */
export function addTrainingSample(parseResult, originalPrompt) {
  if (parseResult.success && parseResult.confidence >= 0.8) {
    const trainingSample = {
      prompt: originalPrompt,
      intent: "create_quotation",
      uom: parseResult.uomPreference,
      confidence: parseResult.confidence,
      products: parseResult.products.map(p => ({
        description: p.description,
        length: p.length,
        quantity: p.quantity,
        uom: p.uom
      })),
      extractedData: {
        customerName: parseResult.customerName,
        uomPreference: parseResult.uomPreference,
        gst: parseResult.gst
      },
      timestamp: new Date().toISOString(),
      source: parseResult.source
    };
    
    console.log('🧠 Adding successful parse as training sample:', trainingSample);
    // TODO: Store in database or training data collection
    quotationTrainingSamples.push(trainingSample);
    return trainingSample;
  }
  return null;
}

/**
 * Get training samples for pattern matching
 * @param {string} intent - Intent to match
 * @returns {array} Relevant training samples
 */
export function getTrainingSamples(intent = "create_quotation") {
  return quotationTrainingSamples.filter(sample => sample.intent === intent);
}

export default quotationTrainingSamples; 
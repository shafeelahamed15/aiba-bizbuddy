/**
 * Suggestion Manager for Contextual Autocomplete and Smart Suggestions
 * Provides intelligent suggestions based on user input context, history, and state
 */
class SuggestionManager {
  constructor() {
    this.customerHistory = this.loadCustomerHistory();
    this.productHistory = this.loadProductHistory();
    this.recentSuggestions = [];
    this.popularItems = this.getPopularItems();
    this.contextualSuggestions = {};
  }

  /**
   * Get suggestions based on current context and partial input
   */
  getSuggestions(context, partialInput = '') {
    const { currentField, quotationStep, userInput } = context;
    const suggestions = {
      type: currentField,
      items: [],
      priority: 'medium',
      context: context,
      timestamp: Date.now()
    };

    switch (currentField) {
      case 'customerName':
        suggestions.items = this.getCustomerSuggestions(partialInput);
        suggestions.priority = 'high';
        break;
      
      case 'productDescription':
        suggestions.items = this.getProductSuggestions(partialInput);
        suggestions.priority = 'high';
        break;
      
      case 'quantity':
        suggestions.items = this.getQuantitySuggestions(context);
        suggestions.priority = 'medium';
        break;
      
      case 'uom':
        suggestions.items = this.getUOMSuggestions(context);
        suggestions.priority = 'medium';
        break;
      
      case 'rate':
        suggestions.items = this.getRateSuggestions(context);
        suggestions.priority = 'medium';
        break;
      
      case 'gst':
        suggestions.items = this.getGSTSuggestions();
        suggestions.priority = 'low';
        break;
      
      case 'transport':
        suggestions.items = this.getTransportSuggestions();
        suggestions.priority = 'low';
        break;
      
      case 'paymentTerms':
        suggestions.items = this.getPaymentTermsSuggestions();
        suggestions.priority = 'low';
        break;
      
      default:
        suggestions.items = this.getGeneralSuggestions(context, partialInput);
    }

    // Filter and rank suggestions
    suggestions.items = this.filterAndRankSuggestions(suggestions.items, partialInput);
    
    return suggestions;
  }

  /**
   * Get customer name suggestions with autocomplete
   */
  getCustomerSuggestions(partialInput) {
    const suggestions = [];
    
    // Recent customers
    const recentCustomers = this.customerHistory
      .filter(customer => customer.name.toLowerCase().includes(partialInput.toLowerCase()))
      .slice(0, 8)
      .map(customer => ({
        text: customer.name,
        type: 'recent_customer',
        metadata: {
          lastQuoteDate: customer.lastQuoteDate,
          totalQuotes: customer.totalQuotes,
          location: customer.location
        },
        confidence: this.calculateStringMatch(customer.name, partialInput)
      }));

    suggestions.push(...recentCustomers);

    return suggestions;
  }

  /**
   * Get product description suggestions
   */
  getProductSuggestions(partialInput) {
    const suggestions = [];
    
    // Popular steel products
    const popularProducts = this.popularItems
      .filter(item => item.name.toLowerCase().includes(partialInput.toLowerCase()))
      .slice(0, 8)
      .map(item => ({
        text: item.name,
        type: 'popular_product',
        metadata: {
          category: item.category,
          typicalRate: item.typicalRate,
          commonUOM: item.commonUOM,
          description: item.description
        },
        confidence: this.calculateStringMatch(item.name, partialInput)
      }));

    suggestions.push(...popularProducts);
    return suggestions;
  }

  /**
   * Get quantity suggestions
   */
  getQuantitySuggestions(context) {
    const commonQuantities = [
      { qty: 1, desc: 'Single unit' },
      { qty: 5, desc: 'Small order' },
      { qty: 10, desc: 'Standard order' },
      { qty: 25, desc: 'Bulk order' },
      { qty: 50, desc: 'Large order' },
      { qty: 100, desc: 'Volume order' }
    ];

    return commonQuantities.map(item => ({
      text: item.qty.toString(),
      type: 'common_quantity',
      metadata: { description: item.desc },
      confidence: 0.6
    }));
  }

  /**
   * Get UOM suggestions
   */
  getUOMSuggestions(context) {
    const { productDescription } = context;
    const suggestions = [];

    const steelUOMs = [
      { uom: 'MT', desc: 'Metric Ton', category: 'weight' },
      { uom: 'Kg', desc: 'Kilogram', category: 'weight' },
      { uom: 'Nos', desc: 'Numbers/Pieces', category: 'count' },
      { uom: 'Ft', desc: 'Feet', category: 'length' },
      { uom: 'Mtr', desc: 'Meter', category: 'length' },
      { uom: 'SqFt', desc: 'Square Feet', category: 'area' },
      { uom: 'SqMtr', desc: 'Square Meter', category: 'area' }
    ];

    return steelUOMs.map(item => ({
      text: item.uom,
      type: 'uom_suggestion',
      metadata: { description: item.desc, category: item.category },
      confidence: 0.7
    }));
  }

  /**
   * Get rate suggestions
   */
  getRateSuggestions(context) {
    const commonRanges = [
      { range: '40-50', desc: 'Standard range' },
      { range: '50-60', desc: 'Premium range' },
      { range: '60-75', desc: 'High-end range' }
    ];

    return commonRanges.map(range => ({
      text: range.range,
      type: 'rate_range',
      metadata: { description: range.desc },
      confidence: 0.5
    }));
  }

  /**
   * Get GST suggestions
   */
  getGSTSuggestions() {
    const gstRates = [
      { rate: 18, desc: 'Standard rate for steel products', common: true },
      { rate: 12, desc: 'Reduced rate for some items', common: false },
      { rate: 5, desc: 'Special rate for certain categories', common: false },
      { rate: 28, desc: 'Higher rate for luxury items', common: false }
    ];

    return gstRates.map(item => ({
      text: `${item.rate}%`,
      type: 'gst_rate',
      metadata: { description: item.desc, isCommon: item.common },
      confidence: item.common ? 0.9 : 0.6
    }));
  }

  /**
   * Get transport suggestions
   */
  getTransportSuggestions() {
    const transportOptions = [
      'Included',
      'Extra',
      'Buyer arrangement',
      'To pay',
      'Free delivery within city',
      'Rs. 2/MT per km'
    ];

    return transportOptions.map(option => ({
      text: option,
      type: 'transport_option',
      metadata: { description: 'Common transport term' },
      confidence: 0.7
    }));
  }

  /**
   * Get payment terms suggestions
   */
  getPaymentTermsSuggestions() {
    const paymentOptions = [
      'Against Invoice',
      '50% advance',
      '30% advance',
      'COD',
      'Net 30 days',
      'Net 15 days',
      '100% advance'
    ];

    return paymentOptions.map(option => ({
      text: option,
      type: 'payment_term',
      metadata: { description: 'Common payment term' },
      confidence: 0.7
    }));
  }

  /**
   * Get general suggestions
   */
  getGeneralSuggestions(context, partialInput) {
    return [];
  }

  /**
   * Filter and rank suggestions
   */
  filterAndRankSuggestions(suggestions, partialInput) {
    return suggestions
      .filter(suggestion => suggestion.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  /**
   * Calculate string match confidence
   */
  calculateStringMatch(target, input) {
    if (!input) return 0.5;
    
    const targetLower = target.toLowerCase();
    const inputLower = input.toLowerCase();
    
    if (targetLower === inputLower) return 1.0;
    if (targetLower.startsWith(inputLower)) return 0.9;
    if (targetLower.includes(inputLower)) return 0.7;
    
    return 0.3;
  }

  /**
   * Load customer history
   */
  loadCustomerHistory() {
    try {
      const stored = localStorage.getItem('aiba_customer_history');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading customer history:', error);
    }

    return [
      { name: 'ABC Constructions', lastQuoteDate: '2024-01-15', totalQuotes: 12, location: 'Chennai' },
      { name: 'XYZ Steel Trading', lastQuoteDate: '2024-01-10', totalQuotes: 8, location: 'Coimbatore' },
      { name: 'Modern Builders', lastQuoteDate: '2024-01-08', totalQuotes: 15, location: 'Madurai' }
    ];
  }

  /**
   * Load product history
   */
  loadProductHistory() {
    try {
      const stored = localStorage.getItem('aiba_product_history');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading product history:', error);
    }

    return [
      { description: 'TMT Bars 10mm', avgRate: 52, commonUOM: 'MT', lastUsed: '2024-01-15', frequency: 25 },
      { description: 'ISMB 150', avgRate: 75, commonUOM: 'Nos', lastUsed: '2024-01-12', frequency: 18 },
      { description: 'HR Sheet 2mm', avgRate: 58, commonUOM: 'Kg', lastUsed: '2024-01-10', frequency: 22 }
    ];
  }

  /**
   * Get popular steel items
   */
  getPopularItems() {
    return [
      { name: 'TMT Bars 8mm', category: 'Reinforcement Steel', typicalRate: 50, commonUOM: 'MT', description: 'Thermo-Mechanically Treated bars' },
      { name: 'TMT Bars 10mm', category: 'Reinforcement Steel', typicalRate: 52, commonUOM: 'MT', description: 'Standard construction bars' },
      { name: 'TMT Bars 12mm', category: 'Reinforcement Steel', typicalRate: 53, commonUOM: 'MT', description: 'Medium gauge construction bars' },
      { name: 'ISMB 150', category: 'Structural Steel', typicalRate: 75, commonUOM: 'Nos', description: 'I-Section beam' },
      { name: 'ISMB 200', category: 'Structural Steel', typicalRate: 85, commonUOM: 'Nos', description: 'Heavy I-Section beam' },
      { name: 'HR Sheet 1.6mm', category: 'Sheet Metal', typicalRate: 55, commonUOM: 'Kg', description: 'Hot Rolled sheet' },
      { name: 'CR Sheet 1mm', category: 'Sheet Metal', typicalRate: 62, commonUOM: 'Kg', description: 'Cold Rolled sheet' },
      { name: 'MS Pipe 25mm', category: 'Pipes & Tubes', typicalRate: 120, commonUOM: 'Nos', description: 'Mild Steel pipe' },
      { name: 'Angle 50x50x6mm', category: 'Angles', typicalRate: 850, commonUOM: 'Nos', description: 'Equal angle' },
      { name: 'Flat Bar 25x6mm', category: 'Bars', typicalRate: 55, commonUOM: 'Kg', description: 'Flat steel bar' }
    ];
  }

  /**
   * Update customer history
   */
  updateCustomerHistory(customerName) {
    const existing = this.customerHistory.find(c => c.name === customerName);
    if (existing) {
      existing.lastQuoteDate = new Date().toISOString().split('T')[0];
      existing.totalQuotes++;
    } else {
      this.customerHistory.unshift({
        name: customerName,
        lastQuoteDate: new Date().toISOString().split('T')[0],
        totalQuotes: 1,
        location: 'Unknown'
      });
    }

    try {
      localStorage.setItem('aiba_customer_history', JSON.stringify(this.customerHistory));
    } catch (error) {
      console.error('Error saving customer history:', error);
    }
  }

  /**
   * Update product history
   */
  updateProductHistory(productData) {
    const { description, rate, uom } = productData;
    const existing = this.productHistory.find(p => p.description === description);
    
    if (existing) {
      existing.lastUsed = new Date().toISOString().split('T')[0];
      existing.frequency++;
      existing.avgRate = ((existing.avgRate * (existing.frequency - 1)) + rate) / existing.frequency;
    } else {
      this.productHistory.unshift({
        description: description,
        avgRate: rate,
        commonUOM: uom,
        lastUsed: new Date().toISOString().split('T')[0],
        frequency: 1
      });
    }

    try {
      localStorage.setItem('aiba_product_history', JSON.stringify(this.productHistory));
    } catch (error) {
      console.error('Error saving product history:', error);
    }
  }
}

// Export singleton instance
const suggestionManager = new SuggestionManager();

export default suggestionManager;
export { SuggestionManager }; 
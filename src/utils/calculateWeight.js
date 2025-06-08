import { sectionWeights } from './sectionWeights.js';

/**
 * Calculate total weight for a steel item
 * @param {string} description - Steel item description
 * @param {number} quantityNos - Number of pieces
 * @param {number} lengthMeters - Length in meters (default 6m for sections, ignored for sheets)
 * @returns {number} Total weight in kg
 */
export function calculateWeight(description, quantityNos, lengthMeters = 6) {
  // Find the item in the weights database
  const weightData = sectionWeights[description];
  
  if (!weightData) {
    console.warn(`Weight data not found for: ${description}`);
    return 0;
  }
  
  // If it's a sheet/plate (object with dimensions)
  if (typeof weightData === 'object' && weightData.length !== undefined) {
    const { length, width, thickness, density } = weightData;
    // For sheets: volume (m³) × density (kg/m³) × quantity
    const volumePerSheet = length * width * thickness;
    const weightPerSheet = volumePerSheet * density;
    return quantityNos * weightPerSheet;
  }
  
  // If it's a standard section (number representing kg/m)
  if (typeof weightData === 'number') {
    // For sections: quantity × length × weight per meter
    return quantityNos * lengthMeters * weightData;
  }
  
  return 0;
}

/**
 * Get weight per unit for display purposes
 * @param {string} description - Steel item description
 * @param {number} lengthMeters - Length in meters for sections
 * @returns {object} Weight information
 */
export function getWeightInfo(description, lengthMeters = 6) {
  const weightData = sectionWeights[description];
  
  if (!weightData) {
    return { error: `Weight data not found for: ${description}` };
  }
  
  if (typeof weightData === 'object' && weightData.length !== undefined) {
    const { length, width, thickness, density } = weightData;
    const volumePerSheet = length * width * thickness;
    const weightPerSheet = volumePerSheet * density;
    return {
      type: 'sheet',
      weightPerUnit: weightPerSheet,
      unit: 'kg/sheet',
      dimensions: `${length}m × ${width}m × ${thickness * 1000}mm`,
      density: density
    };
  }
  
  if (typeof weightData === 'number') {
    const weightPerLength = weightData * lengthMeters;
    return {
      type: 'section',
      weightPerMeter: weightData,
      weightPerUnit: weightPerLength,
      unit: `kg/${lengthMeters}m length`,
      length: lengthMeters
    };
  }
  
  return { error: 'Invalid weight data format' };
}

/**
 * Check if an item description exists in the database
 * @param {string} description - Steel item description
 * @returns {boolean} True if item exists
 */
export function isValidItem(description) {
  return sectionWeights.hasOwnProperty(description);
}

/**
 * Get all available steel items
 * @returns {string[]} Array of all steel item descriptions
 */
export function getAllItems() {
  return Object.keys(sectionWeights);
}

/**
 * Find similar items based on partial match
 * @param {string} partialDescription - Partial item description
 * @returns {string[]} Array of matching item descriptions
 */
export function findSimilarItems(partialDescription) {
  const searchTerm = partialDescription.toLowerCase();
  return Object.keys(sectionWeights).filter(item => 
    item.toLowerCase().includes(searchTerm)
  );
}

export default calculateWeight; 
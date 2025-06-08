// Steel section weights mapping
// For simple sections: kg/m
// For sheets/plates: object with dimensions and density
export const sectionWeights = {
  // I-Sections (Indian Standard Medium Beam)
  "ISMB 100": 11.5,
  "ISMB 125": 13.7,
  "ISMB 150": 23.0,
  "ISMB 175": 25.4,
  "ISMB 200": 33.9,
  "ISMB 225": 38.3,
  "ISMB 250": 42.9,
  "ISMB 300": 57.2,
  "ISMB 350": 72.4,
  "ISMB 400": 89.3,
  "ISMB 450": 108.2,
  "ISMB 500": 129.1,
  "ISMB 550": 152.6,
  "ISMB 600": 178.4,

  // RSJ Poles and Sections
  "RSJ POLES 200x100": 28.4,
  "RSJ POLES 250x125": 41.2,
  "RSJ POLES 300x150": 56.3,
  "RSJ POLES 350x175": 72.8,
  "RSJ POLES 400x200": 91.5,

  // Channels (ISMC)
  "ISMC 75": 7.14,
  "ISMC 100": 11.0,
  "ISMC 125": 13.1,
  "ISMC 150": 16.4,
  "ISMC 175": 19.6,
  "ISMC 200": 24.2,
  "ISMC 250": 31.1,
  "ISMC 300": 38.8,
  "ISMC 350": 47.3,
  "ISMC 400": 56.8,

  // Angles (ISA)
  "ISA 25x25x3": 1.11,
  "ISA 30x30x3": 1.36,
  "ISA 40x40x3": 1.85,
  "ISA 50x50x5": 3.77,
  "ISA 65x65x6": 5.85,
  "ISA 75x75x6": 6.85,
  "ISA 90x90x6": 8.30,
  "ISA 100x100x8": 12.2,
  "ISA 125x125x10": 18.9,
  "ISA 150x150x12": 26.8,

  // HR Sheets and Plates (thickness x width x length in meters, density in kg/m³)
  "HR SHEET 1.6mm x 900 x 2500": { 
    length: 2.5, 
    width: 0.9, 
    thickness: 0.0016, 
    density: 7850 
  },
  "HR SHEET 2.0mm x 1000 x 2000": { 
    length: 2.0, 
    width: 1.0, 
    thickness: 0.002, 
    density: 7850 
  },
  "HR SHEET 2.5mm x 1250 x 2500": { 
    length: 2.5, 
    width: 1.25, 
    thickness: 0.0025, 
    density: 7850 
  },
  "HR SHEET 3.0mm x 1250 x 2500": { 
    length: 2.5, 
    width: 1.25, 
    thickness: 0.003, 
    density: 7850 
  },
  "HR SHEET 4.0mm x 1250 x 2500": { 
    length: 2.5, 
    width: 1.25, 
    thickness: 0.004, 
    density: 7850 
  },
  "HR SHEET 5.0mm x 1500 x 3000": { 
    length: 3.0, 
    width: 1.5, 
    thickness: 0.005, 
    density: 7850 
  },
  "HR SHEET 6.0mm x 1500 x 3000": { 
    length: 3.0, 
    width: 1.5, 
    thickness: 0.006, 
    density: 7850 
  },
  "HR SHEET 8.0mm x 1500 x 3000": { 
    length: 3.0, 
    width: 1.5, 
    thickness: 0.008, 
    density: 7850 
  },
  "HR SHEET 10mm x 1500 x 3000": { 
    length: 3.0, 
    width: 1.5, 
    thickness: 0.010, 
    density: 7850 
  },
  "HR SHEET 12mm x 1500 x 3000": { 
    length: 3.0, 
    width: 1.5, 
    thickness: 0.012, 
    density: 7850 
  },

  // CR Sheets (Cold Rolled)
  "CR SHEET 1.0mm x 1000 x 2000": { 
    length: 2.0, 
    width: 1.0, 
    thickness: 0.001, 
    density: 7850 
  },
  "CR SHEET 1.2mm x 1000 x 2000": { 
    length: 2.0, 
    width: 1.0, 
    thickness: 0.0012, 
    density: 7850 
  },
  "CR SHEET 1.6mm x 1250 x 2500": { 
    length: 2.5, 
    width: 1.25, 
    thickness: 0.0016, 
    density: 7850 
  },

  // Pipes and Tubes (weight per meter)
  "MS PIPE 25mm": 1.51,
  "MS PIPE 32mm": 2.15,
  "MS PIPE 40mm": 2.93,
  "MS PIPE 50mm": 3.85,
  "MS PIPE 65mm": 5.11,
  "MS PIPE 80mm": 6.51,
  "MS PIPE 100mm": 8.38,
  "MS PIPE 125mm": 10.9,
  "MS PIPE 150mm": 13.7,

  // Square Tubes
  "MS SQUARE TUBE 20x20x2mm": 1.42,
  "MS SQUARE TUBE 25x25x2mm": 1.80,
  "MS SQUARE TUBE 40x40x3mm": 3.45,
  "MS SQUARE TUBE 50x50x3mm": 4.47,
  "MS SQUARE TUBE 60x60x4mm": 6.95,
  "MS SQUARE TUBE 80x80x4mm": 9.42,
  "MS SQUARE TUBE 100x100x5mm": 14.2,

  // Rectangular Tubes
  "MS RECT TUBE 40x20x2mm": 2.27,
  "MS RECT TUBE 50x25x3mm": 4.18,
  "MS RECT TUBE 60x40x3mm": 5.56,
  "MS RECT TUBE 80x40x4mm": 8.77,
  "MS RECT TUBE 100x50x5mm": 13.6,

  // Flats
  "MS FLAT 20x3mm": 0.471,
  "MS FLAT 25x5mm": 0.981,
  "MS FLAT 40x5mm": 1.57,
  "MS FLAT 50x6mm": 2.36,
  "MS FLAT 75x8mm": 4.71,
  "MS FLAT 100x10mm": 7.85,

  // Rounds
  "MS ROUND 8mm": 0.395,
  "MS ROUND 10mm": 0.617,
  "MS ROUND 12mm": 0.888,
  "MS ROUND 16mm": 1.58,
  "MS ROUND 20mm": 2.47,
  "MS ROUND 25mm": 3.85,
  "MS ROUND 32mm": 6.31,
  "MS ROUND 40mm": 9.86,
  "MS ROUND 50mm": 15.4,

  // Squares
  "MS SQUARE 10mm": 0.785,
  "MS SQUARE 12mm": 1.13,
  "MS SQUARE 16mm": 2.01,
  "MS SQUARE 20mm": 3.14,
  "MS SQUARE 25mm": 4.91,
  "MS SQUARE 32mm": 8.04,
  "MS SQUARE 40mm": 12.6,
  "MS SQUARE 50mm": 19.6
};

export default sectionWeights; 
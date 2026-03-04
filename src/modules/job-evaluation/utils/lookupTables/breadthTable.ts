
// Breadth calculation lookup table

export const breadthTable = {
  values: [
    { level: 1, points: 0, label: "Domestic" },   // Domestic - Applies knowledge within a country
    { level: 1.5, points: 5 },                    // Intermediate level
    { level: 2, points: 10, label: "Regional" },  // Regional - Applies knowledge in a continental region
    { level: 2.5, points: 15 },                   // Intermediate level
    { level: 3, points: 20, label: "Global" }     // Global - Applies knowledge across all regions
  ]
};

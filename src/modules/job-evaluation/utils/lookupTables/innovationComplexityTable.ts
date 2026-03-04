
// Innovation-Complexity calculation lookup table

export const innovationComplexityTable = {
  rows: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6],
  cols: [1, 1.5, 2, 2.5, 3, 3.5, 4],
  values: [
    // Innovation 1 (Follow)
    [10, 13, 15, 18, 20, 23, 25],
    // Innovation 1.5
    [18, 20, 23, 25, 28, 30, 33],
    // Innovation 2 (Check)
    [25, 28, 30, 33, 35, 38, 40],
    // Innovation 2.5
    [33, 35, 38, 40, 43, 45, 48],
    // Innovation 3 (Modify)
    [40, 43, 45, 48, 50, 53, 55],
    // Innovation 3.5
    [53, 55, 58, 60, 63, 65, 68],
    // Innovation 4 (Improve)
    [65, 68, 70, 73, 75, 78, 80],
    // Innovation 4.5
    [78, 80, 83, 85, 88, 90, 93],
    // Innovation 5 (Create/Conceptualize)
    [90, 93, 95, 98, 100, 103, 105],
    // Innovation 5.5
    [103, 105, 108, 110, 113, 115, 118],
    // Innovation 6 (Scientific/Technical Breakthrough)
    [115, 118, 120, 123, 125, 128, 130]
  ]
};

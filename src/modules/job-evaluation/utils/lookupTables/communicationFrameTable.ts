
// Communication-Frame calculation lookup table

export const communicationFrameTable = {
  rows: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
  cols: [1, 1.5, 2, 2.5, 3, 3.5, 4],
  values: [
    // Communication 1 (Convey)
    [10, 18, 25, 28, 30, 38, 45],
    // Communication 1.5
    [18, 25, 33, 35, 38, 45, 53],
    // Communication 2 (Adapt and exchange)
    [25, 33, 40, 43, 45, 53, 60],
    // Communication 2.5
    [33, 40, 48, 50, 53, 60, 68],
    // Communication 3 (Influence)
    [40, 48, 55, 58, 60, 68, 75],
    // Communication 3.5
    [48, 56, 65, 68, 70, 79, 88],
    // Communication 4 (Negotiate)
    [55, 65, 75, 78, 80, 90, 100],
    // Communication 4.5
    [63, 73, 83, 85, 88, 98, 108],
    // Communication 5 (Negotiate Long Term)
    [70, 80, 90, 93, 95, 105, 115]
  ]
};

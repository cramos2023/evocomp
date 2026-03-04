
// Impact-Contribution calculation lookup table

export const impactContributionTable = {
  rows: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
  cols: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5],
  values: [
    // Impact 1 (Delivery)
    [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6],
    // Impact 1.5
    [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5],
    // Impact 2 (Operation)
    [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7],
    // Impact 2.5
    [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5],
    // Impact 3 (Tactical)
    [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8],
    // Impact 3.5
    [4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5],
    // Impact 4 (Strategic)
    [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9],
    // Impact 4.5
    [5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5],
    // Impact 5 (Visionary)
    [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]
  ]
};

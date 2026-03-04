
// Risk-Environment calculation lookup table

export const riskEnvironmentTable = {
  rows: [0, 1, 1.5, 2, 2.5, 3],
  cols: [1, 1.5, 2, 2.5, 3],
  values: [
    // Risk 0
    [0, 0, 0, 0, 0],
    // Risk 1
    [5, 8, 10, 13, 15],
    // Risk 1.5
    [10, 13, 15, 18, 20],
    // Risk 2
    [15, 18, 20, 23, 25],
    // Risk 2.5
    [20, 23, 25, 28, 30],
    // Risk 3
    [25, 28, 30, 33, 35]
  ]
};

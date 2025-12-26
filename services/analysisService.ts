import { DataRow, ColumnStat } from '../types';

export const calculateStatsForColumn = (data: number[]) => {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((acc, val) => acc + val, 0);
  const mean = sum / data.length;

  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  const modeMap: Record<number, number> = {};
  let maxCount = 0;
  let modes: number[] = [];
  data.forEach(item => {
    modeMap[item] = (modeMap[item] || 0) + 1;
    if (modeMap[item] > maxCount) {
      maxCount = modeMap[item];
      modes = [item];
    } else if (modeMap[item] === maxCount && !modes.includes(item)) {
      modes.push(item);
    }
  });
  // If all values appear same number of times, there is no mode.
  if (modes.length === Object.keys(modeMap).length) modes = [];


  const stdDev = Math.sqrt(data.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (data.length -1));

  const q1Index = Math.floor(sorted.length / 4);
  const q3Index = Math.floor((3 * sorted.length) / 4);
  const q1 = sorted.length % 4 === 0 ? (sorted[q1Index - 1] + sorted[q1Index]) / 2 : sorted[q1Index];
  const q3 = sorted.length % 4 === 0 ? (sorted[q3Index - 1] + sorted[q3Index]) / 2 : sorted[q3Index];
  const iqr = q3 - q1;

  return {
    mean,
    median,
    mode: modes,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1,
    q3,
    iqr
  };
};

export const findOutliers = (data: DataRow[], column: string, q1: number, q3: number, iqr: number): DataRow[] => {
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    return data.filter(row => {
        const value = parseFloat(row[column]);
        return !isNaN(value) && (value < lowerBound || value > upperBound);
    });
};

export const getColumnInfo = (columnData: any[], allData: DataRow[], header: string): ColumnStat => {
    const validData = columnData.filter(d => d !== null && d !== undefined && d !== '');
    const missingCount = columnData.length - validData.length;

    const numericData = validData.map(Number).filter(n => !isNaN(n));

    // Consider it numeric if more than 80% of valid data points are numbers
    const isNumeric = validData.length > 0 && (numericData.length / validData.length > 0.8);

    if(isNumeric) {
        const stats = calculateStatsForColumn(numericData);
        if (!stats) {
            return { missingCount, type: 'categorical', outliers: [] };
        }
        const outliers = findOutliers(allData, header, stats.q1, stats.q3, stats.iqr);
        return {
            missingCount,
            type: 'numeric',
            stats,
            outliers
        };
    } else {
        return {
            missingCount,
            type: 'categorical',
            outliers: []
        };
    }
};

// Calculates Pearson correlation coefficient
const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length;
    if (n === 0 || n !== y.length) return NaN;
  
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
    const sumX2 = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
    const sumY2 = y.map(yi => yi * yi).reduce((a, b) => a + b, 0);
  
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
    if (denominator === 0) return NaN;
  
    return numerator / denominator;
};

export const generateCorrelationMatrix = (data: DataRow[], headers: string[]): { labels: string[], matrix: number[][] } | null => {
    // 1. Identify numeric columns
    const numericColumns = headers.filter(header => {
        const columnData = data.map(row => row[header]);
        const validData = columnData.filter(d => d !== null && d !== undefined && d !== '');
        if (validData.length === 0) return false;
        const numericData = validData.map(Number).filter(n => !isNaN(n));
        return (numericData.length / validData.length > 0.8);
    });

    if (numericColumns.length < 2) return null;

    // 2. Extract numeric data into a map for easier access
    const numericDataMap: Record<string, number[]> = {};
    numericColumns.forEach(header => {
        numericDataMap[header] = data.map(row => parseFloat(row[header]));
    });

    // 3. Build the matrix
    const n = numericColumns.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            const col1Header = numericColumns[i];
            const col2Header = numericColumns[j];
            
            // Prepare paired data, ignoring rows where either value is not a number
            const pairedX: number[] = [];
            const pairedY: number[] = [];
            for(let k = 0; k < data.length; k++) {
                const val1 = numericDataMap[col1Header][k];
                const val2 = numericDataMap[col2Header][k];
                if (!isNaN(val1) && !isNaN(val2)) {
                    pairedX.push(val1);
                    pairedY.push(val2);
                }
            }

            if (i === j) {
                matrix[i][j] = 1.0;
            } else {
                const corr = calculateCorrelation(pairedX, pairedY);
                matrix[i][j] = isNaN(corr) ? 0 : corr;
                matrix[j][i] = isNaN(corr) ? 0 : corr; // Symmetric matrix
            }
        }
    }

    return { labels: numericColumns, matrix };
};
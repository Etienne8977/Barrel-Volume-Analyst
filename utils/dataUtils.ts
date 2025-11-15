import { BarrelData, TableRow } from "../types";

export const mergeBarrelData = (existingData: BarrelData, newData: BarrelData): BarrelData => {
  if (!newData || newData.length === 0) return existingData;
  if (!existingData || existingData.length === 0) return newData;

  const mergedDataMap = new Map<string | number, TableRow>();

  // Use the first key of the first object as the primary key (e.g., "Mouillé")
  const primaryKey = Object.keys(existingData[0])[0];
  if (!primaryKey) {
    return newData;
  }
  
  // Populate map with existing data, using the value inside the CellData object as the key
  for (const row of existingData) {
    if (row[primaryKey] && row[primaryKey].value !== null) {
      mergedDataMap.set(row[primaryKey].value!, row);
    }
  }

  // Merge new data
  for (const newRow of newData) {
    const key = newRow[primaryKey]?.value;
    if (key === null || key === undefined) continue;

    if (mergedDataMap.has(key)) {
      // Merge properties of newRow into the existing row
      // New data overwrites old data if there's a conflict, assuming it's more recent/correct
      const existingRow = mergedDataMap.get(key)!;
      const mergedRow = { ...existingRow };

      for (const cellKey in newRow) {
         // Only update if the new cell has a non-null value, to avoid overwriting good data with blanks
         if (newRow[cellKey].value !== null) {
              mergedRow[cellKey] = newRow[cellKey];
         }
      }
      mergedDataMap.set(key, mergedRow);

    } else {
      // Add new row
      mergedDataMap.set(key, newRow);
    }
  }

  // Convert map back to array and sort by the primary key numerically
  const sortedData = Array.from(mergedDataMap.values()).sort((a, b) => {
    const valA = Number(a[primaryKey].value);
    const valB = Number(b[primaryKey].value);
    if (isNaN(valA) || isNaN(valB)) return 0;
    return valA - valB;
  });

  return sortedData;
};

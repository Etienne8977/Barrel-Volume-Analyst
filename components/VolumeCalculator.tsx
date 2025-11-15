import React, { useState, useMemo, useEffect } from 'react';
import { BarrelData, TableRow } from '../types';

interface VolumeCalculatorProps {
  barrelData: BarrelData | null;
}

const VolumeCalculator: React.FC<VolumeCalculatorProps> = ({ barrelData }) => {
  const [wetHeight, setWetHeight] = useState('');
  const [selectedVolumeKey, setSelectedVolumeKey] = useState('');
  const [volume, setVolume] = useState<string | number | null>(null);
  const [calculationNote, setCalculationNote] = useState<string | null>(null);

  const isDisabled = !barrelData || barrelData.length === 0;

  const { heightKey, volumeKeys, dataMap } = useMemo(() => {
    if (isDisabled) return { heightKey: null, volumeKeys: [], dataMap: new Map() };

    const headers = Object.keys(barrelData[0]);
    const potentialHeightKey = headers.find(h => h.toLowerCase().includes('mouill')) || headers[0];
    const potentialVolumeKeys = headers.filter(h => h !== potentialHeightKey);
    
    // Create a map for quick lookups
    const map = new Map<number, TableRow>();
    barrelData.forEach(row => {
        const height = Number(row[potentialHeightKey].value);
        if(!isNaN(height)) {
            map.set(height, row);
        }
    });

    return { heightKey: potentialHeightKey, volumeKeys: potentialVolumeKeys, dataMap: map };
  }, [barrelData, isDisabled]);

  useEffect(() => {
    if (volumeKeys.length > 0 && !volumeKeys.includes(selectedVolumeKey)) {
      setSelectedVolumeKey(volumeKeys[0]);
    } else if (volumeKeys.length === 0) {
      setSelectedVolumeKey('');
    }
    setVolume(null);
    setWetHeight('');
    setCalculationNote(null);
  }, [volumeKeys, selectedVolumeKey]);


  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setCalculationNote(null);

    if (isDisabled || !heightKey || !selectedVolumeKey || !dataMap.size) {
        setVolume('N/A');
        return;
    }
    
    const height = parseFloat(wetHeight);
    if (isNaN(height)) {
      setVolume('Invalid input');
      return;
    }

    // Case 1: Exact match
    if (dataMap.has(height)) {
        setVolume(dataMap.get(height)![selectedVolumeKey].value);
        setCalculationNote('Exact value found in table.');
        return;
    }

    // Case 2: Decimal value, requires interpolation
    const lowerHeight = Math.floor(height);
    const upperHeight = Math.ceil(height);

    const lowerRow = dataMap.get(lowerHeight);
    const upperRow = dataMap.get(upperHeight);

    if (lowerRow && upperRow) {
        const lowerVolume = Number(lowerRow[selectedVolumeKey].value);
        const upperVolume = Number(upperRow[selectedVolumeKey].value);

        if (isNaN(lowerVolume) || isNaN(upperVolume)) {
            setVolume('Data not numeric');
            setCalculationNote('Cannot interpolate non-numeric values.');
            return;
        }

        const heightFraction = height - lowerHeight;
        const volumeDifference = upperVolume - lowerVolume;
        const interpolatedVolume = lowerVolume + (volumeDifference * heightFraction);

        setVolume(interpolatedVolume.toFixed(2)); // Round to 2 decimal places
        setCalculationNote(`Interpolated between ${lowerHeight} and ${upperHeight}.`);

    } else {
      // No exact match and no bounding values for interpolation, find closest
      let closestRow: TableRow | null = null;
      let minDiff = Infinity;

      for (const row of barrelData) {
          const rowHeight = parseFloat(String(row[heightKey].value));
          if (!isNaN(rowHeight)) {
              const diff = Math.abs(rowHeight - height);
              if (diff < minDiff) {
                  minDiff = diff;
                  closestRow = row;
              }
          }
      }
      if (closestRow) {
          setVolume(closestRow[selectedVolumeKey].value);
          setCalculationNote(`No exact match. Showing value for closest height: ${closestRow[heightKey].value}.`);
      } else {
          setVolume('No match found');
      }
    }
  };

  return (
    <div className={`w-full lg:w-2/5 xl:w-1/3 p-4 md:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex flex-col space-y-4 transition-opacity duration-500 ${isDisabled ? 'opacity-50' : 'opacity-100'}`}>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">2. Calculate Volume</h2>
      {isDisabled && (
        <div className="text-center p-4 border border-dashed rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            <p>Add data from a page to enable the calculator.</p>
        </div>
      )}
      <form onSubmit={handleCalculate} className="flex flex-col space-y-4">
        <div>
            <label htmlFor="barrel-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Barrel Configuration
            </label>
            <select
                id="barrel-type"
                value={selectedVolumeKey}
                onChange={e => setSelectedVolumeKey(e.target.value)}
                disabled={isDisabled}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100 dark:disabled:bg-gray-700"
            >
                {volumeKeys.map(key => <option key={key} value={key}>{key.replace(/_/g, ' ')}</option>)}
            </select>
        </div>
        <div>
          <label htmlFor="hauteur" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Hauteur de mouillé (e.g. 25.5)
          </label>
          <input
            type="number"
            id="hauteur"
            step="0.1"
            value={wetHeight}
            onChange={(e) => setWetHeight(e.target.value)}
            disabled={isDisabled}
            placeholder={heightKey ? `e.g. value from '${heightKey}' column` : "e.g. 55"}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700"
          />
        </div>
        
        <button
          type="submit"
          disabled={isDisabled || !wetHeight}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 dark:disabled:bg-green-800 disabled:cursor-not-allowed transition-colors"
        >
          Calculate
        </button>
      </form>
      {volume !== null && (
        <div className="mt-4 text-center p-6 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg">
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Calculated Volume:</p>
          <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{String(volume)}</p>
          {calculationNote && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{calculationNote}</p>}
        </div>
      )}
    </div>
  );
};

export default VolumeCalculator;

import React from 'react';
import { BarrelData } from '../types';
import { EditableTable } from './EditableTable';

interface DataManagementProps {
  barrelData: BarrelData | null;
  onDataChange: (newData: BarrelData) => void;
  onClearAll: () => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ barrelData, onDataChange, onClearAll }) => {
  if (!barrelData || barrelData.length === 0) {
    return (
        <div className="p-4 md:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Master Dataset</h2>
            <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400">No data has been saved yet.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Go to the 'Analyzer' tab to add a page.</p>
            </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Master Dataset</h2>
             <button onClick={onClearAll} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900">
                Clear All Data
             </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        This is your complete, saved dataset. All confirmed data from your analyses is stored here. You can double-click any cell to make corrections. Changes are saved automatically.
      </p>
      <EditableTable data={barrelData} onDataChange={onDataChange} fullHeight />
    </div>
  );
};

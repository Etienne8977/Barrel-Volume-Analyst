import React, { useState } from 'react';
import { BarrelData, CellData } from '../types';

interface EditableTableProps {
  data: BarrelData;
  onDataChange: (newData: BarrelData) => void;
  fullHeight?: boolean;
}

const EditableCell: React.FC<{
  cellData: CellData;
  rowIndex: number;
  header: string;
  onSave: (rowIndex: number, header: string, newCellData: CellData) => void;
}> = ({ cellData, rowIndex, header, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(cellData.value);

  const handleSave = () => {
    // Attempt to convert to number if possible, otherwise keep as string
    const numericValue = Number(currentValue);
    const finalValue = isNaN(numericValue) ? String(currentValue) : numericValue;

    if (finalValue === cellData.value) {
        setIsEditing(false);
        return;
    }

    const newCellData: CellData = {
        value: finalValue,
        confidence: 'user'
    };

    onSave(rowIndex, header, newCellData);
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setCurrentValue(cellData.value);
      setIsEditing(false);
    }
  };

  const confidenceClasses: Record<string, string> = {
    high: 'bg-green-50 dark:bg-green-900/40',
    medium: 'bg-yellow-50 dark:bg-yellow-900/40',
    low: 'bg-red-50 dark:bg-red-900/40',
    user: 'bg-blue-50 dark:bg-blue-900/30 font-medium',
  };
  
  const cellClass = confidenceClasses[cellData.confidence] || '';

  if (isEditing) {
    return (
      <td className={`px-4 py-0 whitespace-nowrap text-sm ${cellClass}`}>
        <input
          type="text"
          value={currentValue ?? ''}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-indigo-500 border rounded px-1 py-1 my-0.5"
        />
      </td>
    );
  }
  
  return (
    <td
      className={`px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 cursor-pointer transition-colors ${cellClass}`}
      onDoubleClick={() => setIsEditing(true)}
      title="Double-click to edit"
    >
      {String(cellData.value ?? '')}
    </td>
  );
};


export const EditableTable: React.FC<EditableTableProps> = ({ data, onDataChange, fullHeight = false }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No data to display.</p>;
  }

  const headers = Object.keys(data[0]);

  const handleCellSave = (rowIndex: number, header: string, newCellData: CellData) => {
    const updatedData = data.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        return { ...row, [header]: newCellData };
      }
      return row;
    });
    onDataChange(updatedData);
  };
  
  return (
    <div className={`overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg flex-grow ${fullHeight ? 'h-[65vh]' : 'h-64'}`}>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
            <tr>
                {headers.map(header => (
                <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                ))}
            </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((row, rowIndex) => (
                <tr key={String(row.Mouillé?.value) + '-' + rowIndex}>
                {headers.map((header) => (
                    <EditableCell
                        key={`${String(row.Mouillé?.value)}-${header}`}
                        cellData={row[header]}
                        rowIndex={rowIndex}
                        header={header}
                        onSave={handleCellSave}
                    />
                ))}
                </tr>
            ))}
            </tbody>
        </table>
    </div>
  );
};

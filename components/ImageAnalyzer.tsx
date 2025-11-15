
import React, { useState, useEffect, useRef } from 'react';
import { BarrelData } from '../types';
import { UploadIcon, CopyIcon, DownloadIcon } from './icons';
import { convertToCSV, downloadCSV } from '../utils/csv';
import { EditableTable } from './EditableTable';

interface ImageAnalyzerProps {
  onAnalyze: (file: File) => void;
  loadingStep: '' | 'extracting' | 'verifying';
  error: string | null;
  analysisResult: BarrelData | null;
  barrelData: BarrelData | null;
  onConfirm: (data: BarrelData) => void;
  onDiscard: () => void;
  imagePreviewUrl: string | null;
  setImagePreviewUrl: (url: string | null) => void;
  setSelectedFile: (file: File | null) => void;
  selectedFile: File | null;
}

const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({
  onAnalyze,
  loadingStep,
  error,
  analysisResult,
  barrelData,
  onConfirm,
  onDiscard,
  imagePreviewUrl,
  setImagePreviewUrl,
  setSelectedFile,
  selectedFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editableData, setEditableData] = useState<BarrelData | null>(null);

  const isLoading = loadingStep !== '';

  useEffect(() => {
    setEditableData(analysisResult);
  }, [analysisResult]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeClick = () => {
    if (selectedFile) {
      onAnalyze(selectedFile);
    }
  };
  
  const handleConfirmClick = () => {
    if (editableData) {
      onConfirm(editableData);
    }
  };

  const handleCopy = () => {
    if (barrelData) {
        navigator.clipboard.writeText(JSON.stringify(barrelData, null, 2));
    }
  };

  const handleDownload = () => {
    if (barrelData) {
        const csv = convertToCSV(barrelData);
        downloadCSV(csv, 'barrel_data.csv');
    }
  };
  
  const getLoadingText = () => {
    switch (loadingStep) {
      case 'extracting':
        return 'Step 1/2: Extracting...';
      case 'verifying':
        return 'Step 2/2: AI Verifying...';
      default:
        return 'Analyzing...'; // Fallback
    }
  };


  return (
    <div className="w-full lg:w-3/5 xl:w-2/3 p-4 md:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex flex-col space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">1. Add & Verify Page</h2>
      
      {/* Uploader */}
      <div
        className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        {imagePreviewUrl ? (
          <img src={imagePreviewUrl} alt="Preview" className="mx-auto max-h-48 rounded-md" />
        ) : (
          <div className="text-gray-500 dark:text-gray-400">
            <UploadIcon className="w-12 h-12 mx-auto" />
            <p>Click to upload a page image</p>
          </div>
        )}
      </div>
      
      {selectedFile && !analysisResult && (
        <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{selectedFile.name}</p>
            <button onClick={handleAnalyzeClick} disabled={isLoading} className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed flex items-center justify-center transition-all min-w-[180px]">
                {isLoading ? (
                    <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{getLoadingText()}</>
                ) : 'Analyze Page'}
            </button>
        </div>
      )}
      
      {error && <p className="text-red-500 text-sm">{error}</p>}
      
      {/* Validation Step */}
      {editableData && (
        <div className="p-4 border-2 border-indigo-500 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 space-y-3">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Verify Extracted Data</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">The AI has analyzed the data. Cells are colored by confidence (Green=High, Yellow=Medium, Red=Low). Please double-click to correct any errors before adding to the dataset.</p>
          <EditableTable data={editableData} onDataChange={setEditableData} />
           <div className="flex justify-end space-x-3 pt-2">
                <button onClick={onDiscard} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                    Discard
                </button>
                <button onClick={handleConfirmClick} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Confirm & Add to Dataset
                </button>
            </div>
        </div>
      )}

      {/* Cumulative Data Preview */}
      {barrelData && !analysisResult && (
         <div className="flex-grow flex flex-col pt-4">
             <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Dataset Preview (Last 5 rows)</h3>
                 <div className="flex space-x-2">
                     <button onClick={handleCopy} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" title="Copy as JSON"><CopyIcon className="w-5 h-5"/></button>
                     <button onClick={handleDownload} className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400" title="Download as CSV"><DownloadIcon className="w-5 h-5"/></button>
                 </div>
             </div>
           <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Go to the "Data" tab to see and edit the full dataset.</p>
           <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg flex-grow h-48">
             <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
               <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                 <tr>
                   {Object.keys(barrelData[0]).map(header => (
                     <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                   ))}
                 </tr>
               </thead>
               <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                 {barrelData.slice(-5).map((row, index) => (
                   <tr key={index}>
                     {Object.keys(row).map(header => (
                       <td key={header} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{String(row[header].value)}</td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
      )}
    </div>
  );
};

export default ImageAnalyzer;

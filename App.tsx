
import React, { useState, useEffect } from 'react';
import ImageAnalyzer from './components/ImageAnalyzer';
import VolumeCalculator from './components/VolumeCalculator';
import { DataManagement } from './components/DataManagement';
import { analyzeImageForTable, verifyTableData } from './services/geminiService';
import { BarrelData } from './types';
import { mergeBarrelData } from './utils/dataUtils';
import { InstallIcon } from './components/icons';

type LoadingStep = '' | 'extracting' | 'verifying';
type ActiveTab = 'analyzer' | 'data';

// Define the interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function App() {
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('');
  const [error, setError] = useState<string | null>(null);
  
  const [barrelData, setBarrelData] = useState<BarrelData | null>(() => {
    try {
        const item = window.localStorage.getItem('barrelData');
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error("Error reading from localStorage", error);
        return null;
    }
  });
  
  const [analysisResult, setAnalysisResult] = useState<BarrelData | null>(null);
  
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyzer');
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
        if (barrelData && barrelData.length > 0) {
            window.localStorage.setItem('barrelData', JSON.stringify(barrelData));
        } else {
            window.localStorage.removeItem('barrelData');
        }
    } catch (error) {
        console.error("Error writing to localStorage", error);
    }
  }, [barrelData]);
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      return;
    }
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setInstallPromptEvent(null);
  };

  const handleAnalyze = async (file: File) => {
    let currentStep: LoadingStep = 'extracting';
    setLoadingStep(currentStep);
    setError(null);
    setAnalysisResult(null); 
    try {
      const extractedData = await analyzeImageForTable(file);
      currentStep = 'verifying';
      setLoadingStep(currentStep);
      const verifiedData = await verifyTableData(file, extractedData);
      setAnalysisResult(verifiedData);
    } catch (e) {
      if (e instanceof Error) {
        const stepName = currentStep === 'extracting' ? 'extraction' : 'verification';
        setError(`An error occurred during the AI ${stepName} step: ${e.message}`);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoadingStep('');
    }
  };

  const handleConfirmData = (confirmedData: BarrelData) => {
    setBarrelData(prevData => mergeBarrelData(prevData || [], confirmedData));
    setAnalysisResult(null); 
    // Reset file input to allow analyzing the same file again if needed
    setImagePreviewUrl(null);
    setSelectedFile(null);
  };

  const handleDiscardData = () => {
    setAnalysisResult(null);
  };
  
  const handleClearAllData = () => {
    if(window.confirm("Are you sure you want to delete all saved data? This action cannot be undone.")){
        setBarrelData(null);
        setAnalysisResult(null);
        setImagePreviewUrl(null);
        setSelectedFile(null);
    }
  };

  const TabButton: React.FC<{tabId: ActiveTab, children: React.ReactNode}> = ({ tabId, children }) => {
    const isActive = activeTab === tabId;
    return (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'}`}
        >
            {children}
        </button>
    );
  };


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                    Barrel Volume Analyst
                </h1>
            </div>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Digitize book pages, verify with AI, and calculate volumes with precision.
          </p>
           {installPromptEvent && (
              <div className="mt-4 animate-fade-in-down">
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                  title="Installer sur votre appareil"
                  aria-label="Installer l'application sur votre appareil"
                >
                  <InstallIcon className="w-5 h-5" />
                  <span>Installer l'application</span>
                </button>
              </div>
            )}
        </header>

        <nav className="flex justify-center space-x-2 mb-8 p-2 bg-gray-200 dark:bg-gray-800 rounded-lg max-w-xs mx-auto">
            <TabButton tabId="analyzer">Analyzer</TabButton>
            <TabButton tabId="data">Data</TabButton>
        </nav>

        <main>
          {activeTab === 'analyzer' && (
             <div className="flex flex-col lg:flex-row gap-8 items-start">
                <ImageAnalyzer 
                    onAnalyze={handleAnalyze}
                    loadingStep={loadingStep}
                    error={error}
                    analysisResult={analysisResult}
                    barrelData={barrelData}
                    onConfirm={handleConfirmData}
                    onDiscard={handleDiscardData}
                    imagePreviewUrl={imagePreviewUrl}
                    setImagePreviewUrl={setImagePreviewUrl}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                />
                <VolumeCalculator barrelData={barrelData} />
            </div>
          )}
          {activeTab === 'data' && (
            <DataManagement 
                barrelData={barrelData}
                onDataChange={setBarrelData}
                onClearAll={handleClearAllData}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
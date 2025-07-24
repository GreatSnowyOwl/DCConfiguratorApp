import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import DataCenterVisualizer from '../components/DataCenterVisualizer';
import { PDUType } from '@/utils/configuratorData';
import html2canvas from 'html2canvas';

// Import background image
import backgroundImage from '/DATACENTER.png';

// Define props for user products to satisfy TypeScript
interface UserProducts {
  racks600: number;
  racks800: number;
  acModel: string;
  acUnits: number;
  acTotalPower: number;
  itUps: {
    model: string;
    power: number;
    description: string;
    price: number;
  };
  acUps: {
    model: string;
    power: number;
    description?: string;
    price: number;
  } | null;
  battery: any | null;
  pduType: PDUType;
  pduCount: number;
  distributionCabinet: {
    name: string;
    price: number;
    type?: string;
  } | null;
  selectedUpsIndex?: number;
  redundancyEnabled?: boolean;
}

// Interface for visualizer ref
interface VisualizerRef {
  switchToSchematicForCapture: () => Promise<"detailed" | "schematic">;
  restoreViewMode: (originalMode: "detailed" | "schematic") => void;
}

export default function DataCenterVisualizerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [configData, setConfigData] = useState<any>(location.state?.configData || null);
  const [captureFeedback, setCaptureFeedback] = useState<string>('');
  const visualizerRef = useRef<HTMLDivElement>(null);
  const visualizerComponentRef = useRef<VisualizerRef>(null);

  // Format configuration data for the visualizer
  const getUserProducts = (): UserProducts | undefined => {
    if (!configData) return undefined;

    return {
      racks600: parseInt(configData.racks600 || '0'),
      racks800: parseInt(configData.racks800 || '0'),
      acModel: configData.acModel || '',
      acUnits: configData.acUnits || 0,
      acTotalPower: configData.acTotalPower || 0,
      itUps: configData.itUps || {
        model: 'Default UPS',
        power: 100,
        description: 'Generic UPS Model',
        price: 0
      },
      acUps: configData.acUps || null,
      battery: configData.selectedBattery || null,
      pduType: configData.pduType || 'B' as PDUType,
      pduCount: (parseInt(configData.racks600 || '0') + parseInt(configData.racks800 || '0')) * 2,
      distributionCabinet: configData.distributionCabinet || null,
      selectedUpsIndex: configData.selectedUpsIndex,
      redundancyEnabled: configData.redundancyEnabled
    };
  };

  // Go back to configurator
  const handleBackToConfigurator = () => {
    navigate('/configurator', { 
      state: { 
        returnToSummary: true,
        configData: configData,
        // Pass these explicitly as top-level props for easier access in Configurator
        selectedUpsIndex: configData?.selectedUpsIndex,
        redundancyEnabled: configData?.redundancyEnabled
      } 
    });
  };

  // Capture visualization to add to PDF
  const captureVisualization = async () => {
    try {
      setCaptureFeedback('Сохраняем схему дата-центра...');
      
      // Switch to schematic view if necessary
      if (!visualizerComponentRef.current) {
        setCaptureFeedback('Ошибка: компонент визуализатора не найден.');
        return;
      }
      
      // Store the original view mode so we can switch back
      const originalViewMode = await visualizerComponentRef.current.switchToSchematicForCapture();
      
      // After view switch, wait a little to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Now get the schematic element
      const schematicElement = document.getElementById('schematicCapture');
      
      if (!schematicElement) {
        setCaptureFeedback('Ошибка: не удалось найти элемент схемы для сохранения.');
        // Switch back to original view
        visualizerComponentRef.current.restoreViewMode(originalViewMode);
        return;
      }
      
      // Capture the schematic view
      const canvas = await html2canvas(schematicElement, {
        backgroundColor: '#0A2B6C',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true, // Allow loading images from other domains
        allowTaint: true, // Allow tainted canvas
        foreignObjectRendering: false // Sometimes better compatibility
      });
      
      // Convert to data URL
      const imageData = canvas.toDataURL('image/png');
      
      // Save to localStorage
      localStorage.setItem('dcVisualizationImage', imageData);
      
      // Switch back to original view mode
      visualizerComponentRef.current.restoreViewMode(originalViewMode);
      
      setCaptureFeedback('Схема добавлена в PDF! Можете вернуться к расчёту.');
      
      // Clear feedback after 5 seconds
      setTimeout(() => {
        setCaptureFeedback('');
      }, 5000);
    } catch (error) {
      console.error('Error capturing visualization:', error);
      setCaptureFeedback('Не удалось сохранить схему. Пожалуйста, попробуйте еще раз.');
      // Make sure we restore the view mode in case of error too
      if (visualizerComponentRef.current) {
        visualizerComponentRef.current.restoreViewMode("detailed");
      }
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: '#0A2B6C',
        backgroundSize: 'cover',
      }}
    >
      {/* Dark blue overlay */}
      <div className="absolute inset-0 bg-[#0A2B6C] bg-opacity-40"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto py-8 px-4">
        <header className="mb-6 sticky top-0 z-40 bg-[#0A2B6C]/80 backdrop-blur-md py-4 -mx-4 px-4">
          <div className="flex justify-between items-center">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-bold text-white flex items-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A]">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
              Визуализация дата-центра
            </motion.h1>

            <div className="flex gap-3">
              <Button
                onClick={captureVisualization}
                className="bg-[#1e88e5] hover:bg-[#1e88e5]/80 text-white border border-white/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="8" y1="13" x2="16" y2="13"></line>
                  <line x1="8" y1="17" x2="16" y2="17"></line>
                </svg>
                Добавить схему в PDF
              </Button>
              <Button
                onClick={handleBackToConfigurator}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                Вернуться к расчёту
              </Button>
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-white/70 mt-2"
          >
            Визуализируйте и настройте расположение оборудования на основе вашей конфигурации
          </motion.p>
          
          {/* Feedback message */}
          {captureFeedback && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 py-2 px-4 bg-green-500/20 text-green-300 rounded-md text-sm"
            >
              {captureFeedback}
            </motion.div>
          )}
          
          {/* Helpful tooltip about capture */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-2 py-2 px-4 bg-blue-500/10 text-blue-300 rounded-md text-sm flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 flex-shrink-0">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Нажмите "Добавить схему в PDF", чтобы добавить визуализацию в расчёт. Схематический вид будет автоматически использован.</span>
          </motion.div>
        </header>

        {!configData ? (
          <div className="bg-white/5 rounded-xl p-12 backdrop-blur-sm">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-4">Нет данных конфигурации</h3>
              <p className="text-white/80 mb-6">Для работы с визуализатором необходимо сначала создать конфигурацию</p>
              <Button
                onClick={() => navigate('/configurator')}
                className="bg-[#8AB73A] hover:bg-[#8AB73A]/90 text-white"
              >
                Перейти к конфигуратору
              </Button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div ref={visualizerRef} className="p-6 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md mb-6">
              <h3 className="text-lg font-medium text-white mb-4">Конфигурация оборудования:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white/80">
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <span className="font-medium">Серверные стойки:</span> {configData.racks600 || '0'} × 600мм, {configData.racks800 || '0'} × 800мм
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <span className="font-medium">Охлаждение:</span> {configData.acModel || 'Не выбрано'} ({configData.acUnits || 0} блоков)
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <span className="font-medium">ИБП:</span> {configData.itUps?.model || 'Стандартный'}
                </div>
              </div>
            
              <div className="overflow-visible pb-10 mt-6">
                <DataCenterVisualizer 
                  userProducts={getUserProducts()} 
                  defaultViewMode="detailed" 
                  ref={visualizerComponentRef}
                />
              </div>
            </div>
          </motion.div>
        )}

        <footer className="mt-8 text-center text-white/50 text-sm py-4">
          <p>© {new Date().getFullYear()} iTeaQ. Все права защищены.</p>
        </footer>
      </div>
    </div>
  );
} 
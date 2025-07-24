import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import DataCenterVisualizer from '../components/DataCenterVisualizer';
import { PDUType } from '@/utils/configuratorData';

// Import or define the UserProducts interface
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

export default function DataCenterDesigner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const [configData, setConfigData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract configuration data from location state if available
  useEffect(() => {
    if (location.state && location.state.configData) {
      setConfigData(location.state.configData);
      setIsLoading(false);
    } else if (token) {
      // Try to fetch the last quote from the API
      fetchLastQuote();
    } else {
      setError('No configuration data available. Please start a new configuration.');
      setIsLoading(false);
    }
  }, [location, token]);

  const fetchLastQuote = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/wp-json/partner-zone/v1/quotes/latest', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch the latest quote');
      }

      const data = await response.json();
      if (data && data.configData) {
        setConfigData(data.configData);
      } else {
        throw new Error('No configuration data available');
      }
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError('Could not load configuration data. Please try again or start a new configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format configuration data for the visualizer
  const getUserProducts = (): UserProducts | undefined => {
    if (!configData) return undefined;

    // Parse and type-cast values from configData
    return {
      racks600: parseInt(configData.racks600 || '0'),
      racks800: parseInt(configData.racks800 || '0'),
      acModel: configData.acModel || '',
      acUnits: parseInt(configData.acUnits || '0'), 
      acTotalPower: parseInt(configData.acTotalPower || '0'),
      itUps: configData.itUps || {
        model: 'Default UPS',
        power: 100,
        description: 'Generic UPS Model',
        price: 0
      },
      acUps: configData.acUps || null,
      battery: configData.selectedBattery || null,
      pduType: (configData.pduType || 'B') as PDUType,
      pduCount: (parseInt(configData.racks600 || '0') + parseInt(configData.racks800 || '0')) * 2,
      distributionCabinet: configData.distributionCabinet || null,
      selectedUpsIndex: configData.selectedUpsIndex,
      redundancyEnabled: configData.redundancyEnabled
    };
  };

  return (
    <div className="min-h-screen bg-[#0A2B6C] bg-opacity-90 py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold text-white mb-2"
            >
              Планирование дата-центра
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-white/70"
            >
              Визуализируйте и настройте расположение оборудования в вашем дата-центре
            </motion.p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              Вернуться в личный кабинет
            </Button>
            <Button
              onClick={() => navigate('/configurator')}
              className="bg-[#8AB73A] hover:bg-[#8AB73A]/90 text-white"
            >
              Новая конфигурация
            </Button>
          </div>
        </header>

        <main>
          {isLoading ? (
            <div className="bg-white/5 rounded-xl p-12 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-t-[#8AB73A] border-white/20 rounded-full animate-spin mb-4"></div>
                <p className="text-white">Загрузка данных конфигурации...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white/5 rounded-xl p-12 backdrop-blur-sm">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-4">Ошибка</h3>
                <p className="text-white/80 mb-6">{error}</p>
                <Button
                  onClick={() => navigate('/configurator')}
                  className="bg-[#8AB73A] hover:bg-[#8AB73A]/90 text-white"
                >
                  Начать новую конфигурацию
                </Button>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <DataCenterVisualizer userProducts={getUserProducts()} />
            </motion.div>
          )}
        </main>

        <footer className="mt-8 text-center text-white/50 text-sm py-4">
          <p>© {new Date().getFullYear()} iTeaQ. Все права защищены.</p>
        </footer>
      </div>
    </div>
  );
} 
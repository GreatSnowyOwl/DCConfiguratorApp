import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext'; // Adjust path if needed
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FormData as ConfigFormData, 
    PDUType,
    translations, 
    _dataUpsAc, 
    _dataUpsIt, 
    _dataAc,
    _dataPdu, 
    _dataMon, 
    _dataIso, 
    _dataDist, 
    _dataRacks,
    _dataBattery,
    calculateUPSConfig,
    pduCardData,
} from '../utils/configuratorData';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from '@/components/ui/card';
import DataCenterVisualizer from './DataCenterVisualizer';

// Import background image
import backgroundImage from '/DATACENTER.png';
// Import logo image - REMOVED, will reference directly from /public
// import logoImage from '/logo.png24';

// Import ProductCard at the top of the file with other imports
import { ProductCard } from './ui/ProductCard';

type BatteryType = 'B' | 'M' | 'S';

// Keep local getRecommendedUPS (if still needed locally)
//function getRecommendedUPS(requiredPower: number) {
 // return _dataUpsAc.find(ups => ups.power >= requiredPower) || _dataUpsAc[_dataUpsAc.length - 1]; 


// --- Keep necessary interfaces and functions --- 
interface FormData extends ConfigFormData {
  // When user selects cooling manually
  acUnitsManual?: number; // overrides auto N+1 units if set
  acUpsManual?: { model: string; power: number; price: number }; // chosen AC-UPS
  warrantyExtension?: 'none' | '1' | '3'; // продление гарантии
}

// Keep BatteryOption interface
interface BatteryOption {
  model: string;
  capacity_ah: number;
  strings_needed: number;
  total_batteries: number;
  total_weight_kg: number;
  dimensions: string;
  price: number;
  total_price: number;
  energy_per_string: number;
  required_energy: number;
  voltage: number;
  current_per_string: number;
}

// Keep CostBreakdownItem interface
interface CostBreakdownItem {
  label: string;
  cost: number;
}

// Keep EmailPayload interface
interface EmailPayload {
  customerInfo: { name: string; phone: string; email: string; quoteName: string; };
  partnerInfo: { name: string; email: string; /* Add other relevant partner fields */ };
  rackConfig: { racks600: string; power600: string; racks800: string; power800: string; totalLoad: string; };
  coolingSystem: { acModel: string; acUnitsCount: number; acTotalPower: number; backupCooling: boolean; acUpsModel?: string; acUpsPower?: number; };
  itUps: { model: string; power: number; description: string; price: number; };
  batteryConfig: BatteryOption | null;
  pduConfig: { current: string; phase: string; type: PDUType; typeLabel: string; totalCost: number; };
  additionalSystems: { monitoring: boolean; corridorIsolation: boolean; distributionSystem: boolean; pnrSelected?: boolean; }; 
  totalCost: number;
  redundancyEnabled: boolean; // Add this field to support 2N redundancy flag
  costBreakdown?: CostBreakdownItem[]; // Add cost breakdown for detailed email
}

// Keep sendConfigurationToServer function
async function sendConfigurationToServer(
    emailData: EmailPayload, 
    token: string | null, 
    setEmailStatus: React.Dispatch<React.SetStateAction<'idle' | 'sending' | 'success' | 'error'>>
) {
    setEmailStatus('sending');
    console.log("Sending data to server:", emailData);

    if (!token) { 
        console.error("Cannot send email: No auth token provided.");
        setEmailStatus('error');
        alert("Authentication error. Please log in again.");
        return;
    }

    try {
      console.log("[sendConfigurationToServer] Payload being sent:", JSON.stringify(emailData, null, 2));

      const response = await fetch('/wp-json/partner-zone/v1/send-config-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
          const errorBody = await response.text(); 
          console.error('Server response error body:', errorBody);
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setEmailStatus('success');
        console.log('Configuration email sent successfully.');
      } else {
        throw new Error(result.message || 'Failed to send email from server.');
      }
    } catch (error) {
      setEmailStatus('error');
      console.error("Error sending configuration email:", error);
      alert(`Error sending configuration: ${error instanceof Error ? error.message : String(error)}`); 
    }
}

// Keep calculateTotalConfigurationCost function
const calculateTotalConfigurationCost = (
    formData: FormData, 
    batteryOptions: BatteryOption[],
    selectedBatteryIndex: number,
    dataUpsAcArg: any[], 
    dataUpsItArg: any[], 
    dataAcArg: any[],
    dataPduArg: any, 
    dataMonArg: any,
    dataIsoArg: any,
    dataDistArg: any,
    dataRacksArg: any,
    selectedUpsIdx: number = 0, // Add parameter for selected UPS index
    redundancyEnabled: boolean = false // Add parameter for 2N redundancy
): number => {
    let baseCost = 0; 
    const itLoad = parseFloat(
        (
            parseFloat(formData.racks600 || '0') * parseFloat(formData.power600 || '0') +
            parseFloat(formData.racks800 || '0') * parseFloat(formData.power800 || '0')
        ).toFixed(2)
    );

     const getACPwr = (model: string) => {
        // Map of predefined power codes → kW
        const map: { [key: string]: number } = {
          '12.5': 12.5,
          '25': 25,
          '35-300': 35,
          '35-600': 35,
          '40': 40,
          '45': 45,
          '60': 60,
          '70': 70,
        };
        if (map[model] !== undefined) return map[model];
        // Fallback: attempt to parse numeric string (manual mode saves raw kW value)
        const parsed = parseFloat(model);
        return isNaN(parsed) ? 0 : parsed;
    };
    const getUnits = (totalLoad: number, unitPwr: number) => unitPwr === 0 ? 0 : Math.ceil(totalLoad / unitPwr) + 1;
    const getTotalACPwr = (unitPwr: number, units: number) => unitPwr * units;
    const getRecUPS = (requiredPower: number) => dataUpsAcArg.find(ups => ups.power >= requiredPower) || dataUpsAcArg[dataUpsAcArg.length - 1];
    const getRecITUPS = (itLd: number) => {
         const requiredPower = itLd * 1.3; 
         return dataUpsItArg.find(ups => ups.power >= requiredPower) || dataUpsItArg[dataUpsItArg.length - 1];
    };

    const racks600Count = parseInt(formData.racks600 || '0');
    const racks800Count = parseInt(formData.racks800 || '0');
    if (racks600Count > 0 && dataRacksArg.R600) baseCost += racks600Count * dataRacksArg.R600.price;
    if (racks800Count > 0 && dataRacksArg.R800) baseCost += racks800Count * dataRacksArg.R800.price;

    // Use selected UPS if valid index, or fall back to recommended
    const itUps = selectedUpsIdx >= 0 && selectedUpsIdx < dataUpsItArg.length 
        ? dataUpsItArg[selectedUpsIdx] 
        : getRecITUPS(itLoad);
    
    // Apply 2N redundancy if enabled (double the UPS cost)
    if(itUps) {
        const upsCount = redundancyEnabled ? 2 : 1;
        baseCost += itUps.price * upsCount;
    }

    const acUnitPower = getACPwr(formData.acModel);
    // If user specified manual count, use it, otherwise compute N+1 automatically
    const acUnitsCount = (formData.acUnitsManual && formData.acUnitsManual > 0)
      ? formData.acUnitsManual
      : getUnits(itLoad, acUnitPower);

    // Locate AC model: first try by power (covers manual mode where acModel is kW),
    // then fall back to model string search
    const selectedAC =
      dataAcArg.find(unit => Math.abs(unit.power - acUnitPower) < 0.1) ||
      dataAcArg.find(unit => unit.model.includes(formData.acModel));
    if (selectedAC) baseCost += selectedAC.price * acUnitsCount;

    if (formData.backupCooling) {
        const totalACPower = getTotalACPwr(acUnitPower, acUnitsCount);
        const recommendedACUPS = formData.acUpsManual ?? getRecUPS(totalACPower);
        if (recommendedACUPS) baseCost += recommendedACUPS.price;
    }

    const totalRacks = racks600Count + racks800Count;
    const pduPrice = dataPduArg[formData.pduType]?.[formData.pduCurrent];
    if (pduPrice && totalRacks > 0) baseCost += pduPrice * totalRacks * 2;

    if (batteryOptions.length > 0 && selectedBatteryIndex >= 0 && selectedBatteryIndex < batteryOptions.length) {
        // Apply 2N redundancy to battery cost if enabled (double the batteries)
        const batteryMultiplier = redundancyEnabled ? 2 : 1;
        baseCost += batteryOptions[selectedBatteryIndex].total_price * batteryMultiplier;
    }

    if (formData.monitoring) baseCost += dataMonArg.price;
    if (formData.corridorIsolation) baseCost += dataIsoArg.price;
    if (formData.distributionSystem === 'yes' && dataDistArg) baseCost += dataDistArg.price;

    // Warranty extension cost (based on baseCost, excluding PNR)
    let warrantyCost = 0;
    if (formData.warrantyExtension === '1') {
        warrantyCost = baseCost * 0.04;
    } else if (formData.warrantyExtension === '3') {
        warrantyCost = baseCost * 0.10;
    }

    let totalCost = baseCost + warrantyCost;

    if (formData.pnrSelected) {
        const pnrCost = baseCost * 0.10; // still computed from baseCost, excludes warranty
        totalCost += pnrCost;
    }

    return totalCost;
};

export default function DCConfiguratorApp() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if returning from visualizer with saved config
  const returnFromVisualizer = location.state?.returnToSummary === true;
  const savedConfigData = location.state?.configData as (FormData & { selectedUpsIndex?: number, redundancyEnabled?: boolean, acTotalPower?: number, acUps?: { model: string, power: number, price?: number } | null, selectedBattery?: BatteryOption | null }) | undefined;
  
  // Clear visualization data when creating a new quote (not when returning from visualizer)
  useEffect(() => {
    if (!returnFromVisualizer) {
      localStorage.removeItem('dcVisualizationImage');
    }
  }, [returnFromVisualizer]);
  
  const [step, setStep] = useState<number>(returnFromVisualizer ? 9 : 0);
  const [maxCompletedStep, setMaxCompletedStep] = useState<number>(returnFromVisualizer ? 9 : 0);
  
  // Initial form data (will be overridden by savedConfigData if returning from visualizer)
  const [formData, setFormData] = useState<FormData>({
    customerName: '', 
    customerPhone: '', 
    customerEmail: '', 
    quoteName: '',
    racks600: '', 
    racks800: '', 
    power600: '0', 
    power800: '0', 
    acModel: '',
    batteryTime: '5', 
    backupCooling: false, 
    pduCurrent: '16', 
    pduPhase: '1',
    pduType: 'B', 
    distributionSystem: 'no',
    monitoring: false, 
    corridorIsolation: false,
    pnrSelected: false,
    warrantyExtension: 'none',
  });

  // Helper function for recommended IT UPS (can be moved outside or made a utility if shared more widely)
  const getRecommendedITUPSFromConfig = (config: ConfigFormData | undefined, dataUpsIt: typeof _dataUpsIt) => {
    if (!config) return dataUpsIt[dataUpsIt.length - 1]; // Fallback if no config
    const itLoad = parseFloat(
      (
        parseFloat(config.racks600 || '0') * parseFloat(config.power600 || '0') +
        parseFloat(config.racks800 || '0') * parseFloat(config.power800 || '0')
      ).toFixed(2)
    );
    const requiredPower = itLoad * 1.3; // Adding 30% margin
    return dataUpsIt.find(ups => ups.power >= requiredPower) || dataUpsIt[dataUpsIt.length - 1];
  };
  
  // Determine initial selected UPS index and showingRecommendedUps state
  let initialSelectedUpsIndexValue = 0;
  let initialShowingRecommendedUpsValue = true;

  if (returnFromVisualizer && savedConfigData) {
    if (savedConfigData.selectedUpsIndex !== undefined) {
      initialSelectedUpsIndexValue = savedConfigData.selectedUpsIndex;
      const recommendedUPSBasedOnSaved = getRecommendedITUPSFromConfig(savedConfigData, _dataUpsIt);
      const recommendedIndexBasedOnSaved = _dataUpsIt.findIndex(ups => ups.model === recommendedUPSBasedOnSaved.model);
      initialShowingRecommendedUpsValue = savedConfigData.selectedUpsIndex === recommendedIndexBasedOnSaved;
    } else {
      // No selectedUpsIndex in savedConfigData, so default to recommended
      const recommendedUPSBasedOnSaved = getRecommendedITUPSFromConfig(savedConfigData, _dataUpsIt);
      const recommendedIndexBasedOnSaved = _dataUpsIt.findIndex(ups => ups.model === recommendedUPSBasedOnSaved.model);
      initialSelectedUpsIndexValue = recommendedIndexBasedOnSaved !== -1 ? recommendedIndexBasedOnSaved : 0;
      initialShowingRecommendedUpsValue = true;
    }
  } else if (location.state?.selectedUpsIndex !== undefined) { // Fallback to location.state if not in savedConfigData (less likely for visualizer return)
    initialSelectedUpsIndexValue = location.state.selectedUpsIndex;
    // Assuming if direct location.state.selectedUpsIndex is set, it's a user choice
    initialShowingRecommendedUpsValue = false; 
  }


  // Add state for selected UPS index
  const [selectedUpsIndex, setSelectedUpsIndex] = useState<number>(initialSelectedUpsIndexValue);
  // Add state to track if we're showing the recommended UPS or user-selected
  const [showingRecommendedUps, setShowingRecommendedUps] = useState<boolean>(initialShowingRecommendedUpsValue);
  
  // State to track previous UPS index for animation direction
  const [prevIndex, setPrevIndex] = useState(initialSelectedUpsIndexValue);
  
  // Update prevIndex when selectedUpsIndex changes
  useEffect(() => {
    setPrevIndex(selectedUpsIndex);
  }, [selectedUpsIndex]);
  
  // Determine initial redundancy flag (2N) – use navigation state or configData
  const initialRedundancyEnabled = (returnFromVisualizer && savedConfigData?.redundancyEnabled !== undefined)
    ? savedConfigData.redundancyEnabled
    : (location.state?.redundancyEnabled !== undefined
        ? location.state.redundancyEnabled
        : false);

  // Add state for 2N UPS redundancy
  const [redundancyEnabled, setRedundancyEnabled] = useState<boolean>(initialRedundancyEnabled);
  
  // --- New state for manual cooling selection ---
  const [manualCoolingMode, setManualCoolingMode] = useState<boolean>(false);
  const [selectedACManualIndex, setSelectedACManualIndex] = useState<number>(() => {
    const idx = _dataAc.findIndex(ac => ac.power.toString() === formData.acModel);
    return idx !== -1 ? idx : 0;
  });
  const [selectedACUPSManualIndex, setSelectedACUPSManualIndex] = useState<number>(0);
  const [manualACUnits, setManualACUnits] = useState<number>(0);
  // --- End manual cooling state ---
  
  // --- Animation helpers for manual cooling carousels ---
  const [prevACIndex, setPrevACIndex] = useState<number>(0);
  useEffect(() => {
    setPrevACIndex(selectedACManualIndex);
  }, [selectedACManualIndex]);

  const [prevACUPSIndex, setPrevACUPSIndex] = useState<number>(0);
  useEffect(() => {
    setPrevACUPSIndex(selectedACUPSManualIndex);
  }, [selectedACUPSManualIndex]);
  // --- End animation helpers ---
  
  // Initialize with data from visualizer if available
  useEffect(() => {
    if (returnFromVisualizer && savedConfigData) {
      // Restore main form data
      setFormData(prevData => ({
        ...prevData,
        ...savedConfigData // This correctly spreads all properties from savedConfigData
      }));
      
      // UPS index and showingRecommendedUps are already initialized by useState above
      // based on savedConfigData. We just need to ensure they are re-affirmed if necessary,
      // or if there's a slight change in logic required post initial state.

      // Re-affirm selectedUpsIndex and showingRecommendedUps based on the fully loaded savedConfigData
      if (savedConfigData.selectedUpsIndex !== undefined) {
        setSelectedUpsIndex(savedConfigData.selectedUpsIndex);
        const recommendedUPS = getRecommendedITUPSFromConfig(savedConfigData, _dataUpsIt);
        const recommendedIndex = _dataUpsIt.findIndex(ups => ups.model === recommendedUPS.model);
        setShowingRecommendedUps(savedConfigData.selectedUpsIndex === recommendedIndex);
      } else {
        // If index isn't saved in configData, default to recommended
        setShowingRecommendedUps(true);
        const recommendedUPS = getRecommendedITUPSFromConfig(savedConfigData, _dataUpsIt);
        const recommendedIndex = _dataUpsIt.findIndex(ups => ups.model === recommendedUPS.model);
        setSelectedUpsIndex(recommendedIndex !== -1 ? recommendedIndex : 0);
      }

      // Restore redundancy setting if available
      if (savedConfigData.redundancyEnabled !== undefined) {
        setRedundancyEnabled(savedConfigData.redundancyEnabled);
      }
      
      // Recalculate battery options based on potentially restored redundancy setting
      if (savedConfigData.batteryTime && savedConfigData.backupCooling !== undefined) {
        const itLoad = parseInt(
          (
            parseFloat(savedConfigData.racks600 || '0') * parseFloat(savedConfigData.power600 || '0') +
            parseFloat(savedConfigData.racks800 || '0') * parseFloat(savedConfigData.power800 || '0')
          ).toFixed(2)
        );
        
        // Calculate total load with cooling if needed
        let totalLoad = itLoad;
        if (savedConfigData.backupCooling && savedConfigData.acModel) {
          const acUnitPower = savedConfigData.acTotalPower || 0;
          const acUps = savedConfigData.acUps || null;
          totalLoad += acUnitPower + (acUps ? acUps.power : 0);
        }
        
        // Get backup time
        const backupMinutes = parseInt(savedConfigData.batteryTime || '15');
        
        // Calculate battery options
        const selected = calculateUPSConfig(totalLoad, backupMinutes);
        setBatteryOptions(selected);
        
        if (selected.length > 0) {
          // Try to find the previously selected battery in the options
          if (savedConfigData.selectedBattery) {
            const matchingIndex = selected.findIndex(
              battery => battery.model === savedConfigData.selectedBattery.model
            );
            setSelectedBatteryIndex(matchingIndex >= 0 ? matchingIndex : 0);
          } else {
            setSelectedBatteryIndex(0);
          }
        }
      }
    }
  }, [returnFromVisualizer, savedConfigData]);
  
  // Effect to update the selected UPS index when the recommended UPS changes
  // This effect should respect 'showingRecommendedUps'. If it's false, it means the user
  // made a specific choice (or a specific choice was restored) and it shouldn't be overridden
  // just because formData changed.
  useEffect(() => {
    if (showingRecommendedUps) {
      const itLoad = parseFloat(totalITLoad()); // totalITLoad uses current formData state
      const recommendedUPS = getRecommendedITUPS(itLoad); // getRecommendedITUPS uses current formData
      const recommendedIndex = _dataUpsIt.findIndex(ups => ups.model === recommendedUPS.model);
      if (recommendedIndex !== -1 && selectedUpsIndex !== recommendedIndex) { // Only update if different
        setSelectedUpsIndex(recommendedIndex);
      }
    }
  }, [formData.racks600, formData.racks800, formData.power600, formData.power800, showingRecommendedUps, selectedUpsIndex]); // Added selectedUpsIndex
  
  const [errors, setErrors] = useState<Partial<Record<keyof ConfigFormData, string>>>({});
  const [batteryOptions, setBatteryOptions] = useState<BatteryOption[]>([]);
  const [selectedBatteryIndex, setSelectedBatteryIndex] = useState<number>(0);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // --- Additions for Auto Save ---
  const { token, user } = useAuth(); // Get user from context as well
  const hasSavedQuoteRef = useRef(false); // Ref to track save status
  // --- End Additions ---

  // Add effect to scroll to top when step changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [step]);
  
  // Add effect to update slider progress CSS variables
  useEffect(() => {
    const power600Slider = document.querySelector('input[name="power600"]') as HTMLInputElement;
    const power800Slider = document.querySelector('input[name="power800"]') as HTMLInputElement;
    const batteryTimeSlider = document.querySelector('input[name="batteryTime"]') as HTMLInputElement;
    
    if (power600Slider) {
      const percent = (parseFloat(formData.power600 || '0') / 15) * 100;
      power600Slider.style.setProperty('--progress', `${percent}%`);
    }
    
    if (power800Slider) {
      const percent = (parseFloat(formData.power800 || '0') / 15) * 100;
      power800Slider.style.setProperty('--progress', `${percent}%`);
    }

    if (batteryTimeSlider) {
      const percent = ((parseFloat(formData.batteryTime || '15') - 5) / 25) * 100;
      batteryTimeSlider.style.setProperty('--progress', `${percent}%`);
    }
  }, [formData.power600, formData.power800, formData.batteryTime, step]);

  const totalITLoad = () => {
    const load600 = parseInt(formData.racks600 || '0') * parseInt(formData.power600 || '0');
    const load800 = parseInt(formData.racks800 || '0') * parseInt(formData.power800 || '0');
    // Return whole number without decimal places
    const totalLoad = load600 + load800;
    return totalLoad.toString();
  };

  const getACPower = () => {
    const map: { [key: string]: number } = {
      '12.5': 12.5,
      '25': 25,
      '35-300': 35,
      '35-600': 35,
      '40': 40,
      '45': 45,
      '60': 60,
      '70': 70,
    };
    if (map[formData.acModel] !== undefined) return map[formData.acModel];
    const parsed = parseFloat(formData.acModel);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculateACUnits = () => {
    if (formData.acUnitsManual && formData.acUnitsManual > 0) {
      return formData.acUnitsManual;
    }
    const totalLoad = parseFloat(totalITLoad());
    const unitPower = getACPower();
    if (unitPower === 0) return 0;
    return Math.ceil(totalLoad / unitPower) + 1; // N+1 scheme (auto)
  };

  const calculateTotalACPower = () => {
    const unitPower = getACPower();
    const units = calculateACUnits();
    const totalPower = unitPower * units;
    return Math.round(totalPower);
  };

  const getRecommendedUPSForAC = () => {
    // If user picked UPS manually, use it
    if (formData.acUpsManual) {
      return formData.acUpsManual;
    }
    const totalACPower = calculateTotalACPower();
    console.log(`Selecting AC UPS for ${totalACPower}kW of cooling power`);
    
    // Ensure we have a valid UPS even if none matches the power requirement
    const recommendedUPS = _dataUpsAc.find(ups => ups.power >= totalACPower) || _dataUpsAc[_dataUpsAc.length - 1];
    console.log(`Selected AC UPS: ${recommendedUPS.model} with ${recommendedUPS.power}kW power`);
    
    return recommendedUPS;
  };

  const getPDUTypeLabel = (type: PDUType) => {
    return translations.pduTypes[type] || '';
  };

  const getRecommendedITUPS = (itLoadKw: number) => {
    const requiredPower = itLoadKw * 1.3; // Adding 30% margin
    return _dataUpsIt.find(ups => ups.power >= requiredPower) || _dataUpsIt[_dataUpsIt.length - 1]; // Use renamed variable
  };

  const calculateTotalPDUCost = () => {
    const totalRacks = parseInt(formData.racks600 || '0') + parseInt(formData.racks800 || '0');
    const pduPrice = _dataPdu[formData.pduType as PDUType]?.[formData.pduCurrent]; // Use renamed variable
    if (!pduPrice || totalRacks === 0) return 0;
    return pduPrice * totalRacks * 2;
  };

  const calculateTotalRacksCost = () => {
    const racks600Cost = parseInt(formData.racks600 || '0') * _dataRacks.R600.price; // Use renamed variable
    const racks800Cost = parseInt(formData.racks800 || '0') * _dataRacks.R800.price; // Use renamed variable
    return racks600Cost + racks800Cost;
  };

  // --- Auto-Save Quote Logic ---
  useEffect(() => {
    const autoSaveQuote = async () => {
        if (!token) {
            console.warn("AutoSave: No auth token available.");
            return;
        }
        hasSavedQuoteRef.current = true;
        console.log("AutoSave: Attempting to save quote...");
        
        const quoteName = formData.quoteName.trim() || `Quote - ${new Date().toLocaleString('ru-RU')}`;
        
        // --- Prepare configData with selectedBattery and UPS/Redundancy info --- 
        const configDataToSend = {
             ...formData, // Spread the existing form data
             // Add the selected battery object if one is chosen
             selectedBattery: (selectedBatteryIndex >= 0 && batteryOptions[selectedBatteryIndex]) 
                                ? batteryOptions[selectedBatteryIndex] 
                                : null, 
             // Explicitly include selected UPS index and redundancy status
             selectedUpsIndex: selectedUpsIndex, 
             redundancyEnabled: redundancyEnabled 
        };
        // --- End Prepare configData --- 

        // Calculate total cost using the refactored function
        const totalCost = calculateTotalConfigurationCost(
            formData, batteryOptions, selectedBatteryIndex, 
            _dataUpsAc, _dataUpsIt, _dataAc, _dataPdu, _dataMon, _dataIso, _dataDist, _dataRacks,
            selectedUpsIndex,
            redundancyEnabled
        );

        try {
            const response = await fetch('/wp-json/partner-zone/v1/quotes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, 
                },
                body: JSON.stringify({
                    quoteName: quoteName,
                    configData: configDataToSend, // Send the prepared object
                    totalCost: totalCost,
                }),
            });
            const responseText = await response.text(); // Get text first
            if (!response.ok) {
                 let errorMessage = 'Failed to auto-save quote.';
                 try { errorMessage = JSON.parse(responseText).message || errorMessage; } catch (e) {}
                 throw new Error(errorMessage);
            }
            const responseData = JSON.parse(responseText);
            console.log("AutoSave: Quote saved successfully:", responseData);
        } catch (error: any) {
            console.error("AutoSave: Error saving quote:", error.message);
            // Reset flag on error to allow retry? Maybe not for auto-save.
            // hasSavedQuoteRef.current = false; 
        }
    };

    // Don't auto-save if user is returning from visualizer
    const isReturningFromVisualizer = location.state?.returnToSummary === true;

    if (step === 9 && token && !hasSavedQuoteRef.current && !isReturningFromVisualizer) {
       autoSaveQuote();
    }

    if (step !== 9 && hasSavedQuoteRef.current) {
        console.log("AutoSave: Resetting save flag as user left summary.");
        hasSavedQuoteRef.current = false;
    }

   }, [step, token, formData, batteryOptions, selectedBatteryIndex, location.state]); // Added location.state to dependencies
   // --- End Auto-Save Quote Logic ---

  // --- generatePDF function --- 
  const generatePDF = async () => {
    // --- 1. Generate the report PDF using jsPDF ---
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    // Set up fonts and colors
    const primaryColor = '#8AB73A';
    const secondaryColor = '#333333';
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Add Cyrillic font support
    doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', 'Roboto', 'normal');
    doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto');

    let y = margin;

    // Helper function for text wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12, align: 'left' | 'center' | 'right' = 'left') => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      const lineHeight = fontSize * 0.5;
      
      if (align === 'center') {
        lines.forEach((line: string) => {
          const textWidth = doc.getStringUnitWidth(line) * fontSize;
          doc.text(line, x + (maxWidth - textWidth) / 2, y);
    y += lineHeight;
        });
      } else if (align === 'right') {
        lines.forEach((line: string) => {
          const textWidth = doc.getStringUnitWidth(line) * fontSize;
          doc.text(line, x + maxWidth - textWidth, y);
          y += lineHeight;
        });
      } else {
        doc.text(lines, x, y);
        y += lines.length * lineHeight;
      }
      return y;
    };

    // Helper function for adding section headers
    const addSectionHeader = (text: string) => {
      doc.setFillColor(primaryColor);
      doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
      doc.setFont('Roboto', 'bold');
      doc.rect(margin, y, contentWidth, 10, 'F');
      y += 7;
      doc.text(text, margin + 2, y);
      y += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont('Roboto', 'normal');
    };

    // Helper function for adding a table row (Adopted from ViewQuote.tsx)
    const addTableRow = (label: string, value: string) => {
      const currentFontSize = 11;
      doc.setFontSize(currentFontSize);
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(secondaryColor);
      
        const labelMaxWidth = contentWidth * 0.65; // Keep label wider
        const valueMaxWidth = contentWidth * 0.35;

        const labelYStart = y;
        // Calculate label height *before* drawing
      const labelLines = doc.splitTextToSize(label, labelMaxWidth);
      const labelLineHeight = currentFontSize * 0.5;
      const labelHeight = labelLines.length * labelLineHeight;
        // Draw label
        doc.text(labelLines, margin, labelYStart);
      
        // Calculate value height *before* drawing
        const valueTrimmed = value.trim();
        const valueLines = doc.splitTextToSize(valueTrimmed, valueMaxWidth);
      const valueLineHeight = currentFontSize * 0.5;
      const valueHeight = valueLines.length * valueLineHeight;

        // Draw value lines, manually aligned right
        let valueY = labelYStart; // Start value at the same Y as label
        valueLines.forEach((line: string) => {
            const textWidth = doc.getStringUnitWidth(line) * currentFontSize / doc.internal.scaleFactor; // Calculate width in document units (mm)
            const valueX = pageWidth - margin - textWidth; // Calculate X for right alignment
            doc.text(line, valueX, valueY); // Draw text at calculated X
            valueY += valueLineHeight; // Move Y for next value line
        });

        // Move global y down by the height of the taller column + spacing
        y = labelYStart + Math.max(labelHeight, valueHeight) + 5; // Advance y based on the taller element
    };

        // Add Logo (Place it before the title)
        const logoUrl = `${import.meta.env.BASE_URL}logologo.png`;
        const logoWidth = 40; // Adjust as needed
        const logoHeight = 15; // Adjust as needed
        const logoX = pageWidth - margin - logoWidth;
        const logoY = margin - 5; // Position slightly above the top margin
        try {
          // Use await with addImage if it returns a promise (depends on jsPDF version/plugins)
          // For standard jsPDF, it might be synchronous
          doc.addImage(logoUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
        } catch (imgError) {
          console.error("Error adding logo to PDF:", imgError);
          // Optionally inform the user or proceed without the logo
        }

        // Title
    doc.setTextColor(primaryColor);
    doc.setFontSize(28);
    doc.setFont('Roboto', 'bold');
    const title = translations.title;
        // Adjust title Y position if logo takes space
        const titleY = margin + (logoHeight > 10 ? 10 : 0); // Add some space below logo if present
        doc.text(title, margin, titleY);
        y = titleY + 15; // Update y position after title

    // Add date
    doc.setTextColor(secondaryColor);
    doc.setFontSize(12);
    doc.setFont('Roboto', 'normal');
    const date = new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(date, margin, y);
    y += 15;

    // Add horizontal line
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // Company Information -> Use new fields
    addSectionHeader(translations.steps.customerQuoteInfo);
    addTableRow(translations.fields.quoteName, formData.quoteName);
    addTableRow(translations.fields.customerName, formData.customerName);
    addTableRow(translations.fields.customerPhone, formData.customerPhone);
    addTableRow(translations.fields.customerEmail, formData.customerEmail);
    // Remove old fields
    // addTableRow(translations.fields.contactPerson, formData.contactPerson);
    // addTableRow(translations.fields.email, formData.contactEmail);
    // addTableRow(translations.fields.phone, formData.contactPhone);
    y += 10;
    
    // Check if we have a visualization image to add - MOVED UP in the PDF flow
    const visualizationImage = localStorage.getItem('dcVisualizationImage');
    if (visualizationImage) {
      // Add a new page specifically for the visualization
      doc.addPage();
      y = margin;
      
      // Add a more prominent, styled section header
      doc.setFillColor('#8AB73A'); // Use a more vibrant green color
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); // Larger font
      doc.setFont('Roboto', 'bold');
      doc.rect(margin, y, contentWidth, 14, 'F');
      y += 9;
      doc.text("Визуализация дата-центра", pageWidth / 2, y, { align: 'center' });
      y += 15;
      doc.setTextColor(0, 0, 0);
      doc.setFont('Roboto', 'normal');
      
      // Add a subtitle/description with better formatting
      doc.setFontSize(12);
      doc.setTextColor(secondaryColor);
      doc.text("Схема размещения оборудования", pageWidth / 2, y, { align: 'center' });
      y += 10;
      
      try {
        // Calculate image dimensions to fit the page while keeping aspect ratio
        const imageWidth = contentWidth;
        const aspectRatio = 0.5; // Adjusted aspect ratio to match screenshot appearance
        const imageHeight = imageWidth * aspectRatio;
        
        // Add a background for the visualization (light blue box)
        doc.setFillColor(230, 240, 250); // Light blue background
        doc.rect(margin - 5, y - 5, imageWidth + 10, imageHeight + 10, 'F');
        
        // Add a border around the visualization
        doc.setDrawColor(100, 150, 200); // Blue border
        doc.setLineWidth(0.5);
        doc.rect(margin - 5, y - 5, imageWidth + 10, imageHeight + 10, 'S');
        
        // Add the image
        doc.addImage(visualizationImage, 'PNG', margin, y, imageWidth, imageHeight);
        
        // Update y position for any content after the image
        y += imageHeight + 15;
        
        // Add a more detailed caption
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(secondaryColor);
        doc.text("Визуальное представление конфигурации дата-центра с размещением серверных стоек,", margin, y);
        y += 5;
        doc.text("систем охлаждения, ИБП и другого оборудования согласно выбранной конфигурации.", margin, y);
      } catch (error) {
        console.error("Error adding visualization to PDF:", error);
        // Add a message about failed image
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(secondaryColor);
        doc.text("Не удалось добавить визуализацию дата-центра.", margin, y);
        y += 10;
      }
      
      // Return to a new page to continue with the rest of the report
      doc.addPage();
      y = margin;
    }

    // Rack Configuration
    addSectionHeader(translations.steps.racks);
    addTableRow(translations.fields.racks600, `${formData.racks600 || '0'} (${formData.power600 || '0'}kW ${translations.fields.each})`);
    addTableRow(translations.fields.racks800, `${formData.racks800 || '0'} (${formData.power800 || '0'}kW ${translations.fields.each})`);
    addTableRow(translations.fields.totalLoad, `${totalITLoad()} kW`);
    y += 10;

    // Check if we need a new page
    if (y > pageHeight - 100) {
      doc.addPage();
      y = margin;
    }

    // Cooling System
    addSectionHeader(translations.steps.cooling);
        // Improved lookup logic for AC units
        let acModelDisplay = formData.acModel || 'Не выбрано';
        let acModelName = acModelDisplay;
        
        // First try direct power match
        const selectedCoolingAC = _dataAc.find(unit => {
            // Compare as numbers to avoid string mismatch issues
            return Math.abs(unit.power - parseFloat(formData.acModel)) < 0.1;
        });
        
        // If found, use the model name
        if (selectedCoolingAC) {
            acModelName = selectedCoolingAC.model;
            acModelDisplay = `${selectedCoolingAC.model} (${formData.acModel} кВт)`;
        } else {
            // Secondary lookup by model name
            const acByName = _dataAc.find(unit => unit.model.includes(formData.acModel));
            if (acByName) {
                acModelName = acByName.model;
                acModelDisplay = `${acByName.model} (${acByName.power} кВт)`;
            } else {
                // If still not found, use generic display
                acModelDisplay = `Кондиционер ${formData.acModel} кВт`;
            }
        }
        
        addTableRow(translations.fields.acModel, acModelDisplay);
        const acUnits = calculateACUnits();
        addTableRow(translations.fields.acUnits, acUnits.toString());
        const totalACPower = calculateTotalACPower();
        addTableRow(translations.fields.totalPower, `${totalACPower} kW`);
    addTableRow(translations.fields.backupPower, formData.backupCooling ? translations.fields.yes : translations.fields.no);
    y += 10;

        // AC UPS Section (if backup cooling is enabled)
        if (formData.backupCooling) {
          if (y > pageHeight - 80) { doc.addPage(); y = margin; }
          
          const recommendedACUPS = getRecommendedUPSForAC();
          addSectionHeader("ИБП для кондиционирования");
          addTableRow(translations.fields.model, recommendedACUPS.model);
          addTableRow(translations.fields.powerRating, `${recommendedACUPS.power} kW`);
          // AC UPS doesn't have a description property in its type, so use a static description
          y = addWrappedText(`ИБП для обеспечения бесперебойного питания системы кондиционирования.`, margin, y, contentWidth, 11);
          y += 10;
        }

        // IT UPS Section
        if (y > pageHeight - 80) { doc.addPage(); y = margin; }
        // Use selected UPS and redundancy status from component state
        const currentItLoad = parseFloat(totalITLoad()); 
        const selectedITUPSForPdf = selectedUpsIndex >= 0 && selectedUpsIndex < _dataUpsIt.length
            ? _dataUpsIt[selectedUpsIndex] 
            : getRecommendedITUPS(currentItLoad); // Fallback
        const isRedundant = redundancyEnabled;
        
        if(selectedITUPSForPdf) { // Use renamed variable
          const upsLabel = isRedundant 
            ? `${selectedITUPSForPdf.model} - 2N резервирование (2x)` 
            : selectedITUPSForPdf.model;
          
        addSectionHeader(translations.steps.ups); // Reusing UPS title for IT UPS
          addTableRow(translations.fields.model, upsLabel);
          addTableRow(translations.fields.powerRating, `${selectedITUPSForPdf.power} kW`);
          y = addWrappedText(`Описание: ${selectedITUPSForPdf.description}`, margin, y, contentWidth, 11);
        y += 10;
        }

        // PDU Section
        if (y > pageHeight - 80) { doc.addPage(); y = margin; }
        addSectionHeader(translations.steps.pdu); // Use PDU title
        addTableRow(translations.fields.current, `${formData.pduCurrent}A`);
        addTableRow(translations.fields.phase, formData.pduPhase === '1' ? translations.fields.single : translations.fields.three);
        addTableRow(translations.fields.type, getPDUTypeLabel(formData.pduType));
        y += 10;

        // Battery Configuration Section (existing, slightly adjusted spacing)
        if (y > pageHeight - 100) { doc.addPage(); y = margin; }
    if (batteryOptions.length > 0 && selectedBatteryIndex >= 0) {
      const selectedBattery = batteryOptions[selectedBatteryIndex];
          const batteryMultiplier = isRedundant ? 2 : 1;
          const totalBatteriesCount = selectedBattery.total_batteries * batteryMultiplier;
          
      addSectionHeader(translations.steps.battery);
      addTableRow(translations.fields.model, selectedBattery.model);
      addTableRow(translations.fields.capacity, `${selectedBattery.capacity_ah} Ah`);
          addTableRow(translations.fields.totalBatteries, totalBatteriesCount.toString() + (isRedundant ? ' (2N)' : ''));
          addTableRow(translations.fields.totalWeight, `${(selectedBattery.total_weight_kg * batteryMultiplier).toFixed(2)} kg`);
      addTableRow(translations.fields.dimensions, selectedBattery.dimensions);
      y += 10;
    }

        // Additional Systems Section (Monitoring, Isolation, Distribution)
        let additionalSystemsAdded = false;
        const addAdditionalSystemsHeader = () => {
            if (!additionalSystemsAdded) {
                if (y > pageHeight - 50) { doc.addPage(); y = margin; }
                addSectionHeader(translations.steps.additionalSystems); // Use added key
                additionalSystemsAdded = true;
            }
        };

        if (formData.monitoring) {
            addAdditionalSystemsHeader();
            addTableRow(translations.fields.monitoringSystem, translations.fields.included);
            // Optionally list features, but keep it concise for now
            // y = addWrappedText(_dataMon.features.join(', '), margin, y, contentWidth, 9);
            // y += 5;
        }
        if (formData.corridorIsolation) {
            addAdditionalSystemsHeader();
            addTableRow(translations.fields.corridorIsolation, translations.fields.included);
            // Optionally list features
        }
        if (formData.distributionSystem === 'yes') {
            addAdditionalSystemsHeader();
            addTableRow(_dataDist.name, translations.fields.included); // Use correct variable _dataDist
        }

        if (additionalSystemsAdded) {
            y += 10; // Add spacing after the section if it was added
    }

    // Check if we need a new page for cost summary
        if (y > pageHeight - 150) { // Adjusted threshold slightly
      doc.addPage();
      y = margin;
    }

        // Cost Summary (using saved data, showing saved total cost)
    addSectionHeader(translations.steps.costSummary);
    
    // Collect cost items (Add PNR logic here)
    const costItems: CostBreakdownItem[] = [];
    let subTotal = 0; // Use subTotal to calculate PNR base

    // --- Calculate Costs (mirroring DCConfiguratorApp summary logic) ---
    const itLoad = totalITLoad();

    // Rack Costs
    const racks600Count = parseInt(formData.racks600 || '0');
    const racks800Count = parseInt(formData.racks800 || '0');
    if (racks600Count > 0) {
        const cost = racks600Count * _dataRacks.R600.price;
        costItems.push({ label: `${_dataRacks.R600.name} (${racks600Count}x)`, cost });
        subTotal += cost;
    }
    if (racks800Count > 0) {
        const cost = racks800Count * _dataRacks.R800.price;
        costItems.push({ label: `${_dataRacks.R800.name} (${racks800Count}x)`, cost });
        subTotal += cost;
    }

    // IT UPS
    const recommendedITUPS = getRecommendedITUPS(parseFloat(itLoad));
    // Use the currently selected UPS instead of only the recommended one
    const selectedITUPS = _dataUpsIt[selectedUpsIndex] || recommendedITUPS;
    
    if (redundancyEnabled) {
      // When redundancy is enabled, show as 2x UPS units
      costItems.push({ label: `IT UPS (${selectedITUPS.model}) - 2N резервирование (2x)`, cost: selectedITUPS.price * 2 });
      subTotal += selectedITUPS.price * 2;
    } else {
      costItems.push({ label: `IT UPS (${selectedITUPS.model})`, cost: selectedITUPS.price });
      subTotal += selectedITUPS.price;
    }
    
    // Batteries
    if (batteryOptions.length > 0 && selectedBatteryIndex >= 0 && selectedBatteryIndex < batteryOptions.length) {
      const batteryOption = batteryOptions[selectedBatteryIndex];
      const batteryCount = redundancyEnabled ? batteryOption.total_batteries * 2 : batteryOption.total_batteries;
      
      costItems.push({
        label: `Батареи ${Math.round(parseFloat(formData.batteryTime))}мин (${batteryCount}x ${batteryOption.model})`, 
        cost: redundancyEnabled ? batteryOption.total_price * 2 : batteryOption.total_price 
      });
      
      subTotal += redundancyEnabled ? batteryOption.total_price * 2 : batteryOption.total_price;
    }

    // Improved AC unit lookup for cost calculation
    if (formData.acModel) {
        // First try to find AC by comparing power values as numbers
        const acPower = getACPower();
        const selectedAC = _dataAc.find(unit => 
            Math.abs(unit.power - acPower) < 0.1
        );
        
        if (selectedAC) {
            const acUnitsCount = calculateACUnits();
            const acCost = selectedAC.price * acUnitsCount;
      costItems.push({
                label: `Кондиционеры (${acUnitsCount}x ${selectedAC.model})`, 
                cost: acCost 
      });
            subTotal += acCost;

            // AC UPS (if backup selected)
            if (formData.backupCooling) {
                const recommendedACUPS = getRecommendedUPSForAC();
                if (recommendedACUPS) {
      costItems.push({
                        label: `ИБП для кондиционирования (${recommendedACUPS.model})`, 
                        cost: recommendedACUPS.price 
      });
                    subTotal += recommendedACUPS.price;
    }
            }
        } else {
            // Try finding by model string
            const acByModelString = _dataAc.find(unit => 
                unit.model.includes(formData.acModel) || 
                formData.acModel.includes(unit.model)
            );
            
            if (acByModelString) {
                const acUnitsCount = calculateACUnits();
                const acCost = acByModelString.price * acUnitsCount;
                costItems.push({ 
                    label: `Кондиционеры (${acUnitsCount}x ${acByModelString.model})`, 
                    cost: acCost 
                });
                subTotal += acCost;
                
                // AC UPS (if backup selected)
                if (formData.backupCooling) {
                    const recommendedACUPS = getRecommendedUPSForAC();
                    if (recommendedACUPS) {
                        costItems.push({ 
                            label: `ИБП для кондиционирования (${recommendedACUPS.model})`, 
                            cost: recommendedACUPS.price 
                        });
                        subTotal += recommendedACUPS.price;
                    }
                }
            } else if (acPower > 0) {
                // If we couldn't find the exact model but have a power value,
                // use a reasonable default price based on similar units
                const acUnitsCount = calculateACUnits();
                const similarPowerUnit = _dataAc.find(unit => unit.power >= acPower) || _dataAc[0];
                const estimatedPrice = similarPowerUnit ? similarPowerUnit.price : 10000;
                const acCost = estimatedPrice * acUnitsCount;
                costItems.push({ 
                    label: `Кондиционеры (${acUnitsCount}x ${acPower}kW)`, 
                    cost: acCost 
                });
                subTotal += acCost;
                
                // AC UPS (if backup selected)
    if (formData.backupCooling) {
      const recommendedACUPS = getRecommendedUPSForAC();
                    if (recommendedACUPS) {
                        costItems.push({ 
                            label: `ИБП для кондиционирования (${recommendedACUPS.model})`, 
                            cost: recommendedACUPS.price 
                        });
                        subTotal += recommendedACUPS.price;
                    }
                }
            }
        }
    }

    // PDU
    const totalPDUCost = calculateTotalPDUCost();
    if (totalPDUCost > 0) {
        const pduTypeLabel = getPDUTypeLabel(formData.pduType);
        const totalRacks = parseInt(formData.racks600 || '0') + parseInt(formData.racks800 || '0');
      costItems.push({
          label: `PDU (${pduTypeLabel} ${formData.pduCurrent}A, ${totalRacks} × 2 PDU на стойку)`,
        cost: totalPDUCost
      });
        subTotal += totalPDUCost;
    }

    // Battery Cost (This block is the redundant one - removing it)
    /*
    if (batteryOptions.length > 0 && selectedBatteryIndex >= 0) {
      const selectedBattery = batteryOptions[selectedBatteryIndex];
      costItems.push({
        label: `Батареи (${selectedBattery.model})`,
        cost: selectedBattery.total_price
      });
      subTotal += selectedBattery.total_price;
    }
    */

    // Add monitoring system cost if selected
    if (formData.monitoring) {
      costItems.push({
        label: translations.fields.monitoringSystem,
            cost: _dataMon.price
      });
      subTotal += _dataMon.price;
    }

    // Add corridor isolation cost if selected
    if (formData.corridorIsolation) {
      costItems.push({
        label: translations.fields.corridorIsolation,
            cost: _dataIso.price
      });
      subTotal += _dataIso.price;
    }

    // Add power distribution system cost if selected
    if (formData.distributionSystem === 'yes' && _dataDist) {
      costItems.push({
            label: _dataDist.name,
            cost: _dataDist.price
          }); 
      subTotal += _dataDist.price;
    }

    const subTotalBeforeWarrantyAndPnr = subTotal; // Store subTotal before warranty and PNR

    // Warranty Extension Cost (based on running subTotal, which excludes PNR)
    let warrantyCost = 0;
    if (formData.warrantyExtension === '1') {
        warrantyCost = subTotalBeforeWarrantyAndPnr * 0.04;
    } else if (formData.warrantyExtension === '3') {
        warrantyCost = subTotalBeforeWarrantyAndPnr * 0.10;
    }
    if (warrantyCost > 0) {
        const label = formData.warrantyExtension === '1'
          ? 'Продление гарантии на 1 год'
          : 'Продление гарантии на 3 года';
        costItems.push({ label, cost: warrantyCost });
        // subTotal is NOT incremented here yet, finalTotalCost will sum it up
    }

    // Calculate PNR cost before adding to costItems
    let pnrCost = 0;
    if (formData.pnrSelected) {
        pnrCost = subTotalBeforeWarrantyAndPnr * 0.10; // PNR from pre-warranty/PNR subtotal
        costItems.push({ label: "Пуско-наладочные работы", cost: pnrCost }); 
    }

    // Draw cost table
    costItems.forEach((item, index) => {
      const isEvenRow = index % 2 === 0;
      if (isEvenRow) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 5, contentWidth, 12, 'F');
      }
      
      doc.setFontSize(11);
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(secondaryColor);
      doc.text(item.label, margin, y);
      const costText = `${item.cost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`; // Updated locale and currency
      // Manually calculate right alignment X position
      const textWidth = doc.getStringUnitWidth(costText) * 11 / doc.internal.scaleFactor; // Width in mm
      const valueX = pageWidth - margin - textWidth;
      doc.text(costText, valueX, y);
      y += 12;
    });

    // Add total cost with special styling
    y += 5;
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFont('Roboto', 'bold');
      doc.setFontSize(14);
    doc.setTextColor(primaryColor);

    // Compute final total that includes Warranty & PNR (do NOT mutate subTotal to keep earlier logic intact)
    const finalTotalCost = subTotalBeforeWarrantyAndPnr + warrantyCost + pnrCost;

    doc.text(translations.fields.totalCost, margin, y);
    const totalCostText = `${finalTotalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
    // Align right
    const totalTextWidth = doc.getStringUnitWidth(totalCostText) * 14 / doc.internal.scaleFactor;
    doc.text(totalCostText, pageWidth - margin - totalTextWidth, y);
    
    // --- 2. Get the generated PDF as an ArrayBuffer ---
    const generatedPdfBytes = doc.output('arraybuffer');

    // Add footer with page numbers
    const pages = doc.internal.pages;
    const totalPages = pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor);
      
      // Add company logo or brand info to the footer
      if (i === 2 && visualizationImage) { // Special footer for visualization page
        // Add a special footer for the visualization page
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
        
        doc.setFontSize(9);
        doc.setTextColor(primaryColor);
        doc.text('iTeaQ © Визуализация конфигурации дата-центра', margin, pageHeight - 12);
        
        doc.setTextColor(secondaryColor);
        doc.text(`Страница ${i} из ${totalPages}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
      } else {
        // Regular page numbering for other pages
      doc.text(
        `${i} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      }
    }

    // --- 3. Fetch the static PDF ---
    let staticPdfBytes: ArrayBuffer | null = null;
    try {
          const response = await fetch(`${import.meta.env.BASE_URL}components2.pdf`); // Prepend base URL
      if (!response.ok) {
        throw new Error(`Failed to fetch components2.pdf: ${response.statusText}`);
      }
      staticPdfBytes = await response.arrayBuffer();
    } catch (error) {
      console.error("Error fetching static PDF:", error);
      alert("Не удалось загрузить статический PDF-файл (components2.pdf). Пожалуйста, убедитесь, что он находится в папке public.");
      // Optionally, proceed to download only the generated part
      // Create a blob and download link for the generated PDF only
      const blob = new Blob([generatedPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'datacenter-configuration-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return; // Stop execution if static PDF fetch failed
    }
    
    if (!staticPdfBytes) {
        console.error("Static PDF bytes are null after fetch.");
        alert("Произошла ошибка при обработке статического PDF-файла.");
        return;
    }

    // --- 4. Merge the PDFs using pdf-lib ---
    try {
        const mergedPdf = await PDFDocument.create();
        
        // Load the generated PDF
        const generatedPdfDoc = await PDFDocument.load(generatedPdfBytes);
        // Copy pages from generated PDF
        const generatedPages = await mergedPdf.copyPages(generatedPdfDoc, generatedPdfDoc.getPageIndices());
        generatedPages.forEach(page => mergedPdf.addPage(page));

        // Load the static PDF
        const staticPdfDoc = await PDFDocument.load(staticPdfBytes);
        // Copy pages from static PDF
        const staticPages = await mergedPdf.copyPages(staticPdfDoc, staticPdfDoc.getPageIndices());
        staticPages.forEach(page => mergedPdf.addPage(page));

        // --- 5. Save the merged PDF ---
        const mergedPdfBytes = await mergedPdf.save();

        // --- 6. Trigger download ---
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'datacenter-configuration-merged.pdf'; // New filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Error merging PDFs:", error);
        alert("Произошла ошибка при объединении PDF-файлов.");
    }
  };

  const validateStep = () => {
    const errors: Partial<Record<keyof ConfigFormData, string>> = {};
    const addError = (field: keyof ConfigFormData, message: string) => {
      errors[field] = message;
    };

    // Validation logic based on current step
    switch (step) {
      case 0:
        if (!formData.customerName?.trim()) addError('customerName', translations.validation.enterCustomerName);
        if (!formData.customerEmail?.trim()) {
            addError('customerEmail', translations.validation.enterCustomerEmail);
        } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.customerEmail)) { // Standard email regex
            addError('customerEmail', translations.validation.invalidCustomerEmail);
        }
        break;
      case 1:
        if (!formData.racks600 && !formData.racks800) {
          addError('racks600', translations.validation.enterRacks);
        } else {
          const racks600 = parseInt(formData.racks600 || '0');
          const racks800 = parseInt(formData.racks800 || '0');
          if (racks600 < 0) addError('racks600', 'Количество стоек не может быть отрицательным');
          if (racks800 < 0) addError('racks800', 'Количество стоек не может быть отрицательным');
        }
        break;
      case 2:
        if (!formData.power600 && !formData.power800) {
          addError('power600', translations.validation.enterPower);
        } else {
          const power600 = parseFloat(formData.power600 || '0');
          const power800 = parseFloat(formData.power800 || '0');
          if (power600 < 0) addError('power600', 'Мощность не может быть отрицательной');
          if (power800 < 0) addError('power800', 'Мощность не может быть отрицательной');
          if (power600 > 100) addError('power600', 'Максимальная мощность на стойку - 100 кВт');
          if (power800 > 100) addError('power800', 'Максимальная мощность на стойку - 100 кВт');
        }
        break;
      case 3:
        if (!formData.acModel) {
          addError('acModel', translations.validation.selectAcModel);
        }
        break;
      case 4:
        if (!formData.batteryTime) {
          addError('batteryTime', translations.validation.enterBackupTime);
        } else {
          const batteryTime = parseFloat(formData.batteryTime);
          if (batteryTime < 5) addError('batteryTime', 'Минимальное время автономной работы - 5 минут');
          if (batteryTime > 30) addError('batteryTime', 'Максимальное время автономной работы - 30 минут');
        }
        break;
      case 5:
        if (!formData.pduCurrent) addError('pduCurrent', translations.validation.selectPduCurrent);
        if (!formData.pduPhase) addError('pduPhase', translations.validation.selectPduPhase);
        if (!formData.pduType) addError('pduType', translations.validation.selectPduType);
        break;
    }

    setErrors(errors);
    const valid = Object.keys(errors).length === 0;
    
    if (valid) {
      // If on the last step, don't auto-advance
      const maxStep = 9; // Update to 9 instead of 8
      if (step < maxStep) {
        setStep(step + 1);
      }
      // Update maximum completed step
      if (step > maxCompletedStep) {
      setMaxCompletedStep(step);
    }
    }
    
    return valid;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step === 4) {
      // Get IT load as integer
      const itLoad = parseInt(totalITLoad());
      
      // Calculate total load with cooling if needed
      let totalLoad = itLoad;
      if (formData.backupCooling && formData.acModel) {
        const acUnitPower = calculateTotalACPower();
        const acUps = getRecommendedUPSForAC();
        totalLoad += acUnitPower + (acUps ? acUps.power : 0);
      }
      
      // Get backup time as integer
      const backupMinutes = parseInt(formData.batteryTime || '15');
      
      // Log values for debugging
      console.log(`Battery calculation: Load=${totalLoad}kW, Time=${backupMinutes}min`);
      
      // Calculate UPS configuration with the restored formula
      const selected = calculateUPSConfig(totalLoad, backupMinutes);
      setBatteryOptions(selected);
      
      if (selected.length > 0) {
        setSelectedBatteryIndex(0);
      }
    }
    
    setStep(step + 1);
    setMaxCompletedStep(Math.max(maxCompletedStep, step));
  };

  const handleBack = () => setStep(step - 1);

  const handleStepClick = (targetStep: number) => {
    // Allow navigation up to the next uncompleted step (max total steps is 10, indices 0-9)
    if (targetStep <= maxCompletedStep + 1 && targetStep < 10) { 
         if (targetStep > step && !validateStep()) return; // Validate if moving forward
      setStep(targetStep);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    // Special handling for range inputs
    if (type === 'range') {
      // Always use whole numbers for slider values
      const numValue = parseInt(value);
      
      setFormData(prevData => ({
        ...prevData,
        [name]: numValue.toString()
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        [name]: type === 'checkbox' ? checked : value 
      }));
    }
    
    setErrors(prevErrors => ({ ...prevErrors, [name]: undefined })); 
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  // Add this near your Input components
  const ErrorMessage = ({ error }: { error?: string }) => {
    if (!error) return null;
  return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center space-x-2 mt-1"
      >
        <svg
          className="w-4 h-4 text-red-500"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-red-500 font-medium">{error}</span>
      </motion.div>
    );
  };

  // Effect to send email when reaching step 9 (Summary)
  useEffect(() => {
    console.log(`Email useEffect triggered. Step: ${step}, Email Status: ${emailStatus}, User Loaded: ${!!user}`); // Log effect run

    // Trigger only when step becomes 9 (new summary step) and email hasn't been sent/attempted yet
    if (step === 9 && emailStatus === 'idle') { 
        console.log('Condition met (step 9, status idle). Preparing email data...'); // Log condition met
        if (!user) {
            console.error("Cannot send email: Partner user data not loaded.");
            setEmailStatus('error'); // Or handle differently
            return;
        }

        console.log("User data available:", user); // Log user data

        // Calculate necessary values based on current state
        const itLoad = parseFloat(totalITLoad());
        const recommendedITUPS = getRecommendedITUPS(itLoad);
        // Use the currently selected UPS instead of only the recommended one
        const selectedITUPS = _dataUpsIt[selectedUpsIndex] || recommendedITUPS;
        const selectedAC = _dataAc.find(unit => unit.power.toString() === formData.acModel); // Use renamed variable
        const acUnitsCount = calculateACUnits();
        const acTotalPower = calculateTotalACPower();
        const recommendedACUPS = formData.backupCooling ? getRecommendedUPSForAC() : null;
        const selectedBattery = batteryOptions[selectedBatteryIndex] || null; // Ensure it can be null
        const totalPDU = calculateTotalPDUCost();
        
        // Calculate the final total cost using the dedicated function
        const finalTotalCost = calculateTotalConfigurationCost(
            formData, batteryOptions, selectedBatteryIndex,
            _dataUpsAc, _dataUpsIt, _dataAc, _dataPdu, _dataMon, _dataIso, _dataDist, _dataRacks,
            selectedUpsIndex,
            redundancyEnabled
        );

        // Generate cost breakdown items for the email
        const costItems: CostBreakdownItem[] = [];
        let subTotal = 0;
        
        // Rack Costs
        const racks600Count = parseInt(formData.racks600 || '0');
        const racks800Count = parseInt(formData.racks800 || '0');
        if (racks600Count > 0) {
            const cost = racks600Count * _dataRacks.R600.price;
            costItems.push({ label: `${_dataRacks.R600.name} (${racks600Count}x)`, cost });
            subTotal += cost;
        }
        if (racks800Count > 0) {
            const cost = racks800Count * _dataRacks.R800.price;
            costItems.push({ label: `${_dataRacks.R800.name} (${racks800Count}x)`, cost });
            subTotal += cost;
        }

        // IT UPS
        if (redundancyEnabled) {
            costItems.push({ label: `IT UPS (${selectedITUPS.model}) - 2N резервирование (2x)`, cost: selectedITUPS.price * 2 });
            subTotal += selectedITUPS.price * 2;
        } else {
            costItems.push({ label: `IT UPS (${selectedITUPS.model})`, cost: selectedITUPS.price });
            subTotal += selectedITUPS.price;
        }
        
        // Batteries
        if (batteryOptions.length > 0 && selectedBatteryIndex >= 0 && selectedBatteryIndex < batteryOptions.length) {
            const batteryOption = batteryOptions[selectedBatteryIndex];
            const batteryCount = redundancyEnabled ? batteryOption.total_batteries * 2 : batteryOption.total_batteries;
            
            costItems.push({
                label: `Батареи ${Math.round(parseFloat(formData.batteryTime))}мин (${batteryCount}x ${batteryOption.model})`, 
                cost: redundancyEnabled ? batteryOption.total_price * 2 : batteryOption.total_price 
            });
            
            subTotal += redundancyEnabled ? batteryOption.total_price * 2 : batteryOption.total_price;
        }

        // Construct the payload
        const emailPayload: EmailPayload = {
            customerInfo: { // Add customer details
                name: formData.customerName,
                phone: formData.customerPhone,
                email: formData.customerEmail,
                quoteName: formData.quoteName,
            },
            partnerInfo: { // Add partner details from context
                name: user.displayName,
                email: user.email,
                // Add other details if available in user object and needed
                // company: user.companyName || '',
            },
            rackConfig: {
                racks600: formData.racks600 || '0',
                power600: formData.power600 || '0',
                racks800: formData.racks800 || '0',
                power800: formData.power800 || '0',
                totalLoad: totalITLoad(),
            },
            coolingSystem: {
                acModel: formData.acModel,
                acUnitsCount: acUnitsCount,
                acTotalPower: acTotalPower,
                backupCooling: formData.backupCooling,
                acUpsModel: recommendedACUPS?.model,
                acUpsPower: recommendedACUPS?.power,
            },
            itUps: selectedITUPS, // Use the currently selected UPS
            batteryConfig: selectedBattery, // Pass the potentially null selected battery
            pduConfig: {
                current: formData.pduCurrent,
                phase: formData.pduPhase,
                type: formData.pduType,
                typeLabel: getPDUTypeLabel(formData.pduType),
                totalCost: totalPDU,
            },
            additionalSystems: {
                monitoring: formData.monitoring,
                corridorIsolation: formData.corridorIsolation,
                distributionSystem: formData.distributionSystem === 'yes',
                pnrSelected: formData.pnrSelected
            },
            redundancyEnabled: redundancyEnabled, // Include the redundancy flag
            costBreakdown: costItems, // Include cost breakdown
            totalCost: finalTotalCost // Include the calculated total cost
        };

        console.log("Email payload constructed:", emailPayload); // Log payload

        // Call the external helper function - pass the token
        sendConfigurationToServer(emailPayload, token, setEmailStatus);
    } else if (step === 9 && emailStatus !== 'idle') {
        console.log(`Email not sent: Status is ${emailStatus}, not idle.`); // Log if status prevents send
    }
    // Add dependencies
  }, [step, emailStatus, batteryOptions, formData, selectedBatteryIndex, user, token, redundancyEnabled, selectedUpsIndex]); // Add redundancyEnabled and selectedUpsIndex to dependency array

  // Add a function to open PDF file
  const openPDFDocument = (pdfName: string) => {
    // Create a link to the PDF and open it in a new tab
    const url = `/pdfs/${pdfName}`;
    window.open(url, '_blank');
  };

  // Effect to clear backup cooling when AC model is not selected
  useEffect(() => {
    if (!formData.acModel && formData.backupCooling) {
      setFormData(prev => ({
        ...prev,
        backupCooling: false
      }));
    }
  }, [formData.acModel]);

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
      
      {/* Left sidebar - converts to top bar on mobile */}
      <div className="fixed md:left-6 left-0 md:top-[45%] top-0 md:-translate-y-[45%] translate-y-0 md:h-auto h-auto w-full md:w-[72px] bg-[#0A2B6C]/80 backdrop-blur-md md:rounded-2xl rounded-none z-20 flex md:flex-col flex-row md:py-4 py-2 border-b md:border border-white/20 shadow-lg">
        {/* Back button */}
        <div className="md:flex hidden justify-center">
          <button 
            disabled
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#0A2B6C]/40 text-white/30 cursor-not-allowed transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Status Icons */}
        <div className="flex-1 flex md:flex-col flex-row items-center md:justify-between justify-around md:mt-0 md:px-0 px-2 md:space-y-2 space-x-1 md:space-x-0">
          {/* Settings (steps 0-2) */}
          <button 
            onClick={() => handleStepClick(0)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl transition-all duration-300 
              ${step <= 2 ? 'bg-[#1e88e5]' : 
                maxCompletedStep >= 0 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : 
                'bg-[#0A2B6C]/40 cursor-not-allowed'}`}
          >
            <img src={`${import.meta.env.BASE_URL}settings1.png`} alt="Settings" className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Cooling (step 3) */}
          <button 
            onClick={() => handleStepClick(3)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl transition-all duration-300 
              ${step === 3 ? 'bg-[#1e88e5]' : 
                maxCompletedStep >= 2 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : 
                'bg-[#0A2B6C]/40 cursor-not-allowed'}`}
          >
            <img src={`${import.meta.env.BASE_URL}cooler1.png`} alt="Cooling" className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Battery (steps 4-5) */}
          <button 
            onClick={() => handleStepClick(4)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl transition-all duration-300 
              ${step >= 4 && step <= 5 ? 'bg-[#1e88e5]' : 
                maxCompletedStep >= 3 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : 
                'bg-[#0A2B6C]/40 cursor-not-allowed'}`}
          >
            <img src={`${import.meta.env.BASE_URL}battery1.png`} alt="Battery" className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Server (step 6) */}
          <button 
            onClick={() => handleStepClick(6)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl transition-all duration-300 
              ${step === 6 ? 'bg-[#1e88e5]' : 
                maxCompletedStep >= 5 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : 
                'bg-[#0A2B6C]/40 cursor-not-allowed'}`}
          >
            <img src={`${import.meta.env.BASE_URL}server1.png`} alt="Server" className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Power (steps 7-8) */}
          <button 
            onClick={() => handleStepClick(7)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl transition-all duration-300 
              ${step === 7 ? 'bg-[#1e88e5]' : 
                maxCompletedStep >= 6 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : 
                'bg-[#0A2B6C]/40 cursor-not-allowed'}`}
          >
            <img src={`${import.meta.env.BASE_URL}lightning-removebg-preview.png`} alt="Power" className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* PNR (NEW step 8) */}
          <button 
            onClick={() => handleStepClick(8)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl transition-all duration-300 
              ${step === 8 ? 'bg-[#1e88e5]' : 
                maxCompletedStep >= 7 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : 
                'bg-[#0A2B6C]/40 cursor-not-allowed'}`}
          >
            <img src={`${import.meta.env.BASE_URL}wrench.png`} alt="Commissioning" className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Summary/Finish (NEW step 9) */}
          <button 
            onClick={() => handleStepClick(9)}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl transition-all duration-300 
              ${step === 9 ? 'bg-[#1e88e5]' : 
                maxCompletedStep >= 8 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : 
                'bg-[#0A2B6C]/40 cursor-not-allowed'}`}
          >
            <img src={`${import.meta.env.BASE_URL}finish1.png`} alt="Finish" className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 md:ml-24 ml-0">
        <div className="max-w-4xl mx-auto px-4 md:px-8 md:pt-32 pt-24 pb-6">
          <motion.div 
            className="bg-[#0A2B6C]/10 backdrop-blur-md rounded-3xl p-4 md:p-8 shadow-2xl border border-white/5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
            {/* Title and Logo */}
            <div className="flex items-center justify-between mb-6">
        <motion.h1 
                className="text-2xl md:text-4xl font-extrabold text-white tracking-tight"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {translations.title}
        </motion.h1>
              <motion.img 
                src={`${import.meta.env.BASE_URL}logologo.png`} // Use direct path from public folder for the PNG logo
                alt="Logo" 
                className="h-8 md:h-12 object-contain"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              />
            </div>

            {/* Progress dots */}
        <motion.div 
          className="mb-8 flex flex-col items-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center space-x-1.5 md:space-x-2"> 
            {[...Array(10)].map((_, i) => ( // 10 dots
              <button
                key={i}
                    onClick={() => handleStepClick(i)}
                    className={`w-2 md:w-2.5 h-2 md:h-2.5 rounded-full transition-all duration-300 
                  ${i === step ? 'bg-[#1e88e5] scale-125' : i <= maxCompletedStep ? 'bg-[#8AB73A]/50 hover:bg-[#8AB73A]/70 cursor-pointer' : 'bg-white/20 cursor-not-allowed'}`}
                disabled={i > maxCompletedStep + 1 || i >= 10}
              />
            ))}
          </div>
              <div className="text-sm font-medium text-white/90">
            {step + 1}/10 {/* 10 steps */}
          </div>
        </motion.div>

            {/* Form content */}
            <div className="space-y-4 md:space-y-6">
      {step === 0 && (
            <motion.div variants={fadeIn} className="space-y-6">
                  <div className="bg-gradient-to-br from-[#0A2B6C]/60 to-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white">{translations.steps.customerQuoteInfo}</h3>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                        <Label htmlFor="customerName" className="text-base font-semibold text-white/90 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A] mr-2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                          {translations.fields.customerName}
                    </Label>
                        <div className="relative">
            <Input
                            id="customerName"
                          name="customerName"
                          value={formData.customerName}
              onChange={handleChange}
                            className={`bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5]/20 font-medium transition-all rounded-lg pl-4 h-12 ${errors.customerName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                        />
                          {formData.customerName && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8AB73A]">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                        </div>
                        <ErrorMessage error={errors.customerName} />
          </div>
                      
                  <div className="space-y-2">
                        <Label htmlFor="customerEmail" className="text-base font-semibold text-white/90 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A] mr-2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                          {translations.fields.customerEmail}
                    </Label>
                        <div className="relative">
            <Input
                            id="customerEmail"
                          name="customerEmail"
                          value={formData.customerEmail}
              onChange={handleChange}
                          type="email"
                            className={`bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5]/20 font-medium transition-all rounded-lg pl-4 h-12 ${errors.customerEmail ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                        />
                          {formData.customerEmail && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8AB73A]">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                        </div>
                        <ErrorMessage error={errors.customerEmail} />
          </div>
                      
                  <div className="space-y-2">
                        <Label htmlFor="customerPhone" className="text-base font-semibold text-white/90 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A] mr-2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          {translations.fields.customerPhone}
                    </Label>
                        <div className="relative">
            <Input
                            id="customerPhone"
                          name="customerPhone"
                          value={formData.customerPhone}
              onChange={handleChange}
                          type="tel"
                            className={`bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5]/20 font-medium transition-all rounded-lg pl-4 h-12 ${errors.customerPhone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                        />
                          {formData.customerPhone && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8AB73A]">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                        </div>
                        <ErrorMessage error={errors.customerPhone} />
          </div>
                      
                  <div className="space-y-2">
                        <Label htmlFor="quoteName" className="text-base font-semibold text-white/90 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A] mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          {translations.fields.quoteName}
                    </Label>
                        <div className="relative">
            <Input
                            id="quoteName"
                          name="quoteName"
                          value={formData.quoteName}
              onChange={handleChange}
                            className={`bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5]/20 font-medium transition-all rounded-lg pl-4 h-12 ${errors.quoteName ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                        />
                          {formData.quoteName && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8AB73A]">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                        </div>
                        <ErrorMessage error={errors.quoteName} />
          </div>
        </div>
              </div>
            </motion.div>
      )}

      {step === 1 && (
            <motion.div variants={fadeIn} className="space-y-6">
                  <div className="bg-gradient-to-br from-[#0A2B6C]/60 to-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><line x1="9" y1="2" x2="9" y2="22"></line><line x1="15" y1="2" x2="15" y2="22"></line><line x1="2" y1="9" x2="22" y2="9"></line><line x1="2" y1="15" x2="22" y2="15"></line></svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white">{translations.steps.racks}</h3>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                        <Label htmlFor="racks600" className="text-base font-semibold text-white/90 flex items-center">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#8AB73A]/20 text-[#8AB73A] mr-2 text-sm font-bold">600</span>
                      {translations.fields.racks600}
                    </Label>
                        <div className="relative">
                          <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#0A2B6C]/50 flex items-center justify-center text-white/70 border border-white/20 border-r-0 rounded-l-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="12" y1="6" x2="12.01" y2="6"></line><line x1="12" y1="10" x2="12.01" y2="10"></line><line x1="12" y1="14" x2="12.01" y2="14"></line><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                          </div>
            <Input
                            id="racks600"
              name="racks600"
              value={formData.racks600}
              onChange={handleChange}
                            className={`bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5]/20 font-medium transition-all rounded-lg pl-14 ${errors.racks600 ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                            placeholder="0"
                        />
                        </div>
                        <ErrorMessage error={errors.racks600} />
          </div>
                      
                  <div className="space-y-2">
                        <Label htmlFor="racks800" className="text-base font-semibold text-white/90 flex items-center">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#8AB73A]/20 text-[#8AB73A] mr-2 text-sm font-bold">800</span>
                      {translations.fields.racks800}
                    </Label>
                        <div className="relative">
                          <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#0A2B6C]/50 flex items-center justify-center text-white/70 border border-white/20 border-r-0 rounded-l-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="12" y1="6" x2="12.01" y2="6"></line><line x1="12" y1="10" x2="12.01" y2="10"></line><line x1="12" y1="14" x2="12.01" y2="14"></line><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                          </div>
            <Input
                            id="racks800"
              name="racks800"
              value={formData.racks800}
              onChange={handleChange}
                            className={`bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5]/20 font-medium transition-all rounded-lg pl-14 ${errors.racks800 ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                            placeholder="0"
                        />
                        </div>
                        <ErrorMessage error={errors.racks800} />
          </div>
        </div>
                    
                    {/* Removed rack visualization component */}
              </div>
            </motion.div>
      )}

      {step === 2 && (
            <motion.div variants={fadeIn} className="space-y-6">
                  <div className="bg-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <h3 className="text-xl font-semibold text-white mb-6">{translations.steps.power}</h3>
                <div className="grid gap-6">
                  <div className="space-y-2">
                        <Label className="text-lg font-semibold text-white/90">
                      {translations.fields.power600}
                    </Label>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-white">0 кВт</span>
                        <span className="text-white">15 кВт</span>
                      </div>
                      <input
                        type="range"
                        id="power600"
              name="power600"
                        min="0"
                        max="15"
                        step="1"
                        value={formData.power600 || '0'}
              onChange={handleChange}
                        className="slider w-full"
                        style={{ "--progress": `${(parseInt(formData.power600 || '0') / 15) * 100}%` } as React.CSSProperties}
                        />
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">Мощность:</span>
                        <span className="text-white font-bold text-lg">{formData.power600} кВт</span>
          </div>
                    </div>
                    {errors.power600 && <ErrorMessage error={errors.power600} />}
                  </div>
                  
                  <div className="space-y-2">
                        <Label className="text-lg font-semibold text-white/90">
                      {translations.fields.power800}
                    </Label>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-white">0 кВт</span>
                        <span className="text-white">15 кВт</span>
                      </div>
                      <input
                        type="range"
                        id="power800"
              name="power800"
                        min="0"
                        max="15"
                        step="1"
                        value={formData.power800 || '0'}
              onChange={handleChange}
                        className="slider w-full"
                        style={{ "--progress": `${(parseInt(formData.power800 || '0') / 15) * 100}%` } as React.CSSProperties}
                        />
                      <div className="flex justify-between items-center">
                        <span className="text-white font-semibold">Мощность:</span>
                        <span className="text-white font-bold text-lg">{formData.power800} кВт</span>
        </div>
                </div>
                    {errors.power800 && <ErrorMessage error={errors.power800} />}
              </div>
                </div>
              </div>
              
              {/* Add Total IT Load display */}
              {(parseFloat(formData.power600 || '0') > 0 || parseFloat(formData.power800 || '0') > 0) && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="bg-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 mt-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M6 7h12M6 17h12M6 12h12"/></svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">ИБП для ИТ-нагрузки</h3>
                  </div>
                  
                  {/* Improved power requirement message with visual indicator */}
                  {(() => {
                    const itLoad = parseFloat(totalITLoad());
                    const requiredPower = itLoad * 1.3;
                    return (
                      <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M5 18h14M5 14h14M5 10h14M5 6h14"/></svg>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-white/90 font-medium">
                              Рекомендуемая мощность ИБП:
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xl font-bold text-white">{itLoad.toFixed(1)} кВт</span>
                              <span className="text-sm text-white/70">с запасом 30%: <span className="text-white/90">{requiredPower.toFixed(1)} кВт</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Product Card for IT UPS */}
                    {(() => {
                      const itLoad = parseFloat(totalITLoad());
                      const recommendedUPS = getRecommendedITUPS(itLoad);
                      
                      // Find the index of the recommended UPS in _dataUpsIt
                      const recommendedIndex = _dataUpsIt.findIndex(ups => ups.model === recommendedUPS.model);
                      
                      // The currently selected UPS (either recommended or user-selected)
                      const currentUPS = _dataUpsIt[selectedUpsIndex] || recommendedUPS;
                      
                      // Determine animation direction
                      const direction = selectedUpsIndex > prevIndex ? 1 : -1;
                      
                      // Navigate to previous UPS
                      const handlePrevUPS = () => {
                        setShowingRecommendedUps(false);
                        setSelectedUpsIndex(prev => (prev > 0 ? prev - 1 : _dataUpsIt.length - 1));
                      };
                      
                      // Navigate to next UPS
                      const handleNextUPS = () => {
                        setShowingRecommendedUps(false);
                        setSelectedUpsIndex(prev => (prev < _dataUpsIt.length - 1 ? prev + 1 : 0));
                      };
                      
                      return (
                        <div className="relative">
                          {/* Recommended tag */}
                          {showingRecommendedUps && (
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                              <div className="bg-[#8AB73A] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                Рекомендуемая модель
                              </div>
                            </div>
                          )}
                          
                          {/* UPS Carousel */}
                          <div className="flex justify-center items-center relative">
                            {/* Left Arrow */}
                            <button
                              onClick={handlePrevUPS}
                              className="absolute left-0 z-10 transform -translate-x-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-all duration-200 shadow-lg"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                              </svg>
                            </button>
                            
                            <div className="flex justify-center mx-12 overflow-hidden w-[320px]">
                              <motion.div
                                key={`ups-card-${selectedUpsIndex}`}
                                initial={{ 
                                  x: direction * 300,
                                  opacity: 0,
                                  scale: 0.8
                                }}
                                animate={{ 
                                  x: 0,
                                  opacity: 1,
                                  scale: 1
                                }}
                                transition={{ 
                                  type: "spring", 
                                  stiffness: 300, 
                                  damping: 30,
                                  duration: 0.3
                                }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.2}
                                onDragEnd={(e, { offset, velocity }) => {
                                  const swipe = offset.x;
                                  
                                  if (swipe < -70) {
                                    handleNextUPS();
                                  } else if (swipe > 70) {
                                    handlePrevUPS();
                                  }
                                }}
                              >
                                <ProductCard
                                  model={currentUPS.model}
                                  power={currentUPS.power}
                                  description={currentUPS.description}
                                  type="IT"
                                />
                              </motion.div>
                            </div>
                            
                            {/* Right Arrow */}
                            <button
                              onClick={handleNextUPS}
                              className="absolute right-0 z-10 transform translate-x-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-all duration-200 shadow-lg"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            </button>
                          </div>
                          
                          {/* UPS Navigation Info */}
                          <div className="text-center mt-4 text-white/70 text-sm">
                            <p>{selectedUpsIndex + 1} из {_dataUpsIt.length}</p>
                            {!showingRecommendedUps && (
                              <button
                                onClick={() => {
                                  setShowingRecommendedUps(true);
                                  setSelectedUpsIndex(recommendedIndex);
                                }}
                                className="underline text-[#8AB73A] hover:text-[#8AB73A]/80 mt-1"
                              >
                                Вернуться к рекомендуемой модели
                              </button>
                            )}
                          </div>
                          
                          {/* 2N Redundancy Toggle */}
                          <div className="mt-6 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id="redundancyEnabled"
                                  checked={redundancyEnabled}
                                  onChange={() => setRedundancyEnabled(!redundancyEnabled)}
                                  className="sr-only peer"
                                />
                                <label 
                                  htmlFor="redundancyEnabled" 
                                  className={`relative w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e88e5] cursor-pointer`}
                                ></label>
                                <span className="font-medium text-white/90">
                                  Резервировать по схеме 2N
                                </span>
                              </div>
                              
                              {redundancyEnabled && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-[#1e88e5] text-sm font-medium">
                                    Двойная надежность
                                  </span>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1e88e5]">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {redundancyEnabled && (
                              <div className="mt-3 bg-[#1e88e5]/10 p-3 rounded-lg border border-[#1e88e5]/30">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 text-[#1e88e5]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 2v4"></path>
                                      <path d="M12 18v4"></path>
                                      <path d="M4.93 4.93l2.83 2.83"></path>
                                      <path d="M16.24 16.24l2.83 2.83"></path>
                                      <path d="M2 12h4"></path>
                                      <path d="M18 12h4"></path>
                                      <path d="M4.93 19.07l2.83-2.83"></path>
                                      <path d="M16.24 7.76l2.83-2.83"></path>
                                    </svg>
                                  </div>
                                  <p className="text-sm text-white/80">
                                    Конфигурация 2N добавляет второй идентичный ИБП, удваивает количество батарей и обеспечивает 100% избыточность при отказе одного ИБП.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                </motion.div>
              )}
            </motion.div>
      )}

      {step === 3 && (
            <motion.div variants={fadeIn} className="space-y-6">
                  <div className="bg-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    {/* Cooling System Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="mb-8"
                    >
                      <div className="flex items-center gap-3 mb-6 justify-between">
                        {/* Title block */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path></svg>
                          </div>
                          <h3 className="text-xl font-semibold text-white">{translations.steps.cooling}</h3>
                        </div>
                        {/* Manual select button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-[#8AB73A]/10 border border-[#8AB73A]/60 text-[#8AB73A] font-medium rounded-lg px-4 py-2 backdrop-blur-sm hover:bg-[#8AB73A]/20 hover:border-[#8AB73A] hover:text-[#8AB73A]/90 transition-colors duration-200"
                          onClick={() => {
                            setManualCoolingMode(true);
                            setFormData(prev => ({ ...prev, backupCooling: true }));
                          }}
                        >
                           Выбрать вручную
                        </Button>
                      </div>

                      <div className="space-y-6">
                        {!manualCoolingMode && (
                          <div className="bg-white/5 rounded-lg p-5 border border-white/10">
                           <Label htmlFor="acModel" className="text-lg font-semibold text-white/90 mb-3 block">
                         {translations.fields.acModel}
                       </Label>
                       <select
                         id="acModel"
                         name="acModel"
                         value={formData.acModel}
                         onChange={handleChange}
                             className={`w-full p-3 rounded-lg border bg-white/10 text-white 
                           ${errors.acModel ? 'border-red-500' : formData.acModel ? 'border-[#8AB73A] ring-2 ring-[#8AB73A]/20' : 'border-white/30'} 
                           focus:ring-2 focus:ring-[#8AB73A] focus:border-[#8AB73A] cursor-pointer transition-all duration-200`}
                       >
                         <option value="" className="bg-[#0A2B6C] text-white">{translations.acModels.select}</option>
                         {Object.entries(translations.acModels)
                           .filter(([key]) => key !== 'select')
                           .map(([key, value]) => (
                             <option key={key} value={key} className="bg-[#0A2B6C] text-white">
                               {value}
                             </option>
                           ))
                         }
                       </select>
                       {errors.acModel && <ErrorMessage error={errors.acModel} />}
                     </div>
                        )}

                        {formData.acModel && !manualCoolingMode && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="p-5 bg-white/5 border border-[#8AB73A]/30 rounded-lg"
                          >
                            <div className='flex flex-col sm:flex-row sm:items-center gap-4'>
                              <div className='flex-shrink-0'>
                                <div className='w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center'>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className='text-green-400'><path d="M5 18h14M5 14h14M5 10h14M5 6h14"/></svg>
                                </div>
                              </div>
                              <div>
                                <p className='text-sm text-white/90 font-medium'>Система охлаждения:</p>
                                <div className='mt-1'>
                                  <span className='text-xl font-bold text-white'>{calculateTotalACPower().toFixed(1)} кВт</span>
                                  <p className='text-xs text-green-400 mt-1 italic'>схема N+1</p>
                                  <p className='text-xs text-white/70 mt-2'>Количество блоков кондиционирования: <span className='font-semibold text-white'>{calculateACUnits()}</span></p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                    
                    {/* AC UPS Section with improved design */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                        <div className="pt-4 border-t border-white/10">
                        {/* Remove the header and keep only the toggle */}
                        <div className="mb-6">
                          <div className="relative inline-flex items-center mb-6">
                      <input
                        type="checkbox"
                        id="backupCooling"
                        name="backupCooling"
                        checked={formData.backupCooling}
                        onChange={handleChange}
                              disabled={!formData.acModel}
                              className="sr-only peer"
                            />
                            <label 
                              htmlFor="backupCooling" 
                              className={`relative w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${formData.acModel ? 'peer-checked:bg-[#8AB73A] cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                            ></label>
                            <span className={`ms-3 font-medium ${formData.acModel ? 'text-white/90' : 'text-white/50'}`}>
                              Добавить резервное питание для системы кондиционирования
                              {!formData.acModel && <span className="block text-xs text-white/40 mt-1">Выберите модель кондиционера</span>}
                            </span>
                    </div>

                          {!manualCoolingMode && (
                              <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10 hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M5 18h14M5 14h14M5 10h14M5 6h14"/></svg>
          </div>
                        </div>
                                  <div>
                                    <p className="text-sm text-white/90 font-medium">
                                      Требуемая мощность ИБП для системы кондиционирования:
                                    </p>
                                    <div className="mt-1">
                                      <span className="text-xl font-bold text-white">{calculateTotalACPower().toFixed(1)} кВт</span>
                  <p className="text-xs text-green-400 mt-1 italic">схема N+1</p>
                </div>
                                  </div>
                                </div>
                              </div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* Display section for CoolRow and AC UPS cards (auto recommended) */}
                    {formData.acModel && !manualCoolingMode && (
                      <div className="pt-4 border-t border-white/10 mb-6">
                        <div className="flex flex-wrap justify-center gap-4">
                          {/* CoolRow Card */}
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1, duration: 0.3 }}
                            className="w-full sm:max-w-[320px]"
                          >
                            <Card 
                              className="bg-transparent backdrop-blur-lg border border-white/10 hover:border-white/30 
                                transition-all duration-300 text-white rounded-xl hover:shadow-[0_0_15px_3px_rgba(66,165,245,0.3)] 
                                overflow-hidden h-full flex flex-col relative"
                            >
                              {/* Add gradient background effect */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-700/20 opacity-10 hover:opacity-20 transition-opacity"></div>
                              
                              {/* Badge top right corner */}
                              <div className="absolute top-3 right-3 z-20">
                                <div className="rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                                  AC
                                </div>
                              </div>
                              
                              <CardContent className="flex flex-col items-center p-4 sm:p-5 flex-grow relative z-10">
                                <motion.div 
                                  whileHover={{ scale: 1.05 }}
                                  transition={{ duration: 0.3 }}
                                  className="w-full aspect-square max-h-40 rounded-lg flex items-center justify-center mb-4 overflow-hidden"
                                >
                                  <img
                                    src={`${import.meta.env.BASE_URL}CoolRow-removebg-preview.png`}
                                    alt="CoolRow"
                                    className="max-h-full max-w-full object-contain p-3"
                                    loading="lazy"
                                  />
                                </motion.div>
                                
                                <div className="space-y-3 w-full">
                                  <div className="text-center">
                                    <p className="text-xl font-bold">CoolRow</p>
                                    <p className="text-sm text-white/80">Прецизионный рядный кондиционер</p>
                                  </div>
                                  
                                  {/* Specifications */}
                                  <div className="bg-white/5 rounded-lg p-3 mt-2">
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/70">Модель:</span>
                                        <span className="font-medium text-white">{formData.acModel} кВт</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/70">Количество:</span>
                                        <span className="font-medium text-white">{calculateACUnits()}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Learn More Button */}
                                  <div className="mt-3 flex justify-end">
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-[#8AB73A] hover:text-white hover:bg-[#8AB73A]/20 p-1 h-auto text-xs font-medium transition-colors rounded"
                                      onClick={() => window.open('https://iteaq.su/wp-content/uploads/2024/10/CoolRow-brochure.pdf', '_blank')}
                                    >
                                      Узнать больше
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                          
                          {/* AC UPS Card - only shown when backup cooling is enabled */}
                          {formData.backupCooling && (() => {
                                const acPower = calculateTotalACPower();
                                const recommendedACUPS = getRecommendedUPSForAC();
                                return recommendedACUPS ? (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3, duration: 0.3 }}
                                    className="w-full sm:max-w-[320px]"
                                  >
                                    <ProductCard
                                      model={recommendedACUPS.model}
                                      power={recommendedACUPS.power}
                                      type="AC"
                                    />
                                  </motion.div>
                                ) : null;
                              })()}
          </div>
        </div>
                    )}

                    {/* Manual Cooling Selection UI */}
                    {manualCoolingMode && (
                      <div className="pt-4 border-t border-white/10 mb-6">
                        {/* Styled manual selection with cards */}
                        {(() => {
                          const handlePrevAC = () => setSelectedACManualIndex(prev => prev > 0 ? prev - 1 : _dataAc.length - 1);
                          const handleNextAC = () => setSelectedACManualIndex(prev => prev < _dataAc.length - 1 ? prev + 1 : 0);
                          const currentAC = _dataAc[selectedACManualIndex];

                          const handlePrevACUPS = () => setSelectedACUPSManualIndex(prev => prev > 0 ? prev - 1 : _dataUpsAc.length - 1);
                          const handleNextACUPS = () => setSelectedACUPSManualIndex(prev => prev < _dataUpsAc.length - 1 ? prev + 1 : 0);
                          const currentACUPS = _dataUpsAc[selectedACUPSManualIndex];

                          return (
                            <div className="space-y-6">
                              {/* Card carousel for AC */}
                              <div className="flex justify-center items-center relative">
                                {/* Left Arrow */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handlePrevAC}
                                  className="absolute left-0 -translate-x-1/2 bg-[#0A2B6C]/60 hover:bg-[#1e88e5]/60 text-white border border-white/20 rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                                  title="Предыдущий AC"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                                </Button>

                                {/* Card */}
                                <div className="flex justify-center mx-12 overflow-hidden w-[320px]">
                                  {(() => {
                                    const direction = selectedACManualIndex > prevACIndex ? 1 : -1;
                                    return (
                                      <motion.div
                                        key={`ac-card-${selectedACManualIndex}`}
                                        initial={{ x: direction * 300, opacity: 0, scale: 0.8 }}
                                        animate={{ x: 0, opacity: 1, scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.2}
                                        onDragEnd={(e, { offset }) => {
                                          if (offset.x < -70) {
                                            handleNextAC();
                                          } else if (offset.x > 70) {
                                            handlePrevAC();
                                          }
                                        }}
                                      >
                                        <Card className="bg-transparent backdrop-blur-lg border border-white/10 hover:border-white/30 transition-all duration-300 text-white rounded-xl overflow-hidden h-full flex flex-col relative">
                                          {/* Gradient */}
                                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-700/20 opacity-10 hover:opacity-20 transition-opacity"></div>
                                          {/* Badge */}
                                          <div className="absolute top-3 right-3 z-20">
                                            <div className="rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-semibold text-white">AC</div>
                                          </div>
                                          <CardContent className="flex flex-col items-center p-4 sm:p-5 flex-grow relative z-10">
                                            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }} className="w-full aspect-square max-h-40 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                                              <img src={`${import.meta.env.BASE_URL}CoolRow-removebg-preview.png`} alt={currentAC.model} className="max-h-full max-w-full object-contain p-3" loading="lazy" />
                                            </motion.div>
                                            <div className="space-y-3 w-full">
                                              <div className="text-center">
                                                <p className="text-xl font-bold">{currentAC.model}</p>
                                                <p className="text-sm text-white/80">Прецизионный рядный кондиционер</p>
                                              </div>
                                              <div className="bg-white/5 rounded-lg p-3 mt-2">
                                                <div className="space-y-1.5">
                                                  <div className="flex justify-between items-center text-sm"><span className="text-white/70">Модель:</span><span className="font-medium text-white">{currentAC.power} кВт</span></div>
                                                  <div className="flex justify-between items-center text-sm"><span className="text-white/70">Количество:</span><span className="font-medium text-white">{manualACUnits || 1}</span></div>
                                                </div>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      </motion.div>
                                    );
                                  })()}
                                </div>

                                {/* Right Arrow */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleNextAC}
                                  className="absolute right-0 translate-x-1/2 bg-[#0A2B6C]/60 hover:bg-[#1e88e5]/60 text-white border border-white/20 rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                                  title="Следующий AC"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                </Button>
                              </div>

                              {/* Card carousel for AC-UPS (if enabled) */}
                              {formData.backupCooling && (
                                <div className="flex justify-center items-center relative">
                                  {/* Left Arrow */}
                                  <Button variant="ghost" size="icon" onClick={handlePrevACUPS} title="Предыдущий AC UPS" className="absolute left-0 -translate-x-1/2 bg-[#0A2B6C]/60 hover:bg-[#1e88e5]/60 text-white border border-white/20 rounded-full w-9 h-9 flex items-center justify-center transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                                  </Button>

                                  <div className="flex justify-center mx-12 overflow-hidden w-[320px]">
                                    {(() => {
                                      const direction = selectedACUPSManualIndex > prevACUPSIndex ? 1 : -1;
                                      return (
                                        <motion.div
                                          key={`acups-card-${selectedACUPSManualIndex}`}
                                          initial={{ x: direction * 300, opacity: 0, scale: 0.8 }}
                                          animate={{ x: 0, opacity: 1, scale: 1 }}
                                          transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
                                          drag="x"
                                          dragConstraints={{ left: 0, right: 0 }}
                                          dragElastic={0.2}
                                          onDragEnd={(e, { offset }) => {
                                            if (offset.x < -70) {
                                              handleNextACUPS();
                                            } else if (offset.x > 70) {
                                              handlePrevACUPS();
                                            }
                                          }}
                                        >
                                          <ProductCard model={currentACUPS.model} power={currentACUPS.power} type="AC" />
                                        </motion.div>
                                      );
                                    })()}
                                  </div>

                                  {/* Right Arrow */}
                                  <Button variant="ghost" size="icon" onClick={handleNextACUPS} title="Следующий AC UPS" className="absolute right-0 translate-x-1/2 bg-[#0A2B6C]/60 hover:bg-[#1e88e5]/60 text-white border border-white/20 rounded-full w-9 h-9 flex items-center justify-center transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                  </Button>
                                </div>
                              )}

                              {/* AC Units Input */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white/5 p-4 rounded-lg border border-white/10">
                                <Label className="text-white/80">Количество кондиционеров:</Label>
                                <input
                                  type="number"
                                  min="1"
                                  value={manualACUnits === 0 ? '' : manualACUnits}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setManualACUnits(val === '' ? 0 : parseInt(val) || 0);
                                  }}
                                  placeholder="0"
                                  className="w-24 h-10 p-2 rounded-lg bg-[#061640]/70 border border-white/20 text-white placeholder-white/50 focus:border-[#8AB73A] focus:ring-2 focus:ring-[#8AB73A]/30 font-medium transition-all"
                                />
                              </div>

                              {/* Save / Cancel */}
                              <div className="flex justify-end gap-3">
                                <Button variant="secondary" onClick={() => setManualCoolingMode(false)} className="bg-white/10 text-white hover:bg-white/20">Отмена</Button>
                                <Button onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    acModel: currentAC.power.toString(),
                                    acUnitsManual: manualACUnits || 1,
                                    acUpsManual: formData.backupCooling ? currentACUPS : undefined
                                  }));
                                  setManualCoolingMode(false);
                                }} className="bg-[#8AB73A]/80 hover:bg-[#8AB73A] text-white">Сохранить</Button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
              </div>
            </motion.div>
       )}

      {step === 4 && (
            <motion.div 
              variants={fadeIn} 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-gradient-to-br from-[#0A2B6C]/60 to-[#102b5c]/80 backdrop-blur-md rounded-xl border border-white/10 shadow-xl overflow-hidden">
                <div className="p-6 md:p-8">
                  {/* Header with icon */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1e88e5]/30 to-[#8AB73A]/30 flex items-center justify-center border border-white/20">
                      <img 
                        src={`${import.meta.env.BASE_URL}battery1.png`} 
                        alt="Battery" 
                        className="w-7 h-7"
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{translations.steps.battery}</h2>
                  </div>
                  
                  {/* Battery time selector with enhanced visuals */}
                  <div className="space-y-8">
                    <div>
                      <Label 
                        htmlFor="batteryTime" 
                        className="text-lg font-semibold text-white/90 flex items-center mb-4"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A] mr-2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    {translations.fields.batteryTime}
                  </Label>
                  
                      <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-6">
                        {/* Time indicator with visual battery level */}
                        <div className="relative bg-[#061640]/70 rounded-lg p-4 border border-white/10 mb-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="relative w-16 h-8 bg-[#061640] rounded-md border border-white/20 flex items-center">
                                <div 
                                  className="absolute left-1 top-1 bottom-1 rounded-sm transition-all duration-300 bg-gradient-to-r from-green-500 to-[#8AB73A]"
                                  style={{ width: `${Math.max(15, ((parseFloat(formData.batteryTime || '15') - 5) / 25) * 80)}%` }}
                                ></div>
                                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-1 h-3 bg-white/40 rounded-sm"></div>
                              </div>
                              <div>
                                <p className="text-3xl font-bold text-white tracking-wide flex items-baseline">
                                  {formData.batteryTime || '15'}
                                  <span className="text-sm text-white/70 font-normal ml-1">мин</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm text-white/70">Время автономной работы</span>
                              <div className="mt-1 text-xs text-white/50">5-30 минут</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Slider with improved visuals */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                            <span className="text-white/70 font-medium text-sm">5 мин</span>
                            <span className="text-white/70 font-medium text-sm">30 мин</span>
                    </div>
                    <input
                      type="range"
              id="batteryTime"
              name="batteryTime"
                      min="5"
                      max="30"
                      step="1"
                      value={formData.batteryTime || '15'}
              onChange={handleChange}
                      className="slider w-full"
                      style={{ "--progress": `${((parseFloat(formData.batteryTime || '15') - 5) / 25) * 100}%` } as React.CSSProperties}
                    />
                          <div className="flex items-center justify-between text-xs text-white/50">
                            <span>Минимум батарей</span>
                            <span>Максимум батарей</span>
                    </div>
                  </div>
                        
                        {errors.batteryTime && <ErrorMessage error={errors.batteryTime} />}
                      </div>
                    </div>
                  </div>
                </div>
          </div>
            </motion.div>
          )}

          {step === 5 && batteryOptions.length > 0 && (
            <motion.div 
              variants={fadeIn} 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {redundancyEnabled && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="bg-[#1e88e5]/10 p-4 rounded-xl border border-[#1e88e5]/30 shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-[#1e88e5]/20 text-[#1e88e5]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4"></path>
                        <path d="M12 18v4"></path>
                        <path d="M4.93 4.93l2.83 2.83"></path>
                        <path d="M16.24 16.24l2.83 2.83"></path>
                        <path d="M2 12h4"></path>
                        <path d="M18 12h4"></path>
                        <path d="M4.93 19.07l2.83-2.83"></path>
                        <path d="M16.24 7.76l2.83-2.83"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium mb-1">Активировано 2N резервирование</h3>
                      <p className="text-white/80 text-sm">
                        В конфигурации с 2N резервированием количество батарей и линеек удваивается для обеспечения полной избыточности питания.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div className="bg-gradient-to-br from-[#0A2B6C]/60 to-[#102b5c]/80 backdrop-blur-md rounded-xl border border-white/10 shadow-xl overflow-hidden">
                <div className="p-6 md:p-8">
                  {/* Header with icon */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1e88e5]/30 to-[#8AB73A]/30 flex items-center justify-center border border-white/20">
                      <img 
                        src={`${import.meta.env.BASE_URL}battery1.png`} 
                        alt="Battery" 
                        className="w-7 h-7"
                      />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{translations.steps.battery}</h2>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-full bg-[#8AB73A]/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A]">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-white">Подходящие конфигурации батарей</h3>
                    </div>
                    <p className="text-white/60 text-sm mt-2 ml-9">Выберите оптимальную конфигурацию для ваших задач</p>
                  </div>
                  
                  {/* Battery options with enhanced visuals */}
              <div className="space-y-4">
                {batteryOptions.map((battery, i) => (
                      <motion.div 
                    key={i} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedBatteryIndex(i)}
                        className={`group relative rounded-xl cursor-pointer transition-all duration-300 overflow-hidden
                      ${selectedBatteryIndex === i 
                            ? 'bg-gradient-to-r from-[#8AB73A]/20 to-[#0A2B6C]/40 ring-2 ring-[#8AB73A] shadow-lg shadow-[#8AB73A]/10' 
                            : 'bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40'}`}
                  >
                        {/* Selection indicator */}
                        <div className={`absolute top-0 left-0 w-1.5 h-full transition-all duration-300 
                          ${selectedBatteryIndex === i ? 'bg-[#8AB73A]' : 'bg-transparent group-hover:bg-white/20'}`}
                        ></div>
                        
                        {/* Content area */}
                        <div className="p-5 ml-1.5">
                          <div className="flex items-start gap-4">
                            {/* Battery visual */}
                            <div className={`relative w-16 h-28 flex flex-col border-2 rounded-md transition-all duration-300 overflow-hidden
                              ${selectedBatteryIndex === i 
                                ? 'border-[#8AB73A] bg-gradient-to-b from-[#0A2B6C]/40 to-[#061640]/70' 
                                : 'border-white/40 bg-gradient-to-b from-[#0A2B6C]/60 to-[#061640]/80 group-hover:border-white/60'}`}
                            >
                              {/* Battery top cap */}
                              <div className={`w-6 h-2 mx-auto -mt-1 rounded-t-sm transition-all duration-300
                                ${selectedBatteryIndex === i 
                                  ? 'bg-[#8AB73A]' 
                                  : 'bg-white/40 group-hover:bg-white/60'}`}
                              ></div>
                              
                              {/* Battery power terminals */}
                              <div className="flex justify-center space-x-5 mt-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${selectedBatteryIndex === i ? 'bg-red-500' : 'bg-red-500/50'}`}></div>
                                <div className={`w-1.5 h-1.5 rounded-full ${selectedBatteryIndex === i ? 'bg-blue-500' : 'bg-blue-500/50'}`}></div>
                      </div>
                              
                              {/* Battery label */}
                              <div className="absolute top-4 left-0 right-0 flex justify-center">
                                <div className={`text-[8px] font-bold px-1 rounded-sm ${selectedBatteryIndex === i ? 'text-[#8AB73A] bg-black/30' : 'text-white/70 bg-black/20'}`}>
                                  {battery.model.split('-')[0]}
                                </div>
                              </div>
                              
                              {/* Battery level fill - calculate height based on capacity */}
                              <div 
                                className={`absolute bottom-0 left-0.5 right-0.5 rounded-sm transition-all duration-500
                                  ${selectedBatteryIndex === i 
                                    ? 'bg-gradient-to-t from-[#8AB73A] to-[#6cb52a]' 
                                    : 'bg-gradient-to-t from-white/40 to-white/30 group-hover:from-white/50 group-hover:to-white/40'}`}
                                style={{ 
                                  height: `${Math.min(80, Math.max(25, (battery.capacity_ah / 250) * 85))}%`,
                                  boxShadow: selectedBatteryIndex === i ? 'inset 0 0 5px rgba(0,0,0,0.3)' : 'none'
                                }}
                              >
                                {/* Battery "bubbles" effect */}
                                {selectedBatteryIndex === i && (
                                  <>
                                    <div className="absolute w-1 h-1 rounded-full bg-white/30 animate-float-slow left-1 bottom-2"></div>
                                    <div className="absolute w-1.5 h-1.5 rounded-full bg-white/20 animate-float-med right-2 bottom-4"></div>
                                    <div className="absolute w-0.5 h-0.5 rounded-full bg-white/40 animate-float-fast left-3 bottom-1"></div>
                                  </>
                                )}
                              </div>
                              
                              {/* Battery capacity text */}
                              <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center mb-2 text-white z-10">
                                <span className={`text-xs font-bold drop-shadow-md ${selectedBatteryIndex === i ? 'text-white' : 'text-white/90'}`}>
                                  {battery.capacity_ah}
                                </span>
                              </div>
                              
                              {/* Battery shine effect */}
                              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white/10 to-transparent"></div>
                            </div>
                            
                            {/* Battery specs */}
                            <div className="flex-1">
                              <h4 className={`text-lg font-semibold mb-3 transition-all duration-300
                                ${selectedBatteryIndex === i 
                                  ? 'text-[#8AB73A]' 
                                  : 'text-white group-hover:text-white/90'}`}
                              >
                                {battery.model}
                              </h4>
                              
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm">Емкость:</span>
                                  <span className="text-white font-medium">{battery.capacity_ah} Ah</span>
                      </div>
                      <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm">Энергия:</span>
                                  <span className="text-white font-medium">{battery.energy_per_string.toFixed(1)} кВт·ч</span>
                      </div>
                      <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm">Линейки:</span>
                                  <span className="text-white font-medium">
                                    {redundancyEnabled ? battery.strings_needed * 2 : battery.strings_needed}
                                    {redundancyEnabled && <span className="text-xs text-[#1e88e5] ml-1">(2N)</span>}
                                  </span>
                      </div>
                      <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm">Батареи:</span>
                                  <span className="text-white font-medium">
                                    {redundancyEnabled ? battery.total_batteries * 2 : battery.total_batteries}
                                    {redundancyEnabled && <span className="text-xs text-[#1e88e5] ml-1">(2N)</span>}
                                  </span>
                      </div>
                      <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm">Вес:</span>
                                  <span className="text-white font-medium">
                                    {redundancyEnabled ? 
                                      (battery.total_weight_kg * 2).toFixed(1) : 
                                      battery.total_weight_kg.toFixed(1)} кг
                                  </span>
                      </div>
                      <div className="flex justify-between items-center">
                                  <span className="text-white/70 text-sm">Размеры:</span>
                                  <span className="text-white font-medium truncate max-w-[100px]">{battery.dimensions}</span>
                      </div>
                    </div>
                    
                    {/* Remove the cost indicator section with 2N display */}
          </div>
                            
                            {/* Selection indicator */}
                            <div className={`self-center flex-shrink-0 transition-all duration-300 ${selectedBatteryIndex === i ? 'opacity-100' : 'opacity-0'}`}>
                              <div className="bg-[#8AB73A]/20 rounded-full p-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A]">
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
        </div>
                  </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Helpful tip */}
                  <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex gap-3">
                      <div className="text-[#1e88e5]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 16v-4"></path>
                          <path d="M12 8h.01"></path>
                        </svg>
                      </div>
                      <p className="text-sm text-white/80">
                        Выбирайте конфигурацию батарей исходя из требуемого времени автономной работы и общей нагрузки. Учитывайте, что большее количество батарей потребует дополнительного пространства.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div variants={fadeIn} className="space-y-6">
              <div className="bg-gradient-to-br from-[#0A2B6C]/60 to-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">{translations.steps.pdu}</h3>
                </div>
                
                  <div className="space-y-4">
                  <div className="bg-[#061640]/50 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-full bg-[#8AB73A]/20 flex items-center justify-center mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A]"><path d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"></path><path d="M11 4v18"></path></svg>
                      </div>
                      <Label className="text-lg font-semibold text-white">{translations.fields.pduCurrent}</Label>
                    </div>
                    
                    <div className="flex gap-6 mt-3">
                      <label className="group relative h-14 flex-1">
                          <input
                            type="radio"
                            name="pduCurrent"
                            value="16"
                            checked={formData.pduCurrent === '16'}
                            onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="absolute inset-0 rounded-lg bg-[#0A2B6C]/40 border border-white/20 peer-checked:border-[#8AB73A] peer-checked:bg-[#8AB73A]/10 transition-all flex items-center justify-center cursor-pointer hover:border-white/40 peer-checked:hover:border-[#8AB73A]/80">
                          <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-white">16A</span>
                            <span className="text-xs text-white/60">Стандартный</span>
                          </div>
                        </div>
                        {formData.pduCurrent === '16' && (
                          <div className="absolute top-2 right-2 text-[#8AB73A]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        )}
                        </label>
                      <label className="group relative h-14 flex-1">
                          <input
                            type="radio"
                            name="pduCurrent"
                            value="32"
                            checked={formData.pduCurrent === '32'}
                            onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="absolute inset-0 rounded-lg bg-[#0A2B6C]/40 border border-white/20 peer-checked:border-[#8AB73A] peer-checked:bg-[#8AB73A]/10 transition-all flex items-center justify-center cursor-pointer hover:border-white/40 peer-checked:hover:border-[#8AB73A]/80">
                          <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-white">32A</span>
                            <span className="text-xs text-white/60">Повышенная мощность</span>
                          </div>
                        </div>
                        {formData.pduCurrent === '32' && (
                          <div className="absolute top-2 right-2 text-[#8AB73A]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        )}
                        </label>
                      </div>
                    </div>

                  <div className="bg-[#061640]/50 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-full bg-[#8AB73A]/20 flex items-center justify-center mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A]"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                      </div>
                      <Label className="text-lg font-semibold text-white">{translations.fields.pduPhase}</Label>
                    </div>
                    
                    <div className="flex gap-6 mt-3">
                      <label className="group relative h-14 flex-1">
                          <input
                            type="radio"
                            name="pduPhase"
                            value="1"
                            checked={formData.pduPhase === '1'}
                            onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="absolute inset-0 rounded-lg bg-[#0A2B6C]/40 border border-white/20 peer-checked:border-[#8AB73A] peer-checked:bg-[#8AB73A]/10 transition-all flex items-center justify-center cursor-pointer hover:border-white/40 peer-checked:hover:border-[#8AB73A]/80">
                          <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-white">1Ф</span>
                            <span className="text-xs text-white/60">{translations.fields.single}</span>
                          </div>
                        </div>
                        {formData.pduPhase === '1' && (
                          <div className="absolute top-2 right-2 text-[#8AB73A]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        )}
                        </label>
                      <label className="group relative h-14 flex-1">
                          <input
                            type="radio"
                            name="pduPhase"
                            value="3"
                            checked={formData.pduPhase === '3'}
                            onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="absolute inset-0 rounded-lg bg-[#0A2B6C]/40 border border-white/20 peer-checked:border-[#8AB73A] peer-checked:bg-[#8AB73A]/10 transition-all flex items-center justify-center cursor-pointer hover:border-white/40 peer-checked:hover:border-[#8AB73A]/80">
                          <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-white">3Ф</span>
                            <span className="text-xs text-white/60">{translations.fields.three}</span>
                          </div>
                        </div>
                        {formData.pduPhase === '3' && (
                          <div className="absolute top-2 right-2 text-[#8AB73A]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        )}
                        </label>
                      </div>
                    </div>

                  <div className="bg-[#061640]/50 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 rounded-full bg-[#8AB73A]/20 flex items-center justify-center mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A]"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
                      </div>
                          <Label className="text-lg font-semibold text-white">{translations.fields.pduType}</Label>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4 mt-3">
                        {['B', 'M', 'S'].map((type) => (
                        <label key={type} className="group relative h-14">
                            <input
                              type="radio"
                              name="pduType"
                              value={type}
                              checked={formData.pduType === type}
                              onChange={handleChange}
                            className="sr-only peer"
                          />
                          <div className="absolute inset-0 rounded-lg bg-[#0A2B6C]/40 border border-white/20 peer-checked:border-[#8AB73A] peer-checked:bg-[#8AB73A]/10 transition-all flex items-center justify-center cursor-pointer hover:border-white/40 peer-checked:hover:border-[#8AB73A]/80">
                            <span className="text-lg font-bold text-white">{translations.pduTypes[type as PDUType]}</span>
                          </div>
                          {formData.pduType === type && (
                            <div className="absolute top-2 right-2 text-[#8AB73A]">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                          </label>
                        ))}
                      </div>
                    
                    {/* PDU Card Carousel */}
                    {formData.pduType && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mt-8"
                      >
                        <div className="text-center mb-4">
                          <h4 className="text-xl font-semibold text-white">
                            {pduCardData[formData.pduType as PDUType].title}
                          </h4>
                          <p className="text-white/70 text-sm">
                            {pduCardData[formData.pduType as PDUType].description}
                          </p>
                    </div>

                        <div className="relative py-5">
                          <Carousel className="w-full relative">
                            <CarouselContent className="px-2 sm:px-0">
                              {/* PDU Visualization Card */}
                              <CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 p-1">
                                <div className="bg-gradient-to-br from-[#0A2B6C] to-[#061640] rounded-xl p-4 sm:p-5 border border-white/10 shadow-lg h-full flex flex-col">
                                  <div className="rounded-lg bg-[#8AB73A]/20 p-2 w-fit mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A]">
                                      <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                                      <path d="M6 12h12"></path>
                                      <path d="M8 12v4"></path>
                                      <path d="M16 12v4"></path>
                                      <path d="M12 12v4"></path>
                                    </svg>
                  </div>
                                  <h5 className="text-lg font-bold text-white mb-3">Визуализация</h5>
                                  <div className="flex-1 flex items-center justify-center bg-[#061640]/70 rounded-lg p-2 overflow-hidden">
                                    <div className="w-full" dangerouslySetInnerHTML={{ __html: pduCardData[formData.pduType as PDUType].image }} />
                </div>
                                  <div className="mt-4 text-center text-sm text-white/60">
                                    {translations.pduTypes[formData.pduType as PDUType]} PDU • {formData.pduCurrent}A • {formData.pduPhase}Ф
                                  </div>
                                </div>
                              </CarouselItem>
                              
                              {/* PDU Specification Card */}
                              <CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 p-1">
                                <div className="bg-gradient-to-br from-[#0A2B6C] to-[#061640] rounded-xl p-4 sm:p-5 border border-white/10 shadow-lg h-full">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="rounded-lg bg-[#8AB73A]/20 p-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A]">
                                        <rect x="2" y="2" width="20" height="20" rx="2"></rect>
                                        <path d="M15 4v16"></path>
                                        <path d="M9 4v16"></path>
                                        <path d="M4 9h6"></path>
                                        <path d="M4 15h6"></path>
                                        <path d="M14 9h6"></path>
                                        <path d="M14 15h6"></path>
                                      </svg>
                                    </div>
                                    <div className="bg-[#8AB73A]/20 text-[#8AB73A] text-xs font-bold px-2 py-1 rounded">
                                      {formData.pduCurrent}A / {formData.pduPhase}Ф
                                    </div>
                                  </div>
                                  <h5 className="text-lg font-bold text-white mb-2">Спецификация</h5>
                                  <div className="space-y-2 text-sm text-white/80">
                                    <div className="flex justify-between">
                                      <span>Тип:</span>
                                      <span className="font-medium">{translations.pduTypes[formData.pduType as PDUType]}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Ток:</span>
                                      <span className="font-medium">{formData.pduCurrent}A</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Фазы:</span>
                                      <span className="font-medium">{formData.pduPhase === '1' ? 'Однофазный' : 'Трехфазный'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Розетки:</span>
                                      <span className="font-medium">8 x C13/C19</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Монтаж:</span>
                                      <span className="font-medium">Вертикальный в стойку</span>
                                    </div>
                                  </div>
                                </div>
                              </CarouselItem>
                              
                              {/* PDU Features Card */}
                              <CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 p-1">
                                <div className="bg-gradient-to-br from-[#0A2B6C] to-[#061640] rounded-xl p-4 sm:p-5 border border-white/10 shadow-lg h-full">
                                  <div className="rounded-lg bg-[#8AB73A]/20 p-2 w-fit mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A]">
                                      <path d="m9 12 2 2 4-4"></path>
                                      <path d="M12 3a9 9 0 1 0 9 9"></path>
                                    </svg>
                                  </div>
                                  <h5 className="text-lg font-bold text-white mb-3">Характеристики</h5>
                                  <ul className="space-y-2">
                                    {pduCardData[formData.pduType as PDUType].features.map((feature: string, index: number) => (
                                      <li key={index} className="flex items-start gap-2 text-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8AB73A] mt-0.5">
                                          <polyline points="9 11 12 14 22 4"></polyline>
                                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                        </svg>
                                        <span className="text-white/80">{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </CarouselItem>
                              
                              {/* PDU Showcase Card */}
                              <CarouselItem className="basis-full sm:basis-1/2 md:basis-1/3 p-1">
                                <div className="bg-gradient-to-br from-[#0A2B6C] to-[#061640] rounded-xl p-4 sm:p-5 border border-white/10 shadow-lg h-full flex flex-col relative overflow-hidden">
                                  {/* Background pattern */}
                                  <div className="absolute inset-0 opacity-5">
                                    <div className="w-full h-full" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '20px 20px' }}></div>
                                  </div>
  
                                  <div className="flex-1 flex items-center justify-center relative">
                                    <div className="text-center">
                                      <div className="flex justify-center space-x-6 mb-6">
                                        {/* Intelligent PDU */}
                                        <div className="relative group">
                                          <svg width="40" height="220" viewBox="0 0 40 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="40" height="220" rx="2" fill="#1A1A1A"/>
                                            <rect x="10" y="8" width="20" height="12" rx="1" fill="#222"/>
                                            <rect x="12" y="10" width="16" height="8" rx="1" fill="#444"/>
                                            <rect x="16" y="12" width="8" height="4" fill="#666"/>
                                            <rect x="10" y="24" width="20" height="10" rx="1" fill="#222"/>
                                            <rect x="16" y="26" width="8" height="6" rx="1" fill="#444"/>
                                            
                                            {/* Outlets */}
                                            <rect x="13" y="40" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="58" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="76" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="94" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="112" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="130" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="148" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="166" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="184" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="202" width="14" height="12" rx="2" fill="#333"/>
                                          </svg>
                                          <div className="absolute -top-1 right-0 bg-[#8AB73A] text-[#0A2B6C] text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            S
                                          </div>
                                        </div>
                                        
                                        {/* Monitored PDU */}
                                        <div className="relative group">
                                          <svg width="40" height="220" viewBox="0 0 40 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="40" height="220" rx="2" fill="#1A1A1A"/>
                                            <rect x="10" y="8" width="20" height="12" rx="1" fill="#222"/>
                                            <rect x="12" y="10" width="16" height="8" rx="1" fill="#444"/>
                                            <rect x="16" y="12" width="8" height="4" fill="#666"/>
                                            
                                            {/* Outlets */}
                                            <rect x="13" y="40" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="58" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="76" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="94" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="112" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="130" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="148" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="166" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="184" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="13" y="202" width="14" height="12" rx="2" fill="#333"/>
                                          </svg>
                                          <div className="absolute -top-1 right-0 bg-[#8AB73A] text-[#0A2B6C] text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            M
                                          </div>
                                        </div>
                                        
                                        {/* Basic PDU */}
                                        <div className="relative group">
                                          <svg width="36" height="220" viewBox="0 0 36 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="36" height="220" rx="2" fill="#1A1A1A"/>
                                            
                                            {/* Outlets */}
                                            <rect x="11" y="40" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="11" y="58" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="11" y="76" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="11" y="94" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="11" y="112" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="11" y="130" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="11" y="148" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="11" y="166" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="11" y="184" width="14" height="12" rx="2" fill="#333"/>
                                            <rect x="11" y="202" width="14" height="12" rx="2" fill="#333"/>
                                          </svg>
                                          <div className="absolute -top-1 right-0 bg-[#8AB73A] text-[#0A2B6C] text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            B
                                          </div>
                                        </div>
                                      </div>
                                      <h3 className="text-xl font-bold text-white">PDU</h3>
                                      <p className="text-white/60 text-xs mt-1">Распределение питания</p>
                                    </div>
                                  </div>
                                </div>
                              </CarouselItem>
                            </CarouselContent>
                            {/* Mobile-friendly carousel controls */}
                            <CarouselPrevious className="absolute left-0 sm:left-[-20px] bg-white/10 border-white/30 text-white hover:bg-white/30 h-10 w-10 sm:h-12 sm:w-12 -translate-y-1/2" />
                            <CarouselNext className="absolute right-0 sm:right-[-20px] bg-white/10 border-white/30 text-white hover:bg-white/30 h-10 w-10 sm:h-12 sm:w-12 -translate-y-1/2" />
                          </Carousel>
                        
                          {/* Add a standalone "Узнать больше" button with direct link outside of carousel context */}
                          <div className="mt-6 flex justify-center">
                            <a 
                              href="https://iteaq.su/wp-content/uploads/2025/04/r-PDU-Brochure-98125349-A00-20240806.pdf" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-[#8AB73A]/90 hover:bg-[#8AB73A] text-white py-2 px-4 rounded-lg font-medium text-center flex items-center gap-2 shadow-lg shadow-[#8AB73A]/20 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open('https://iteaq.su/wp-content/uploads/2025/04/r-PDU-Brochure-98125349-A00-20240806.pdf', '_blank');
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              Узнать больше о PDU
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gradient-to-br from-[#0A2B6C]/60 to-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
                <div className="bg-gradient-to-br from-[#0A2B6C]/80 to-[#0A2B6C]/50 rounded-xl p-6 border border-white/20 shadow-lg transition-all hover:shadow-xl hover:border-white/30">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="md:w-auto flex-shrink-0">
                    <input
                      type="checkbox"
                      id="distributionSystem"
                      name="distributionSystem"
                      checked={formData.distributionSystem === 'yes'}
                      onChange={(e) => {
                        handleChange({
                          target: {
                            name: 'distributionSystem',
                            value: e.target.checked ? 'yes' : 'no'
                          }
                        } as React.ChangeEvent<HTMLInputElement>);
                      }}
                        className="h-5 w-5 rounded border-white/30 text-[#8AB73A] focus:ring-2 focus:ring-[#8AB73A]/50 bg-white/10"
                    />
                    </div>
                    
                    <div className="flex-1">
                      <label htmlFor="distributionSystem" className="text-xl font-bold text-white block mb-3 cursor-pointer flex items-center gap-2">
                        <span className={formData.distributionSystem === 'yes' ? "text-[#8AB73A]" : "text-white"}>
                        {_dataDist.name}
                        </span>
                      {formData.distributionSystem === 'yes' && (
                          <span className="bg-[#8AB73A]/20 text-[#8AB73A] text-xs px-2 py-0.5 rounded-full border border-[#8AB73A]/30">
                            Выбрано
                          </span>
                        )}
                      </label>
                      
                      <div className="bg-[#8AB73A]/5 p-4 rounded-lg border border-[#8AB73A]/20 mb-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <img src={`${import.meta.env.BASE_URL}rasp-pitan345-removebg-preview.png`} alt="Power distribution cabinet" className="w-16 h-16 object-contain" />
                    </div>
                          <div>
                            <h4 className="text-base font-medium text-white mb-1">Шкаф распределения питания</h4>
                            <p className="text-sm text-white/80">{_dataDist.type || 'Система распределения питания обеспечивает защиту оборудования от перенапряжений и равномерное распределение нагрузки.'}</p>
                  </div>
                    </div>
                      </div>
                      
                      <div className="mt-4 bg-[#8AB73A]/10 p-3 rounded-lg border border-[#8AB73A]/30 flex items-center gap-3">
                        <div className="p-2 rounded-full bg-[#8AB73A]/20 text-[#8AB73A]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4"></path>
                            <path d="M12 8h.01"></path>
                          </svg>
                  </div>
                        <div className="text-sm text-white/80">
                          Шкаф распределения питания повышает надежность и безопасность электроснабжения дата-центра.
                </div>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 7 && (
            <motion.div variants={fadeIn} className="space-y-6">
                  <h2 className="text-2xl font-bold text-white mb-6">{translations.steps.monitoring}</h2>
              
              <div className="space-y-8">
                    <div className="bg-gradient-to-br from-[#0A2B6C]/80 to-[#0A2B6C]/50 rounded-xl p-6 border border-white/20 shadow-lg transition-all hover:shadow-xl hover:border-white/30">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="md:w-auto flex-shrink-0">
                    <input
                      type="checkbox"
                      id="monitoring"
                      name="monitoring"
                      checked={formData.monitoring}
                      onChange={handleChange}
                        className="h-5 w-5 rounded border-white/30 text-[#1e88e5] focus:ring-2 focus:ring-[#1e88e5]/50 bg-white/10"
                    />
                    </div>
                    
                    <div className="flex-1">
                          <label htmlFor="monitoring" className="text-xl font-bold text-white block mb-3 cursor-pointer flex items-center gap-2">
                            <span className={formData.monitoring ? "text-[#1e88e5]" : "text-white"}>
                        {translations.fields.monitoringSystem}
                            </span>
                            {formData.monitoring && (
                              <span className="bg-[#1e88e5]/20 text-[#1e88e5] text-xs px-2 py-0.5 rounded-full border border-[#1e88e5]/30">
                                Выбрано
                              </span>
                            )}
                      </label>
                          
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {_dataMon.features.map((feature, index) => (
                              <div 
                                key={index} 
                                className={`flex items-start gap-2 p-3 rounded-lg transition-colors ${formData.monitoring ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/10 text-white/60'}`}
                              >
                                <div className={`mt-0.5 text-lg ${formData.monitoring ? 'text-[#1e88e5]' : 'text-white/40'}`}>•</div>
                                <span className={`text-sm ${formData.monitoring ? 'text-white/90' : 'text-white/60'}`}>{feature}</span>
                              </div>
                        ))}
        </div>
                          
                          {formData.monitoring && (
                            <div className="mt-4 bg-[#1e88e5]/10 p-3 rounded-lg border border-[#1e88e5]/30 flex items-center gap-3">
                              <div className="p-2 rounded-full bg-[#1e88e5]/20 text-[#1e88e5]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <path d="M12 16v-4"></path>
                                  <path d="M12 8h.01"></path>
                                </svg>
                              </div>
                              <div className="text-sm text-white/80">
                                Система мониторинга включает оборудование для контроля параметров дата-центра в режиме реального времени.
                              </div>
                            </div>
                          )}
                    </div>
                  </div>
                </div>

                    <div className="bg-gradient-to-br from-[#0A2B6C]/80 to-[#0A2B6C]/50 rounded-xl p-6 border border-white/20 shadow-lg transition-all hover:shadow-xl hover:border-white/30">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="md:w-auto flex-shrink-0">
                    <input
                      type="checkbox"
                      id="corridorIsolation"
                      name="corridorIsolation"
                      checked={formData.corridorIsolation}
                      onChange={handleChange}
                      className="h-5 w-5 rounded border-white/30 text-[#8AB73A] focus:ring-2 focus:ring-[#8AB73A]/50 bg-white/10"
                    />
                    </div>
                    
                    <div className="flex-1">
                          <label htmlFor="corridorIsolation" className="text-xl font-bold text-white block mb-3 cursor-pointer flex items-center gap-2">
                            <span className={formData.corridorIsolation ? "text-[#8AB73A]" : "text-white"}>
                        {translations.fields.corridorIsolation}
                            </span>
                            {formData.corridorIsolation && (
                              <span className="bg-[#8AB73A]/20 text-[#8AB73A] text-xs px-2 py-0.5 rounded-full border border-[#8AB73A]/30">
                                Выбрано
                              </span>
                            )}
                      </label>
                          
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {_dataIso.features.map((feature, index) => (
                              <div 
                                key={index} 
                                className={`flex items-start gap-2 p-3 rounded-lg transition-colors ${formData.corridorIsolation ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/10 text-white/60'}`}
                              >
                                <div className={`mt-0.5 text-lg ${formData.corridorIsolation ? 'text-[#8AB73A]' : 'text-white/40'}`}>•</div>
                                <span className={`text-sm ${formData.corridorIsolation ? 'text-white/90' : 'text-white/60'}`}>{feature}</span>
                              </div>
                        ))}
                      </div>
                          
                          {formData.corridorIsolation && (
                            <div className="mt-4 bg-[#8AB73A]/10 p-3 rounded-lg border border-[#8AB73A]/30 flex items-center gap-3">
                              <div className="p-2 rounded-full bg-[#8AB73A]/20 text-[#8AB73A]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <path d="M12 16v-4"></path>
                                  <path d="M12 8h.01"></path>
                                </svg>
                    </div>
                              <div className="text-sm text-white/80">
                                Изоляция коридоров повышает энергоэффективность охлаждения и предотвращает смешивание холодного и горячего воздуха.
                              </div>
                            </div>
                          )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
      )}

      {step === 8 && (
        <motion.div 
          variants={fadeIn} 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-br from-[#0A2B6C]/60 to-[#0A2B6C]/40 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-xl">
            {/* Header section with icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-lg bg-gradient-to-br from-[#8AB73A]/30 to-[#1e88e5]/30 backdrop-blur-sm border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Пуско-Наладочные работы</h2>
            </div>
            
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div 
                className="flex items-start gap-5 cursor-pointer hover:bg-white/5 p-3 rounded-lg -m-3 transition-colors"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    pnrSelected: !prev.pnrSelected
                  }));
                }}
              >
                {/* Styled checkbox */}
                <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                id="pnrSelected"
                    name="pnrSelected"
                    checked={!!formData.pnrSelected}
                    onChange={handleChange}
                    className="appearance-none h-7 w-7 rounded-md border-2 border-white/30 bg-white/5 
                      checked:bg-[#8AB73A] checked:border-[#8AB73A] focus:ring-2 focus:ring-[#8AB73A]/50 
                      focus:outline-none cursor-pointer transition-all duration-200"
                  />
                  {formData.pnrSelected && (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                
              <div className="flex-1">
                  {/* Main content area */}
                  <div className="mb-3">
                    <label 
                      htmlFor="pnrSelected" 
                      className="text-xl font-bold text-white cursor-pointer hover:text-[#8AB73A] transition-colors group flex items-center"
                    >
                      Пуско-Наладочные работы
                </label>
                    
                    {/* Styled company name */}
                    <p className="text-sm text-white/80 mt-2 flex items-center">
                      <span className="opacity-80">Пусковые и наладочные работы от производителя</span>
                      <span className="flex items-center ml-1.5 font-semibold">
                        <span className="text-[#8AB73A]">i</span><span className="text-[#1e88e5]">TeaQ</span>
                      </span>
                    </p>
                  </div>
                  
                  {/* Services list with nice bullets */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                          </svg>
                        ),
                        text: "ПНР ИБП"
                      },
                      {
                        icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M18.12 14.37a6 6 0 10-8.5 0"></path>
                            <path d="M12 16v4"></path>
                            <path d="M8 20h8"></path>
                          </svg>
                        ),
                        text: "ПНР систем кондиционирования"
                      },
                      {
                        icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <line x1="2" y1="10" x2="22" y2="10"></line>
                          </svg>
                        ),
                        text: "Монтаж изоляции корридора"
                      },
                      {
                        icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                            <path d="M6 8h.01"></path>
                            <path d="M6 12h.01"></path>
                            <path d="M6 16h.01"></path>
                            <path d="M10 8h8"></path>
                            <path d="M10 12h8"></path>
                            <path d="M10 16h8"></path>
                          </svg>
                        ),
                        text: "Монтаж PDU"
                      },
                      {
                        icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <rect x="3" y="2" width="18" height="20" rx="2" ry="2"></rect>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                            <line x1="3" y1="14" x2="21" y2="14"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                          </svg>
                        ),
                        text: "Монтаж серверных стоек"
                      },
                      {
                        icon: (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                            <circle cx="7" cy="10" r="1"></circle>
                            <circle cx="17" cy="10" r="1"></circle>
                          </svg>
                        ),
                        text: "Настройка системы мониторинга и освещение"
                      }
                    ].map((service, index) => (
                      <motion.div 
                      key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * (index + 1) }}
                        className="flex items-center p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#8AB73A]/30 hover:shadow-md hover:shadow-[#8AB73A]/5 transition-all duration-300 group"
                      >
                        <div className="mr-3 p-1.5 rounded-full bg-[#8AB73A]/10 group-hover:bg-[#8AB73A]/20 transition-colors">
                          {service.icon}
                        </div>
                        <span className="text-white/90 group-hover:text-white transition-colors">{service.text}</span>
                      </motion.div>
                  ))}
                </div>
                  
                  {/* Information about commission - removed pricing information */}
                  {formData.pnrSelected && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-6 p-4 bg-gradient-to-r from-[#8AB73A]/10 to-transparent rounded-lg border border-[#8AB73A]/20"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-5 h-5 relative">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full absolute transition-transform duration-700 hover:rotate-12">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                          <div className="absolute inset-0 bg-[#8AB73A]/20 rounded-full animate-ping opacity-30" style={{animationDuration: '3s'}}></div>
              </div>
                        <p className="text-sm text-white/80">
                          Включает в себя монтаж и настройку оборудования, подключение к электросети и тестирование работоспособности систем.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Warranty Extension Section */}
          <div className="bg-gradient-to-br from-[#0A2B6C]/80 to-[#0A2B6C]/50 backdrop-blur-lg rounded-2xl p-8 border border-white/15 shadow-2xl mt-6 relative overflow-hidden">
            {/* Background subtle pattern */}
            <div className="absolute inset-0 opacity-15">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#8AB73A]/30 blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#1e88e5]/30 blur-2xl"></div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 relative">
              <div className="p-2 rounded-lg bg-[#8AB73A]/30 border-2 border-[#8AB73A]/40 shadow-lg shadow-[#8AB73A]/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span className="drop-shadow-md">Продление гарантии</span>
              <span className="ml-2 text-sm font-normal text-white/70 hidden md:inline">Выберите опцию продления гарантийного срока</span>
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-6 relative z-10">
              {[
                { 
                  value: 'none', 
                  label: 'Без продления',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  ),
                  description: 'Стандартный гарантийный срок'
                },
                { 
                  value: '1', 
                  label: '+1 год',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ),
                  description: 'Продление на 1 год'
                },
                { 
                  value: '3', 
                  label: '+3 года',
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                      <polyline points="20 12 9 23 4 18" transform="translate(0, -6)"></polyline>
                    </svg>
                  ),
                  description: 'Максимальный гарантийный срок'
                }
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`
                    flex-1 cursor-pointer rounded-xl border-2 transition-all duration-300 p-5 shadow-xl
                    ${formData.warrantyExtension === opt.value 
                      ? 'bg-gradient-to-br from-[#8AB73A]/50 to-[#8AB73A]/30 border-[#8AB73A] text-white scale-105 transform ring-2 ring-[#8AB73A]/50 ring-offset-1 ring-offset-[#0A2B6C]' 
                      : 'bg-gradient-to-br from-[#FFFFFF0d] to-[#FFFFFF14] border-white/25 text-white/80 hover:bg-white/15 hover:border-white/40 hover:scale-[1.025]'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="warrantyExtension"
                    value={opt.value}
                    checked={formData.warrantyExtension === opt.value}
                    onChange={handleChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`
                      w-14 h-14 rounded-full flex items-center justify-center transition-all
                      ${formData.warrantyExtension === opt.value 
                        ? 'bg-[#8AB73A] text-white shadow-lg shadow-[#8AB73A]/30' 
                        : 'bg-white/15 text-white/80 border border-white/30'
                      }
                    `}>
                      {opt.icon}
                    </div>
                    <div className="font-semibold text-lg drop-shadow-sm">{opt.label}</div>
                    <div className={`text-sm font-light ${formData.warrantyExtension === opt.value ? 'text-white/90' : 'text-white/60'}`}>{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* --- Step 9: Summary --- */}
      {step === 9 && (() => { // Start IIFE
          // --- Start Calculation Logic --- 
          const costItems: CostBreakdownItem[] = [];
          let subTotal = 0; // Use subTotal to calculate PNR base
                        const itLoad = totalITLoad();

          // Rack Costs
                        const racks600Count = parseInt(formData.racks600 || '0');
                        const racks800Count = parseInt(formData.racks800 || '0');
                        if (racks600Count > 0) {
              const cost = racks600Count * _dataRacks.R600.price;
              costItems.push({ label: `${_dataRacks.R600.name} (${racks600Count}x)`, cost });
              subTotal += cost;
                        }
                        if (racks800Count > 0) {
              const cost = racks800Count * _dataRacks.R800.price;
              costItems.push({ label: `${_dataRacks.R800.name} (${racks800Count}x)`, cost });
              subTotal += cost;
                        }

          // IT UPS
          const recommendedITUPS = getRecommendedITUPS(parseFloat(itLoad));
          // Use the currently selected UPS instead of only the recommended one
          const selectedITUPS = _dataUpsIt[selectedUpsIndex] || recommendedITUPS;
          
          if (redundancyEnabled) {
            // When redundancy is enabled, show as 2x UPS units
            costItems.push({ label: `IT UPS (${selectedITUPS.model}) - 2N резервирование (2x)`, cost: selectedITUPS.price * 2 });
            subTotal += selectedITUPS.price * 2;
          } else {
            costItems.push({ label: `IT UPS (${selectedITUPS.model})`, cost: selectedITUPS.price });
            subTotal += selectedITUPS.price;
          }
          
          // Batteries
          if (batteryOptions.length > 0 && selectedBatteryIndex >= 0 && selectedBatteryIndex < batteryOptions.length) {
            const batteryOption = batteryOptions[selectedBatteryIndex];
            const batteryCount = redundancyEnabled ? batteryOption.total_batteries * 2 : batteryOption.total_batteries;
            
            costItems.push({ 
              label: `Батареи ${Math.round(parseFloat(formData.batteryTime))}мин (${batteryCount}x ${batteryOption.model})`, 
              cost: redundancyEnabled ? batteryOption.total_price * 2 : batteryOption.total_price 
            });
            
            subTotal += redundancyEnabled ? batteryOption.total_price * 2 : batteryOption.total_price;
          }

          // Improved AC unit lookup for cost calculation
          if (formData.acModel) {
              console.log(`Looking for AC unit with model code: ${formData.acModel}`);
              
              // Get the AC power from the model code
              const acPower = getACPower();
              console.log(`Translated AC model code to power: ${acPower}kW`);
              
              // Find the AC unit that matches the power value
              const selectedAC = _dataAc.find(unit => {
                  const powerMatch = Math.abs(unit.power - acPower) < 0.1; // Allow small difference for floating point comparison
                  console.log(`Checking AC unit: ${unit.model}, power: ${unit.power}, match: ${powerMatch}`);
                  return powerMatch;
              });
              
                        if (selectedAC) {
                  console.log(`Found matching AC unit: ${selectedAC.model} with power ${selectedAC.power}kW`);
              const acUnitsCount = calculateACUnits();
              const cost = selectedAC.price * acUnitsCount;
              costItems.push({ label: `Кондиционеры (${acUnitsCount}x ${selectedAC.model})`, cost });
              subTotal += cost;

              // AC UPS (if backup selected)
              if (formData.backupCooling) {
                  const recommendedACUPS = getRecommendedUPSForAC();
                      if (recommendedACUPS) {
                          console.log(`Adding AC UPS to cost items: ${recommendedACUPS.model} - $${recommendedACUPS.price}`);
                  costItems.push({ label: `ИБП для кондиционирования (${recommendedACUPS.model})`, cost: recommendedACUPS.price });
                  subTotal += recommendedACUPS.price;
                      } else {
                          console.error("Failed to get recommended AC UPS even though backup cooling is enabled");
                      }
                  }
              } else {
                  // Try finding by model string
                  const acByModelString = _dataAc.find(unit => 
                      unit.model.includes(formData.acModel) || 
                      formData.acModel.includes(unit.model)
                  );
                  
                  if (acByModelString) {
                      const acUnitsCount = calculateACUnits();
                      const cost = acByModelString.price * acUnitsCount;
                      costItems.push({ label: `Кондиционеры (${acUnitsCount}x ${acByModelString.model})`, cost });
                      subTotal += cost;
                      
                      // AC UPS (if backup selected)
                      if (formData.backupCooling) {
                          const recommendedACUPS = getRecommendedUPSForAC();
                          if (recommendedACUPS) {
                              costItems.push({ label: `ИБП для кондиционирования (${recommendedACUPS.model})`, cost: recommendedACUPS.price });
                              subTotal += recommendedACUPS.price;
                          }
                      }
                  } else if (acPower > 0) {
                      // If we couldn't find the exact model but have a power value,
                      // use a reasonable default price based on similar units
                      const acUnitsCount = calculateACUnits();
                      const similarPowerUnit = _dataAc.find(unit => unit.power >= acPower) || _dataAc[0];
                      const estimatedPrice = similarPowerUnit ? similarPowerUnit.price : 10000;
                      const cost = estimatedPrice * acUnitsCount;
                      costItems.push({ label: `Кондиционеры (${acUnitsCount}x ${acPower}kW)`, cost });
                      subTotal += cost;
                      
                      // AC UPS (if backup selected)
                      if (formData.backupCooling) {
                          const recommendedACUPS = getRecommendedUPSForAC();
                          if (recommendedACUPS) {
                              costItems.push({ label: `ИБП для кондиционирования (${recommendedACUPS.model})`, cost: recommendedACUPS.price });
                              subTotal += recommendedACUPS.price;
                          }
                      }
                  } else {
                      console.error(`Could not find AC unit matching model code: ${formData.acModel} with power ${acPower}kW`);
                  }
              }
                        }

          // PDU
                        const totalPDUCost = calculateTotalPDUCost();
                        if (totalPDUCost > 0) {
                          const pduTypeLabel = translations.pduTypes[formData.pduType as PDUType];
              const totalRacks = parseInt(formData.racks600 || '0') + parseInt(formData.racks800 || '0');
              costItems.push({ 
                label: `PDU (${pduTypeLabel} ${formData.pduCurrent}A, ${totalRacks} × 2 PDU на стойку)`,
                cost: totalPDUCost 
              });
              subTotal += totalPDUCost;
                        }

          // Battery Cost (This block is the redundant one - removing it)
          /*
                        if (batteryOptions.length > 0 && selectedBatteryIndex >= 0) {
                          const selectedBattery = batteryOptions[selectedBatteryIndex];
              costItems.push({ label: `Батареи (${selectedBattery.model})`, cost: selectedBattery.total_price });
              subTotal += selectedBattery.total_price;
                        }
          */

          // Additional Systems
                        if (formData.monitoring) {
              costItems.push({ label: translations.fields.monitoringSystem, cost: _dataMon.price });
              subTotal += _dataMon.price;
                        }
                        if (formData.corridorIsolation) {
              costItems.push({ label: translations.fields.corridorIsolation, cost: _dataIso.price });
              subTotal += _dataIso.price;
                        }
          if (formData.distributionSystem === 'yes') {
              costItems.push({ label: _dataDist.name, cost: _dataDist.price });
              subTotal += _dataDist.price;
          }

          const subTotalBeforeWarrantyAndPnr = subTotal; 

           let warrantyCost = 0;
           if (formData.warrantyExtension === '1') {
              warrantyCost = subTotalBeforeWarrantyAndPnr * 0.04;
           } else if (formData.warrantyExtension === '3') {
              warrantyCost = subTotalBeforeWarrantyAndPnr * 0.10;
           }
           if (warrantyCost > 0) {
               const label = formData.warrantyExtension === '1'
                 ? 'Продление гарантии на 1 год'
                 : 'Продление гарантии на 3 года';
               costItems.push({ label, cost: warrantyCost });
           }
 
           let pnrCost = 0;
           if (formData.pnrSelected) {
              pnrCost = subTotalBeforeWarrantyAndPnr * 0.10; 
               costItems.push({ label: "Пуско-наладочные работы", cost: pnrCost }); 
           }
 
           const finalTotalCost = subTotalBeforeWarrantyAndPnr + warrantyCost + pnrCost;
           
           console.log("Summary cost items:", costItems);
           console.log(`Base subTotal (before W/PNR): ${subTotalBeforeWarrantyAndPnr}`);
           console.log(`Warranty cost: ${warrantyCost}`);
           console.log(`PNR cost: ${pnrCost}`);
           console.log(`Final total cost for summary page: ${finalTotalCost}`);

          // Return the JSX structure
                        return (
              <motion.div variants={fadeIn} className="space-y-8">
                 <div className="bg-white/10 rounded-2xl shadow-lg">
                   <div className="p-6 md:p-8">
                     <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8 text-center">{translations.steps.summary}</h2>
                     
                     <div className="space-y-4">
                         <div className="divide-y divide-white/10 rounded-lg overflow-hidden border border-white/10">
                             {costItems.map((item, index) => (
                                 <div 
                                     key={index} 
                                     className={`flex justify-between items-center px-4 py-3 ${index % 2 === 0 ? 'bg-white/5' : ''}`}
                                 >
                                     <span className="text-white/90 text-sm md:text-base">{item.label}</span>
                                     <span className="text-white font-medium text-sm md:text-base">
                                         {item.cost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                     </span>
              </div>
                              ))}
            </div>

                         {/* Separator */}
                         <hr className="border-t border-[#8AB73A]/50 my-4 md:my-6" />

                         {/* Total Cost - Use the calculated finalTotalCost */}
                         <div className="flex justify-between items-center px-4 py-3 bg-[#8AB73A]/20 rounded-lg">
                             <span className="text-[#8AB73A] text-lg md:text-xl font-bold">{translations.fields.totalCost}</span>
                             <span className="text-white text-lg md:text-xl font-bold">
                                 {finalTotalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </span>
                              </div>
                            </div>
                </div>
              </div>
            </motion.div>
          );
      })()} {/* End IIFE execution */}

      {step === 9 && (
        <motion.div variants={fadeIn} className="space-y-6 mt-8">
          <div className="bg-white/10 rounded-xl p-5 border border-white/20">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#1e88e5]/20 border border-[#1e88e5]/30">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e88e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                    <line x1="6" y1="6" x2="6.01" y2="6"></line>
                    <line x1="6" y1="18" x2="6.01" y2="18"></line>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">{translations.steps.dcDesign}</h2>
              </div>

              <Button
                onClick={() => {
                  // Get the currently selected UPS model
                  const currentUPS = _dataUpsIt[selectedUpsIndex];
                  
                  navigate('/visualizer', { 
                    state: { 
                      configData: {
                        ...formData,
                        acUnits: calculateACUnits(),
                        acTotalPower: calculateTotalACPower(),
                        itUps: currentUPS, // Use the actually selected UPS instead of the recommended one
                        // Add selected UPS and redundancy info
                        selectedUpsIndex: selectedUpsIndex, 
                        redundancyEnabled: redundancyEnabled,
                        // Keep existing data
                        acUps: formData.backupCooling ? getRecommendedUPSForAC() : null,
                        selectedBattery: batteryOptions.length > 0 ? batteryOptions[selectedBatteryIndex] : null,
                        distributionCabinet: formData.distributionSystem === 'yes' ? _dataDist : null
                      } 
                    } 
                  });
                }}
                className="bg-[#1e88e5] hover:bg-[#1e88e5]/90 text-white flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                  <line x1="6" y1="6" x2="6.01" y2="6"></line>
                  <line x1="6" y1="18" x2="6.01" y2="18"></line>
                </svg>
                Визуализировать конфигурацию
              </Button>
            </div>
            <p className="text-white/70 text-sm mt-2">
              Воспользуйтесь интерактивным инструментом визуализации для планирования размещения оборудования в вашем дата-центре
            </p>
          </div>
        </motion.div>
      )}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6 md:mt-8">
          {step > 0 ? (
            <Button
              onClick={handleBack}
                  className="bg-[#1e88e5]/20 hover:bg-[#1e88e5]/30 text-white border border-[#1e88e5]/50 px-4 md:px-8 py-2 md:py-3 rounded-xl font-semibold transition-all backdrop-blur-sm text-sm md:text-base h-12"
            >
              {translations.buttons.back}
            </Button>
          ) : (
            <div /> 
          )}

              <div className="flex space-x-3 md:space-x-4">
            {step >= 9 && ( // Show buttons on step 9 (Summary) and beyond if any
              <>
                    {/* Return to Site button */}
                <Button
                  onClick={() => navigate('/dashboard')} 
                      className="bg-[#8AB73A]/90 hover:bg-[#8AB73A] text-white px-3 md:px-8 py-2 md:py-3 rounded-xl font-semibold transition-all shadow-lg shadow-[#8AB73A]/20 backdrop-blur-sm text-xs md:text-base h-12"
                >
                      <span className="hidden sm:inline">Вернуться в личный кабинет</span>
                      <span className="sm:hidden">Назад</span>
                </Button>
                    {/* PDF Button */}
              <Button
                onClick={generatePDF}
                      className="bg-[#1e88e5]/90 hover:bg-[#1e88e5] text-white px-3 md:px-8 py-2 md:py-3 rounded-xl font-semibold transition-all shadow-lg shadow-[#1e88e5]/20 backdrop-blur-sm text-xs md:text-base flex items-center space-x-2 h-12"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                      <span className="hidden sm:inline">{translations.buttons.downloadPdf}</span>
                      <span className="sm:hidden">PDF</span>
              </Button>
              </>
            )}
            {step < 9 && ( // Show Next button until step 8 (PNR)
            <Button
              onClick={handleNext}
                    className="bg-[#8AB73A]/90 hover:bg-[#8AB73A] text-white px-5 md:px-8 py-2 md:py-3 rounded-xl font-semibold transition-all shadow-lg shadow-[#8AB73A]/20 backdrop-blur-sm text-sm md:text-base h-12"
            >
              {translations.buttons.next}
            </Button>
          )}
          </div>
            </div>
      </motion.div>
        </div>
      </div>
    </div>
  );
}

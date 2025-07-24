import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { PDUType, _dataAc, _dataBattery, _dataRacks, _dataUpsIt } from "@/utils/configuratorData";

/**
 * Data Center Row Configurator
 * 
 * Allows users to visually build and configure a data center layout with:
 * - Cold/hot aisle configuration with two rows facing each other
 * - Multiple rack types (600mm, 800mm) and equipment modules (UPS, AC, etc.)
 * - Interactive drag-and-drop placement
 * - Realistic visualization with proper scaling
 */

// Visual scaling
const MIN_SCALE = 0.08; // Minimum scale for lots of components
const DEFAULT_SCALE = 0.14; // Default px per mm
const CORRIDOR_MM = 1200;

// Type definitions
interface Module {
  id: string;
  label: string;
  width: number;
  color: string;
  key?: string;
  description?: string;
  image?: string;
  dimensions?: string;
  quantity?: number; // Add quantity property
}

interface RowsState {
  top: Module[];
  bottom: Module[];
}

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

interface DataCenterVisualizerProps {
  onUpdate?: (rows: RowsState) => void;
  initialData?: RowsState | null;
  userProducts?: UserProducts;
  defaultViewMode?: "detailed" | "schematic";
}

// Module definitions - these will be used when no user products are provided
const BASE_MODULES: Module[] = [
  { 
    id: "rack600", 
    label: "Стойка 600 мм", 
    width: 600, 
    color: "bg-gradient-to-b from-blue-500/30 to-blue-600/30 border border-blue-500/50",
    description: "Серверный шкаф шириной 600 мм для размещения серверного оборудования. Каждая стойка включает 2 × PDU."
  },
  { 
    id: "rack800", 
    label: "Стойка 800 мм", 
    width: 800, 
    color: "bg-gradient-to-b from-green-500/30 to-green-600/30 border border-green-500/50",
    description: "Серверный шкаф шириной 800 мм для размещения сетевого оборудования. Каждая стойка включает 2 × PDU."
  },
  { 
    id: "ac300", 
    label: "Кондиционер 300 мм", 
    width: 300, 
    color: "bg-gradient-to-b from-cyan-500/30 to-cyan-600/30 border border-cyan-500/50",
    description: "Прецизионный кондиционер шириной 300 мм для охлаждения серверного помещения."
  },
  { 
    id: "ups", 
    label: "ИБП для ИТ", 
    width: 600, 
    color: "bg-gradient-to-b from-amber-500/30 to-amber-600/30 border border-amber-500/50",
    description: "Источник бесперебойного питания для защиты ИТ-оборудования от проблем с электросетью."
  },
  { 
    id: "acups", 
    label: "ИБП для кондиционирования", 
    width: 600, 
    color: "bg-gradient-to-b from-yellow-500/30 to-yellow-600/30 border border-yellow-500/50",
    description: "Источник бесперебойного питания для системы кондиционирования."
  },
  { 
    id: "battery", 
    label: "Батареи", 
    width: 600, 
    color: "bg-gradient-to-b from-purple-500/30 to-purple-600/30 border border-purple-500/50",
    description: "Батарейные модули для обеспечения автономной работы при отключении электричества."
  },
  { 
    id: "distribution", 
    label: "Шкаф распределения питания", 
    width: 600, 
    color: "bg-gradient-to-b from-indigo-500/30 to-indigo-600/30 border border-indigo-500/50",
    description: "Распределительный шкаф для организации электропитания в дата-центре."
  },
];

// Hard-coded AC dimensions map for quick lookup
const AC_DIMENSIONS_MAP: Record<string, string> = {
  '12.5': '300*1200*2000',
  '25': '300*1200*2000',
  '35-300': '300*1200*2000',
  '35-600': '600*1200*2000',
  '45': '600*1200*2000',
  '60': '600*1200*2000',
  '70': '600*1200*2000',
};

// Helper function to get component dimensions
const getComponentDimensions = (moduleId: string, modelName?: string): string | undefined => {
  // For AC units, lookup from _dataAc
  if (moduleId.includes('ac') && !moduleId.includes('acups') && modelName) {
    console.log(`Getting dimensions for AC unit: ${modelName}`);
    
    // Check if modelName explicitly mentions 300mm or 600mm width
    if (modelName.includes('300 мм') || modelName.includes('(300')) {
      return '300*1200*2000';
    }
    if (modelName.includes('600 мм') || modelName.includes('(600')) {
      return '600*1200*2000';
    }
    
    // Try to extract power value from modelName
    let powerValue = 0;
    try {
      const powerMatch = modelName.match(/\d+(\.\d+)?/);
      powerValue = powerMatch ? parseFloat(powerMatch[0]) : 0;
    } catch (e) {
      console.error("Error parsing AC power in getComponentDimensions:", e);
    }
    
    // Map known models to their widths - based on the dropdown list
    if (modelName.includes('25') || powerValue === 25) {
      return '300*1200*2000'; // 25kW is 300mm wide
    }
    
    if (modelName.includes('12.5') || powerValue === 12.5) {
      return '300*1200*2000'; // 12.5kW is 300mm wide
    }
    
    // Some 35kW models are 300mm, some are 600mm - check for specific model info
    if ((modelName.includes('35') || powerValue === 35) && modelName.includes('300')) {
      return '300*1200*2000'; // 35kW 300mm model
    }
    
    // 45kW, 60kW, 70kW models are all 600mm wide
    if (modelName.includes('45') || powerValue === 45 || 
        modelName.includes('60') || powerValue === 60 || 
        modelName.includes('70') || powerValue === 70) {
      return '600*1200*2000';
    }
    
    // Fallback dimensions based on power for models we don't explicitly recognize
    if (powerValue >= 45) {
      return '600*1200*2000'; // Large units (45kW+)
    } else {
      return '300*1200*2000'; // Small units
    }
  }
  
  // For batteries, lookup from _dataBattery
  if (moduleId.includes('battery') && modelName) {
    const batteryModel = _dataBattery.find(b => modelName.includes(b[0]));
    if (batteryModel) {
      return batteryModel[3]; // Dimensions are in index 3
    }
  }
  
  // For rack600
  if (moduleId.includes('rack600')) {
    return '600*1200*2000'; // Standard server rack dimensions (W*D*H mm)
  }
  
  // For rack800
  if (moduleId.includes('rack800')) {
    return '800*1200*2000'; // Standard server rack dimensions (W*D*H mm)
  }
  
  // For distribution cabinet
  if (moduleId.includes('distribution')) {
    return '600*1000*2000'; // Updated to 600mm width for distribution cabinet
  }
  
  // For UPS units (generic dimensions)
  if (moduleId.includes('ups')) {
    return '600*1000*2000'; // Standard UPS dimensions
  }
  
  return undefined;
};

const DataCenterVisualizer = forwardRef<{ 
  switchToSchematicForCapture: () => Promise<"detailed" | "schematic">; 
  restoreViewMode: (originalMode: "detailed" | "schematic") => void 
}, DataCenterVisualizerProps>(({ 
  onUpdate = () => {},
  initialData = null,
  userProducts,
  defaultViewMode = "schematic" // Default to schematic if not specified
}, ref) => {
  // Add debug logging for AC models data
  console.log("Available AC models in _dataAc:", _dataAc);
  
  // Check if 70kW model exists
  const model70kw = _dataAc.find(ac => ac.power === 70);
  console.log("70kW model exists:", !!model70kw, model70kw);
  
  // State management for the two rows
  const [rows, setRows] = useState<RowsState>(initialData || { 
    top: [], 
    bottom: [] 
  });
  
  // Track available quantities for each module
  const [moduleQuantities, setModuleQuantities] = useState<Record<string, number>>({});
  
  // Track which row is currently being edited
  const [activeRow, setActiveRow] = useState<"top" | "bottom">("top");
  
  // State for hovering module
  const [hoveredModule, setHoveredModule] = useState<Module | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{x: number, y: number, width: number, height: number, rowKey: "top" | "bottom", spaceAbove: number, spaceBelow: number, viewportHeight: number, viewportWidth: number}>({ 
    x: 0, y: 0, width: 0, height: 0, rowKey: "top", spaceAbove: 0, spaceBelow: 0, viewportHeight: 0, viewportWidth: 0 
  });
  
  // State for the module being dragged
  const [draggedModule, setDraggedModule] = useState<Module | null>(null);
  const [dragOrigin, setDragOrigin] = useState<{ row: "top" | "bottom", index: number } | null>(null);
  
  // Visualization scaling based on content
  const [scale, setScale] = useState(DEFAULT_SCALE);
  
  // Use defaultViewMode prop for initial state
  const [viewMode, setViewMode] = useState<"detailed" | "schematic">(defaultViewMode);
  
  // Refs for drag and drop
  const topRowRef = useRef<HTMLDivElement>(null);
  const bottomRowRef = useRef<HTMLDivElement>(null);
  
  // Modal for more details
  const [detailsModule, setDetailsModule] = useState<Module | null>(null);

  // Method to temporarily switch to schematic view for capture
  const switchToSchematicForCapture = () => {
    const currentMode = viewMode;
    // Only switch if not already in schematic mode
    if (currentMode !== "schematic") {
      setViewMode("schematic");
      // Use setTimeout to ensure the DOM has updated before capture
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 100); // Small delay to ensure render completes
      }).then(() => {
        return currentMode; // Return original mode to switch back later
      });
    }
    return Promise.resolve(currentMode);
  };

  // Method to switch back to original view after capture
  const restoreViewMode = (originalMode: "detailed" | "schematic") => {
    setViewMode(originalMode);
  };

  // Expose methods via React useImperativeHandle for parent component access
  useImperativeHandle(ref, () => ({
    switchToSchematicForCapture,
    restoreViewMode
  }), [viewMode]);

  // Define the renderModuleInSchematic function inside the component
  const renderModuleInSchematic = (mod: Module, index: number) => {
    // Different colors based on module type
    let bgColor = 'rgba(59, 130, 246, 0.3)'; // Default blue for racks
    let label = '';
    let borderColor = 'rgba(255, 255, 255, 0.3)'; // Default border
    let specialStyle = {}; // For any additional styling
    
    if (mod.id.includes('rack600')) {
      bgColor = 'rgba(59, 130, 246, 0.3)'; // Blue for rack 600
      label = '600';
    } else if (mod.id.includes('rack800')) {
      bgColor = 'rgba(34, 197, 94, 0.3)'; // Green for rack 800
      label = '800';
    } else if (mod.id.includes('ac') && !mod.id.includes('acups')) {
      bgColor = 'rgba(45, 212, 191, 0.3)'; // Teal for AC
      label = 'AC';
    } else if (mod.id.includes('acups')) {
      bgColor = 'rgba(245, 158, 11, 0.3)'; // Amber for AC UPS
      borderColor = 'rgba(245, 158, 11, 0.6)'; // Stronger amber border
      // Show "AC UPS" instead of model prefix
      label = 'AC UPS';
      // Use a fixed width to ensure consistency
      specialStyle = { 
        minWidth: '80px',
        boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)'
      };
    } else if (mod.id.includes('ups')) {
      bgColor = 'rgba(251, 191, 36, 0.3)'; // Yellow for IT UPS
      label = 'IT UPS';
    } else if (mod.id.includes('battery')) {
      bgColor = 'rgba(168, 85, 247, 0.3)'; // Purple for batteries
      label = 'BAT';
    } else if (mod.id.includes('dist')) {
      bgColor = 'rgba(79, 70, 229, 0.3)'; // Indigo for distribution
      label = 'ШРП';
    }

    // Extract width from dimensions if available
    let moduleWidth = mod.width;
    if (mod.dimensions) {
      const dimensionParts = mod.dimensions.split('*');
      if (dimensionParts.length > 0) {
        // Use the actual width from dimensions
        moduleWidth = parseInt(dimensionParts[0]);
        
        // Handle AC UPS separately to avoid scaling like an AC unit
        if (mod.id.includes('acups')) {
          moduleWidth = 600; // Use standard UPS width instead of AC width
        }
        // Make AC units display a bit larger - minimum width for small AC units
        else if (mod.id.includes('ac') && moduleWidth === 300) {
          moduleWidth = Math.max(350, moduleWidth); // Minimum 350px width for 300mm AC units
        }
      }
    }
    
    // Determine where to put the blue indicator for cold aisle
    const rowKey = rows.top.some(m => m.key === mod.key) ? "top" : "bottom";
    
    return (
      <div
        key={mod.key}
        className="h-20 border rounded-sm flex items-center justify-center text-white/80 text-xs font-medium"
        style={{ 
          width: moduleWidth * scale * 0.8, 
          backgroundColor: bgColor,
          borderColor: borderColor,
          position: 'relative',
          ...specialStyle
        }}
      >
        <div className="text-center text-white/90">{label}</div>
        {/* Add blue cold aisle indicator based on the row */}
        {rowKey === "top" ? 
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[#4cc9f0]"></div> : 
          <div className="absolute inset-x-0 top-0 h-1.5 bg-[#4cc9f0]"></div>
        }
      </div>
    );
  };
  
  // Handler for "Узнать больше" button
  const handleShowDetails = (module: Module) => {
    setDetailsModule(module);
    
    // Create detailed message including dimensions if available
    let detailMessage = `${module.label}\n\n${module.description}`;
    
    // Add dimensions if available
    if (module.dimensions) {
      const dimensions = module.dimensions.split('*');
      detailMessage += `\n\nРазмеры (Ш×Г×В):\n`;
      detailMessage += `Ширина: ${dimensions[0]} мм\n`;
      detailMessage += `Глубина: ${dimensions[1]} мм\n`;
      detailMessage += `Высота: ${dimensions[2]} мм`;
    }
    
    // Display in alert for now - in a real app this could trigger a modal
    alert(detailMessage);
  };
  
  // Automatically adjust scale to fit content
  useEffect(() => {
    const calculateScale = () => {
      const lengthTop = rows.top.reduce((s, m) => s + m.width, 0);
      const lengthBottom = rows.bottom.reduce((s, m) => s + m.width, 0);
      const maxLength = Math.max(lengthTop, lengthBottom, CORRIDOR_MM);
      
      // Get container width
      const container = document.querySelector('.dc-visualizer-container');
      if (!container) return DEFAULT_SCALE;
      
      const containerWidth = (container as HTMLElement).clientWidth - 48; // Subtract padding
      
      // Calculate required scale to fit all components
      let newScale = (containerWidth / maxLength);
      
      // Ensure scale is within reasonable bounds
      newScale = Math.max(MIN_SCALE, Math.min(DEFAULT_SCALE, newScale));
      
      return newScale;
    };
    
    const handleResize = () => {
      setScale(calculateScale());
    };
    
    // Set initial scale
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [rows.top, rows.bottom]);

  // Generate modules based on user's selected products
  const [modules, setModules] = useState<Module[]>(BASE_MODULES);

  // Update modules when userProducts change
  useEffect(() => {
    if (userProducts) {
      const productModules: Module[] = [];
      const quantities: Record<string, number> = {};
      
      // Add racks
      if (userProducts.racks600 > 0) {
        const quantity = userProducts.racks600;
        quantities["rack600"] = quantity;
        productModules.push({
          id: "rack600",
          label: `Стойка 600 мм (${quantity})`,
          width: 600,
          color: "bg-gradient-to-b from-blue-500/30 to-blue-600/30 border border-blue-500/50",
          description: `Серверный шкаф шириной 600 мм для размещения серверного оборудования. Каждая стойка оснащена 2 × PDU типа ${userProducts.pduType}.`,
          dimensions: '600*1200*2000',
          quantity: quantity
        });
      }
      
      if (userProducts.racks800 > 0) {
        const quantity = userProducts.racks800;
        quantities["rack800"] = quantity;
        productModules.push({
          id: "rack800",
          label: `Стойка 800 мм (${quantity})`,
          width: 800,
          color: "bg-gradient-to-b from-green-500/30 to-green-600/30 border border-green-500/50",
          description: `Серверный шкаф шириной 800 мм для размещения сетевого оборудования. Каждая стойка оснащена 2 × PDU типа ${userProducts.pduType}.`,
          dimensions: '800*1200*2000',
          quantity: quantity
        });
      }
      
      // Add cooling units (only show larger models, not the 300mm)
      if (userProducts.acModel && userProducts.acUnits > 0 && !userProducts.acModel.includes('300')) {
        // Extract width from model (usually 300mm or 600mm)
        const acWidth = userProducts.acModel.includes('300') ? 300 : 600;
        
        // Get power value from model name or number
        let acPower = 0;
        try {
          acPower = parseInt(userProducts.acModel.match(/\d+(\.\d+)?/)?.[0] || '0');
        } catch (e) {
          console.error("Error parsing AC power:", e);
        }
        
        console.log(`Looking for AC unit with power: ${acPower}kW, model: ${userProducts.acModel}`);
        
        // Find dimensions from hardcoded map first
        let dimensions = AC_DIMENSIONS_MAP[userProducts.acModel] || '';
        
        // Special case for 70kW model
        if (acPower === 70 || userProducts.acModel.includes('70')) {
          dimensions = '600*1200*2000';
          console.log("Special case: 70kW AC unit, using dimensions:", dimensions);
        } else if (!dimensions) {
          // Try finding in _dataAc
          const acModelData = _dataAc.find(ac => Math.abs(ac.power - acPower) < 0.1);
          dimensions = acModelData?.dimensions || '';
          
          // Fallback dimensions based on power if still not found
          if (!dimensions) {
            if (acPower >= 60) {
              dimensions = '600*1200*2000'; // Default for large units (60kW+)
            } else if (acPower >= 30) {
              dimensions = '600*1200*2000'; // Default for medium units (30-60kW)
            } else {
              dimensions = '300*1200*2000'; // Default for small units
            }
            console.log(`Using fallback dimensions for ${acPower}kW AC unit: ${dimensions}`);
          } else {
            console.log(`Found dimensions for ${acPower}kW AC unit in _dataAc: ${dimensions}`);
          }
        }
        
        const quantity = userProducts.acUnits;
        quantities["ac"] = quantity;
        productModules.push({
          id: "ac",
          label: `Кондиционер ${userProducts.acModel} (${quantity})`,
          width: acWidth,
          color: "bg-gradient-to-b from-cyan-500/30 to-cyan-600/30 border border-cyan-500/50",
          description: `Прецизионный кондиционер ${userProducts.acModel} для охлаждения серверного помещения. Установлено ${userProducts.acUnits} блоков. Общая мощность: ${userProducts.acTotalPower} кВт.`,
          dimensions: dimensions,
          quantity: quantity
        });
        
        console.log("Created AC module with dimensions:", dimensions);
      }
      
      // Add UPS for IT equipment
      if (userProducts.itUps) {
        // Get the correct UPS model - use selected UPS index if available
        const selectedUps = userProducts.selectedUpsIndex !== undefined && 
          userProducts.selectedUpsIndex >= 0 && 
          userProducts.selectedUpsIndex < _dataUpsIt.length
            ? _dataUpsIt[userProducts.selectedUpsIndex]
            : userProducts.itUps;
        
        // When 2N redundancy is enabled, set quantity to 2, otherwise 1
        const quantity = userProducts.redundancyEnabled ? 2 : 1;
        quantities["ups"] = quantity;
        productModules.push({
          id: "ups",
          label: `ИБП для ИТ: ${selectedUps.model} ${userProducts.redundancyEnabled ? '(2N: 2x)' : '(1x)'}`,
          width: 600, // Standard width
          color: "bg-gradient-to-b from-amber-500/30 to-amber-600/30 border border-amber-500/50",
          description: selectedUps.description || "Источник бесперебойного питания для защиты оборудования от проблем с электросетью.",
          dimensions: '600*1000*2000', // Standard dimensions for UPS
          quantity: quantity
        });
      }

      // Add UPS for cooling equipment (if configured)
      if (userProducts.acUps) {
        const quantity = 1;
        quantities["acups"] = quantity;
        productModules.push({
          id: "acups",
          label: `ИБП для кондиционирования: ${userProducts.acUps.model} (${quantity})`,
          width: 600, // Standard width
          color: "bg-gradient-to-b from-yellow-500/30 to-yellow-600/30 border border-yellow-500/50",
          description: `Источник бесперебойного питания для системы кондиционирования, мощность: ${userProducts.acUps.power} кВт.`,
          dimensions: '600*1000*2000', // Standard dimensions for UPS
          quantity: quantity
        });
      }
      
      // Add power distribution cabinet if configured
      if (userProducts.distributionCabinet) {
        const quantity = 1;
        quantities["distribution"] = quantity;
        productModules.push({
          id: "distribution",
          label: `${userProducts.distributionCabinet.name} (${quantity})`,
          width: 600, // Updated width for a cabinet
          color: "bg-gradient-to-b from-indigo-500/30 to-indigo-600/30 border border-indigo-500/50",
          description: `Шкаф распределения питания. ${userProducts.distributionCabinet.type || ''}`,
          dimensions: '600*1000*2000', // Updated dimensions
          quantity: quantity
        });
      }
      
      // Add generic modules to ensure all options are available
      // Removed battery and ac300 from baseModuleTypes
      const baseModuleTypes = ['rack600', 'rack800', 'ups', 'acups', 'distribution'];
      baseModuleTypes.forEach(type => {
        if (!productModules.some(m => m.id.startsWith(type.substring(0, 3)))) {
          const baseModule = BASE_MODULES.find(m => m.id === type);
          if (baseModule) {
            // Default quantity for generic modules
            const quantity = 1;
            quantities[type] = quantity;
            // Add dimensions to the base modules if needed
            const dimensionBaseModule = {
              ...baseModule,
              dimensions: getComponentDimensions(baseModule.id),
              quantity: quantity,
              label: `${baseModule.label} (${quantity})`
            };
            productModules.push(dimensionBaseModule);
          }
        }
      });
      
      setModules(productModules);
      setModuleQuantities(quantities);
    } else {
      // Filter out battery and ac300 modules when setting default modules
      const filteredModules = BASE_MODULES.filter(
        module => module.id !== 'battery' && module.id !== 'ac300'
      ).map(module => {
        const quantity = 1;
        return {
          ...module,
          dimensions: getComponentDimensions(module.id),
          quantity: quantity,
          label: `${module.label} (${quantity})`
        };
      });
      
      // Set default quantities
      const defaultQuantities: Record<string, number> = {};
      filteredModules.forEach(module => {
        defaultQuantities[module.id] = 1;
      });
      
      setModules(filteredModules);
      setModuleQuantities(defaultQuantities);
    }
  }, [userProducts]);

  // Update parent component when layout changes
  useEffect(() => {
    onUpdate(rows);
  }, [rows, onUpdate]);

  // Helper function to update a specific row
  const mutateRow = (rowKey: "top" | "bottom", updater: (prev: Module[]) => Module[]) => 
    setRows(prev => ({ ...prev, [rowKey]: updater(prev[rowKey]) }));

  // Add a new module to the active row
  const addModule = (tpl: Module) => {
    // Check if there are available modules of this type
    const moduleId = tpl.id;
    const currentQuantity = moduleQuantities[moduleId] || 0;
    
    if (currentQuantity <= 0) {
      return; // Can't add more of this module type
    }
    
    // For IT UPS, always add one unit at a time.
    // The `tpl.quantity` might reflect the total in a 2N pair from initial setup,
    // but `moduleQuantities[moduleId]` is the source of truth for what's left to place.
    const quantityToPlace = 1; // Always place one visual unit

    // Decrease available quantity by one
    setModuleQuantities(prev => ({
      ...prev,
      [moduleId]: prev[moduleId] - quantityToPlace
    }));
    
    // Update the label of the main button in "Доступные модули"
    const newAvailableQuantity = currentQuantity - quantityToPlace;
    const updatedModules = modules.map(m => {
      if (m.id === moduleId) {
        let newLabel = m.label;
        // Update the count in the label, e.g., "ИБП для ИТ: MODEL (2N: 1x)" or "ИБП для ИТ (0)"
        if (moduleId === "ups" && userProducts?.itUps) {
          const baseLabel = `ИБП для ИТ: ${userProducts.itUps.model}`;
          if (userProducts.redundancyEnabled) {
            newLabel = `${baseLabel} (2N: ${newAvailableQuantity > 0 ? newAvailableQuantity + 'x' : 'все размещены'})`;
          } else {
            newLabel = `${baseLabel} (${newAvailableQuantity > 0 ? newAvailableQuantity + 'x' : 'все размещены'})`;
          }
        } else {
          // Generic label update for other modules
          newLabel = m.label.replace(/\(\d+\)/, `(${newAvailableQuantity})`);
          if (newAvailableQuantity === 0) {
             newLabel = m.label.replace(/\(\d+\)/, '(все размещены)');
          }
        }
        return {
          ...m,
          label: newLabel,
          quantity: newAvailableQuantity // This refers to remaining available in palette
        };
      }
      return m;
    });
    setModules(updatedModules);
    
    // Determine the label for the placed module
    let placedModuleLabel = tpl.label.split('(')[0].trim(); // Get base label
    if (moduleId === "ups" && userProducts?.redundancyEnabled) {
      // If 2N, and 2 were initially available, this is UPS 1. If 1 was available, this is UPS 2.
      // This assumes initial tpl.quantity for a 2N UPS was 2.
      const originalTotalFor2N = modules.find(m => m.id === 'ups')?.quantity === 2 || userProducts.itUps.model === tpl.label.split(': ')[1].split(' ')[0] && tpl.quantity ===2; // Check original config
      if (currentQuantity === 2) { // This is the first of a 2N pair being placed
        placedModuleLabel = `${userProducts.itUps.model} (2N: UPS 1)`;
      } else if (currentQuantity === 1 && originalTotalFor2N) { // This is the second of a 2N pair
        placedModuleLabel = `${userProducts.itUps.model} (2N: UPS 2)`;
      }
      // If not 2N or not the specific 2N scenario, it's a single UPS or other module
    }

    mutateRow(activeRow, prev => [
      ...prev, 
      { ...tpl, label: placedModuleLabel, key: crypto.randomUUID(), quantity: 1 } // quantity here is for the placed item, always 1
    ]);
  };

  // Remove a module from a row and return it to available modules
  const remove = (rowKey: "top" | "bottom", key: string) => {
    // Find the module to remove first
    const moduleToRemove = rows[rowKey].find(m => m.key === key);
    if (!moduleToRemove) return;
    
    const baseModuleId = moduleToRemove.id.startsWith("ups") ? "ups" : moduleToRemove.id;

    // Increase available quantity for this module type
    const newAvailableQuantityAfterRemove = (moduleQuantities[baseModuleId] || 0) + 1;
    setModuleQuantities(prev => ({
      ...prev,
      [baseModuleId]: newAvailableQuantityAfterRemove
    }));
    
    // Update module label in the palette to reflect new available quantity
    const updatedPaletteModules = modules.map(m => {
      if (m.id === baseModuleId) {
        let newLabel = m.label;
        if (baseModuleId === "ups" && userProducts?.itUps) {
          const baseLabel = `ИБП для ИТ: ${userProducts.itUps.model}`;
          if (userProducts.redundancyEnabled) {
            // Max for 2N is 2. If 1 is available, label is (2N: 1x). If 2, (2N: 2x)
            newLabel = `${baseLabel} (2N: ${newAvailableQuantityAfterRemove}x)`; 
          } else {
            // Max for 1N is 1. If 1 is available, label is (1x)
            newLabel = `${baseLabel} (${newAvailableQuantityAfterRemove > 0 ? newAvailableQuantityAfterRemove + 'x' : '1x'})`; 
          }
        } else {
          // Generic label update for other modules
          newLabel = m.label.replace(/\((все размещены|\d+)\)?/, `(${newAvailableQuantityAfterRemove})`);
        }
        return {
          ...m,
          label: newLabel,
          quantity: newAvailableQuantityAfterRemove // This is the new total available in palette
        };
      }
      return m;
    });
    setModules(updatedPaletteModules);
    
    // Remove the module from the row
    mutateRow(rowKey, prev => prev.filter(m => m.key !== key));
  };

  // Clear all modules from both rows
  const clearAll = () => {
    // Get all modules that need to be returned to inventory
    const allModules = [...rows.top, ...rows.bottom];
    
    // Count modules by their ID type
    const modulesToRestore: Record<string, number> = {};
    allModules.forEach(module => {
      const moduleId = module.id;
      modulesToRestore[moduleId] = (modulesToRestore[moduleId] || 0) + 1;
    });
    
    // Add these back to available quantities
    if (Object.keys(modulesToRestore).length > 0) {
      // Update quantities and module labels in one go to avoid race conditions
      setModuleQuantities(prevQuantities => {
        const updatedQuantities = { ...prevQuantities };
        
        // Update quantities
        Object.entries(modulesToRestore).forEach(([id, count]) => {
          updatedQuantities[id] = (updatedQuantities[id] || 0) + count;
        });
        
        // Now update module labels using the updated quantities
        setModules(prevModules => 
          prevModules.map(m => {
            if (modulesToRestore[m.id]) {
              const newQuantity = updatedQuantities[m.id];
              // Use regex that safely handles labels with or without quantities
              const updatedLabel = m.label.replace(/\s*\(\d+\)$/, '') + ` (${newQuantity})`;
              
              return {
                ...m,
                label: updatedLabel,
                quantity: newQuantity
              };
            }
            return m;
          })
        );
        
        return updatedQuantities;
      });
    }
    
    // Clear the rows
    setRows({ top: [], bottom: [] });
  };

  // Drag and drop handlers
  const handleDragStart = (rowKey: "top" | "bottom", module: Module, index: number) => {
    setDraggedModule(module);
    setDragOrigin({ row: rowKey, index });
  };
  
  const handleDragOver = (e: React.DragEvent, rowKey: "top" | "bottom") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: React.DragEvent, rowKey: "top" | "bottom") => {
    e.preventDefault();
    
    if (!draggedModule || !dragOrigin) return;
    
    // If dropping in the same row
    if (dragOrigin.row === rowKey) {
      // Determine drop position based on mouse position
      const rowElement = rowKey === "top" ? topRowRef.current : bottomRowRef.current;
      if (!rowElement) return;
      
      const rect = rowElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const rowWidth = rect.width;
      
      // Calculate approximate position based on mouse X
      // This is a simple approach; for more accuracy you'd need to consider actual element positions
      const dropPosition = Math.floor((mouseX / rowWidth) * rows[rowKey].length);
      
      // Move the module to the new position
      const newRows = { ...rows };
      const draggedItem = { ...draggedModule };
      
      const filtered = newRows[rowKey].filter((_, i) => i !== dragOrigin.index);
      
      // Ensure position is valid
      const insertPosition = Math.min(dropPosition, filtered.length);
      
      filtered.splice(insertPosition, 0, draggedItem);
      newRows[rowKey] = filtered;
      
      setRows(newRows);
    } else {
      // Moving between rows
      const newRows = { ...rows };
      
      // Remove from origin row
      newRows[dragOrigin.row] = newRows[dragOrigin.row].filter((_, i) => i !== dragOrigin.index);
      
      // Add to target row
      newRows[rowKey].push({ ...draggedModule });
      
      setRows(newRows);
    }
    
    // Clear drag state
    setDraggedModule(null);
    setDragOrigin(null);
  };

  // Render a single row of modules
  const renderRow = (rowKey: "top" | "bottom") => (
    <div 
      ref={rowKey === "top" ? topRowRef : bottomRowRef}
      className={`flex items-end gap-1 ${rowKey === "top" ? "flex-row" : ""} relative`}
      onDragOver={(e) => handleDragOver(e, rowKey)}
      onDrop={(e) => handleDrop(e, rowKey)}
    >
      <AnimatePresence initial={false}>
        {rows[rowKey].map((mod, index) => {
          // Extract width from dimensions if available
          let moduleWidth = mod.width;
          if (mod.dimensions) {
            const dimensionParts = mod.dimensions.split('*');
            if (dimensionParts.length > 0) {
              // Use the actual width from dimensions
              moduleWidth = parseInt(dimensionParts[0]);
              
              // Handle AC UPS separately to avoid scaling like an AC unit
              if (mod.id.includes('acups')) {
                moduleWidth = 600; // Use standard UPS width instead of AC width
              }
              // Make AC units display a bit larger - minimum width for small AC units
              else if (mod.id.includes('ac') && moduleWidth === 300) {
                moduleWidth = Math.max(350, moduleWidth); // Minimum 350px width for 300mm AC units
              }
            }
          }
          
          // Create a display label - replace "Кондиционер" with "AC" for better fit
          let displayLabel = mod.label;
          if (mod.id.includes('ac') && !mod.id.includes('acups')) {
            displayLabel = displayLabel.replace('Кондиционер', 'AC');
          }
          
          return (
            <motion.div
              key={mod.key}
              exit={{ opacity: 0, y: 20 }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`relative h-36 ${mod.color} rounded-sm shadow-md flex flex-col justify-between backdrop-blur-sm cursor-grab active:cursor-grabbing hover:shadow-lg transition-shadow duration-300 group`}
              style={{ 
                width: moduleWidth * scale
              }}
              draggable
              onDragStart={(e) => handleDragStart(rowKey, mod, index)}
              onMouseEnter={(e) => {
                setHoveredModule(mod);
                const rect = e.currentTarget.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                
                // Calculate if there's enough space above or below
                const spaceAbove = rect.top;
                const spaceBelow = viewportHeight - (rect.top + rect.height);
                
                setHoverPosition({ 
                  x: rect.left,
                  y: rect.top,
                  width: rect.width,
                  height: rect.height,
                  rowKey: rowKey,
                  spaceAbove,
                  spaceBelow,
                  viewportHeight,
                  viewportWidth
                });
              }}
              onMouseMove={(e) => {
                if (hoveredModule?.key === mod.key) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const viewportHeight = window.innerHeight;
                  const viewportWidth = window.innerWidth;
                  
                  // Calculate if there's enough space above or below
                  const spaceAbove = rect.top;
                  const spaceBelow = viewportHeight - (rect.top + rect.height);
                  
                  setHoverPosition({ 
                    x: rect.left,
                    y: rect.top,
                    width: rect.width, 
                    height: rect.height,
                    rowKey: rowKey,
                    spaceAbove,
                    spaceBelow,
                    viewportHeight,
                    viewportWidth
                  });
                }
              }}
              onMouseLeave={() => setHoveredModule(null)}
            >
              <span className={`text-xs text-center mt-1 select-none text-white font-medium`}>
                {displayLabel}
              </span>
              
              <div className="flex justify-between px-1 pb-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 bg-white/10 hover:bg-white/20 rounded-full"
                  onClick={() => remove(rowKey, mod.key || "")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  // Calculate total length/width of each row
  const lengthTop = rows.top.reduce((s, m) => s + m.width, 0);
  const lengthBottom = rows.bottom.reduce((s, m) => s + m.width, 0);

  // Render buttons for available modules with quantity information
  const renderModuleButtons = () => {
    return modules.map((tpl) => {
      const quantity = moduleQuantities[tpl.id] || 0;
      const isDisabled = quantity <= 0;
      
      return (
        <Button 
          key={tpl.id} 
          onClick={() => addModule(tpl)} 
          className={`whitespace-nowrap ${
            isDisabled 
              ? 'bg-gray-500/50 text-white/50 cursor-not-allowed border border-white/10' 
              : 'bg-[#0A2B6C]/80 hover:bg-[#0A2B6C] text-white border border-white/10'
          }`}
          disabled={isDisabled}
        >
          {tpl.label}
        </Button>
      );
    });
  };

  return (
    <div className="space-y-6 bg-gradient-to-br from-[#0A2B6C]/60 to-[#102b5c]/80 backdrop-blur-md rounded-xl border border-white/10 shadow-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          Визуализация дата-центра
        </h2>
        
        <div className="flex items-center space-x-3">
          {/* View mode toggle */}
          <div className="flex items-center bg-[#0A2B6C]/60 rounded-lg border border-white/10 p-1">
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === "detailed" 
                  ? "bg-[#1e88e5]/80 text-white" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Детальный
            </button>
            <button
              onClick={() => setViewMode("schematic")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === "schematic" 
                  ? "bg-[#1e88e5]/80 text-white" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Схема
            </button>
          </div>
          
          <span className="text-white/80 text-sm">Масштаб:</span>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setScale(prev => Math.max(MIN_SCALE, prev - 0.01))}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setScale(DEFAULT_SCALE)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setScale(prev => Math.min(DEFAULT_SCALE * 1.5, prev + 0.01))}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="text-white/70 text-sm bg-white/5 p-3 rounded-lg">
        <p>Перетаскивайте компоненты мышью для изменения их расположения. Наведите на компонент для подробной информации.</p>
      </div>

      {/* Global hover card positioned relative to the component */}
      {hoveredModule && (
        <div 
          className="fixed bg-[#0A2B6C] rounded-lg shadow-2xl border border-white/20 p-3 z-[9999] w-72 animate-in fade-in duration-200"
          style={{ 
            // Horizontal positioning - center with the component
            left: Math.max(10, Math.min(hoverPosition.viewportWidth - 290, hoverPosition.x + (hoverPosition.width / 2) - 140)), // 280/2 = 140 (half the width of card)
            
            // Vertical positioning - adjust based on row and available space
            top: hoverPosition.rowKey === "top" 
              ? hoverPosition.y + hoverPosition.height + 10 // Top row: below component
              : hoverPosition.y - 140, // Bottom row: above component
            
            pointerEvents: "none" 
          }}
        >
          <h3 className="text-sm font-bold text-white mb-1">{hoveredModule.label}</h3>
          <p className="text-xs text-white/80 mb-2">{hoveredModule.description}</p>
          
          {(hoveredModule.dimensions || hoveredModule.id.includes('ac')) && (
            <div className="bg-[#1C3D80] rounded px-3 py-2 mb-2">
              <p className="text-xs text-white font-medium mb-1">Размеры (Ш×Г×В):</p>
              <div className="flex justify-between items-center">
                {(hoveredModule.dimensions || '600*1200*2000').split('*').map((dimension, index) => (
                  <div key={index} className="text-center">
                    <span className="text-white/80 text-xs">{index === 0 ? 'Ш' : index === 1 ? 'Г' : 'В'}</span>
                    <p className="text-sm text-white font-bold">{dimension} <span className="text-xs font-normal">мм</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-2">
            <button 
              className="text-[#8AB73A] hover:text-white hover:bg-[#8AB73A]/20 py-1 px-2 text-xs font-medium transition-colors rounded cursor-pointer pointer-events-auto"
              onClick={() => handleShowDetails(hoveredModule)}
            >
              Узнать больше
            </button>
          </div>
        </div>
      )}

      {/* Quick-add suggestion for user's configured products */}
      {userProducts && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-6">
          <h3 className="font-medium text-white mb-3">Быстрое добавление из вашей конфигурации:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={() => {
                // Add rack600 modules to top row
                if (userProducts.racks600 > 0) {
                  const rack600Module = modules.find(m => m.id === "rack600");
                  if (rack600Module) {
                    const newRows = { ...rows };
                    for (let i = 0; i < Math.min(userProducts.racks600, 5); i++) {
                      newRows.top.push({ ...rack600Module, key: crypto.randomUUID() });
                    }
                    setRows(newRows);
                  }
                }
              }}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              disabled={userProducts.racks600 === 0}
            >
              Добавить стойки 600мм в верхний ряд
            </Button>
            <Button 
              onClick={() => {
                // Add rack800 modules to bottom row
                if (userProducts.racks800 > 0) {
                  const rack800Module = modules.find(m => m.id === "rack800");
                  if (rack800Module) {
                    const newRows = { ...rows };
                    for (let i = 0; i < Math.min(userProducts.racks800, 5); i++) {
                      newRows.bottom.push({ ...rack800Module, key: crypto.randomUUID() });
                    }
                    setRows(newRows);
                  }
                }
              }}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              disabled={userProducts.racks800 === 0}
            >
              Добавить стойки 800мм в нижний ряд
            </Button>
          </div>
        </div>
      )}

      {/* Row selector & module palette */}
      <div className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Label className="text-lg font-semibold text-white/90 flex items-center">Активный ряд:</Label>
          <div className="flex gap-2">
            <Button 
              variant={activeRow === "top" ? "default" : "outline"} 
              onClick={() => setActiveRow("top")}
              className={activeRow === "top" ? "bg-[#1e88e5] hover:bg-[#1e88e5]/90" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
            >
              Верхний ряд
            </Button>
            <Button 
              variant={activeRow === "bottom" ? "default" : "outline"} 
              onClick={() => setActiveRow("bottom")}
              className={activeRow === "bottom" ? "bg-[#1e88e5] hover:bg-[#1e88e5]/90" : "bg-white/10 border-white/20 text-white hover:bg-white/20"}
            >
              Нижний ряд
            </Button>
          </div>
          
          <div className="ml-auto">
            <Button 
              variant="destructive" 
              onClick={clearAll}
              className="bg-red-500/80 hover:bg-red-600 text-white"
              size="sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              </svg>
              Очистить всё
            </Button>
          </div>
        </div>
        
        <div>
          <Label className="text-lg font-semibold text-white/90 flex items-center mb-3">Доступные модули:</Label>
          <div className="flex gap-2 flex-wrap">
            {renderModuleButtons()}
          </div>
        </div>
      </div>

      {/* Visualization - Conditional rendering based on view mode */}
      {viewMode === "detailed" ? (
        <Card className="bg-[#0A2B6C]/40 border-white/10 relative">
          <CardContent className="overflow-x-auto p-6 space-y-6 dc-visualizer-container" style={{ minHeight: "300px", overflow: "visible" }}>
            {/* Row labels for clarity */}
            <div className="flex justify-between mb-1 px-2 text-xs text-white/70">
              <span>Фронтальная сторона (вход холодного воздуха)</span>
            </div>
          
            {/* Top row (front side) with extra padding */}
            <div className="pt-4 pb-6 relative">
              {renderRow("top")}
              
              {/* Top row cooling indicators */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center">
                {Array.from({ length: Math.max(3, Math.min(8, rows.top.length)) }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center pb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce-slow">
                      <path d="M12 5v14"></path>
                      <path d="m19 12-7 7-7-7"></path>
                    </svg>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Cold Aisle - more prominent */}
            <div className="relative">
              <div
                className="border-2 border-[#4cc9f0] border-dashed h-12 flex items-center justify-center text-sm text-white rounded-md bg-[#4cc9f0]/10 w-full"
                style={{ minWidth: Math.max(lengthTop, lengthBottom, CORRIDOR_MM) * scale }}
              >
                <span className="font-medium">Холодный коридор 1200 мм</span>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#4cc9f0]/20 rounded-full p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3s-1.5-2-1.5-3.5a2.5 2.5 0 0 1 5 0c0 1.38-.5 2-1 3s-1.5 2-1.5 3.5a2.5 2.5 0 0 0 2.5 2.5"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Bottom row (front side) with extra padding */}
            <div className="pt-6 pb-4 relative">
              {/* Bottom row cooling indicators */}
              <div className="absolute top-0 left-0 right-0 flex justify-around items-center">
                {Array.from({ length: Math.max(3, Math.min(8, rows.bottom.length)) }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center pt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce-slow">
                      <path d="M12 19V5"></path>
                      <path d="m5 12 7-7 7 7"></path>
                    </svg>
                  </div>
                ))}
              </div>
              
              {renderRow("bottom")}
            </div>
            
            {/* Row labels for clarity */}
            <div className="flex justify-between mt-1 px-2 text-xs text-white/70">
              <span>Фронтальная сторона (вход холодного воздуха)</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Schematic View - Simpler representation */
        <Card className="bg-[#0A2B6C]/40 border-white/10 relative">
          <CardContent className="overflow-x-auto overflow-y-visible p-6 dc-visualizer-container" style={{ minHeight: "300px" }}>
            {/* Capturable area - red border removed */}
            <div id="schematicCapture" className="rounded-xl p-5">
              {/* Legend */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-2">Легенда:</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[rgba(59,130,246,0.3)] border border-white/20"></div>
                    <span className="text-white/80">Стойка 600мм (2×PDU)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[rgba(34,197,94,0.3)] border border-white/20"></div>
                    <span className="text-white/80">Стойка 800мм (2×PDU)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[rgba(45,212,191,0.3)] border border-white/20"></div>
                    <span className="text-white/80" title={userProducts?.acModel ? `Модель: ${userProducts.acModel}` : ''}>
                      Кондиционер{userProducts?.acModel ? ` (${userProducts.acModel})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[rgba(251,191,36,0.3)] border border-white/20"></div>
                    <span className="text-white/80" title={userProducts?.itUps?.model ? `Модель: ${userProducts.itUps.model}` : ''}>
                      ИБП для ИТ{userProducts?.itUps?.model ? ` (${userProducts.itUps.model})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[rgba(245,158,11,0.3)] border border-[rgba(245,158,11,0.6)]"></div>
                    <span className="text-white/80" title={userProducts?.acUps?.model ? `Модель: ${userProducts.acUps.model}` : ''}>
                      ИБП для АС{userProducts?.acUps?.model ? ` (${userProducts.acUps.model})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[rgba(168,85,247,0.3)] border border-white/20"></div>
                    <span className="text-white/80">Батареи (авто)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[rgba(79,70,229,0.3)] border border-white/20"></div>
                    <span className="text-white/80">Шкаф распределения</span>
                  </div>
                </div>
                <div className="mt-2 text-white/70 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-1 bg-[#4cc9f0]"></div>
                    <span>Синяя полоса указывает на сторону, обращенную к холодному коридору</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center space-y-8">
                {/* Top row schematic */}
                <div className="relative w-full">
                  <div className="flex gap-1 justify-center">
                    {rows.top.map((mod, index) => renderModuleInSchematic(mod, index))}
                  </div>
                  
                  {/* Air flow arrows */}
                  <div className="absolute -bottom-6 inset-x-0 flex justify-center">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14"></path>
                        <path d="m19 12-7 7-7-7"></path>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14"></path>
                        <path d="m19 12-7 7-7-7"></path>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14"></path>
                        <path d="m19 12-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Cold aisle */}
                <div 
                  className="border-2 border-[#4cc9f0] border-dashed h-10 flex items-center justify-center text-sm text-white font-medium bg-[#4cc9f0]/10 rounded-md px-4"
                  style={{ width: Math.max(lengthTop, lengthBottom, CORRIDOR_MM) * scale * 0.8 }}
                >
                  Закрытый холодный коридор
                </div>
                
                {/* Bottom row schematic */}
                <div className="relative w-full">
                  {/* Air flow arrows */}
                  <div className="absolute -top-6 inset-x-0 flex justify-center">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19V5"></path>
                        <path d="m5 12 7-7 7 7"></path>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19V5"></path>
                        <path d="m5 12 7-7 7 7"></path>
                      </svg>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4cc9f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19V5"></path>
                        <path d="m5 12 7-7 7 7"></path>
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 justify-center">
                    {rows.bottom.map((mod, index) => renderModuleInSchematic(mod, index))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="text-white space-y-3 bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="font-semibold mb-3">Конфигурация дата-центра:</h3>
        
        {/* Layout information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white/80">Параметры размещения:</h4>
            <div className="space-y-2 bg-white/5 p-3 rounded-md">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-sm bg-blue-500/30 border border-blue-500/50 mr-2"></div>
                <div>Верхний ряд: {lengthTop} мм (модулей: {rows.top.length})</div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-sm bg-green-500/30 border border-green-500/50 mr-2"></div>
                <div>Нижний ряд: {lengthBottom} мм (модулей: {rows.bottom.length})</div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-sm bg-white/30 border border-white/50 mr-2"></div>
                <div>Общая длина: {Math.max(lengthTop, lengthBottom)} мм</div>
              </div>
            </div>
          </div>
          
          {/* Component breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white/80">Размещенные компоненты:</h4>
            <div className="space-y-2 bg-white/5 p-3 rounded-md">
              {/* Count each type of component */}
              {(() => {
                // Count all components by type
                const allRows = [...rows.top, ...rows.bottom];
                const componentCounts: Record<string, number> = {};
                
                allRows.forEach(module => {
                  const type = module.id.replace(/[0-9]/g, ''); // Strip numbers
                  componentCounts[type] = (componentCounts[type] || 0) + 1;
                });
                
                // Display component counts
                return (
                  <div className="space-y-1.5 text-sm">
                    {componentCounts['rack'] && (
                      <div className="flex justify-between">
                        <span>Серверные стойки:</span>
                        <span className="font-medium">{componentCounts['rack']}</span>
                      </div>
                    )}
                    {componentCounts['ac'] && (
                      <div className="flex justify-between">
                        <span>Блоки кондиционирования:</span>
                        <span className="font-medium">{componentCounts['ac']}</span>
                      </div>
                    )}
                    {componentCounts['ups'] && (
                      <div className="flex justify-between">
                        <span>ИБП для ИТ:</span>
                        <span className="font-medium">{componentCounts['ups']}</span>
                      </div>
                    )}
                    {componentCounts['acups'] && (
                      <div className="flex justify-between">
                        <span>ИБП для кондиционирования{userProducts?.acUps?.model ? ` (${userProducts.acUps.model})` : ''}:</span>
                        <span className="font-medium">{componentCounts['acups']}</span>
                      </div>
                    )}
                    {componentCounts['battery'] && (
                      <div className="flex justify-between">
                        <span>Батарейные модули:</span>
                        <span className="font-medium">{componentCounts['battery']}</span>
                      </div>
                    )}
                    {/* Show battery from user configuration even if not placed in visualization */}
                    {!componentCounts['battery'] && userProducts?.battery && (
                      <div className="flex justify-between text-white/60">
                        <span>Батарейные модули:</span>
                        <span className="font-medium">Авто-конфигурация</span>
                      </div>
                    )}
                    {componentCounts['distribution'] && (
                      <div className="flex justify-between">
                        <span>Шкафы распределения:</span>
                        <span className="font-medium">{componentCounts['distribution']}</span>
                      </div>
                    )}
                    {/* PDU info - now included with racks */}
                    {(componentCounts['rack'] > 0) && (
                      <div className="flex justify-between mt-2 pt-2 border-t border-white/10 text-xs text-white/70">
                        <span>PDU (2 на стойку):</span>
                        <span className="font-medium">{componentCounts['rack'] * 2}</span>
                      </div>
                    )}
                    {Object.keys(componentCounts).length === 0 && (
                      <div className="text-white/60 italic">Нет размещенных компонентов</div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DataCenterVisualizer; 
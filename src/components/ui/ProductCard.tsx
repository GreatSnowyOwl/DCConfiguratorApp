import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  model: string;
  power: number;
  description?: string;
  price?: number;
  type: 'IT' | 'AC'; // UPS type - for IT load or AC load
}

export const ProductCard = ({ model, power, description, type }: ProductCardProps) => {
  // Determine which icon to use based on model prefix and type
  const isModular = model.startsWith('UM');
  
  // Use correct BASE_URL for images to ensure they load correctly
  const iconPath = isModular 
    ? `${import.meta.env.BASE_URL}Modular_UPS_UM.png` 
    : `${import.meta.env.BASE_URL}UE_UPS.png`;
  
  // Determine series text
  const series = isModular ? 'Модульный ИБП UM' : 'ИБП напольного исполнения UE';
  
  // Add subtle color accent based on UPS type
  const cardBorderColor = type === 'IT' ? 'from-blue-500/20 to-blue-700/20' : 'from-green-500/20 to-green-700/20';
  const accentColor = type === 'IT' ? 'bg-blue-500' : 'bg-green-500';
  const glowColor = type === 'IT' ? 'shadow-[0_0_15px_3px_rgba(66,165,245,0.3)]' : 'shadow-[0_0_15px_3px_rgba(138,183,58,0.3)]';
  
  // Icon animation variants
  const iconVariants = {
    hover: {
      scale: 1.05,
      transition: { duration: 0.3 }
    }
  };
  
  // Add specs for the product - simplified
  const specs = [
    { name: 'Мощность', value: `${power} кВт` },
    { name: 'Напряжение', value: '400В / 230В' }
  ];

  // Determine PDF link based on model
  const getPdfLink = () => {
    if (isModular) {
      return 'https://iteaq.su/wp-content/uploads/2024/09/Модульный-ИБП-50-кВА-Брошюра-1.pdf';
    } else {
      return 'https://iteaq.su/wp-content/uploads/2024/10/UE-UPS-10-160kVA-BrochueRU.pdf';
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
      className="max-w-[320px] mx-auto" // Increased from 280px to 320px
    >
      <Card 
        className={`bg-transparent backdrop-blur-lg border border-white/10 hover:border-white/30 
          transition-all duration-300 text-white rounded-xl hover:${glowColor} 
          overflow-hidden h-full flex flex-col relative`}
      >
        {/* Add gradient background effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${cardBorderColor} opacity-10 hover:opacity-20 transition-opacity`}></div>
        
        {/* Badge top right corner */}
        <div className="absolute top-3 right-3 z-20">
          <div className={`rounded-full ${accentColor} px-2.5 py-0.5 text-xs font-semibold text-white`}>
            {type === 'IT' ? 'ИТ' : 'AC-UPS'}
          </div>
        </div>
        
        <CardContent className="flex flex-col items-center p-5 flex-grow relative z-10"> {/* Increased padding from p-4 to p-5 */}
          <motion.div 
            variants={iconVariants}
            whileHover="hover"
            className="w-full aspect-square max-h-40 rounded-lg flex items-center justify-center mb-4 overflow-hidden" // Increased from max-h-32 to max-h-40 and mb-3 to mb-4
          >
            <img
              src={iconPath}
              alt={model}
              className="max-h-full max-w-full object-contain p-3" // Increased padding from p-2 to p-3
              loading="lazy"
            />
          </motion.div>
          
          <div className="space-y-3 w-full"> {/* Increased space-y-2 to space-y-3 */}
            <div className="text-center">
              <p className="text-xl font-bold">{model}</p> {/* Increased from text-lg to text-xl */}
              <p className="text-sm text-white/80">{series}</p> {/* Increased from text-xs to text-sm */}
            </div>
            
            {/* Simplified Specifications */}
            <div className="bg-white/5 rounded-lg p-3 mt-2"> {/* Increased from p-2 to p-3 */}
              <div className="space-y-1.5"> {/* Increased from space-y-1 to space-y-1.5 */}
                {specs.map((spec, index) => (
                  <div key={index} className="flex justify-between items-center text-sm"> {/* Increased from text-xs to text-sm */}
                    <span className="text-white/70">{spec.name}:</span>
                    <span className="font-medium text-white">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {description && (
              <div className="mt-2 text-sm text-white/70 line-clamp-2"> {/* Increased from text-xs to text-sm */}
                {description}
              </div>
            )}

            {/* Learn More Button */}
            <div className="mt-3 flex justify-end">
              <Button
                variant="link"
                size="sm"
                className="text-[#8AB73A] hover:text-white hover:bg-[#8AB73A]/20 p-1 h-auto text-xs font-medium transition-colors rounded"
                onClick={() => window.open(getPdfLink(), '_blank')}
              >
                Узнать больше
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}; 
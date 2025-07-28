// ПНР (пуско-наладочные работы) конфигурация из PNRforUPS.xlsx

export interface PNRService {
  id: string;
  article: string;
  description: string;
  price: number;
  powerRange: {
    min: number;
    max: number;
  };
}

export const PNR_SERVICES: PNRService[] = [
  {
    id: 'pnr-ue-s',
    article: 'PNR-UE-S',
    description: 'Сертификат на ПНР ИБП 10-100 ква',
    price: 848.0,
    powerRange: { min: 10, max: 100 }
  },
  {
    id: 'pnr-ue-m',
    article: 'PNR-UE-M',
    description: 'Сертификат на ПНР ИБП-100-300 ква',
    price: 1490.0,
    powerRange: { min: 100, max: 300 }
  },
  {
    id: 'pnr-ue-l',
    article: 'PNR-UE-L',
    description: 'Сертификат на ПНР ИБП UE Tower 300-600',
    price: 2350.0,
    powerRange: { min: 300, max: 600 }
  },
  {
    id: 'pnr-ue-xl',
    article: 'PNR-UE-XL',
    description: 'Сертификат на ПНР ИБП UE Tower 600-1200',
    price: 4100.0,
    powerRange: { min: 600, max: 1200 }
  }
];

// Дополнительные гарантийные опции (отдельно от ПНР)
export interface WarrantyOption {
  id: string;
  name: string;
  description: string;
  pricePercentage: number; // процент от стоимости ИБП
}

export const WARRANTY_OPTIONS: WarrantyOption[] = [
  {
    id: 'warranty-1year',
    name: 'Расширение гарантии на 1 год',
    description: 'Дополнительная гарантия на оборудование сроком 1 год',
    pricePercentage: 5 // +5% к стоимости ИБП
  },
  {
    id: 'warranty-3years',
    name: 'Расширение гарантии на 3 года',
    description: 'Дополнительная гарантия на оборудование сроком 3 года',
    pricePercentage: 10 // +10% к стоимости ИБП
  }
];

/**
 * Определяет подходящую услугу ПНР на основе мощности ИБП
 */
export function getPNRServiceByPower(powerKVA: number): PNRService | null {
  return PNR_SERVICES.find(service => 
    powerKVA >= service.powerRange.min && powerKVA <= service.powerRange.max
  ) || null;
}

/**
 * Вычисляет стоимость расширенной гарантии
 */
export function calculateWarrantyPrice(upsPrice: number, warrantyOptionId: string): number {
  const option = WARRANTY_OPTIONS.find(opt => opt.id === warrantyOptionId);
  if (!option) return 0;
  
  return (upsPrice * option.pricePercentage) / 100;
} 
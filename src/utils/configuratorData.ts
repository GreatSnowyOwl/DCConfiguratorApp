// src/utils/configuratorData.ts

// Define types (copied from DCConfiguratorApp.tsx)
export type PDUType = 'B' | 'M' | 'S';

export interface UPSItem {
  model: string;
  power: number;
  price: number;
  description?: string;
}

export interface ACItem {
  model: string;
  power: number;
  price: number;
}

export interface FormData {
  quoteName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  racks600: string;
  racks800: string;
  power600: string;
  power800: string;
  acModel: string;
  batteryTime: string;
  backupCooling: boolean;
  distributionSystem?: 'yes' | 'no';
  pduCurrent: '16' | '32';
  pduPhase: '1' | '3';
  pduType: PDUType;
  selectedUpsModel?: string; // Note: Might not be in saved data, recalculate if needed
  monitoring: boolean;
  corridorIsolation: boolean;
  pnrSelected?: boolean;
  selectedBattery?: any;
  selectedUpsIndex?: number; // Add selected UPS index
  redundancyEnabled?: boolean; // Add 2N redundancy flag
}

// Add translations (copied from DCConfiguratorApp.tsx)
export const translations = {
  title: 'Конфигуратор ЦОД',
  steps: {
    customerQuoteInfo: 'Информация о клиенте',
    racks: 'Количество стоек',
    power: 'Потребляемая мощность',
    cooling: 'Система охлаждения',
    ups: 'Конфигурация ИБП',
    battery: 'Конфигурация АКБ',
    pdu: 'Распределение питания',
    monitoring: 'Дополнительное оборудование',
    summary: 'Итоговая конфигурация',
    distributionSystem: 'Система распределения',
    costSummary: 'Общая стоимость',
    additionalSystems: 'Дополнительные системы',
    dcDesign: 'Планировка дата-центра',
  },
  fields: {
    customerName: 'Название заказчика',
    customerPhone: 'Номер телефона заказчика',
    customerEmail: 'Email заказчика',
    quoteName: 'Название квоты',
    racks600: 'Стойки 600мм',
    racks800: 'Стойки 800мм',
    power600: 'Мощность на стойку 600мм (кВт)',
    power800: 'Мощность на стойку 800мм (кВт)',
    totalLoad: 'Общая ИТ нагрузка',
    backupCooling: 'Резервное питание для системы охлаждения',
    acModel: 'Модель кондиционера',
    batteryTime: 'Требуемое время автономной работы (в минутах)',
    pduCurrent: 'Номинальный ток',
    pduPhase: 'Количество фаз',
    pduType: 'Тип PDU',
    monitoringSystem: 'Система мониторинга',
    corridorIsolation: 'Изоляция коридоров',
    currentRating: 'Номинальный ток',
    phaseConfiguration: 'Конфигурация фаз',
    selectedPduConfiguration: 'Выбранная конфигурация PDU',
    addDistributionSystem: 'Добавить систему распределения?',
    company: 'Компания',
    contact: 'Контакт',
    email: 'Email',
    phone: 'Телефон',
    racks: 'Стойки',
    each: 'каждая',
    acUnits: 'Кондиционеры (N+1)',
    totalPower: 'Общая мощность',
    backupPower: 'Резервное питание',
    current: 'Ток',
    phase: 'Фазы',
    type: 'Тип',
    model: 'Модель',
    capacity: 'Емкость',
    totalBatteries: 'Всего батарей',
    totalWeight: 'Общий вес',
    included: 'Включено',
    yes: 'Да',
    no: 'Нет',
    single: 'Одна',
    three: 'Три',
    powerRating: 'Мощность',
    wCell: 'Вт/Элемент',
    banks: 'Банки',
    dimensions: 'Размеры',
    totalCost: 'Общая стоимость'
  },
  buttons: {
    back: 'Назад',
    next: 'Далее',
    generateReport: 'Сформировать отчет',
    downloadPdf: 'Скачать PDF',
    sendEmail: 'Отправить на почту'
  },
  validation: {
    required: 'Обязательное поле',
    enterCustomerName: 'Введите название заказчика',
    enterCustomerPhone: 'Введите телефон заказчика',
    invalidCustomerPhone: 'Введите корректный номер телефона заказчика',
    enterQuoteName: 'Введите название квоты',
    enterRacks: 'Введите количество стоек',
    enterPower: 'Введите мощность хотя бы для одного типа стоек',
    selectAcModel: 'Выберите модель кондиционера',
    enterBackupTime: 'Введите время автономной работы',
    selectPduCurrent: 'Выберите номинальный ток',
    selectPduPhase: 'Выберите количество фаз',
    selectPduType: 'Выберите тип PDU',
    enterCustomerEmail: 'Введите Email заказчика',
    invalidCustomerEmail: 'Введите корректный Email заказчика'
  },
  pduTypes: {
    'B': 'Базовый',
    'M': 'Мониторинг',
    'S': 'Управляемый'
  } as const,
  summary: {
    companyInfo: 'Информация о компании',
    rackConfig: 'Конфигурация стоек',
    cooling: 'Система охлаждения',
    pduConfig: 'Конфигурация PDU',
    batteryConfig: 'Конфигурация батарей',
    additionalSystems: 'Дополнительные системы',
    costSummary: 'Итоговая стоимость',
    totalCost: 'Общая стоимость',
  },
  acModels: {
    select: 'Выберите модель',
    '12.5': '12.5 кВт (300 мм)',
    '25': '25 кВт (300 мм)',
    '35-300': '35 кВт (300 мм)',
    '35-600': '35 кВт (600 мм)',
    '45': '45 кВт (600 мм)',
    '60': '60 кВт (600 мм)',
    '70': '70 кВт (600 мм)'
  },
  batteryTypes: {
    'B': 'Большой',
    'M': 'Средний',
    'S': 'Малый'
  } as const
};

// Price data constants (copied from DCConfiguratorApp.tsx)
export const _dataUpsAc = [
  { model: 'UE-0100TPL', power: 10, price: 2708 },
  { model: 'UE-0150TPL', power: 15, price: 4455 },
  { model: 'UE-0200TPL', power: 20, price: 4774 },
  { model: 'UE-0300TPL', power: 30, price: 5979 },
  { model: 'UE-0400TPL', power: 40, price: 6912 },
  { model: 'UE-0600TPL', power: 60, price: 7361 },
  { model: 'UE-0800TPL', power: 80, price: 9735 },
  { model: 'UE-1000TPL', power: 100, price: 13364 },
  { model: 'UE-1200TPL', power: 120, price: 20204 },
  { model: 'UE-2000TAL', power: 200, price: 35185 },
  { model: 'UE-3000TAL', power: 300, price: 62086 },
  { model: 'UE-4000TAL', power: 400, price: 89199 },
  { model: 'UE-5000TAL', power: 500, price: 104320 },
  { model: 'UE-6000TAL', power: 600, price: 131865 },
  { model: 'UE-8000TAL', power: 800, price: 155185 }
];
export const _dataUpsIt = [
  { model: 'UM-0900TELFS/15', power: 90, description: 'Модульный шкаф ИБП 90 кВА (5+1, максимальная мощность 90 кВА)', price: 36856 },
  { model: 'UM-1200TFL-FF', power: 120, description: '100kVA Modular UPS cabinet (5+1, Maximum 120kVA)', price: 42370 },
  { model: 'UM-1250TFL-FF', power: 150, description: '125kVA Modular UPS cabinet (5+1, Maximum 150kVA)', price: 42575 },
  { model: 'UM-1800TFL-FS', power: 180, description: '150kVA Modular UPS cabinet (5+1, Maximum 180kVA)', price: 52358 },
  { model: 'UM-2000TAL-FS', power: 200, description: '200kVA Modular UPS cabinet (Maximum 4*50=200kVA)', price: 47477 },
  { model: 'UM-3000TAL-FS', power: 300, description: '300kVA Modular UPS cabinet (Maximum 6*50=300kVA)', price: 69723 },
  { model: 'UM-4000TAL-FF', power: 400, description: '400kVA Modular UPS cabinet (Maximum 8*50=400kVA)', price: 92358 },
  { model: 'UM-5000TAL-FF', power: 500, description: '500kVA Modular UPS cabinet (Maximum 10*50=500kVA)', price: 111582 },
  { model: 'UM-6000TAL-FF', power: 600, description: '600kVA Modular UPS cabinet (Maximum 12*50=600kVA)', price: 136028 },
  { model: 'UM-8000TAL-FF', power: 800, description: '800kVA Modular UPS cabinet (Maximum 16*50=800kVA)', price: 191603 },
  { model: 'UM-0500TFL-M', power: 50, description: '50kVA UPS power module', price: 8312 }
];
export const _dataAc = [
  { model: 'CR012EA / ACS16-A', power: 12.5, dimensions: '300*1200*2000', price: 17033 },
  { model: 'CR025EA / ACS50-A', power: 25, dimensions: '300*1200*2000', price: 26835 },
  { model: 'CR035EA-B / ACS60-A', power: 35, dimensions: '300*1200*2000', price: 30450 },
  { model: 'CR035EA / ACS80-A', power: 40, dimensions: '600*1200*2000', price: 33548 },
  { model: 'CR045EA / ACS86-A', power: 48, dimensions: '600*1200*2000', price: 39518 },
  { model: 'CR060EA / ACS99-A', power: 60, dimensions: '600*1200*2000', price: 45870 },
  { model: 'CR070EA / ACS99-A', power: 70, dimensions: '600*1200*2000', price: 51180 }
];
export const _dataPdu = {
  'B': { '16': 181, '32': 226 },
  'M': { '16': 724, '32': 1047 },
  'S': { '16': 2223, '32': 2823 }
};

// PDU card display data
export const pduCardData = {
  'B': {
    title: 'Базовый PDU',
    description: 'Базовая модель с надежным распределением питания',
    features: [
      'Простой и надежный дизайн',
      'Монтаж в стойку 1U',
      'Доступны модели 16A и 32A',
      'Основные функции распределения питания'
    ],
    image: `<svg width="100%" height="160" viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="60" width="280" height="40" rx="4" fill="#0A2B6C" stroke="#8AB73A" strokeWidth="2"/>
      <rect x="20" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="50" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="80" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="110" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="140" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="170" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="200" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="230" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="260" y="67" width="20" height="26" rx="2" fill="#8AB73A" opacity="0.4"/>
      <rect x="20" y="90" width="230" height="5" rx="2.5" fill="#ffffff" opacity="0.2"/>
      <text x="150" y="125" fontSize="12" fill="#8AB73A" font-family="sans-serif" text-anchor="middle">Базовый PDU</text>
    </svg>`
  },
  'M': {
    title: 'PDU с мониторингом',
    description: 'Мониторинг потребляемой мощности в реальном времени',
    features: [
      'Отслеживание потребления энергии',
      'Отображение нагрузки в реальном времени',
      'Ethernet-подключение',
      'Оповещения о превышении пороговых значений'
    ],
    image: `<svg width="100%" height="160" viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="60" width="280" height="40" rx="4" fill="#0A2B6C" stroke="#8AB73A" strokeWidth="2"/>
      <rect x="20" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="50" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="80" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="110" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="140" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="170" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="200" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="230" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      
      <rect x="260" y="62" width="22" height="17" rx="2" fill="#0A2B6C" stroke="#8AB73A" strokeWidth="1.5"/>
      <text x="271" y="74" fontSize="8" fill="#8AB73A" font-family="sans-serif" text-anchor="middle">LCD</text>
      
      <rect x="260" y="84" width="22" height="12" rx="2" fill="#0A2B6C" stroke="#8AB73A" strokeWidth="1.5"/>
      <line x1="263" y1="88" x2="279" y2="88" stroke="#8AB73A" strokeWidth="1"/>
      <line x1="263" y1="92" x2="273" y2="92" stroke="#8AB73A" strokeWidth="1"/>
      
      <rect x="20" y="90" width="230" height="5" rx="2.5" fill="#ffffff" opacity="0.2"/>
      <text x="150" y="125" fontSize="12" fill="#8AB73A" font-family="sans-serif" text-anchor="middle">PDU с мониторингом</text>
    </svg>`
  },
  'S': {
    title: 'Управляемый PDU',
    description: 'Полное управление питанием на уровне розеток',
    features: [
      'Удаленное включение/выключение отдельных розеток',
      'Детальная статистика потребления',
      'Расширенные функции мониторинга',
      'Интеграция с системами управления ЦОД'
    ],
    image: `<svg width="100%" height="160" viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="60" width="280" height="40" rx="4" fill="#0A2B6C" stroke="#8AB73A" strokeWidth="2"/>
      
      <rect x="20" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="22" y="69" width="11" height="11" rx="5.5" fill="#0A2B6C"/>
      <circle cx="27.5" cy="74.5" r="3.5" fill="#8AB73A"/>
      
      <rect x="50" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="52" y="69" width="11" height="11" rx="5.5" fill="#0A2B6C"/>
      <circle cx="57.5" cy="74.5" r="3.5" fill="#8AB73A"/>
      
      <rect x="80" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="82" y="69" width="11" height="11" rx="5.5" fill="#0A2B6C"/>
      <circle cx="87.5" cy="74.5" r="3.5" fill="#8AB73A"/>
      
      <rect x="110" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="112" y="69" width="11" height="11" rx="5.5" fill="#0A2B6C"/>
      <circle cx="117.5" cy="74.5" r="3.5" fill="#8AB73A"/>
      
      <rect x="140" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="142" y="69" width="11" height="11" rx="5.5" fill="#0A2B6C"/>
      <circle cx="147.5" cy="74.5" r="3.5" fill="#8AB73A"/>
      
      <rect x="170" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="172" y="69" width="11" height="11" rx="5.5" fill="#0A2B6C"/>
      <circle cx="177.5" cy="74.5" r="3.5" fill="#8AB73A"/>
      
      <rect x="200" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="202" y="69" width="11" height="11" rx="5.5" fill="#0A2B6C"/>
      <circle cx="207.5" cy="74.5" r="3.5" fill="#8AB73A"/>
      
      <rect x="230" y="67" width="15" height="15" rx="7.5" fill="#8AB73A" opacity="0.8"/>
      <rect x="232" y="69" width="11" height="11" rx="5.5" fill="#0A2B6C"/>
      <circle cx="237.5" cy="74.5" r="3.5" fill="#8AB73A"/>
      
      <rect x="260" y="62" width="22" height="17" rx="2" fill="#0A2B6C" stroke="#8AB73A" strokeWidth="1.5"/>
      <text x="271" y="74" fontSize="8" fill="#8AB73A" font-family="sans-serif" text-anchor="middle">LCD</text>
      
      <rect x="260" y="84" width="22" height="12" rx="2" fill="#0A2B6C" stroke="#8AB73A" strokeWidth="1.5"/>
      <line x1="263" y1="88" x2="279" y2="88" stroke="#8AB73A" strokeWidth="1"/>
      <line x1="263" y1="92" x2="273" y2="92" stroke="#8AB73A" strokeWidth="1"/>
      
      <rect x="20" y="90" width="230" height="5" rx="2.5" fill="#ffffff" opacity="0.2"/>
      <text x="150" y="125" fontSize="12" fill="#8AB73A" font-family="sans-serif" text-anchor="middle">Управляемый PDU</text>
    </svg>`
  }
};

export const _dataMon = {
  price: 9528,
  features: [
    "4 NVR (DS-7604N-E1/4P-V3), сетевой коммутатор 8 портов",
    "Коммутатор 8 портов",
    "Звуковая и световая сигнализация",
    "Датчик дыма с подключением к системе пожаротушения",
    "Датчик температуры и влажности (LCD, RS485)",
    "Полусферическая камера для установки в проходе",
    "NVR на 8 камер, жесткий диск 2-8Т",
    "Жесткий диск SATA 2Т для мониторинга",
    "Базовое ПО с 3 лицензиями доступа",
    "Управление энергопотреблением",
    "Датчики протечки воды (9~27VDC, 24VDC)"
  ]
};
export const _dataIso = {
  price: 20100,
  features: [
    "Двойная электронная авто-дверь для шкафа 2000мм",
    "Безрамная дверь из закаленного стекла с приводом и контроллером",
    "Доступ по отпечатку пальца и карте",
    "Ввод пароля с кнопкой подсветки",
    "Кнопка открытия светового люка",
    "Контроллер 1U для распознавания отпечатков пальцев и лиц",
    "Автоматическое управление открытием/восстановлением светового люка",
    "Электрический механизм светового люка с комплектом кабелей",
    "Привод авто-восстановления светового люка (1 метр)",
    "Откидной световой люк шириной 600мм с подключением к системе пожаротушения",
    "Функциональный световой люк 600мм для датчиков/камер",
    "Кабельный лоток для двойного шкафа 600мм",
    "Светодиодная подсветка (1 метр)",
    "Атмосферная подсветка для двойного шкафа 600мм"
  ]
};
export const _dataDist = {
  price: 41025,
  name: 'Система распределения питания от ИБП',
  type: 'Шкаф 600 мм'
};
export const _dataRacks = {
  'R600': { name: 'Серверный шкаф: 600 мм', price: 1908 },
  'R800': { name: 'Серверный шкаф: 800 мм', price: 2310 }
};

// Battery data (Source: User Screenshots with "A$" prefix, treated as USD)
// Array format: [Model, Ah Capacity, Weight (kg), Dimensions, Price ($)]
export const _dataBattery: [string, number, number, string, number][] = [
    ["SP12-50", 50, 16.0, "257*132*198", 202],
    ["SP12-100", 100, 27.6, "330*174*226", 300],
    ["SP12-150", 150, 40.8, "483*171*227", 466],
    ["SP12-200", 200, 55.6, "234*522*220", 798],
    ["SP12-250", 250, 71.0, "271*534*233", 672]
];

// --- Shared Types ---
export interface BatteryOption {
  model: string;
  capacity_ah: number;
  strings_needed: number;
  total_batteries: number;
  total_weight_kg: number;
  dimensions: string;
  price: number; // Base price per battery
  total_price: number; // Total cost for this option
  energy_per_string: number;
  required_energy: number;
  voltage: number;
  current_per_string: number;
}
// Interface for cost breakdown items (needed by ViewQuote and potentially DCConfiguratorApp)
export interface CostBreakdownItem {
  label: string;
  cost: number;
}
// --- End Shared Types --- 

// --- Battery Calculation Logic (Based on UPS battery configuration document) ---
export function calculateUPSConfig(itLoadKw: number, backupTimeMin: number, inverterEfficiency = 0.9) {
  console.log(`calculateUPSConfig: Load=${itLoadKw}kW, Time=${backupTimeMin}min, Efficiency=${inverterEfficiency}`);
  
  // Fixed parameters
  const batteriesPerString = 40; // 40 batteries per string (banks)
  const endVoltage = 1.67; // End voltage (V)
  
  // Step 1: Calculate required W/Cell
  // Formula: W/Cell = K1 × 1000 / (Q × 6 × η)
  // Where:
  // - K1 = IT load (kW)
  // - Q = batteries per string (40)
  // - 6 = conversion factor from 2V to 12V
  // - η = inverter efficiency
  
  // Calculate required W/Cell
  const totalRequiredWCell = (itLoadKw * 1000) / (batteriesPerString * 6 * inverterEfficiency);
  console.log(`Total required W/Cell: ${totalRequiredWCell.toFixed(2)}`);
  
  // Battery W/Cell lookup table - exact values from the battery tables in the PDF
  // Format: [capacity in Ah][backup time in minutes] = W/Cell value at 1.67V
  const batteryWCellTable: { [key: number]: { [key: number]: number } } = {
    // SP12-50 (extracted/interpolated from SP12-50 table)
    50: {
      5: 192.00,   // From SP12-50 5min column
      10: 160.00,  // From SP12-50 10min column
      15: 138.00,  // From SP12-50 15min column
      20: 112.00,  // From SP12-50 20min column
      30: 81.50    // From SP12-50 30min column
    },
    // SP12-100 values (from SP12-100 table)
    100: {
      5: 375.00,   // From SP12-100 5min column
      10: 316.00,  // From SP12-100 10min column
      15: 258.00,  // From SP12-100 15min column
      20: 196.00,  // From SP12-100 20min column
      30: 145.00   // From SP12-100 30min column
    },
    // SP12-150 values (from SP12-150 table)
    150: {
      5: 538.00,   // From SP12-150 5min column
      10: 433.00,  // From SP12-150 10min column
      15: 330.00,  // From SP12-150 15min column
      20: 264.00,  // From SP12-150 20min column
      30: 198.00   // From SP12-150 30min column
    },
    // SP12-200 values (from SP12-200 table)
    200: {
      5: 690.00,   // From SP12-200 5min column
      10: 575.00,  // From SP12-200 10min column
      15: 453.00,  // From SP12-200 15min column
      20: 350.00,  // From SP12-200 20min column
      30: 262.00   // From SP12-200 30min column
    },
    // SP12-250 values (estimated/interpolated as there's no exact 250Ah in tables)
    250: {
      5: 770.00,   // Estimated between SP12-230 and SP12-270 values
      10: 640.00,  // Estimated between SP12-230 and SP12-270 values
      15: 500.00,  // Estimated between SP12-230 and SP12-270 values
      20: 400.00,  // Estimated between SP12-230 and SP12-270 values
      30: 300.00   // Estimated between SP12-230 and SP12-270 values
    }
  };
  
  // Find the closest backup time in the table
  const availableBackupTimes = Object.keys(batteryWCellTable[50]).map(Number);
  const closestBackupTime = availableBackupTimes.reduce((prev, curr) => 
    Math.abs(curr - backupTimeMin) < Math.abs(prev - backupTimeMin) ? curr : prev
  );
  
  console.log(`Using W/Cell values for ${closestBackupTime} minutes backup time`);
  
  // Reference scenarios for verification
  const referenceScenarios = [
    { load: 440, time: 10, strings: { 50: 12, 100: 6, 150: 4, 200: 3, 250: 2 } },
    { load: 595, time: 15, strings: { 50: 20, 100: 10, 150: 8, 200: 6, 250: 5 } }
  ];
  
  return _dataBattery
    .map(([model, capacity_ah, weight, dimensions, price]) => {
      const Ah = capacity_ah;
      
      // Get W/Cell capacity for this battery at the specified backup time
      if (!batteryWCellTable[Ah] || !batteryWCellTable[Ah][closestBackupTime]) {
        console.log(`No W/Cell data for ${Ah}Ah battery at ${closestBackupTime}min backup`);
        return null;
      }
      
      const batteryWCell = batteryWCellTable[Ah][closestBackupTime];
      console.log(`Battery ${model} (${Ah}Ah): W/Cell at ${closestBackupTime}min = ${batteryWCell.toFixed(2)}`);
      
      // Calculate number of strings needed
      // Formula: Strings = Required W/Cell / Battery W/Cell capacity per string
      let stringsNeeded = Math.ceil(totalRequiredWCell / batteryWCell);
      
      // Apply 44% reduction to the number of strings as requested
      stringsNeeded = Math.max(1, Math.ceil(stringsNeeded * 0.56)); // 1 - 0.44 = 0.56, ensure at least 1 string
      
      // Calculate total W/Cell capacity provided
      const totalProvidedWCell = batteryWCell * stringsNeeded;
      
      console.log(`Required W/Cell: ${totalRequiredWCell.toFixed(2)}, Provided: ${totalProvidedWCell.toFixed(2)} with ${stringsNeeded} strings (after 44% reduction)`);
      
      // Calculate total batteries
      const total_batteries = stringsNeeded * batteriesPerString;
      
      // Calculate other metrics for display
      const total_weight_kg = Math.round(total_batteries * weight);
      const total_price = price * total_batteries;
      
      // Verify against reference scenarios
      for (const scenario of referenceScenarios) {
        if (closestBackupTime === scenario.time) {
          const scenarioWCell = (scenario.load * 1000) / (batteriesPerString * 6 * inverterEfficiency);
          const expectedStrings = scenario.strings[Ah as keyof typeof scenario.strings];
          if (expectedStrings) {
            const calculatedStrings = Math.ceil(scenarioWCell / batteryWCell);
            const reducedStrings = Math.max(1, Math.ceil(calculatedStrings * 0.56));
            console.log(`Reference check for ${scenario.load}kW at ${scenario.time}min: Expected ${expectedStrings} strings, Got ${reducedStrings} strings after reduction`);
          }
        }
      }

      return {
        model: String(model),
        capacity_ah: Ah,
        strings_needed: stringsNeeded,
        total_batteries: total_batteries,
        total_weight_kg: total_weight_kg,
        dimensions: String(dimensions),
        price: price,
        total_price: total_price,
        energy_per_string: batteryWCell, // W/Cell per string
        required_energy: totalRequiredWCell, // Required W/Cell 
        voltage: batteriesPerString * 12, // Battery bank voltage (40 * 12V)
        current_per_string: 0 // Not used in this calculation
      };
    })
    .filter(option => option !== null) // Filter out batteries with no W/Cell data
    .sort((a, b) => a!.total_price - b!.total_price);
}

// --- End Battery Calculation Logic --- 
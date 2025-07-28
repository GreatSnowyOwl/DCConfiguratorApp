import React, { useMemo, useState, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search, Plus, Minus, Download, FileText, ChevronRight, ChevronLeft, Check, Battery, Zap, Archive } from "lucide-react";
import { jsPDF } from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { useAuth } from '../contexts/AuthContext';
import { getBatteryConfigFromExcel, EXCEL_BATTERY_CONFIGURATIONS } from '../config/excelBatteryConfig';
import { getBCBBoxFromExcel } from '../config/bcbBoxConfig';
import { getPNRServiceByPower, calculateWarrantyPrice, PNRService, WarrantyOption, WARRANTY_OPTIONS } from '../config/pnrConfig';
import { getUPSImageMapping } from '../utils/upsImageMapping';
import { AnimatePresence, motion } from "framer-motion";

// Custom styles for scrollbar
const customScrollbarStyles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #8AB73A;
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #7DA533;
}
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customScrollbarStyles;
  document.head.appendChild(styleElement);
}

// Background and logo images
const backgroundImage = `${import.meta.env.BASE_URL}DATACENTER.png`;
const logoImage = `${import.meta.env.BASE_URL}logologo.png`;

// UPS Types
export type UPSType = "UR" | "UE" | "UM"; // UR - rack mount, UE - tower, UM - modular
export type BatteryTime = 5 | 10 | 15 | 20 | 30 | 45 | 60 | 90;
export type BatteryType = "SP12-18" | "SP12-26" | "SP12-38" | "SP12-42" | "SP12-50" | "SP12-65" | "SP12-80" | "SP12-100" | "SP12-120" | "SP12-150" | "SP12-200" | "SP12-250";

interface UPSProduct {
  id: string;
  label: string;
  type: UPSType;
  capacity: number; // in kVA
  frame: number;
  model: string;
  priceUSD: number;
  documentationUrl?: string;
}

interface BatterySpec {
  type: BatteryType;
  endVoltage: number;
  time5min: number;
  time10min: number;
  time15min: number;
  time20min: number;
  time30min: number;
  time45min: number;
  time1h: number;
  time1_5h: number;
  time2h: number;
  time3h: number;
  time5h: number;
  time10h: number;
  time20h: number;
  priceUSD: number;
  rackType: string;
  rackPrice: number;
  batteriesPerRack: number; // Number of batteries per rack (40, 80, 120, etc.)
}

interface BCBBox {
  id: string;
  label: string;
  priceUSD: number;
  description: string;
}

// UR Series with corrected USD prices including VAT from UPSCorrected.xlsx
const UPS_PRODUCTS_UR: UPSProduct[] = [
  { id: "UR-10KTFL", type: "UR", capacity: 10, frame: 10, model: "UR-0100TPL", priceUSD: 2546.00, label: "UR 10kVA Rack Mount" },
  { id: "UR-15KTFL", type: "UR", capacity: 15, frame: 15, model: "UR-0150TPL", priceUSD: 3011.00, label: "UR 15kVA Rack Mount" },
  { id: "UR-20KTFL", type: "UR", capacity: 20, frame: 20, model: "UR-0200TPL", priceUSD: 3444.00, label: "UR 20kVA Rack Mount" },
  { id: "UR-30KTFL", type: "UR", capacity: 30, frame: 30, model: "UR-0300TPL", priceUSD: 5071.00, label: "UR 30kVA Rack Mount" },
  { id: "UR-40KTFL", type: "UR", capacity: 40, frame: 40, model: "UR-0400TPL", priceUSD: 6246.00, label: "UR 40kVA Rack Mount" },
];

// UE Series with corrected USD prices including VAT from UPSCorrected.xlsx
const UPS_PRODUCTS_UE: UPSProduct[] = [
  { id: "UE-0100TPL", type: "UE", capacity: 10, frame: 10, model: "UE-0100TPL", priceUSD: 2507.00, label: "UE 10kVA Tower" },
  { id: "UE-0150TPL", type: "UE", capacity: 15, frame: 15, model: "UE-0150TPL", priceUSD: 2860.00, label: "UE 15kVA Tower" },
  { id: "UE-0200TPL", type: "UE", capacity: 20, frame: 20, model: "UE-0200TPL", priceUSD: 4262.50, label: "UE 20kVA Tower" },
  { id: "UE-0300TPL", type: "UE", capacity: 30, frame: 30, model: "UE-0300TPL", priceUSD: 5348.00, label: "UE 30kVA Tower" },
  { id: "UE-0400TPL", type: "UE", capacity: 40, frame: 40, model: "UE-0400TPL", priceUSD: 7672.00, label: "UE 40kVA Tower" },
  { id: "UE-0600TPL", type: "UE", capacity: 60, frame: 60, model: "UE-0600TPL", priceUSD: 8872.00, label: "UE 60kVA Tower" },
  { id: "UE-0800TPL", type: "UE", capacity: 80, frame: 80, model: "UE-0800TPL", priceUSD: 9768.00, label: "UE 80kVA Tower" },
  { id: "UE-1000TPL", type: "UE", capacity: 100, frame: 100, model: "UE-1000TPL", priceUSD: 12028.00, label: "UE 100kVA Tower" },
  { id: "UE-1200TPL", type: "UE", capacity: 120, frame: 120, model: "UE-1200TPL", priceUSD: 15690.00, label: "UE 120kVA Tower" },
  { id: "UE-1600TPL", type: "UE", capacity: 160, frame: 160, model: "UE-1600TPL", priceUSD: 16008.97, label: "UE 160kVA Tower" },
  { id: "UE-2000TAL", type: "UE", capacity: 200, frame: 200, model: "UE-2000TAL", priceUSD: 20279.64, label: "UE 200kVA Tower" },
  { id: "UE-3000TAL", type: "UE", capacity: 300, frame: 300, model: "UE-3000TAL", priceUSD: 24550.26, label: "UE 300kVA Tower" },
  { id: "UE-4000TAL", type: "UE", capacity: 400, frame: 400, model: "UE-4000TAL", priceUSD: 28620.90, label: "UE 400kVA Tower" },
  { id: "UE-5000TAL", type: "UE", capacity: 500, frame: 500, model: "UE-5000TAL", priceUSD: 33635.64, label: "UE 500kVA Tower" },
  { id: "UE-6000TAL", type: "UE", capacity: 600, frame: 600, model: "UE-6000TAL", priceUSD: 38578.68, label: "UE 600kVA Tower" },
  { id: "UE-8000TAL", type: "UE", capacity: 800, frame: 800, model: "UE-8000TAL", priceUSD: 43800.12, label: "UE 800kVA Tower" },
];

// UM Series with corrected USD prices including VAT from UPSCorrected.xlsx
const UPS_PRODUCTS_UM: UPSProduct[] = [
  // Frame 90
  { id: "UM-0900TFL-15", type: "UM", capacity: 15, frame: 90, model: "UM-0900TFL-15", priceUSD: 11738.32, label: "UM 15kVA/90 Frame" },
  { id: "UM-0900TFL-30", type: "UM", capacity: 30, frame: 90, model: "UM-0900TFL-30", priceUSD: 16008.97, label: "UM 30kVA/90 Frame" },
  { id: "UM-0900TFL-45", type: "UM", capacity: 45, frame: 90, model: "UM-0900TFL-45", priceUSD: 20279.64, label: "UM 45kVA/90 Frame" },
  { id: "UM-0900TFL-60", type: "UM", capacity: 60, frame: 90, model: "UM-0900TFL-60", priceUSD: 24550.26, label: "UM 60kVA/90 Frame" },
  { id: "UM-0900TFL-75", type: "UM", capacity: 75, frame: 90, model: "UM-0900TFL-75", priceUSD: 28820.90, label: "UM 75kVA/90 Frame" },
  { id: "UM-0900TFL-90", type: "UM", capacity: 90, frame: 90, model: "UM-0900TFL-90", priceUSD: 33091.54, label: "UM 90kVA/90 Frame" },
  
  // Frame 120
  { id: "UM-1200TFL-20", type: "UM", capacity: 20, frame: 120, model: "UM-1200TFL-20", priceUSD: 11738.32, label: "UM 20kVA/120 Frame" },
  { id: "UM-1200TFL-40", type: "UM", capacity: 40, frame: 120, model: "UM-1200TFL-40", priceUSD: 16008.97, label: "UM 40kVA/120 Frame" },
  { id: "UM-1200TFL-60", type: "UM", capacity: 60, frame: 120, model: "UM-1200TFL-60", priceUSD: 20279.64, label: "UM 60kVA/120 Frame" },
  { id: "UM-1200TFL-80", type: "UM", capacity: 80, frame: 120, model: "UM-1200TFL-80", priceUSD: 24550.26, label: "UM 80kVA/120 Frame" },
  { id: "UM-1200TFL-100", type: "UM", capacity: 100, frame: 120, model: "UM-1200TFL-100", priceUSD: 28820.90, label: "UM 100kVA/120 Frame" },
  { id: "UM-1200TFL-120", type: "UM", capacity: 120, frame: 120, model: "UM-1200TFL-120", priceUSD: 33091.54, label: "UM 120kVA/120 Frame" },
  
  // Frame 125
  { id: "UM-1250TFL-25", type: "UM", capacity: 25, frame: 125, model: "UM-1250TFL-25", priceUSD: 10446.4, label: "UM 25kVA/125 Frame" },
  { id: "UM-1250TFL-50", type: "UM", capacity: 50, frame: 125, model: "UM-1250TFL-50", priceUSD: 14521.28, label: "UM 50kVA/125 Frame" },
  { id: "UM-1250TFL-75", type: "UM", capacity: 75, frame: 125, model: "UM-1250TFL-75", priceUSD: 18596.08, label: "UM 75kVA/125 Frame" },
  { id: "UM-1250TFL-100", type: "UM", capacity: 100, frame: 125, model: "UM-1250TFL-100", priceUSD: 22670.96, label: "UM 100kVA/125 Frame" },
  { id: "UM-1250TFL-125", type: "UM", capacity: 125, frame: 125, model: "UM-1250TFL-125", priceUSD: 26745.76, label: "UM 125kVA/125 Frame" },
  
  // Frame 150
  { id: "UM-1500TFL-30", type: "UM", capacity: 30, frame: 150, model: "UM-1500TFL-30", priceUSD: 11798.34, label: "UM 30kVA/150 Frame" },
  { id: "UM-1500TFL-60", type: "UM", capacity: 60, frame: 150, model: "UM-1500TFL-60", priceUSD: 16008.92, label: "UM 60kVA/150 Frame" },
  { id: "UM-1500TFL-90", type: "UM", capacity: 90, frame: 150, model: "UM-1500TFL-90", priceUSD: 20279.6, label: "UM 90kVA/150 Frame" },
  { id: "UM-1500TFL-120", type: "UM", capacity: 120, frame: 150, model: "UM-1500TFL-120", priceUSD: 24550.28, label: "UM 120kVA/150 Frame" },
  { id: "UM-1500TFL-150", type: "UM", capacity: 150, frame: 150, model: "UM-1500TFL-150", priceUSD: 28820.96, label: "UM 150kVA/150 Frame" },
  
  // Frame 180
  { id: "UM-1800TFL-30", type: "UM", capacity: 30, frame: 180, model: "UM-1800TFL-30", priceUSD: 11798.34, label: "UM 30kVA/180 Frame" },
  { id: "UM-1800TFL-60", type: "UM", capacity: 60, frame: 180, model: "UM-1800TFL-60", priceUSD: 16008.92, label: "UM 60kVA/180 Frame" },
  { id: "UM-1800TFL-90", type: "UM", capacity: 90, frame: 180, model: "UM-1800TFL-90", priceUSD: 20279.6, label: "UM 90kVA/180 Frame" },
  { id: "UM-1800TFL-120", type: "UM", capacity: 120, frame: 180, model: "UM-1800TFL-120", priceUSD: 24550.28, label: "UM 120kVA/180 Frame" },
  { id: "UM-1800TFL-150", type: "UM", capacity: 150, frame: 180, model: "UM-1800TFL-150", priceUSD: 28820.96, label: "UM 150kVA/180 Frame" },
  { id: "UM-1800TFL-180", type: "UM", capacity: 180, frame: 180, model: "UM-1800TFL-180", priceUSD: 33091.54, label: "UM 180kVA/180 Frame" },
  
  // Frame 200
  { id: "UM-2000TFL-50", type: "UM", capacity: 50, frame: 200, model: "UM-2000TFL-50", priceUSD: 14160.8, label: "UM 50kVA/200 Frame" },
  { id: "UM-2000TFL-100", type: "UM", capacity: 100, frame: 200, model: "UM-2000TFL-100", priceUSD: 19382.28, label: "UM 100kVA/200 Frame" },
  { id: "UM-2000TFL-150", type: "UM", capacity: 150, frame: 200, model: "UM-2000TFL-150", priceUSD: 24603.68, label: "UM 150kVA/200 Frame" },
  { id: "UM-2000TFL-200", type: "UM", capacity: 200, frame: 200, model: "UM-2000TFL-200", priceUSD: 29825.12, label: "UM 200kVA/200 Frame" },
  
  // Frame 240
  { id: "UM-2400TFL-60", type: "UM", capacity: 60, frame: 240, model: "UM-2400TFL-60", priceUSD: 16008.92, label: "UM 60kVA/240 Frame" },
  { id: "UM-2400TFL-120", type: "UM", capacity: 120, frame: 240, model: "UM-2400TFL-120", priceUSD: 21469.36, label: "UM 120kVA/240 Frame" },
  { id: "UM-2400TFL-180", type: "UM", capacity: 180, frame: 240, model: "UM-2400TFL-180", priceUSD: 26929.72, label: "UM 180kVA/240 Frame" },
  { id: "UM-2400TFL-240", type: "UM", capacity: 240, frame: 240, model: "UM-2400TFL-240", priceUSD: 32390.16, label: "UM 240kVA/240 Frame" },
  
  // Frame 300
  { id: "UM-3000TFL-150", type: "UM", capacity: 150, frame: 300, model: "UM-3000TFL-150", priceUSD: 28135.88, label: "UM 150kVA/300 Frame" },
  { id: "UM-3000TFL-200", type: "UM", capacity: 200, frame: 300, model: "UM-3000TFL-200", priceUSD: 33357.28, label: "UM 200kVA/300 Frame" },
  { id: "UM-3000TFL-250", type: "UM", capacity: 250, frame: 300, model: "UM-3000TFL-250", priceUSD: 38578.68, label: "UM 250kVA/300 Frame" },
  { id: "UM-3000TFL-300", type: "UM", capacity: 300, frame: 300, model: "UM-3000TFL-300", priceUSD: 43800.12, label: "UM 300kVA/300 Frame" },
  
  // Frame 400
  { id: "UM-4000TFL-50", type: "UM", capacity: 50, frame: 400, model: "UM-4000TFL-50", priceUSD: 21469.68, label: "UM 50kVA/400 Frame" },
  { id: "UM-4000TFL-100", type: "UM", capacity: 100, frame: 400, model: "UM-4000TFL-100", priceUSD: 26691.04, label: "UM 100kVA/400 Frame" },
  { id: "UM-4000TFL-150", type: "UM", capacity: 150, frame: 400, model: "UM-4000TFL-150", priceUSD: 31912.52, label: "UM 150kVA/400 Frame" },
  { id: "UM-4000TFL-200", type: "UM", capacity: 200, frame: 400, model: "UM-4000TFL-200", priceUSD: 37133.88, label: "UM 200kVA/400 Frame" },
  { id: "UM-4000TFL-250", type: "UM", capacity: 250, frame: 400, model: "UM-4000TFL-250", priceUSD: 42355.36, label: "UM 250kVA/400 Frame" },
  { id: "UM-4000TFL-300", type: "UM", capacity: 300, frame: 400, model: "UM-4000TFL-300", priceUSD: 47576.84, label: "UM 300kVA/400 Frame" },
  { id: "UM-4000TFL-350", type: "UM", capacity: 350, frame: 400, model: "UM-4000TFL-350", priceUSD: 52798.24, label: "UM 350kVA/400 Frame" },
  { id: "UM-4000TFL-400", type: "UM", capacity: 400, frame: 400, model: "UM-4000TFL-400", priceUSD: 58019.72, label: "UM 400kVA/400 Frame" },
  
  // Frame 500
  { id: "UM-5000TFL-50", type: "UM", capacity: 50, frame: 500, model: "UM-5000TFL-50", priceUSD: 23103.76, label: "UM 50kVA/500 Frame" },
  { id: "UM-5000TFL-100", type: "UM", capacity: 100, frame: 500, model: "UM-5000TFL-100", priceUSD: 28325.12, label: "UM 100kVA/500 Frame" },
  { id: "UM-5000TFL-150", type: "UM", capacity: 150, frame: 500, model: "UM-5000TFL-150", priceUSD: 33546.56, label: "UM 150kVA/500 Frame" },
  { id: "UM-5000TFL-200", type: "UM", capacity: 200, frame: 500, model: "UM-5000TFL-200", priceUSD: 38768.00, label: "UM 200kVA/500 Frame" },
  { id: "UM-5000TFL-250", type: "UM", capacity: 250, frame: 500, model: "UM-5000TFL-250", priceUSD: 43989.44, label: "UM 250kVA/500 Frame" },
  { id: "UM-5000TFL-300", type: "UM", capacity: 300, frame: 500, model: "UM-5000TFL-300", priceUSD: 49210.96, label: "UM 300kVA/500 Frame" },
  { id: "UM-5000TFL-350", type: "UM", capacity: 350, frame: 500, model: "UM-5000TFL-350", priceUSD: 54432.32, label: "UM 350kVA/500 Frame" },
  { id: "UM-5000TFL-400", type: "UM", capacity: 400, frame: 500, model: "UM-5000TFL-400", priceUSD: 59653.76, label: "UM 400kVA/500 Frame" },
  { id: "UM-5000TFL-450", type: "UM", capacity: 450, frame: 500, model: "UM-5000TFL-450", priceUSD: 64875.20, label: "UM 450kVA/500 Frame" },
  { id: "UM-5000TFL-500", type: "UM", capacity: 500, frame: 500, model: "UM-5000TFL-500", priceUSD: 70096.64, label: "UM 500kVA/500 Frame" },
  
  // Frame 600
  { id: "UM-6000TFL-50", type: "UM", capacity: 50, frame: 600, model: "UM-6000TFL-50", priceUSD: 28017.68, label: "UM 50kVA/600 Frame" },
  { id: "UM-6000TFL-100", type: "UM", capacity: 100, frame: 600, model: "UM-6000TFL-100", priceUSD: 33239.04, label: "UM 100kVA/600 Frame" },
  { id: "UM-6000TFL-150", type: "UM", capacity: 150, frame: 600, model: "UM-6000TFL-150", priceUSD: 38460.40, label: "UM 150kVA/600 Frame" },
  { id: "UM-6000TFL-200", type: "UM", capacity: 200, frame: 600, model: "UM-6000TFL-200", priceUSD: 43681.96, label: "UM 200kVA/600 Frame" },
  { id: "UM-6000TFL-250", type: "UM", capacity: 250, frame: 600, model: "UM-6000TFL-250", priceUSD: 48903.32, label: "UM 250kVA/600 Frame" },
  { id: "UM-6000TFL-300", type: "UM", capacity: 300, frame: 600, model: "UM-6000TFL-300", priceUSD: 54124.80, label: "UM 300kVA/600 Frame" },
  { id: "UM-6000TFL-350", type: "UM", capacity: 350, frame: 600, model: "UM-6000TFL-350", priceUSD: 59346.24, label: "UM 350kVA/600 Frame" },
  { id: "UM-6000TFL-400", type: "UM", capacity: 400, frame: 600, model: "UM-6000TFL-400", priceUSD: 64567.68, label: "UM 400kVA/600 Frame" },
  { id: "UM-6000TFL-450", type: "UM", capacity: 450, frame: 600, model: "UM-6000TFL-450", priceUSD: 69789.12, label: "UM 450kVA/600 Frame" },
  { id: "UM-6000TFL-500", type: "UM", capacity: 500, frame: 600, model: "UM-6000TFL-500", priceUSD: 75010.56, label: "UM 500kVA/600 Frame" },
  { id: "UM-6000TFL-550", type: "UM", capacity: 550, frame: 600, model: "UM-6000TFL-550", priceUSD: 69789.12, label: "UM 550kVA/600 Frame" },
  { id: "UM-6000TFL-600", type: "UM", capacity: 600, frame: 600, model: "UM-6000TFL-600", priceUSD: 75010.56, label: "UM 600kVA/600 Frame" },
  
  // Frame 800
  { id: "UM-8000TFL-50", type: "UM", capacity: 50, frame: 800, model: "UM-8000TFL-50", priceUSD: 42044.32, label: "UM 50kVA/800 Frame" },
  { id: "UM-8000TFL-100", type: "UM", capacity: 100, frame: 800, model: "UM-8000TFL-100", priceUSD: 47265.76, label: "UM 100kVA/800 Frame" },
  { id: "UM-8000TFL-150", type: "UM", capacity: 150, frame: 800, model: "UM-8000TFL-150", priceUSD: 52487.20, label: "UM 150kVA/800 Frame" },
  { id: "UM-8000TFL-200", type: "UM", capacity: 200, frame: 800, model: "UM-8000TFL-200", priceUSD: 57708.64, label: "UM 200kVA/800 Frame" },
  { id: "UM-8000TFL-250", type: "UM", capacity: 250, frame: 800, model: "UM-8000TFL-250", priceUSD: 62930.08, label: "UM 250kVA/800 Frame" },
  { id: "UM-8000TFL-300", type: "UM", capacity: 300, frame: 800, model: "UM-8000TFL-300", priceUSD: 68151.52, label: "UM 300kVA/800 Frame" },
  { id: "UM-8000TFL-350", type: "UM", capacity: 350, frame: 800, model: "UM-8000TFL-350", priceUSD: 73372.96, label: "UM 350kVA/800 Frame" },
  { id: "UM-8000TFL-400", type: "UM", capacity: 400, frame: 800, model: "UM-8000TFL-400", priceUSD: 78594.40, label: "UM 400kVA/800 Frame" },
  { id: "UM-8000TFL-450", type: "UM", capacity: 450, frame: 800, model: "UM-8000TFL-450", priceUSD: 83815.84, label: "UM 450kVA/800 Frame" },
  { id: "UM-8000TFL-500", type: "UM", capacity: 500, frame: 800, model: "UM-8000TFL-500", priceUSD: 89037.28, label: "UM 500kVA/800 Frame" },
  { id: "UM-8000TFL-550", type: "UM", capacity: 550, frame: 800, model: "UM-8000TFL-550", priceUSD: 94258.72, label: "UM 550kVA/800 Frame" },
  { id: "UM-8000TFL-600", type: "UM", capacity: 600, frame: 800, model: "UM-8000TFL-600", priceUSD: 99480.16, label: "UM 600kVA/800 Frame" },
  { id: "UM-8000TFL-650", type: "UM", capacity: 650, frame: 800, model: "UM-8000TFL-650", priceUSD: 104701.60, label: "UM 650kVA/800 Frame" },
  { id: "UM-8000TFL-700", type: "UM", capacity: 700, frame: 800, model: "UM-8000TFL-700", priceUSD: 109923.04, label: "UM 700kVA/800 Frame" },
  { id: "UM-8000TFL-750", type: "UM", capacity: 750, frame: 800, model: "UM-8000TFL-750", priceUSD: 115144.48, label: "UM 750kVA/800 Frame" },
  { id: "UM-8000TFL-800", type: "UM", capacity: 800, frame: 800, model: "UM-8000TFL-800", priceUSD: 120365.92, label: "UM 800kVA/800 Frame" },
  
  // Frame 1000
  { id: "UM-10000TFL-100", type: "UM", capacity: 100, frame: 1000, model: "UM-10000TFL-100", priceUSD: 51200.00, label: "UM 100kVA/1000 Frame" },
  { id: "UM-10000TFL-200", type: "UM", capacity: 200, frame: 1000, model: "UM-10000TFL-200", priceUSD: 69200.00, label: "UM 200kVA/1000 Frame" },
  { id: "UM-10000TFL-300", type: "UM", capacity: 300, frame: 1000, model: "UM-10000TFL-300", priceUSD: 78345.00, label: "UM 300kVA/1000 Frame" },
  { id: "UM-10000TFL-400", type: "UM", capacity: 400, frame: 1000, model: "UM-10000TFL-400", priceUSD: 89298.39, label: "UM 400kVA/1000 Frame" },
  { id: "UM-10000TFL-500", type: "UM", capacity: 500, frame: 1000, model: "UM-10000TFL-500", priceUSD: 116225.34, label: "UM 500kVA/1000 Frame" },
  { id: "UM-10000TFL-600", type: "UM", capacity: 600, frame: 1000, model: "UM-10000TFL-600", priceUSD: 119689.54, label: "UM 600kVA/1000 Frame" },
  
  // Frame 1200
  { id: "UM-12000TFL-100", type: "UM", capacity: 100, frame: 1200, model: "UM-12000TFL-100", priceUSD: 51200.00, label: "UM 100kVA/1200 Frame" },
  { id: "UM-12000TFL-200", type: "UM", capacity: 200, frame: 1200, model: "UM-12000TFL-200", priceUSD: 69200.00, label: "UM 200kVA/1200 Frame" },
  { id: "UM-12000TFL-300", type: "UM", capacity: 300, frame: 1200, model: "UM-12000TFL-300", priceUSD: 78345.00, label: "UM 300kVA/1200 Frame" },
  { id: "UM-12000TFL-400", type: "UM", capacity: 400, frame: 1200, model: "UM-12000TFL-400", priceUSD: 89298.39, label: "UM 400kVA/1200 Frame" },
  { id: "UM-12000TFL-500", type: "UM", capacity: 500, frame: 1200, model: "UM-12000TFL-500", priceUSD: 116225.34, label: "UM 500kVA/1200 Frame" },
  { id: "UM-12000TFL-600", type: "UM", capacity: 600, frame: 1200, model: "UM-12000TFL-600", priceUSD: 119689.54, label: "UM 600kVA/1200 Frame" },
  { id: "UM-12000TFL-700", type: "UM", capacity: 700, frame: 1200, model: "UM-12000TFL-700", priceUSD: 123153.24, label: "UM 700kVA/1200 Frame" },
  { id: "UM-12000TFL-800", type: "UM", capacity: 800, frame: 1200, model: "UM-12000TFL-800", priceUSD: 126616.96, label: "UM 800kVA/1200 Frame" },
  { id: "UM-12000TFL-900", type: "UM", capacity: 900, frame: 1200, model: "UM-12000TFL-900", priceUSD: 133091.54, label: "UM 900kVA/1200 Frame" },
  { id: "UM-12000TFL-1000", type: "UM", capacity: 1000, frame: 1200, model: "UM-12000TFL-1000", priceUSD: 138904.00, label: "UM 1000kVA/1200 Frame" },
  { id: "UM-12000TFL-1100", type: "UM", capacity: 1100, frame: 1200, model: "UM-12000TFL-1100", priceUSD: 144657.00, label: "UM 1100kVA/1200 Frame" },
  { id: "UM-12000TFL-1200", type: "UM", capacity: 1200, frame: 1200, model: "UM-12000TFL-1200", priceUSD: 151200.00, label: "UM 1200kVA/1200 Frame" },
];

const UPS_PRODUCTS: UPSProduct[] = [
  ...UPS_PRODUCTS_UR,
  ...UPS_PRODUCTS_UE,
  ...UPS_PRODUCTS_UM
];

// Battery specifications based on PRD table with rack configurations
const BATTERY_SPECS: BatterySpec[] = [
  {
    type: "SP12-18",
    endVoltage: 1.67,
    time5min: 114.03,
    time10min: 81.19,
    time15min: 62.88,
    time20min: 51.38,
    time30min: 37.78,
    time45min: 28.48,
    time1h: 22.70,
    time1_5h: 16.70,
    time2h: 13.48,
    time3h: 9.98,
    time5h: 6.49,
    time10h: 3.38,
    time20h: 1.82,
    priceUSD: 56,
    rackType: "A40-50",
    rackPrice: 1015.68,
    batteriesPerRack: 40
  },
  {
    type: "SP12-26",
    endVoltage: 1.67,
    time5min: 168.22,
    time10min: 112.35,
    time15min: 92.86,
    time20min: 77.68,
    time30min: 56.06,
    time45min: 39.91,
    time1h: 32.59,
    time1_5h: 23.31,
    time2h: 18.92,
    time3h: 14.12,
    time5h: 9.49,
    time10h: 4.90,
    time20h: 2.63,
    priceUSD: 78,
    rackType: "A40-50",
    rackPrice: 1015.68,
    batteriesPerRack: 40
  },
  {
    type: "SP12-38",
    endVoltage: 1.67,
    time5min: 149.30,
    time10min: 124.75,
    time15min: 96.74,
    time20min: 80.16,
    time30min: 59.67,
    time45min: 44.04,
    time1h: 35.97,
    time1_5h: 28.06,
    time2h: 20.24,
    time3h: 12.93,
    time5h: 7.90,
    time10h: 4.15,
    time20h: 2.33,
    priceUSD: 87,
    rackType: "A40-50",
    rackPrice: 1015.68,
    batteriesPerRack: 40
  },
  {
    type: "SP12-42",
    endVoltage: 1.67,
    time5min: 265.78,
    time10min: 152.64,
    time15min: 121.67,
    time20min: 100.85,
    time30min: 75.15,
    time45min: 55.43,
    time1h: 45.29,
    time1_5h: 33.33,
    time2h: 26.96,
    time3h: 19.96,
    time5h: 12.98,
    time10h: 6.76,
    time20h: 3.65,
    priceUSD: 110,
    rackType: "A40-50",
    rackPrice: 1015.68,
    batteriesPerRack: 40
  },
  {
    type: "SP12-50",
    endVoltage: 1.67,
    time5min: 187.80,
    time10min: 159.36,
    time15min: 123.65,
    time20min: 102.46,
    time30min: 76.32,
    time45min: 56.34,
    time1h: 46.05,
    time1_5h: 35.91,
    time2h: 25.90,
    time3h: 16.54,
    time5h: 10.10,
    time10h: 5.30,
    time20h: 2.92,
    priceUSD: 122,
    rackType: "A40-50",
    rackPrice: 1015.68,
    batteriesPerRack: 40
  },
  {
    type: "SP12-65",
    endVoltage: 1.67,
    time5min: 431.88,
    time10min: 236.85,
    time15min: 188.95,
    time20min: 156.56,
    time30min: 116.65,
    time45min: 86.04,
    time1h: 70.28,
    time1_5h: 51.73,
    time2h: 41.84,
    time3h: 30.99,
    time5h: 20.15,
    time10h: 10.49,
    time20h: 5.67,
    priceUSD: 167,
    rackType: "A40-100",
    rackPrice: 1269.60,
    batteriesPerRack: 40
  },
  {
    type: "SP12-80",
    endVoltage: 1.67,
    time5min: 338.64,
    time10min: 235.66,
    time15min: 182.73,
    time20min: 151.40,
    time30min: 112.81,
    time45min: 83.26,
    time1h: 68.03,
    time1_5h: 53.06,
    time2h: 38.28,
    time3h: 24.44,
    time5h: 14.92,
    time10h: 7.84,
    time20h: 4.32,
    priceUSD: 168.32,
    rackType: "A40-100",
    rackPrice: 1269.60,
    batteriesPerRack: 40
  },
  {
    type: "SP12-100",
    endVoltage: 1.67,
    time5min: 425.25,
    time10min: 297.44,
    time15min: 230.64,
    time20min: 191.03,
    time30min: 142.36,
    time45min: 105.05,
    time1h: 85.84,
    time1_5h: 66.96,
    time2h: 48.32,
    time3h: 30.85,
    time5h: 18.84,
    time10h: 9.89,
    time20h: 5.45,
    priceUSD: 191,
    rackType: "A50-100",
    rackPrice: 1523.52,
    batteriesPerRack: 40
  },
  {
    type: "SP12-120",
    endVoltage: 1.67,
    time5min: 349.14,
    time10min: 318.25,
    time15min: 247.01,
    time20min: 204.62,
    time30min: 152.46,
    time45min: 112.54,
    time1h: 92.00,
    time1_5h: 71.76,
    time2h: 51.75,
    time3h: 33.04,
    time5h: 20.18,
    time10h: 10.60,
    time20h: 5.84,
    priceUSD: 247,
    rackType: "A50-150",
    rackPrice: 1777.44,
    batteriesPerRack: 40
  },
  {
    type: "SP12-150",
    endVoltage: 1.67,
    time5min: 466.56,
    time10min: 379.61,
    time15min: 294.52,
    time20min: 244.01,
    time30min: 181.74,
    time45min: 134.18,
    time1h: 109.69,
    time1_5h: 85.55,
    time2h: 61.73,
    time3h: 39.41,
    time5h: 24.08,
    time10h: 12.64,
    time20h: 6.97,
    priceUSD: 302,
    rackType: "A40-150",
    rackPrice: 1650.48,
    batteriesPerRack: 40
  },
  {
    type: "SP12-200",
    endVoltage: 1.67,
    time5min: 528.84,
    time10min: 430.44,
    time15min: 334.18,
    time20min: 276.83,
    time30min: 206.32,
    time45min: 152.34,
    time1h: 124.53,
    time1_5h: 97.13,
    time2h: 70.10,
    time3h: 44.76,
    time5h: 27.35,
    time10h: 14.35,
    time20h: 7.92,
    priceUSD: 368,
    rackType: "A40-200",
    rackPrice: 1974,
    batteriesPerRack: 40
  },
  {
    type: "SP12-250",
    endVoltage: 1.67,
    time5min: 659.04,
    time10min: 536.77,
    time15min: 416.74,
    time20min: 345.32,
    time30min: 257.35,
    time45min: 190.02,
    time1h: 155.35,
    time1_5h: 121.16,
    time2h: 87.46,
    time3h: 55.84,
    time5h: 34.11,
    time10h: 17.91,
    time20h: 9.88,
    priceUSD: 401,
    rackType: "A40-250",
    rackPrice: 2356,
    batteriesPerRack: 40
  }
];

// BCB-BOX options with exact USD prices from screenshot
const BCB_BOXES: BCBBox[] = [
  {
    id: "BCB-BOX-100A",
    label: "BCB-BOX-100A",
    priceUSD: 862,
    description: "4-позиционный автомат 100A, 750 V DC, Корпус 600 x 200 x 700 мм"
  },
  {
    id: "BCB-BOX-160A",
    label: "BCB-BOX-160A",
    priceUSD: 937,
    description: "4-позиционный автомат 160A, 750 V DC, Корпус 600 x 200 x 700 мм"
  },
  {
    id: "BCB-BOX-250A",
    label: "BCB-BOX-250A",
    priceUSD: 1012,
    description: "4-позиционный автомат 250A, 750 V DC, габариты 600 x 200 x 700 мм"
  },
  {
    id: "BCB-BOX-400A",
    label: "BCB-BOX-400A",
    priceUSD: 1611,
    description: "4-позиционный автомат 400A, 750 V DC, габариты 600 x 200 x 700 мм"
  },
  {
    id: "BCB-BOX-630A",
    label: "BCB-BOX-630A",
    priceUSD: 2172,
    description: "4-позиционный автомат 630A, 750 V DC, габариты 600 x 200 x 700 мм"
  },
  {
    id: "BCB-BOX-800A",
    label: "BCB-BOX-800A",
    priceUSD: 2846,
    description: "4-позиционный автомат 800A, 750 V DC, габариты 600 x 200 x 700 мм"
  },
  {
    id: "BCB-BOX-1250A",
    label: "BCB-BOX-1250A",
    priceUSD: 4869,
    description: "4-позиционный автомат 1250A, 750 V DC, габариты 600 x 200 x 700 мм"
  },
  {
    id: "BCB-BOX-1600A",
    label: "BCB-BOX-1600A",
    priceUSD: 5244,
    description: "4-позиционный автомат 1600A, 750 V DC, габариты 600 x 200 x 700 мм"
  },
  {
    id: "2xBCB-BOX-1600A",
    label: "2xBCB-BOX-1600A*",
    priceUSD: 10488,
    description: "2x 4-позиционный автомат 1600A, 750 V DC, габариты 600 x 200 x 700 мм"
  }
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function UPSConfiguratorPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  // Configuration state
  const [selectedUPSType, setSelectedUPSType] = useState<UPSType | null>(null);
  const [selectedUMFrame, setSelectedUMFrame] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<UPSProduct | null>(null);
  const [selectedBatteryTime, setSelectedBatteryTime] = useState<BatteryTime | null>(null);
  const [selectedBatteryType, setSelectedBatteryType] = useState<BatteryType | null>(null);
  const [batteryQuantity, setBatteryQuantity] = useState<number>(1);
  const [selectedBCBBox, setSelectedBCBBox] = useState<BCBBox | null>(null);
  const [batteryRackQuantity, setBatteryRackQuantity] = useState<number>(1);
  
  // PNR (Commissioning Services) State
  const [selectedPNRService, setSelectedPNRService] = useState<PNRService | null>(null);
  const [selectedWarrantyOption, setSelectedWarrantyOption] = useState<string | null>(null);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward');
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarAnimation, setSidebarAnimation] = useState<'entering' | 'visible' | 'exiting' | 'hidden'>('hidden');

  // Step transition with animation
  const goToStep = (stepNumber: number, direction: 'forward' | 'backward' = 'forward') => {
    if (isAnimating || stepNumber === currentStep) return;
    
    setIsAnimating(true);
    setAnimationDirection(direction);
    
    setTimeout(() => {
      setCurrentStep(stepNumber);
      setTimeout(() => {
        setIsAnimating(false);
      }, 300); // Half of the animation duration
    }, 300);
  };

  const nextStep = () => {
    if (currentStep < 6) {
      goToStep(currentStep + 1, 'forward');
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1, 'backward');
    }
  };

  // Automatically calculate the appropriate BCB-BOX based on Excel data
  const calculateBCBBoxRequirement = (upsProduct: UPSProduct) => {
    if (!upsProduct) return null;

    // Получаем точную конфигурацию BCB-BOX из Excel файла
    const excelBCBConfig = getBCBBoxFromExcel(upsProduct.model);
    
    if (excelBCBConfig) {
      // Ищем соответствующий BCB-BOX в нашем массиве
      const bcbBox = BCB_BOXES.find(bcb => bcb.label === excelBCBConfig.bcb_box);
      
      if (bcbBox) {
        // Обновляем цену из Excel данных
        return {
          ...bcbBox,
          priceUSD: excelBCBConfig.price
        };
      }
    }

    // Fallback к старой логике, если данные не найдены в Excel
    if (upsProduct.capacity <= 15) {
      return BCB_BOXES.find(bcb => bcb.id === "BCB-BOX-100A") || null;
    } else if (upsProduct.capacity <= 30) {
      return BCB_BOXES.find(bcb => bcb.id === "BCB-BOX-160A") || null;
    } else if (upsProduct.capacity <= 60) {
      return BCB_BOXES.find(bcb => bcb.id === "BCB-BOX-250A") || null;
    } else if (upsProduct.capacity <= 120) {
      return BCB_BOXES.find(bcb => bcb.id === "BCB-BOX-400A") || null;
    } else if (upsProduct.capacity <= 250) {
      return BCB_BOXES.find(bcb => bcb.id === "BCB-BOX-630A") || null;
    } else if (upsProduct.capacity <= 400) {
      return BCB_BOXES.find(bcb => bcb.id === "BCB-BOX-800A") || null;
    } else if (upsProduct.capacity <= 800) {
      return BCB_BOXES.find(bcb => bcb.id === "BCB-BOX-1250A") || null;
    } else if (upsProduct.capacity <= 1200) {
      return BCB_BOXES.find(bcb => bcb.id === "BCB-BOX-1600A") || null;
    } else {
      return BCB_BOXES.find(bcb => bcb.id === "2xBCB-BOX-1600A") || null;
    }
  };

  // Calculate required battery configuration automatically based on Excel table
  const calculateBatteryRequirements = (upsProduct: UPSProduct, backupTime: BatteryTime) => {
    // Получаем точную конфигурацию из Excel файла
    const excelConfig = getBatteryConfigFromExcel(upsProduct.model, backupTime, upsProduct.capacity);
    
    if (excelConfig) {
      // Используем данные из Excel файла
      const batterySpec = BATTERY_SPECS.find(spec => spec.type === excelConfig.type);
      if (batterySpec) {
        const requiredRacks = Math.ceil(excelConfig.quantity / 40);
        return {
          quantity: excelConfig.quantity,
          racks: requiredRacks,
          spec: batterySpec
        };
      }
    }

    // Если конфигурация не найдена в данных Excel, возвращаем null.
    // Это делает файл Excel единственным источником истины.
    return null;
  };

  // Auto-calculate rack requirements based on battery count
  const calculateRackRequirements = (batteryCount: number, batteryType: BatteryType) => {
    const batterySpec = BATTERY_SPECS.find(spec => spec.type === batteryType);
    if (!batterySpec) return null;

    // Formula: 1 rack per 40 batteries (as per PRD)
    const requiredRacks = Math.ceil(batteryCount / 40);

    return {
      rackCount: requiredRacks,
      rackType: batterySpec.rackType,
      rackPrice: batterySpec.rackPrice,
      totalRackCost: batterySpec.rackPrice * requiredRacks,
      batteriesPerRack: 40 // Always 40 as per PRD formula
    };
  };

  // Auto-calculate battery requirements when UPS and time are selected
  const batteryRequirements = useMemo(() => {
    if (selectedProduct && selectedBatteryTime) {
      return calculateBatteryRequirements(selectedProduct, selectedBatteryTime);
    }
    return null;
  }, [selectedProduct, selectedBatteryTime]);

  // Auto-update battery configuration when requirements are calculated
  React.useEffect(() => {
    if (batteryRequirements) {
      setSelectedBatteryType(batteryRequirements.spec.type);
      setBatteryQuantity(batteryRequirements.quantity);
      setBatteryRackQuantity(batteryRequirements.racks);
    }
  }, [batteryRequirements]);

  // Auto-update BCB-BOX when UPS product is selected
  React.useEffect(() => {
    if (selectedProduct) {
      const recommendedBCBBox = calculateBCBBoxRequirement(selectedProduct);
      if (recommendedBCBBox) {
        setSelectedBCBBox(recommendedBCBBox);
      }
    }
  }, [selectedProduct]);

  // Force re-render when battery type selection changes
  React.useEffect(() => {
    // This effect ensures the UI updates when selectedBatteryType changes
    if (selectedBatteryType) {
      // Trigger a re-render by updating a timestamp or similar
      const updateTimestamp = Date.now();
      // The component will re-render due to the selectedBatteryType dependency
    }
  }, [selectedBatteryType]);

  const resetConfiguration = () => {
    setSelectedUPSType(null);
    setSelectedUMFrame(null);
    setSelectedProduct(null);
    setSelectedBatteryTime(null);
    setSelectedBatteryType(null);
    setBatteryQuantity(1);
    setSelectedBCBBox(null);
    setBatteryRackQuantity(1);
    setSelectedPNRService(null);
    setSelectedWarrantyOption(null);
    goToStep(1, 'forward');

    // Hide sidebar with animation
    if (showSidebar) {
      setSidebarAnimation('exiting');
      setTimeout(() => {
        setShowSidebar(false);
        setSidebarAnimation('hidden');
      }, 500); // match animation duration
    }
  };

  const handleUPSTypeChange = (type: UPSType) => {
    setSelectedUPSType(type);
    setSelectedUMFrame(null);
    setSelectedProduct(null);
    setSelectedBatteryTime(null);
    setSelectedBatteryType(null);
    setBatteryQuantity(1);
    setBatteryRackQuantity(1);
    
    // Auto-scroll to frame section for UM type
    if (type === 'UM') {
      // Immediate scroll first
      setTimeout(() => {
        const frameSection = document.getElementById('um-frame-section');
        if (frameSection) {
          frameSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 50); // Minimal delay
      
      // Second more aggressive scroll to ensure visibility
      setTimeout(() => {
        const frameSection = document.getElementById('um-frame-section');
        if (frameSection) {
          window.scrollTo({
            top: frameSection.offsetTop - 100,
            behavior: 'smooth'
          });
          
          // Add pulse animation class only once when UM is selected
          frameSection.classList.add('frame-section-highlight');
          
          // Remove the animation class after it completes
          setTimeout(() => {
            frameSection.classList.remove('frame-section-highlight');
          }, 1500); // Match animation duration
        }
      }, 100);
    }
    
    // Remove automatic progression - let user click Next
  };

  const handleUMFrameChange = (frame: number) => {
    setSelectedUMFrame(frame);
    setSelectedProduct(null);
    setSelectedBatteryTime(null);
    setSelectedBatteryType(null);
    setBatteryQuantity(1);
    setBatteryRackQuantity(1);
    // No pulse animation here - only state change
  };

  const handleProductSelect = (product: UPSProduct) => {
    setSelectedProduct(product);
    setSelectedBatteryTime(null);
    setSelectedBatteryType(null);
    setBatteryQuantity(1);
    setBatteryRackQuantity(1);
    
    // Запуск анимации сайдбара
    if (!showSidebar) {
      setShowSidebar(true);
      setSidebarAnimation('entering');
      setTimeout(() => setSidebarAnimation('visible'), 500);
    }
    
    // Remove automatic progression - let user click Next
  };

  const handleBatteryTimeSelect = (time: BatteryTime) => {
    setSelectedBatteryTime(time);
    // Remove automatic progression - let user click Next
  };

  const handleBatteryTypeSelect = (type: BatteryType) => {
    setSelectedBatteryType(type);
    
    // При выборе пользователем батарей, нужно рассчитать правильную конфигурацию
    if (selectedProduct && selectedBatteryTime) {
      const selectedBatterySpec = BATTERY_SPECS.find(spec => spec.type === type);
      if (selectedBatterySpec) {
        // Проверяем, это ли рекомендуемый тип из конфигурации
        const recommendedConfig = calculateBatteryRequirements(selectedProduct, selectedBatteryTime);
        
        if (recommendedConfig && type === recommendedConfig.spec.type) {
          // Если выбран рекомендуемый тип, используем количество из конфигурации
          setBatteryQuantity(recommendedConfig.quantity);
          setBatteryRackQuantity(recommendedConfig.racks);
        } else {
          // Для других типов рассчитываем количество на основе мощности ИБП
          const calculatedQuantity = calculateBatteryQuantityForType(selectedProduct, selectedBatteryTime, type);
          const calculatedRacks = Math.ceil(calculatedQuantity / 40);
          setBatteryQuantity(calculatedQuantity);
          setBatteryRackQuantity(calculatedRacks);
        }
      }
    }
    
    // Remove automatic progression - let user click Next
  };

  const handleBCBBoxSelect = (bcbBox: BCBBox) => {
    setSelectedBCBBox(bcbBox);
    // Remove automatic progression - let user click Next
  };

  // Filter products based on selected UPS type and frame
  const filteredProducts = useMemo(() => {
    let products = UPS_PRODUCTS;
    
    if (selectedUPSType) {
      products = products.filter(p => p.type === selectedUPSType);
    }
    
    // For UM type, filter by selected frame
    if (selectedUPSType === 'UM' && selectedUMFrame) {
      products = products.filter(p => p.frame === selectedUMFrame);
    }
    
    if (searchTerm) {
      products = products.filter(p => 
        p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.model.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return products;
  }, [selectedUPSType, selectedUMFrame, searchTerm]);

  // Get available frames for UM type
  const availableUMFrames = useMemo(() => {
    if (selectedUPSType !== 'UM') return [];
    
    const frames = UPS_PRODUCTS
      .filter(p => p.type === 'UM')
      .map(p => p.frame)
      .filter((frame, index, self) => self.indexOf(frame) === index)
      .sort((a, b) => a - b);
    
    return frames;
  }, [selectedUPSType]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    let total = 0;
    
    if (selectedProduct) {
      total += selectedProduct.priceUSD;
    }
    
    if (selectedBatteryType) {
      const batterySpec = BATTERY_SPECS.find(spec => spec.type === selectedBatteryType);
      if (batterySpec) {
        total += batterySpec.priceUSD * batteryQuantity;
        total += batterySpec.rackPrice * batteryRackQuantity;
      }
    }
    
    if (selectedBCBBox) {
      total += selectedBCBBox.priceUSD;
    }
    
    if (selectedPNRService) {
      total += selectedPNRService.price;
    }
    
    if (selectedWarrantyOption && selectedProduct) {
      total += calculateWarrantyPrice(selectedProduct.priceUSD, selectedWarrantyOption);
    }
    
    return total;
  }, [selectedProduct, selectedBatteryType, batteryQuantity, selectedBCBBox, batteryRackQuantity, selectedPNRService, selectedWarrantyOption]);

  // Handle sidebar animation on step 6
  React.useEffect(() => {
    if (currentStep === 6 && showSidebar) {
      setSidebarAnimation('exiting');
      setTimeout(() => {
        setShowSidebar(false);
        setSidebarAnimation('hidden');
      }, 500);
    }
  }, [currentStep, showSidebar]);

  // Function to save UPS quote to backend
  const saveUPSQuote = async () => {
    if (!token || !selectedProduct) {
      console.warn("Cannot save UPS quote: Missing token or selected product");
      return;
    }

    try {
      // Create quote name with timestamp
      const currentDate = new Date();
      const modelName = selectedProduct.model || 'UPS';
      const quoteName = `UPS: ${modelName} - ${currentDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

      // Prepare UPS configuration data
      const upsConfigData = {
        selectedProduct,
        selectedBatteryTime: selectedBatteryTime,
        bcbBoxConfig: selectedBCBBox,
        selectedPNRService: selectedPNRService,
        selectedWarrantyOption: selectedWarrantyOption,
        totalCost: totalCost,
        // Include all relevant configuration states
        selectedUPSType,
        selectedUMFrame,
        searchTerm,
        currentStep,
        showSidebar,
        sidebarAnimation
      };

      const newQuotePayload = {
        quoteName: quoteName,
        date: currentDate.toISOString(),
        totalCost: totalCost,
        configData: upsConfigData,
        quoteType: 'UPS' as const
      };

      console.log('Saving UPS quote:', newQuotePayload);

      const response = await fetch('/wp-json/partner-zone/v1/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newQuotePayload),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: await response.text() };
        }
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const responseData = await response.json();
      console.log("UPS Quote saved successfully:", responseData);
      
      // Redirect to dashboard after successful save
      navigate('/dashboard');

    } catch (error: any) {
      console.error("Error saving UPS quote:", error);
      alert(`Не удалось сохранить котировку UPS: ${error.message}`);
    }
  };

  // Helper function to add page numbers to PDF
  const addPageNumbers = async (pdfDoc: PDFDocument) => {
    const pages = pdfDoc.getPages();
    const pageCount = pages.length;
    
    for (let i = 0; i < pageCount; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const pageNumber = `${i + 1} / ${pageCount}`;
      
      page.drawText(pageNumber, {
        x: width - 80,
        y: 20,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  };

  const generateQuote = async () => {
    if (!selectedProduct) return;
    
    try {
      // Create PDF with professional setup
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true
      });

      // Set up fonts and colors
      const primaryColor = '#8AB73A';
      const secondaryColor = '#333333';
      const accentColor = '#0A2B6C';
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Function to check and add new page if content overflows
      const checkPageBreak = (currentY: number, elementHeight: number = 20) => {
        if (currentY + elementHeight > pageHeight - margin) {
          doc.addPage();
          return margin; // Reset Y to top margin on new page
        }
        return currentY;
      };

      // Add Cyrillic font support
      try {
        doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', 'Roboto', 'normal');
        doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', 'Roboto', 'bold');
        doc.setFont('Roboto');
      } catch (fontError) {
        console.warn('Could not load custom fonts, using default');
        doc.setFont('helvetica');
      }

      let y = margin;

      // Helper function for text wrapping
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12, align: 'left' | 'center' | 'right' = 'left', fontStyle: 'normal' | 'bold' = 'normal') => {
        doc.setFontSize(fontSize);
        doc.setFont('Roboto', fontStyle);
        const lines = doc.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.5;
        
        if (align === 'center') {
          lines.forEach((line: string) => {
            const textWidth = doc.getStringUnitWidth(line) * fontSize / doc.internal.scaleFactor;
            doc.text(line, x + (maxWidth - textWidth) / 2, y);
            y += lineHeight;
          });
        } else if (align === 'right') {
          lines.forEach((line: string) => {
            const textWidth = doc.getStringUnitWidth(line) * fontSize / doc.internal.scaleFactor;
            doc.text(line, x + maxWidth - textWidth, y);
            y += lineHeight;
          });
        } else {
          doc.text(lines, x, y);
          y += lines.length * lineHeight;
        }
        return y;
      };

      // Helper function for adding table rows
      const addTableRow = (label: string, value: string, currentY: number, labelWidthPercent = 0.5) => {
        const currentFontSize = 11;
        doc.setFontSize(currentFontSize);
        doc.setTextColor(secondaryColor);

        const labelMaxWidth = contentWidth * labelWidthPercent - 2;
        const valueX = margin + contentWidth * labelWidthPercent;
        const valueMaxWidth = contentWidth * (1 - labelWidthPercent) - 2;
        
        const labelYStart = currentY;
        doc.setFont('Roboto', 'bold');
        const labelLines = doc.splitTextToSize(label, labelMaxWidth);
        const labelLineHeight = currentFontSize * 0.5;
        doc.text(labelLines, margin, labelYStart);
        const labelHeight = labelLines.length * labelLineHeight;
        
        doc.setFont('Roboto', 'normal');
        const valueTrimmed = value.trim();
        const valueLines = doc.splitTextToSize(valueTrimmed, valueMaxWidth);
        const valueLineHeight = currentFontSize * 0.5;
        doc.text(valueLines, valueX, labelYStart);
        const valueHeight = valueLines.length * valueLineHeight;

        return labelYStart + Math.max(labelHeight, valueHeight) + 4;
      };

      // Helper function for adding section headers
      const addSectionHeader = (text: string, currentY: number) => {
        doc.setTextColor(primaryColor);
        doc.setFontSize(14);
        doc.setFont('Roboto', 'bold');
        doc.text(text, margin, currentY);
        
        // Add underline
        const textWidth = doc.getStringUnitWidth(text) * 14 / doc.internal.scaleFactor;
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY + 2, margin + textWidth, currentY + 2);
        
        return currentY + 10;
      };

      // Add Logo
      const logoUrl = `${import.meta.env.BASE_URL}logologo.png`;
      const logoWidth = 40;
      const logoHeight = 15;
      const logoX = pageWidth - margin - logoWidth;
      const logoY = margin - 5;
      try {
        doc.addImage(logoUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
      } catch (imgError) {
        console.error("Error adding logo to PDF:", imgError);
      }

      // Title
      doc.setTextColor(primaryColor);
      doc.setFontSize(24);
      doc.setFont('Roboto', 'bold');
      const title = 'Спецификация системы ИБП';
      const titleY = margin + (logoHeight > 10 ? 10 : 0);
      doc.text(title, margin, titleY);
      y = titleY + 15;

      // Date
      doc.setTextColor(secondaryColor);
      doc.setFontSize(12);
      doc.setFont('Roboto', 'normal');
      const dateStr = new Date().toLocaleDateString('ru-RU', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.text(dateStr, margin, y);
      y += 15;

      // UPS Configuration Section
      y = addSectionHeader('Конфигурация ИБП', y);
      
      y = addTableRow('Тип ИБП:', selectedUPSType === 'UR' ? 'Стоечный (UR)' : 
                                 selectedUPSType === 'UE' ? 'Напольный (UE)' : 
                                 'Модульный (UM)', y);
      y = addTableRow('Модель:', selectedProduct.model, y);
      y = addTableRow('Мощность:', `${selectedProduct.capacity} кВА`, y);
      y = addTableRow('Стоимость ИБП:', formatCurrency(selectedProduct.priceUSD), y);
      y += 8;

      // Battery Configuration Section
      if (selectedBatteryTime && selectedBatteryType) {
        y = checkPageBreak(y, 40); // Check space for section header + some rows
        y = addSectionHeader('Конфигурация батарей', y);
        
        y = addTableRow('Время автономии:', `${selectedBatteryTime} минут`, y);
        y = addTableRow('Тип батареи:', selectedBatteryType, y);
        y = addTableRow('Количество батарей:', `${batteryQuantity} шт.`, y);
        
        const batterySpec = BATTERY_SPECS.find(spec => spec.type === selectedBatteryType);
        if (batterySpec) {
          y = checkPageBreak(y, 4 * 10);
          y = addTableRow('Стоимость батарей:', formatCurrency(batterySpec.priceUSD * batteryQuantity), y);
          y = addTableRow('Тип стеллажа:', batterySpec.rackType, y);
          y = addTableRow('Количество стеллажей:', `${batteryRackQuantity} шт.`, y);
          y = addTableRow('Стоимость стеллажей:', formatCurrency(batterySpec.rackPrice * batteryRackQuantity), y);
        }
        y += 8;
      }

      // BCB-BOX Section
      if (selectedBCBBox) {
        y = checkPageBreak(y, 30);
        y = addSectionHeader('BCB-BOX (Блок контроля батарей)', y);
        y = addTableRow('Модель:', selectedBCBBox.label, y);
        y = addTableRow('Стоимость:', formatCurrency(selectedBCBBox.priceUSD), y);
        y += 8;
      }

      // PNR Services Section
      if (selectedPNRService) {
        y = checkPageBreak(y, 35);
        y = addSectionHeader('Пуско-наладочные работы (ПНР)', y);
        y = addTableRow('Услуга:', selectedPNRService.article, y);
        y = addTableRow('Описание:', selectedPNRService.description, y);
        y = addTableRow('Стоимость ПНР:', `$${selectedPNRService.price.toFixed(2)}`, y);
        y += 8;
      }

      // Warranty Section
      if (selectedWarrantyOption && selectedProduct) {
        const option = WARRANTY_OPTIONS.find(opt => opt.id === selectedWarrantyOption);
        if (option) {
          y = checkPageBreak(y, 40);
          y = addSectionHeader('Расширенная гарантия', y);
          y = addTableRow('Опция:', option.name, y);
          y = addTableRow('Описание:', option.description, y);
          const warrantyPrice = calculateWarrantyPrice(selectedProduct.priceUSD, selectedWarrantyOption);
          y = addTableRow('Стоимость гарантии:', `$${warrantyPrice.toFixed(2)}`, y);
          y += 8;
        }
      }

      // Add separator line
      y = checkPageBreak(y, 20);
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Total Cost
      y = checkPageBreak(y, 20);
      doc.setTextColor(primaryColor);
      doc.setFontSize(18);
      doc.setFont('Roboto', 'bold');
      const totalText = `Общая стоимость: ${formatCurrency(totalCost)}`;
      doc.text(totalText, margin, y);
      y += 15;

      // Footer - removed disclaimer text as requested

      // Save the generated PDF to bytes for merging
      const generatedPdfBytes = doc.output('arraybuffer');

      // Try to fetch and merge with UPS specification PDF
      try {
        let finalPdfBytes = generatedPdfBytes;
        
        if (selectedProduct) {
          const imageMapping = getUPSImageMapping(selectedProduct.type, selectedProduct.frame, selectedProduct.capacity);
          
          console.log('Selected UPS:', { 
            type: selectedProduct.type, 
            frame: selectedProduct.frame, 
            capacity: selectedProduct.capacity,
            model: selectedProduct.model 
          });
          console.log('Image mapping:', imageMapping);
          console.log('Trying to fetch PDF from:', imageMapping.documentationUrl);
          
          try {
            // Fetch the UPS specification PDF
            const specResponse = await fetch(imageMapping.documentationUrl);
            console.log('PDF fetch response status:', specResponse.status);
            
                          if (specResponse.ok) {
                const specPdfBytes = await specResponse.arrayBuffer();
                console.log('UPS specification PDF downloaded, size:', specPdfBytes.byteLength);
                
                // Merge PDFs using pdf-lib
                const mergedPdf = await PDFDocument.create();
                
                // Add quote pages first
                const quotePdfDoc = await PDFDocument.load(generatedPdfBytes);
                const quotePages = await mergedPdf.copyPages(quotePdfDoc, quotePdfDoc.getPageIndices());
                console.log('Quote pages count:', quotePages.length);
                quotePages.forEach(page => mergedPdf.addPage(page));
                
                // Add specification pages
                const specPdfDoc = await PDFDocument.load(specPdfBytes);
                const specPages = await mergedPdf.copyPages(specPdfDoc, specPdfDoc.getPageIndices());
                console.log('Specification pages count:', specPages.length);
                specPages.forEach(page => mergedPdf.addPage(page));
                
                // Add page numbers to merged document
                await addPageNumbers(mergedPdf);
                console.log('Page numbers added');
                
                finalPdfBytes = await mergedPdf.save();
                console.log('Final merged PDF size:', finalPdfBytes.byteLength);
                
                console.log('Successfully merged quote with UPS specification');
            }
          } catch (mergeError) {
            console.warn('Could not merge with specification PDF:', mergeError);
            // Fallback: just add page numbers to quote
            const quotePdfDoc = await PDFDocument.load(generatedPdfBytes);
            await addPageNumbers(quotePdfDoc);
            finalPdfBytes = await quotePdfDoc.save();
          }
        }
        
        // Download the final PDF
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const fileName = `UPS_Specification_${selectedProduct.model}_${new Date().toISOString().split('T')[0]}.pdf`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
      } catch (error) {
        console.error('Error processing PDF:', error);
        // Fallback: save original jsPDF
        const fileName = `UPS_Specification_${selectedProduct.model}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Ошибка при создании PDF. Пожалуйста, попробуйте еще раз.');
    }
  };

  // Step Components
  const StepUPSType = () => (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#8AB73A] rounded-full mb-4">
          <div className="text-3xl font-bold text-white">1</div>
        </div>
        <h2 className="text-4xl font-bold text-white mb-2">Выберите тип ИБП</h2>
        <p className="text-white/80 text-xl max-w-3xl mx-auto">
          Каждый тип ИБП предназначен для различных условий установки и требований
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {(['UR', 'UE', 'UM'] as UPSType[]).map((type) => {
          const isSelected = selectedUPSType === type;
          return (
            <div
              key={type}
              onClick={() => handleUPSTypeChange(type)}
              className="group relative cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br rounded-2xl transition-all duration-300 blur-xl ${
                isSelected 
                  ? 'from-[#8AB73A]/30 to-[#8AB73A]/10 opacity-100' 
                  : 'from-[#8AB73A]/20 to-transparent opacity-0 group-hover:opacity-100'
              }`}></div>
              <div className={`relative p-8 backdrop-blur-sm border-2 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl ${
                isSelected
                  ? 'bg-gradient-to-br from-[#8AB73A]/20 to-[#061640]/80 border-[#8AB73A] shadow-[#8AB73A]/30'
                  : 'bg-gradient-to-br from-[#061640]/80 to-[#0A2B6C]/60 border-white/20 hover:border-[#8AB73A] hover:bg-gradient-to-br hover:from-[#8AB73A]/10 hover:to-[#061640]/80 hover:shadow-[#8AB73A]/20'
              }`}>
                
                <div className="text-center space-y-6">
                  {/* Icon/Visual Element */}
                  <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-colors ${
                    isSelected 
                      ? 'bg-[#8AB73A]/30' 
                      : 'bg-[#8AB73A]/20 group-hover:bg-[#8AB73A]/30'
                  }`}>
                    <div className={`text-5xl font-bold transition-colors ${
                      isSelected ? 'text-white' : 'text-[#8AB73A] group-hover:text-white'
                    }`}>
                      {type}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <h3 className={`text-2xl font-bold transition-colors ${
                      isSelected ? 'text-white' : 'text-white group-hover:text-[#8AB73A]'
                    }`}>
                      {type === 'UR' ? 'Стоечный' : type === 'UE' ? 'Напольный' : 'Модульный'}
                    </h3>
                    <p className={`text-lg transition-colors ${
                      isSelected ? 'text-white/90' : 'text-white/70 group-hover:text-white/90'
                    }`}>
                      {type === 'UR' ? 'Для монтажа в 19" стойку' : 
                       type === 'UE' ? 'Напольная установка' : 
                       'Модульная архитектура'}
                    </p>
                  </div>

                  {/* Features */}
                  <div className={`space-y-2 text-sm transition-colors ${
                    isSelected ? 'text-white/80' : 'text-white/70 group-hover:text-white/80'
                  }`}>
                    {type === 'UR' && (
                      <>
                        <div>• Компактное решение</div>
                        <div>• 10-40 кВА</div>
                        <div>• Стандартная стойка</div>
                      </>
                    )}
                    {type === 'UE' && (
                      <>
                        <div>• Автономная установка</div>
                        <div>• 10-800 кВА</div>
                        <div>• Простая установка</div>
                      </>
                    )}
                    {type === 'UM' && (
                      <>
                        <div>• Масштабируемость</div>
                        <div>• 15-1200 кВА</div>
                        <div>• Высокая мощность</div>
                      </>
                    )}
                  </div>

                  {/* Action indicator */}
                  <div className={`pt-4 transition-opacity ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className={`font-semibold flex items-center justify-center ${
                      isSelected ? 'text-white' : 'text-[#8AB73A]'
                    }`}>
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Выбрано
                        </>
                      ) : (
                        <>
                          Выбрать <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* UM Frame Selection */}
      {selectedUPSType === 'UM' && (
        <div 
          id="um-frame-section" 
          className="space-y-6"
        >
          {/* Visual Separator */}
          <div className="flex items-center justify-center py-4">
            <div className="h-px bg-gradient-to-r from-transparent via-[#8AB73A]/50 to-transparent w-full max-w-md animate-pulse"></div>
            <div className="mx-4 text-[#8AB73A] text-sm font-bold tracking-wider animate-pulse">FRAME</div>
            <div className="h-px bg-gradient-to-r from-transparent via-[#8AB73A]/50 to-transparent w-full max-w-md animate-pulse"></div>
          </div>
          
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-white">Выберите тип корпуса (Frame)</h3>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              Каждый корпус поддерживает определённый диапазон мощностей и конфигураций
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {availableUMFrames.map((frame) => {
              const isFrameSelected = selectedUMFrame === frame;
              const frameProducts = UPS_PRODUCTS.filter(p => p.type === 'UM' && p.frame === frame);
              const minCapacity = Math.min(...frameProducts.map(p => p.capacity));
              const maxCapacity = Math.max(...frameProducts.map(p => p.capacity));
              
              return (
                <div
                  key={frame}
                  onClick={() => handleUMFrameChange(frame)}
                  className="group relative cursor-pointer"
                >
                  <div className={`absolute inset-0 rounded-xl transition-all duration-300 blur-lg ${
                    isFrameSelected 
                      ? 'bg-gradient-to-br from-[#8AB73A]/40 to-[#60a5fa]/30 opacity-100' 
                      : 'bg-gradient-to-br from-[#8AB73A]/20 to-transparent opacity-0 group-hover:opacity-100'
                  }`}></div>
                  
                  <div className={`relative p-4 backdrop-blur-sm border-2 rounded-xl transition-all duration-300 ${
                    isFrameSelected
                      ? 'bg-gradient-to-br from-[#8AB73A]/30 to-[#60a5fa]/20 border-[#8AB73A] shadow-lg shadow-[#8AB73A]/40'
                      : 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 group-hover:border-[#8AB73A]/50 group-hover:bg-gradient-to-br group-hover:from-[#8AB73A]/20 group-hover:to-[#60a5fa]/10'
                  }`}>
                    
                    <div className="text-center space-y-2">
                      <div className={`text-xl font-bold transition-colors ${
                        isFrameSelected ? 'text-white' : 'text-[#8AB73A] group-hover:text-white'
                      }`}>
                        Frame {frame}
                      </div>
                      
                      <div className={`text-xs transition-colors ${
                        isFrameSelected ? 'text-white/80' : 'text-white/60 group-hover:text-white/80'
                      }`}>
                        {minCapacity}-{maxCapacity} кВА
                      </div>
                      
                      <div className={`text-xs font-medium transition-colors ${
                        isFrameSelected ? 'text-white/70' : 'text-white/50 group-hover:text-white/70'
                      }`}>
                        {frameProducts.length} модел{frameProducts.length === 1 ? 'ь' : frameProducts.length < 5 ? 'и' : 'ей'}
                      </div>
                      
                      {isFrameSelected && (
                        <div className="flex items-center justify-center pt-1">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center pt-8">
        <div className="text-white/60 text-sm">
          Нужна помощь с выбором? Свяжитесь с нашими специалистами
        </div>
      </div>
    </div>
  );

  const StepUPSCapacity = () => (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#8AB73A] to-[#60a5fa] rounded-2xl mb-6 shadow-2xl shadow-[#8AB73A]/30">
          <div className="text-3xl font-bold text-white">2</div>
        </div>
        <h2 className="text-5xl font-bold bg-gradient-to-r from-white via-white to-[#8AB73A] bg-clip-text text-transparent">
          Выберите мощность ИБП
        </h2>
        <div className="bg-gradient-to-r from-[#061640]/80 to-[#0A2B6C]/60 backdrop-blur-sm rounded-2xl px-8 py-4 inline-flex items-center space-x-4 border border-white/20">
          <div className="w-4 h-4 bg-[#8AB73A] rounded-full animate-pulse"></div>
          <span className="text-white/90 text-xl">
            Тип: <span className="font-bold text-[#8AB73A]">{selectedUPSType}</span> 
            ({selectedUPSType === 'UR' ? 'Стоечный' : selectedUPSType === 'UE' ? 'Напольный' : 'Модульный'})
          </span>
        </div>
      </div>
      
      {/* Enhanced Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#8AB73A]/20 to-[#60a5fa]/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
          <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-6 w-6 text-white/50" />
              <Input
                type="text"
                placeholder="Поиск по модели или мощности..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-14 h-14 bg-transparent border-none text-white placeholder-white/50 focus:ring-2 focus:ring-[#8AB73A]/50 text-lg rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Products Grid with Animation */}
      <div className="relative">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
            {filteredProducts.map((product, index) => {
              const isSelected = selectedProduct?.id === product.id;
              return (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className={`group relative cursor-pointer transition-all duration-500 transform hover:scale-105 ${
                    isSelected ? 'scale-105 z-10' : ''
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 rounded-3xl blur-2xl transition-all duration-500 ${
                    isSelected 
                      ? 'bg-gradient-to-br from-[#8AB73A]/50 to-[#60a5fa]/40 opacity-100 scale-110' 
                      : 'bg-gradient-to-br from-[#8AB73A]/20 to-[#60a5fa]/10 opacity-0 group-hover:opacity-70 group-hover:scale-105'
                  }`}></div>
                  
                  {/* Main Card */}
                  <div className={`relative backdrop-blur-xl border-2 rounded-2xl p-4 transition-all duration-500 ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#8AB73A]/30 to-[#60a5fa]/20 border-[#8AB73A] shadow-2xl shadow-[#8AB73A]/40'
                      : 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 group-hover:border-[#8AB73A]/50 group-hover:bg-gradient-to-br group-hover:from-[#8AB73A]/20 group-hover:to-[#60a5fa]/10'
                  }`}>
                    
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className={`text-2xl font-bold transition-colors duration-300 ${
                        isSelected ? 'text-white' : 'text-[#8AB73A] group-hover:text-white'
                      }`}>
                        {product.capacity}<span className="text-sm ml-1">kVA</span>
                      </div>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isSelected 
                          ? 'bg-white/20 rotate-12' 
                          : 'bg-[#8AB73A]/20 group-hover:bg-[#8AB73A]/40 group-hover:rotate-12'
                      }`}>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#8AB73A] group-hover:text-white transition-colors" />
                        )}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="space-y-2">
                      <div className={`transition-colors duration-300 ${
                        isSelected ? 'text-white' : 'text-white group-hover:text-white'
                      }`}>
                        <div className="text-sm font-bold mb-1">{product.model}</div>
                        <div className={`text-xs transition-colors ${
                          isSelected ? 'text-white/80' : 'text-white/60 group-hover:text-white/80'
                        }`}>
                          {product.type} Series
                        </div>
                      </div>

                      {product.type === 'UM' && (
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          isSelected 
                            ? 'bg-white/20 text-white' 
                            : 'bg-[#8AB73A]/20 text-[#8AB73A] group-hover:bg-white/20 group-hover:text-white'
                        }`}>
                          Frame {product.frame}
                        </div>
                      )}

                      {/* Features */}
                      <div className={`space-y-1 text-xs transition-colors ${
                        isSelected ? 'text-white/70' : 'text-white/60 group-hover:text-white/70'
                      }`}>
                        {product.type === 'UR' && (
                          <>
                            <div className="flex items-center space-x-1">
                              <div className="w-1 h-1 bg-[#8AB73A] rounded-full"></div>
                              <span>Rack Mount</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-1 h-1 bg-[#8AB73A] rounded-full"></div>
                              <span>High Efficiency</span>
                            </div>
                          </>
                        )}
                        {product.type === 'UE' && (
                          <>
                            <div className="flex items-center space-x-1">
                              <div className="w-1 h-1 bg-[#8AB73A] rounded-full"></div>
                              <span>Tower Design</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-1 h-1 bg-[#8AB73A] rounded-full"></div>
                              <span>Wide Input</span>
                            </div>
                          </>
                        )}
                        {product.type === 'UM' && (
                          <>
                            <div className="flex items-center space-x-1">
                              <div className="w-1 h-1 bg-[#8AB73A] rounded-full"></div>
                              <span>Modular</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-1 h-1 bg-[#8AB73A] rounded-full"></div>
                              <span>Hot-Swap</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Selection Animation */}
                    {isSelected && (
                      <div className="absolute inset-0 rounded-2xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#8AB73A]/20 to-[#60a5fa]/10 rounded-2xl animate-pulse"></div>
                      </div>
                    )}

                    {/* Action Indicator */}
                    <div className={`mt-3 text-center transition-all duration-300 ${
                      isSelected ? 'opacity-100 transform translate-y-0' : 'opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0'
                    }`}>
                      <div className={`text-xs font-semibold ${
                        isSelected ? 'text-[#8AB73A]' : 'text-white/70'
                      }`}>
                        {isSelected ? '✓ Выбрано' : 'Выбрать'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-white/50" />
            </div>
            <div className="text-white/60 text-xl mb-2">Модели не найдены</div>
            <div className="text-white/40 text-sm">Попробуйте изменить поисковый запрос</div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-4 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
          <div className="text-white/60 text-sm">
            Показано {filteredProducts.length} моделей для типа {selectedUPSType}
          </div>
          {selectedProduct && (
            <div className="flex items-center space-x-2 text-[#8AB73A] font-medium">
              <Check className="w-4 h-4" />
              <span>Выбрано: {selectedProduct.model}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const StepBatteryTime = () => {
    // Exact time values from the battery configuration table
    const batteryTimes = [5, 10, 15, 20, 30, 45, 60, 90] as BatteryTime[];
    const minTime = Math.min(...batteryTimes); // 5
    const maxTime = Math.max(...batteryTimes); // 90
    const currentTime = selectedBatteryTime || minTime;
    
    // Calculate battery fill percentage based on position in the array (not linear time)
    const currentIndex = selectedBatteryTime ? batteryTimes.indexOf(selectedBatteryTime) : 0;
    const batteryFillPercentage = selectedBatteryTime ? 
      Math.min(95, Math.max(15, ((currentIndex + 1) / batteryTimes.length) * 100)) : 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type } = e.target;
      
      // Special handling for range inputs - more flexible movement
      if (type === 'range') {
        const numValue = parseInt(value);
        
        // For batteryTime, allow more flexible selection
        if (name === 'batteryTime') {
          // Create threshold ranges for each battery time
          const thresholds = [
            { value: 5, range: [5, 7] },      // 5-7 → 5 min
            { value: 10, range: [8, 12] },    // 8-12 → 10 min  
            { value: 15, range: [13, 17] },   // 13-17 → 15 min
            { value: 20, range: [18, 25] },   // 18-25 → 20 min
            { value: 30, range: [26, 37] },   // 26-37 → 30 min
            { value: 45, range: [38, 52] },   // 38-52 → 45 min
            { value: 60, range: [53, 75] },   // 53-75 → 60 min
            { value: 90, range: [76, 90] }    // 76-90 → 90 min
          ];
          
          // Find which threshold range the current value falls into
          const selectedThreshold = thresholds.find(
            threshold => numValue >= threshold.range[0] && numValue <= threshold.range[1]
          );
          
          if (selectedThreshold) {
            handleBatteryTimeSelect(selectedThreshold.value as BatteryTime);
          }
        }
      }
    };

    return (
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white">Время резервирования</h2>
          <p className="text-white/70 text-lg">Выберите требуемое время поддержки</p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {/* Main battery configuration card */}
          <div className="bg-gradient-to-br from-[#061640]/80 to-[#0A2B6C]/60 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl">
            <div className="space-y-10">
              
              {/* Header with icon */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-[#8AB73A]/20 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#8AB73A]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Конфигурация АКБ</h3>
                  <p className="text-white/60">Настройка времени автономной работы</p>
                </div>
              </div>

              {/* Time display with battery animation */}
              <div className="bg-[#0A2B6C]/40 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-8">
                    {/* Animated battery icon - horizontal fill */}
                    <div className="relative">
                      {/* Battery outline */}
                      <div className="w-24 h-12 border-2 border-white/40 rounded-lg relative bg-black/20 flex items-center justify-center p-1 shadow-inner">
                        {/* Battery terminal */}
                        <div className="absolute -right-1.5 top-1/2 transform -translate-y-1/2 w-2 h-6 bg-white/40 rounded-r-sm"></div>
                        
                        {/* Battery fill animation - horizontal */}
                        <div 
                          className="absolute left-1 top-1 bottom-1 bg-gradient-to-r from-[#8AB73A] to-[#a5c954] rounded-md transition-all duration-700 ease-out shadow-lg shadow-[#8AB73A]/50"
                          style={{ 
                            width: `calc(${batteryFillPercentage}% - 8px)`,
                            opacity: batteryFillPercentage > 0 ? 1 : 0
                          }}
                        >
                          {/* Inner glow/shine effect */}
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent rounded-md"></div>
                        </div>
                        
                        {/* Segmented indicators */}
                        <div className="w-full h-full flex items-center justify-around space-x-1 px-1">
                          {[...Array(4)].map((_, i) => (
                            <div 
                              key={i}
                              className="h-full w-1 bg-black/30"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Time value - cleaner layout */}
                    <div className="text-left">
                      <div className="text-5xl font-bold text-[#8AB73A] leading-none">
                        {currentTime}
                      </div>
                      <div className="text-lg text-white/60 font-medium">минут</div>
                    </div>
                  </div>
                  
                  {/* Time range info - simplified */}
                  <div className="text-right">
                    <div className="text-white/50 text-sm">Время автономной работы</div>
                    <div className="text-[#8AB73A] font-semibold">
                      {minTime}-{maxTime} мин
                    </div>
                  </div>
                </div>
              </div>

              {/* Working slider with flexible movement */}
              <div className="space-y-6">
                <div className="flex justify-between text-sm text-white/50">
                  <span>Минимум</span>
                  <span>Максимум</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 font-medium text-sm">{minTime} мин</span>
                    <span className="text-white/70 font-medium text-sm">{maxTime} мин</span>
                  </div>
                  <input
                    type="range"
                    id="batteryTime"
                    name="batteryTime"
                    min={minTime}
                    max={maxTime}
                    step="1"
                    value={currentTime}
                    onChange={handleChange}
                    className="slider w-full"
                    style={{ "--progress": `${((currentTime - minTime) / (maxTime - minTime)) * 100}%` } as React.CSSProperties}
                  />
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>Минимум батарей</span>
                    <span>Максимум батарей</span>
                  </div>
                  
                  {/* Visual indicators for battery time zones */}
                  <div className="relative mt-2">
                    <div className="flex justify-between text-xs text-white/40">
                      {batteryTimes.map((time, index) => (
                        <div key={time} className="flex flex-col items-center">
                          <div className={`w-1 h-2 rounded-full mb-1 ${
                            selectedBatteryTime === time ? 'bg-[#8AB73A]' : 'bg-white/30'
                          }`} />
                          <span className={`${
                            selectedBatteryTime === time ? 'text-[#8AB73A] font-bold' : 'text-white/40'
                          }`}>
                            {time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean button grid */}
              <div className="text-center">
                <div className="text-white/50 text-sm mb-4">Доступные варианты времени:</div>
                <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
                  {batteryTimes.map((time) => {
                    const isSelected = selectedBatteryTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => handleBatteryTimeSelect(time)}
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#8AB73A]/20 border-[#8AB73A] text-[#8AB73A] shadow-lg'
                            : 'bg-white/5 border-white/20 text-white/70 hover:border-[#8AB73A]/50 hover:bg-[#8AB73A]/10'
                        }`}
                      >
                        <div className="text-lg font-bold">{time}</div>
                        <div className="text-xs opacity-70">мин</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Clean feedback */}
          {selectedBatteryTime && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center space-x-3 px-6 py-3 bg-[#8AB73A]/10 border border-[#8AB73A]/30 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-[#8AB73A] rounded-full animate-pulse" />
                <span className="text-white/90">
                  Выбрано: <span className="text-[#8AB73A] font-semibold">{selectedBatteryTime} минут автономной работы</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const StepBatteryAndBCBBox = () => {
    const recommendedBCBBox = selectedProduct ? calculateBCBBoxRequirement(selectedProduct) : null;
    const rackCalc = batteryRequirements ? {
      rackType: batteryRequirements.spec.rackType,
      rackQuantity: batteryRequirements.racks,
      batteriesPerRack: Math.ceil(batteryRequirements.quantity / batteryRequirements.racks)
    } : null;

    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Advanced animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-32 w-96 h-96 bg-gradient-to-br from-[#8AB73A]/30 to-[#60a5fa]/20 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-[#3b82f6]/25 to-[#8AB73A]/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-[#8AB73A]/15 to-[#60a5fa]/15 rounded-full blur-2xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 space-y-8">
          {/* Futuristic header */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-[#8AB73A] via-[#60a5fa] to-[#3b82f6] rounded-3xl mb-6 shadow-2xl shadow-[#8AB73A]/40 border border-white/20">
              <div className="text-4xl font-bold text-white">4</div>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-[#8AB73A] to-[#60a5fa] bg-clip-text text-transparent leading-tight">
              Конфигурация системы
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Автономность <span className="text-[#8AB73A] font-bold">{selectedBatteryTime} минут</span> • 
              ИБП <span className="text-[#60a5fa] font-bold">{selectedProduct?.capacity} кВА</span>
            </p>
          </div>

          {/* Comprehensive System Configuration Grid */}
          {batteryRequirements && recommendedBCBBox && rackCalc && (
            <div className="max-w-7xl mx-auto">
              {/* Main Configuration Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                
                {/* Battery Configuration Panel */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#8AB73A]/30 to-[#60a5fa]/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-50"></div>
                  <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/15 via-white/10 to-white/5 border border-white/30 rounded-3xl p-8 h-full shadow-2xl">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#8AB73A] to-[#60a5fa] rounded-2xl flex items-center justify-center">
                        <Battery className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Батареи</h3>
                        <p className="text-white/60 text-sm">Источник питания</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                          <div className="text-white/70 text-xs uppercase tracking-wide mb-2">Модель</div>
                          <div className="text-xl font-bold text-[#8AB73A]">{batteryRequirements.spec.type}</div>
                        </div>
                        <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                          <div className="text-white/70 text-xs uppercase tracking-wide mb-2">Напряжение</div>
                          <div className="text-xl font-bold text-white">12V</div>
                        </div>
                      </div>
                      
                      <div className="p-6 bg-gradient-to-br from-[#8AB73A]/20 to-transparent rounded-2xl border border-[#8AB73A]/30">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-white mb-2">{batteryRequirements.quantity}</div>
                          <div className="text-white/80 text-sm">единиц батарей</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Время работы:</span>
                        <span className="text-[#8AB73A] font-bold">{selectedBatteryTime} мин</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BCB-BOX Configuration Panel */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#60a5fa]/30 to-[#3b82f6]/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-50"></div>
                  <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/15 via-white/10 to-white/5 border border-white/30 rounded-3xl p-8 h-full shadow-2xl">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#60a5fa] to-[#3b82f6] rounded-2xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">BCB-BOX</h3>
                        <p className="text-white/60 text-sm">Автомат защиты</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="p-6 bg-gradient-to-br from-[#60a5fa]/20 to-transparent rounded-2xl border border-[#60a5fa]/30">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white mb-2">{recommendedBCBBox.label}</div>
                          <div className="text-white/80 text-sm">{recommendedBCBBox.description}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#60a5fa]/20 rounded-full border-2 border-[#60a5fa]">
                          <Check className="w-8 h-8 text-[#60a5fa]" />
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Статус</div>
                        <div className="text-[#60a5fa] font-bold">Автоматически выбран</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rack Configuration Panel */}
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#f59e0b]/30 to-[#d97706]/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-50"></div>
                  <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/15 via-white/10 to-white/5 border border-white/30 rounded-3xl p-8 h-full shadow-2xl">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-2xl flex items-center justify-center">
                        <Archive className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Стеллажи</h3>
                        <p className="text-white/60 text-sm">Система хранения</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-4 bg-white/10 rounded-xl border border-white/20">
                          <div className="text-white/70 text-xs uppercase tracking-wide mb-2">Тип стеллажа</div>
                          <div className="text-xl font-bold text-[#f59e0b]">{rackCalc.rackType}</div>
                        </div>
                      </div>
                      
                      <div className="p-6 bg-gradient-to-br from-[#f59e0b]/20 to-transparent rounded-2xl border border-[#f59e0b]/30">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-white mb-2">{rackCalc.rackQuantity}</div>
                          <div className="text-white/80 text-sm">стеллажей требуется</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Батарей на стеллаж:</span>
                        <span className="text-[#f59e0b] font-bold">{rackCalc.batteriesPerRack}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Overview Summary */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#8AB73A]/20 via-[#60a5fa]/20 to-[#f59e0b]/20 rounded-3xl blur-2xl opacity-30"></div>
                <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/8 to-white/5 border border-white/30 rounded-3xl p-8 shadow-2xl">
                  <div className="text-center space-y-6">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-[#8AB73A] via-[#60a5fa] to-[#f59e0b] bg-clip-text text-transparent">
                      Готовая конфигурация системы
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-8">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-[#8AB73A] mb-2">{batteryRequirements.quantity}</div>
                        <div className="text-white/80">Батарей</div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-[#60a5fa] mb-2">1</div>
                        <div className="text-white/80">BCB-BOX</div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-[#f59e0b] mb-2">{rackCalc.rackQuantity}</div>
                        <div className="text-white/80">Стеллажей</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <div className="inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-[#8AB73A]/20 to-[#60a5fa]/20 rounded-full border border-white/20">
                        <div className="w-3 h-3 bg-[#8AB73A] rounded-full animate-pulse"></div>
                        <span className="text-white font-semibold">Конфигурация готова к использованию</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const StepBatteryType = () => {
    // Animated background elements
    const [batteryFillPercentage, setBatteryFillPercentage] = useState(0);
    const [batteryFillAnimation, setBatteryFillAnimation] = useState(false);

    useMemo(() => {
      if (selectedBatteryType && selectedBatteryTime) {
        const batterySpec = BATTERY_SPECS.find(spec => spec.type === selectedBatteryType);
        if (batterySpec) {
          const batteryTime = selectedBatteryTime;
          const batteryFillPercentage = Math.min(95, Math.max(15, ((batteryTime - 5) / (90 - 5)) * 100));
          setBatteryFillPercentage(batteryFillPercentage);
          setBatteryFillAnimation(true);
          setTimeout(() => setBatteryFillAnimation(false), 700);
        }
      }
    }, [selectedBatteryType, selectedBatteryTime]);

    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -right-20 w-96 h-96 bg-gradient-to-br from-[#8AB73A]/20 to-[#60a5fa]/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-tr from-[#3b82f6]/20 to-[#8AB73A]/25 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        </div>

        <div className="relative z-10 space-y-8">
          {/* Modern header with gradient */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#8AB73A] to-[#60a5fa] rounded-2xl mb-6 shadow-2xl shadow-[#8AB73A]/30">
              <div className="text-4xl font-bold text-white">⚡</div>
            </div>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-white via-white to-[#8AB73A] bg-clip-text text-transparent">
              Конфигурация батарей
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Время поддержки: <span className="text-[#8AB73A] font-bold">{selectedBatteryTime} минут</span>
            </p>
          </div>

          {batteryRequirements && (
            <div className="max-w-6xl mx-auto mb-12">
              {/* Modern recommendation card with advanced glassmorphism */}
              <div className="relative p-8 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#8AB73A]/20 to-[#60a5fa]/10 rounded-3xl blur-xl -z-10"></div>
                
                <div className="text-center space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-[#8AB73A] to-[#60a5fa] bg-clip-text text-transparent">
                      Оптимальная конфигурация
                    </h3>
                  </div>
                
                  {/* Modern grid with enhanced cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#8AB73A]/20 to-transparent rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                      <div className="relative p-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
                        <div className="text-white/70 text-sm mb-2">Тип батарей</div>
                        <div className="text-2xl font-bold text-white">{batteryRequirements.spec.type}</div>
                      </div>
                    </div>
                    
                    <div className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#60a5fa]/20 to-transparent rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                      <div className="relative p-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
                        <div className="text-white/70 text-sm mb-2">Количество</div>
                        <div className="text-2xl font-bold text-white">{batteryRequirements.quantity} шт</div>
                      </div>
                    </div>
                    
                    <div className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#8AB73A]/20 to-transparent rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                      <div className="relative p-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
                        <div className="text-white/70 text-sm mb-2">Стеллажи</div>
                        <div className="text-2xl font-bold text-white">{batteryRequirements.racks} шт</div>
                      </div>
                    </div>
                    
                    <div className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#60a5fa]/20 to-transparent rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                      <div className="relative p-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
                        <div className="text-white/70 text-sm mb-2">Статус</div>
                        <div className="text-lg font-bold text-[#8AB73A]">Готово</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Modern CTA button */}
                  <div className="mt-8 text-center">
                    <button
                      onClick={nextStep}
                      className="bg-gradient-to-r from-[#8AB73A] to-[#60a5fa] text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      Использовать конфигурацию ›
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alternative selection section is removed as per user request */}
        </div>
      </div>
    );
  };

  const StepBCBBox = () => {
    const recommendedBox = selectedProduct ? calculateBCBBoxRequirement(selectedProduct) : null;

    if (!selectedProduct) {
      return (
        <div className="text-center text-white">
          <p>Сначала выберите ИБП</p>
        </div>
      );
    }

    if (!recommendedBox) {
      return (
        <div className="text-center text-white">
          <p>Ошибка при выборе BCB-BOX</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-white">Автоматический выбор BCB-BOX</h2>
          <p className="text-white/70 text-lg">На основе выбранного ИБП автоматически подобран оптимальный BCB-BOX</p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="p-8 border-2 border-[#8AB73A] rounded-xl bg-[#8AB73A]/10 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#8AB73A] rounded-full mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              
              <div className="space-y-4">
                <div className="font-bold text-2xl text-white">{recommendedBox.label}</div>
                <div className="text-white/80 text-lg">{recommendedBox.description}</div>
                {/* Price hidden - will show only in final quote */}
              </div>
              
              <div className="text-sm text-white/60">
                Автоматически выбрано для ИБП {selectedProduct.capacity} кВА
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          {/* Removed individual Continue button - using global navigation */}
        </div>
      </div>
    );
  };

  const StepRackCalculationAndSelection = () => {
    // Auto-calculate rack requirements when entering this step
    React.useEffect(() => {
      if (selectedBatteryType && batteryRequirements) {
        const rackCalc = calculateRackRequirements(batteryRequirements.quantity, selectedBatteryType);
        if (rackCalc) {
          setBatteryQuantity(batteryRequirements.quantity);
          setBatteryRackQuantity(rackCalc.rackCount);
          // Remove automatic progression - let user click to continue
        }
      }
    }, [selectedBatteryType, batteryRequirements]);

    if (!selectedBatteryType || !batteryRequirements) {
      return (
        <div className="text-center text-white">
          <p>Сначала выберите тип батарей</p>
        </div>
      );
    }

    const rackCalc = calculateRackRequirements(batteryRequirements.quantity, selectedBatteryType);
    
    if (!rackCalc) {
      return (
        <div className="text-center text-white">
          <p>Ошибка при расчете стеллажей</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -right-20 w-96 h-96 bg-gradient-to-br from-[#8AB73A]/20 to-[#60a5fa]/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-tr from-[#3b82f6]/20 to-[#8AB73A]/25 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
        </div>

        <div className="relative z-10 space-y-12">
          {/* Modern header with gradient */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#8AB73A] to-[#60a5fa] rounded-2xl mb-6 shadow-2xl shadow-[#8AB73A]/30">
              <div className="text-4xl font-bold text-white">5</div>
            </div>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-white via-white to-[#8AB73A] bg-clip-text text-transparent">
              Расчет и выбор стеллажей
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Автоматический подбор стеллажей по формуле: 1 стеллаж на 40 аккумуляторов
            </p>
          </div>

          {/* Combined Battery and Rack Configuration */}
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Battery Summary Section */}
            <div className="relative p-8 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-[#8AB73A]/20 to-[#60a5fa]/10 rounded-3xl blur-xl -z-10"></div>
              
              <div className="text-center space-y-6">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-[#8AB73A] to-[#60a5fa] bg-clip-text text-transparent">
                  Конфигурация батарей
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#8AB73A]/20 to-transparent rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                    <div className="relative p-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
                      <div className="text-white/70 text-sm mb-2">Тип батарей</div>
                      <div className="text-2xl font-bold text-white">{selectedBatteryType}</div>
                    </div>
                  </div>
                  
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#60a5fa]/20 to-transparent rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                    <div className="relative p-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
                      <div className="text-white/70 text-sm mb-2">Количество</div>
                      <div className="text-2xl font-bold text-white">{batteryRequirements.quantity} шт</div>
                    </div>
                  </div>
                  
                  <div className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#8AB73A]/20 to-transparent rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
                    <div className="relative p-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl">
                      <div className="text-white/70 text-sm mb-2">Время поддержки</div>
                      <div className="text-2xl font-bold text-white">{selectedBatteryTime} мин</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rack Configuration Section */}
            <div className="relative p-8 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-[#60a5fa]/20 to-[#8AB73A]/10 rounded-3xl blur-xl -z-10"></div>
              
              <div className="text-center space-y-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-[#60a5fa] to-[#8AB73A] bg-clip-text text-transparent">
                    Автоматический подбор стеллажей
                  </h3>
                  <p className="text-white/70 text-lg">Оптимальная конфигурация стеллажей на основе количества батарей</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-[#061640]/30 border border-white/20 rounded-lg">
                      <div className="text-white/70 text-sm">Тип стойки</div>
                      <div className="text-white font-bold text-2xl">{rackCalc.rackType}</div>
                      <div className="text-white/80 text-sm mt-2">
                        Вмещает {rackCalc.batteriesPerRack} батарей каждая
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-[#061640]/30 border border-white/20 rounded-lg">
                      <div className="text-white/70 text-sm">Количество стоек</div>
                      <div className="text-white font-bold text-2xl">{rackCalc.rackCount}</div>
                      <div className="text-white/80 text-sm mt-2">
                        Общая вместимость: {rackCalc.batteriesPerRack * rackCalc.rackCount} батарей
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-white/20 pt-6">
                  <div className="text-center space-y-4">
                    <div className="text-white/70">
                      Конфигурация: {batteryRequirements.quantity} × {selectedBatteryType} в {rackCalc.rackCount} × {rackCalc.rackType}
                    </div>
                    <div className="text-white/70">
                      {batteryRequirements.quantity <= rackCalc.batteriesPerRack * rackCalc.rackCount ? (
                        <span className="text-[#8AB73A] font-bold">✓ Конфигурация оптимальна</span>
                      ) : (
                        <span className="text-red-400">⚠ Ошибка конфигурации</span>
                      )}
                    </div>
                    <div className="text-sm text-white/60">
                      Формула: {batteryRequirements.quantity} батарей ÷ 40 = {rackCalc.rackCount} стеллажей
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StepBatteryCalculation = () => {
    // Auto-calculate rack requirements when entering this step
    React.useEffect(() => {
      if (selectedBatteryType && batteryRequirements) {
        const rackCalc = calculateRackRequirements(batteryRequirements.quantity, selectedBatteryType);
        if (rackCalc) {
          setBatteryQuantity(batteryRequirements.quantity);
          setBatteryRackQuantity(rackCalc.rackCount);
          // Remove automatic progression - let user click to continue
        }
      }
    }, [selectedBatteryType, batteryRequirements]);

    if (!selectedBatteryType || !batteryRequirements) {
      return (
        <div className="text-center text-white">
          <p>Сначала выберите тип батарей</p>
        </div>
      );
    }

    const rackCalc = calculateRackRequirements(batteryRequirements.quantity, selectedBatteryType);
    
    if (!rackCalc) {
      return (
        <div className="text-center text-white">
          <p>Ошибка при расчете стеллажей</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-white">Автоматический подбор стеллажей</h2>
          <p className="text-white/70 text-lg">Расчет стеллажей по формуле: 1 стеллаж на 40 аккумуляторов</p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="p-8 border-2 border-[#8AB73A] rounded-xl bg-[#8AB73A]/10 backdrop-blur-sm">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#8AB73A] rounded-full mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-[#8AB73A]">Конфигурация стеллажей</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-white/70">Тип батарей:</div>
                  <div className="text-white font-bold text-xl">{selectedBatteryType}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-white/70">Время поддержки:</div>
                  <div className="text-white font-bold text-xl">{selectedBatteryTime} мин</div>
                </div>
                <div className="space-y-2">
                  <div className="text-white/70">Тип стойки:</div>
                  <div className="text-white font-bold text-xl">{rackCalc.rackType}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="space-y-4">
                  <div className="text-center p-6 bg-[#061640]/30 border border-white/20 rounded-lg">
                    <div className="text-white/70 text-sm">Количество батарей</div>
                    <div className="text-white font-bold text-3xl">{batteryRequirements.quantity}</div>
                    <div className="text-white/80 text-sm mt-2">батарей</div>
                    {/* Price hidden - will show only in final quote */}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center p-6 bg-[#061640]/30 border border-white/20 rounded-lg">
                    <div className="text-white/70 text-sm">Количество стоек</div>
                    <div className="text-white font-bold text-3xl">{rackCalc.rackCount}</div>
                    <div className="text-white/80 text-sm mt-2">стоек</div>
                    {/* Price hidden - will show only in final quote */}
                  </div>
                </div>
              </div>
              
              <div className="border-t border-white/20 pt-6">
                <div className="text-center space-y-2">
                  <div className="text-white/70">Конфигурация батарей и стеллажей:</div>
                  <div className="text-[#8AB73A] font-bold text-3xl">
                    Готова к финальному расчету
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          {/* Removed individual Continue button - using global navigation */}
        </div>
      </div>
    );
  };

  const StepRackSelection = () => {
    // Remove automatic progression - let user control the flow
    if (!selectedBatteryType || !batteryRequirements) {
      return (
        <div className="text-center text-white">
          <p>Ошибка: конфигурация батарей не найдена</p>
        </div>
      );
    }

    const rackCalc = calculateRackRequirements(batteryRequirements.quantity, selectedBatteryType);
    
    if (!rackCalc) {
      return (
        <div className="text-center text-white">
          <p>Ошибка при расчете стеллажей</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 text-center">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white">Стеллажи выбраны автоматически</h2>
          <p className="text-white/70 text-lg">Подтверждение оптимальной конфигурации стеллажей</p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="p-8 bg-[#061640]/50 border-2 border-[#8AB73A] rounded-xl space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#8AB73A] rounded-full mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-[#8AB73A]">Финальная конфигурация стеллажей</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="text-center p-6 bg-[#8AB73A]/10 border border-[#8AB73A]/30 rounded-lg">
                  <div className="text-white/70 text-sm">Тип стойки</div>
                  <div className="text-white font-bold text-2xl">{rackCalc.rackType}</div>
                  <div className="text-white/80 text-sm mt-2">
                    Вмещает {rackCalc.batteriesPerRack} батарей каждая
                  </div>
                </div>
                
                <div className="text-center p-6 bg-[#061640]/30 border border-white/20 rounded-lg">
                  <div className="text-white/70 text-sm">Количество стоек</div>
                  <div className="text-white font-bold text-2xl">{rackCalc.rackCount}</div>
                  <div className="text-white/80 text-sm mt-2">
                    Общая вместимость: {rackCalc.batteriesPerRack * rackCalc.rackCount} батарей
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="text-center p-6 bg-[#061640]/30 border border-white/20 rounded-lg">
                  <div className="text-white/70 text-sm">Тип стойки</div>
                  <div className="text-white font-bold text-xl">{rackCalc.rackType}</div>
                  <div className="text-white/80 text-sm mt-2">
                    Подобрана автоматически
                  </div>
                </div>
                
                <div className="text-center p-6 bg-[#8AB73A]/10 border border-[#8AB73A]/30 rounded-lg">
                  <div className="text-white/70 text-sm">Статус конфигурации</div>
                  <div className="text-[#8AB73A] font-bold text-xl">
                    Готово к расчету
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/20 pt-6">
              <div className="text-center space-y-4">
                <div className="text-white/70">
                  Конфигурация: {batteryRequirements.quantity} × {selectedBatteryType} в {rackCalc.rackCount} × {rackCalc.rackType}
                </div>
                <div className="text-white/70">
                  {batteryRequirements.quantity <= rackCalc.batteriesPerRack * rackCalc.rackCount ? (
                    <span className="text-[#8AB73A] font-bold">✓ Конфигурация оптимальна</span>
                  ) : (
                    <span className="text-red-400">⚠ Ошибка конфигурации</span>
                  )}
                </div>
                <div className="text-sm text-white/60">
                  Формула: {batteryRequirements.quantity} батарей ÷ 40 = {rackCalc.rackCount} стеллажей
                </div>
              </div>
            </div>
            
            <Button
              onClick={nextStep}
              className="w-full bg-[#8AB73A] hover:bg-[#8AB73A]/80 text-white font-semibold text-lg py-4"
            >
              Подтвердить конфигурацию <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // PNR Step Component - Updated with separate PNR and Warranty sections
  const StepPNR = () => {
    // Auto-select PNR service based on UPS power when product changes
    React.useEffect(() => {
      if (selectedProduct && !selectedPNRService) {
        const power = selectedProduct.capacity;
        const recommendedService = getPNRServiceByPower(power);
        if (recommendedService) {
          setSelectedPNRService(recommendedService);
        }
      }
    }, [selectedProduct, selectedPNRService]);

    const handlePNRToggle = () => {
      if (selectedPNRService) {
        setSelectedPNRService(null);
      } else if (selectedProduct) {
        const power = selectedProduct.capacity;
        const recommendedService = getPNRServiceByPower(power);
        if (recommendedService) {
          setSelectedPNRService(recommendedService);
        }
      }
    };

    const handleWarrantyChange = (optionId: string | null) => {
      setSelectedWarrantyOption(optionId);
    };

    const getWarrantyPrice = (optionId: string) => {
      if (!selectedProduct) return 0;
      return calculateWarrantyPrice(selectedProduct.priceUSD, optionId);
    };

    return (
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white">Дополнительные услуги</h2>
          <p className="text-white/70 text-lg">Выберите ПНР и дополнительную гарантию для вашего ИБП</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* PNR Section */}
          <Card className="w-full bg-white/10 backdrop-blur-md shadow-xl border border-white/20">
            <CardHeader className="text-center pb-4">
              <div className="space-y-2">
                <CardTitle className="text-white text-2xl font-bold">Пуско-наладочные работы (ПНР)</CardTitle>
                <div className="text-[#8AB73A] font-mono text-sm tracking-widest uppercase">Commissioning Service</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProduct && getPNRServiceByPower(selectedProduct.capacity) ? (
                <div className="space-y-4">
                  <div 
                    className={`flex items-center justify-between p-6 rounded-lg cursor-pointer transition-all duration-300 ${
                      selectedPNRService 
                        ? 'bg-[#8AB73A]/20 border border-[#8AB73A] shadow-lg' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                    onClick={handlePNRToggle}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        selectedPNRService 
                          ? 'border-[#8AB73A] bg-[#8AB73A]' 
                          : 'border-white/40'
                      }`}>
                        {selectedPNRService && (
                          <div className="w-3 h-3 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="text-left">
                        {(() => {
                          const service = getPNRServiceByPower(selectedProduct.capacity);
                          return service ? (
                            <>
                              <div className="text-white font-bold text-lg">{service.article}</div>
                              <div className="text-white/70 text-sm">{service.description}</div>
                            </>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                  <div className="text-orange-400 text-lg font-semibold">
                    Для данного ИБП услуги ПНР недоступны
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warranty Section */}
          <Card className="w-full bg-white/10 backdrop-blur-md shadow-xl border border-white/20">
            <CardHeader className="text-center pb-4">
              <div className="space-y-2">
                <CardTitle className="text-white text-2xl font-bold">Расширенная гарантия</CardTitle>
                <div className="text-[#8AB73A] font-mono text-sm tracking-widest uppercase">Extended Warranty</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* No warranty option */}
                <div 
                  className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                    selectedWarrantyOption === null 
                      ? 'bg-[#8AB73A]/20 border border-[#8AB73A] shadow-lg' 
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => handleWarrantyChange(null)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      selectedWarrantyOption === null 
                        ? 'border-[#8AB73A] bg-[#8AB73A]' 
                        : 'border-white/40'
                    }`}>
                      {selectedWarrantyOption === null && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-white font-semibold text-base">Стандартная гарантия</div>
                      <div className="text-white/60 text-sm">Базовая гарантия производителя</div>
                    </div>
                  </div>
                  <div className="text-white/50 text-sm">включено</div>
                </div>

                {/* Extended warranty options */}
                {WARRANTY_OPTIONS.map((option) => (
                  <div 
                    key={option.id}
                    className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                      selectedWarrantyOption === option.id 
                        ? 'bg-[#8AB73A]/20 border border-[#8AB73A] shadow-lg' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                    onClick={() => handleWarrantyChange(option.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        selectedWarrantyOption === option.id 
                          ? 'border-[#8AB73A] bg-[#8AB73A]' 
                          : 'border-white/40'
                      }`}>
                        {selectedWarrantyOption === option.id && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-white font-semibold text-base">{option.name}</div>
                        <div className="text-white/60 text-sm">{option.description}</div>
                      </div>
                    </div>
                    
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const StepFinalQuote = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-white">Итоговое коммерческое предложение</h2>
        <p className="text-white/70 text-lg">Конфигурация завершена - можете скачать КП</p>
      </div>
      
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Configuration Card */}
          <div className="lg:col-span-2">
            <div className="p-8 bg-[#061640]/50 border-2 border-white/20 rounded-xl space-y-6">
              <h3 className="text-2xl font-bold text-[#8AB73A] border-b border-white/20 pb-4">Полная конфигурация</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="space-y-4">
              <div>
                <div className="text-white/70 text-sm">ИБП:</div>
                <div className="text-white font-semibold">{selectedProduct?.model}</div>
                <div className="text-white/80">{selectedProduct?.capacity} kVA</div>
                <div className="text-[#8AB73A] font-bold">{formatCurrency(selectedProduct?.priceUSD || 0)}</div>
              </div>
              
              <div>
                <div className="text-white/70 text-sm">Батареи:</div>
                <div className="text-white font-semibold">{selectedBatteryType} × {batteryQuantity}</div>
                <div className="text-white/80">Время поддержки: {selectedBatteryTime} мин</div>
                <div className="text-[#8AB73A] font-bold">
                  {formatCurrency((BATTERY_SPECS.find(s => s.type === selectedBatteryType)?.priceUSD || 0) * batteryQuantity)}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-white/70 text-sm">Стеллажи:</div>
                <div className="text-white font-semibold">
                  {BATTERY_SPECS.find(s => s.type === selectedBatteryType)?.rackType} × {batteryRackQuantity}
                </div>
                <div className="text-[#8AB73A] font-bold">
                  {formatCurrency((BATTERY_SPECS.find(s => s.type === selectedBatteryType)?.rackPrice || 0) * batteryRackQuantity)}
                </div>
              </div>
              
              <div>
                <div className="text-white/70 text-sm">BCB-BOX:</div>
                <div className="text-white font-semibold">{selectedBCBBox?.label}</div>
                <div className="text-[#8AB73A] font-bold">{formatCurrency(selectedBCBBox?.priceUSD || 0)}</div>
              </div>
              
              {selectedPNRService && (
                <div>
                  <div className="text-white/70 text-sm">ПНР услуги:</div>
                  <div className="text-white font-semibold">{selectedPNRService.article}</div>
                  <div className="text-white/80">{selectedPNRService.description}</div>
                  <div className="text-[#8AB73A] font-bold">
                    ${selectedPNRService.price.toFixed(0)}
                  </div>
                </div>
              )}

              {selectedWarrantyOption && selectedProduct && (
                <div>
                  <div className="text-white/70 text-sm">Расширенная гарантия:</div>
                  {(() => {
                    const option = WARRANTY_OPTIONS.find(opt => opt.id === selectedWarrantyOption);
                    return option ? (
                      <>
                        <div className="text-white font-semibold">{option.name}</div>
                        <div className="text-white/80">{option.description}</div>
                        <div className="text-[#8AB73A] font-bold">
                          ${calculateWarrantyPrice(selectedProduct.priceUSD, selectedWarrantyOption).toFixed(0)}
                        </div>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t border-white/20 pt-6">
            <div className="flex justify-between items-center text-2xl">
              <span className="font-bold text-white">Общая стоимость:</span>
              <span className="font-bold text-[#8AB73A]">{formatCurrency(totalCost)}</span>
            </div>
          </div>
          
              <Button 
                onClick={generateQuote} 
                className="w-full bg-[#8AB73A] hover:bg-[#8AB73A]/80 text-white font-semibold text-lg py-4"
              >
                <FileText className="w-5 h-5 mr-2" />
                Скачать коммерческое предложение
              </Button>
            </div>
          </div>
          
          {/* UPS Card - moved from sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#061640]/50 border-2 border-white/20 rounded-xl p-6 space-y-4 h-fit">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#8AB73A] rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-white">Выбранный ИБП</h4>
              </div>
              
              {selectedProduct && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-4">
                  {/* UPS Image */}
                  {(() => {
                    const imageMapping = getUPSImageMapping(selectedProduct.type, selectedProduct.frame, selectedProduct.capacity);
                    return (
                      <div className="flex justify-center">
                        <img 
                          src={imageMapping.image} 
                          alt={selectedProduct.model}
                          className="h-32 w-auto object-contain drop-shadow-lg"
                          onError={(e) => {
                            e.currentTarget.src = "/UEUPS160MAX-removebg-preview.png";
                          }}
                        />
                      </div>
                    );
                  })()}
                  
                  {/* UPS Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/70 text-sm">Модель:</span>
                      <span className="text-white font-medium">{selectedProduct.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70 text-sm">Мощность:</span>
                      <span className="text-[#8AB73A] font-bold">{selectedProduct.capacity} kVA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70 text-sm">Тип:</span>
                      <span className="text-white font-medium">
                        {selectedProduct.type === 'UR' ? 'Стоечный' : 
                         selectedProduct.type === 'UE' ? 'Напольный' : 'Модульный'}
                      </span>
                    </div>
                    {selectedProduct.type === 'UM' && (
                      <div className="flex justify-between">
                        <span className="text-white/70 text-sm">Рамка:</span>
                        <span className="text-white font-medium">{selectedProduct.frame}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Download Specification Button */}
                  {(() => {
                    const imageMapping = getUPSImageMapping(selectedProduct.type, selectedProduct.frame, selectedProduct.capacity);
                    
                    const handleDownload = async () => {
                      try {
                        const response = await fetch(imageMapping.documentationUrl);
                        if (!response.ok) {
                          throw new Error('Network response was not ok');
                        }
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = imageMapping.documentationName + '.pdf';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('Download failed:', error);
                        // Optionally, show an error message to the user
                      }
                    };
                    
                    return (
                      <div className="pt-3 border-t border-white/10">
                        <button 
                          onClick={handleDownload}
                          className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-[#8AB73A] to-[#60a5fa] hover:from-[#7ba233] hover:to-[#3b82f6] text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                          <span>Скачать спецификацию</span>
                        </button>
                        <p className="text-white/50 text-xs text-center mt-2">
                          {imageMapping.documentationName}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return <StepUPSType />;
      case 2: return <StepUPSCapacity />;
      case 3: return <StepBatteryTime />;
      case 4: return <StepBatteryAndBCBBox />; // Now includes racks
      case 5: return <StepPNR />;
      case 6: return <StepFinalQuote />;
      default: return <StepUPSType />;
    }
  };

  // Add global styles for consistent scrollbar theming
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Custom scrollbar for the configurator */
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #8AB73A;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #7ba233;
      }
      
      /* Enhanced animations */
      .fade-in {
        animation: fadeIn 0.5s ease-in-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Better button focus states */
      .btn-outline-enhanced:focus {
        outline: 2px solid #8AB73A;
        outline-offset: 2px;
      }
      
      /* Improved glass morphism effect */
      .glass-card {
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      }

      /* Animated blob effects for dynamic background */
      @keyframes blob {
        0% {
          transform: translate(0px, 0px) scale(1);
        }
        33% {
          transform: translate(30px, -50px) scale(1.1);
        }
        66% {
          transform: translate(-20px, 20px) scale(0.9);
        }
        100% {
          transform: translate(0px, 0px) scale(1);
        }
      }

      .animate-blob {
        animation: blob 7s infinite;
      }

      .animation-delay-2000 {
        animation-delay: 2s;
      }

      .animation-delay-4000 {
        animation-delay: 4s;
      }

      .animation-delay-6000 {
        animation-delay: 6s;
      }

      /* Frame section highlight animations */
      @keyframes frameAttention {
        0%, 100% { 
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(138, 183, 58, 0.7);
        }
        50% { 
          transform: scale(1.01);
          box-shadow: 0 0 0 20px rgba(138, 183, 58, 0);
        }
      }

      .frame-section-highlight {
        animation: frameAttention 1.5s ease-in-out;
      }

      /* Slider styles from DCConfiguratorApp */
      .slider {
        -webkit-appearance: none;
        appearance: none;
        height: 8px;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.1);
        outline: none;
        opacity: 0.7;
        transition: opacity 0.2s;
        background-image: linear-gradient(
          to right,
          #8AB73A 0%,
          #8AB73A var(--progress, 0%),
          rgba(255, 255, 255, 0.1) var(--progress, 0%),
          rgba(255, 255, 255, 0.1) 100%
        );
      }

      .slider:hover {
        opacity: 1;
      }

      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #8AB73A;
        border: 2px solid white;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s;
      }

      .slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }

      .slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #8AB73A;
        border: 2px solid white;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Add effect to update slider progress CSS variables
  React.useEffect(() => {
    const batteryTimeSlider = document.querySelector('input[name="batteryTime"]') as HTMLInputElement;
    
    if (batteryTimeSlider) {
      const currentTime = selectedBatteryTime || 5;
      const percent = ((currentTime - 5) / (90 - 5)) * 100;
      batteryTimeSlider.style.setProperty('--progress', `${percent}%`);
    }
  }, [selectedBatteryTime]);

  // Check if user can proceed to next step based on current selections
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1: {
        // For UM type, also require frame selection
        if (selectedUPSType === 'UM') {
          return selectedUPSType !== null && selectedUMFrame !== null;
        }
        return selectedUPSType !== null;
      }
      case 2: return selectedProduct !== null;
      case 3: return selectedBatteryTime !== null;
      case 4: {
        // На объединенном шаге проверяем наличие батарей, BCB-BOX и стеллажей
        const recommendedBox = selectedProduct ? calculateBCBBoxRequirement(selectedProduct) : null;
        return batteryRequirements !== null && recommendedBox !== null;
      }
      case 5: return selectedPNRService !== null;
      case 6: return batteryRequirements !== null;
      default: return false;
    }
  };

  // Get appropriate battery types for a given UPS capacity
  const getAppropriatesBatteryTypes = (upsCapacity: number): BatteryType[] => {
    // Return battery types that are appropriate for the UPS capacity
    // This prevents showing small batteries for large UPS systems
    if (upsCapacity <= 15) {
      return ["SP12-65", "SP12-80", "SP12-100", "SP12-120", "SP12-150"];
    } else if (upsCapacity <= 30) {
      return ["SP12-80", "SP12-100", "SP12-120", "SP12-150", "SP12-200"];
    } else if (upsCapacity <= 60) {
      return ["SP12-100", "SP12-120", "SP12-150", "SP12-200", "SP12-250"];
    } else if (upsCapacity <= 120) {
      return ["SP12-150", "SP12-200", "SP12-250"];
    } else if (upsCapacity <= 300) {
      return ["SP12-200", "SP12-250"];
    } else {
      // For large UPS systems (300kVA+), only show SP12-250
      return ["SP12-250"];
    }
  };

  // Calculate battery quantity for any battery type based on UPS capacity and backup time
  const calculateBatteryQuantityForType = (upsProduct: UPSProduct, backupTime: BatteryTime, batteryType: BatteryType): number => {
    if (!upsProduct || !backupTime || !batteryType) return 40;

    // Сначала пытаемся получить точную конфигурацию из Excel
    const excelConfig = getBatteryConfigFromExcel(upsProduct.model, backupTime, upsProduct.capacity);
    if (excelConfig && excelConfig.type === batteryType) {
      return excelConfig.quantity;
    }

    // Enhanced quantity calculation based on UPS capacity, battery type, and backup time
    let baseQuantity = 40;
    
    // Calculate base quantity based on UPS capacity and battery type efficiency
    const batterySpec = BATTERY_SPECS.find(spec => spec.type === batteryType);
    if (!batterySpec) return 40;
    
    // More accurate calculation based on actual UPS power requirements
    // Higher capacity UPS systems need more batteries, especially for longer backup times
    if (upsProduct.capacity <= 15) {
      baseQuantity = 40;
    } else if (upsProduct.capacity <= 30) {
      baseQuantity = 40;
    } else if (upsProduct.capacity <= 60) {
      baseQuantity = 80;
    } else if (upsProduct.capacity <= 120) {
      baseQuantity = 120;
    } else if (upsProduct.capacity <= 300) {
      baseQuantity = 160;
    } else if (upsProduct.capacity <= 600) {
      baseQuantity = 320;
    } else {
      baseQuantity = 480;
    }

    // Adjust quantity based on backup time requirements
    let timeMultiplier = 1;
    switch (backupTime) {
      case 5:
        timeMultiplier = 0.6;
        break;
      case 10:
        timeMultiplier = 0.8;
        break;
      case 15:
        timeMultiplier = 1;
        break;
      case 20:
        timeMultiplier = 1.2;
        break;
      case 30:
        timeMultiplier = 1.5;
        break;
      case 45:
        timeMultiplier = 2;
        break;
      case 60:
        timeMultiplier = 2.5;
        break;
      case 90:
        timeMultiplier = 3;
        break;
      default:
        timeMultiplier = 1;
    }

    // Adjust based on battery capacity - higher capacity batteries need fewer units
    let capacityMultiplier = 1;
    if (batteryType === "SP12-18" || batteryType === "SP12-26") {
      capacityMultiplier = 2; // Small batteries need more units
    } else if (batteryType === "SP12-38" || batteryType === "SP12-42") {
      capacityMultiplier = 1.5;
    } else if (batteryType === "SP12-250") {
      capacityMultiplier = 0.8; // Large batteries need fewer units
    }

    const calculatedQuantity = Math.ceil(baseQuantity * timeMultiplier * capacityMultiplier);
    
    // Ensure minimum 40 batteries and round to multiples of 40 for rack efficiency
    return Math.max(40, Math.ceil(calculatedQuantity / 40) * 40);
  };

  // Configuration Sidebar Component
  const ConfigurationSidebar = () => {
    if (!showSidebar || currentStep === 6) return null;

    return (
      <div className={`fixed right-0 top-0 h-full w-96 bg-gradient-to-b from-[#061640]/95 to-[#0A2B6C]/95 backdrop-blur-xl border-l border-white/20 shadow-2xl z-30 transition-all duration-500 ${
        sidebarAnimation === 'entering' ? 'translate-x-full opacity-0' :
        sidebarAnimation === 'visible' ? 'translate-x-0 opacity-100' :
        sidebarAnimation === 'exiting' ? 'translate-x-full opacity-0' : 'translate-x-full opacity-0'
      }`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Конфигурация</h3>
            <div className="w-8 h-8 bg-gradient-to-br from-[#8AB73A] to-[#60a5fa] rounded-full flex items-center justify-center">
              <div className="text-white font-bold text-sm">{currentStep}</div>
            </div>
          </div>
          <p className="text-white/60 text-sm mt-2">Шаг {currentStep} из 6</p>
        </div>

        {/* Configuration Content */}
        <div className="p-6 space-y-6 overflow-y-auto h-full pb-32">
          
          {/* Waiting for Configuration */}
          {!selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-3 h-3 bg-white/50 rounded-full animate-ping"></div>
                </div>
                <h4 className="font-bold text-white">Ожидается конфигурация</h4>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center">
                <div className="animate-pulse space-y-3">
                  <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Search className="w-6 h-6 text-white/50" />
                  </div>
                  <p className="text-white/70 text-sm">
                    Выберите ИБП для начала конфигурации
                  </p>
                  <div className="space-y-2">
                    <div className="h-2 bg-white/10 rounded-full w-3/4 mx-auto"></div>
                    <div className="h-2 bg-white/10 rounded-full w-1/2 mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* UPS Selection */}
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#8AB73A] rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-white">ИБП выбран</h4>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-4">
                {/* UPS Image */}
                {(() => {
                  const imageMapping = getUPSImageMapping(selectedProduct.type, selectedProduct.frame, selectedProduct.capacity);
                  return (
                    <div className="flex justify-center">
                      <img 
                        src={imageMapping.image} 
                        alt={selectedProduct.model}
                        className="h-24 w-auto object-contain drop-shadow-lg"
                        onError={(e) => {
                          // Fallback image if the specific image fails to load
                          e.currentTarget.src = "/UEUPS160MAX-removebg-preview.png";
                        }}
                      />
                    </div>
                  );
                })()}
                
                {/* UPS Details */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Модель:</span>
                    <span className="text-white font-medium">{selectedProduct.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Мощность:</span>
                    <span className="text-[#8AB73A] font-bold">{selectedProduct.capacity} kVA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70 text-sm">Тип:</span>
                    <span className="text-white font-medium">
                      {selectedProduct.type === 'UR' ? 'Стоечный' : 
                       selectedProduct.type === 'UE' ? 'Напольный' : 'Модульный'}
                    </span>
                  </div>
                  {selectedProduct.type === 'UM' && (
                    <div className="flex justify-between">
                      <span className="text-white/70 text-sm">Рамка:</span>
                      <span className="text-white font-medium">{selectedProduct.frame}</span>
                    </div>
                  )}
                </div>
                
                {/* Download Specification Button */}
                {(() => {
                  const imageMapping = getUPSImageMapping(selectedProduct.type, selectedProduct.frame, selectedProduct.capacity);
                  
                  const handleDownload = () => {
                    console.log('Sidebar download clicked for:', {
                      url: imageMapping.documentationUrl,
                      name: imageMapping.documentationName,
                      fullUrl: window.location.origin + imageMapping.documentationUrl
                    });
                    
                    // Create a link element and trigger download
                    const link = document.createElement('a');
                    link.href = imageMapping.documentationUrl;
                    link.download = imageMapping.documentationName + '.pdf';
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  };
                  
                  return (
                    <div className="pt-3 border-t border-white/10">
                      <button 
                        onClick={handleDownload}
                        className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-[#8AB73A] to-[#60a5fa] hover:from-[#7ba233] hover:to-[#3b82f6] text-white px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>Скачать спецификацию</span>
                      </button>
                      <p className="text-white/50 text-xs text-center mt-2">
                        {imageMapping.documentationName}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Battery Time Selection */}
          {selectedBatteryTime && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#8AB73A] rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-white">Время поддержки</h4>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Время резерва:</span>
                  <span className="text-[#8AB73A] font-bold">{selectedBatteryTime} минут</span>
                </div>
              </div>
            </div>
          )}

          {/* Battery Configuration */}
          {currentStep >= 4 && selectedBatteryType && batteryQuantity > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#8AB73A] rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-white">Батареи</h4>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Тип:</span>
                  <span className="text-white font-medium">{selectedBatteryType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Количество:</span>
                  <span className="text-[#8AB73A] font-bold">{batteryQuantity} шт</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Стеллажи:</span>
                  <span className="text-white font-medium">{batteryRackQuantity} шт</span>
                </div>
              </div>
            </div>
          )}

          {/* BCB-BOX - показываем только начиная с шага 4 */}
          {currentStep >= 4 && selectedBCBBox && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#8AB73A] rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-white">BCB-BOX</h4>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Модель:</span>
                  <span className="text-white font-medium">{selectedBCBBox.label}</span>
                </div>
              </div>
            </div>
          )}

          {/* PNR Services - показываем только начиная с шага 6 */}
          {currentStep >= 6 && selectedPNRService && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#8AB73A] rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-bold text-white">ПНР услуги</h4>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Услуга:</span>
                  <span className="text-white font-medium">{selectedPNRService.article}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Статус:</span>
                  <span className="text-[#8AB73A] font-bold">Выбрано</span>
                </div>
                {selectedWarrantyOption && (
                  <div className="space-y-1">
                    <div className="text-white/70 text-sm">Доп. гарантия:</div>
                    {(() => {
                      const option = WARRANTY_OPTIONS.find(opt => opt.id === selectedWarrantyOption);
                      return option ? (
                        <div className="text-white/60 text-xs pl-2">
                          • {option.name}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Total Cost (only on final step) */}
          {currentStep === 7 && totalCost > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#8AB73A] to-[#60a5fa] rounded-full flex items-center justify-center">
                  <div className="text-white font-bold text-sm">$</div>
                </div>
                <h4 className="font-bold text-white">Итого</h4>
              </div>
              
              <div className="bg-gradient-to-br from-[#8AB73A]/20 to-[#60a5fa]/10 backdrop-blur-sm border border-[#8AB73A]/30 rounded-xl p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#8AB73A]">
                    {formatCurrency(totalCost)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed relative overflow-hidden"
      style={{ backgroundImage: `url('${backgroundImage}')` }}
    >
      {/* Dynamic gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A2B6C]/90 via-[#1e3a8a]/80 to-[#1e40af]/85 backdrop-blur-sm"></div>
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large orb - top left */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-[#8AB73A]/30 to-[#60a5fa]/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        
        {/* Medium orb - top right */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-r from-[#3b82f6]/20 to-[#8AB73A]/25 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        
        {/* Small orb - bottom left */}
        <div className="absolute -bottom-32 -left-20 w-72 h-72 bg-gradient-to-r from-[#60a5fa]/15 to-[#8AB73A]/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        
        {/* Tiny orb - center right */}
        <div className="absolute top-1/2 -right-10 w-48 h-48 bg-gradient-to-r from-[#8AB73A]/25 to-[#3b82f6]/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-6000"></div>
      </div>
      
      <div className="relative z-10 pt-4 sm:pt-6">
        <div className={`transition-all duration-500 ${showSidebar && currentStep !== 6 ? 'pr-96' : ''}`}>
          {/* Main Content with enhanced glassmorphism */}
          <div className="bg-white/10 backdrop-blur-md border-b border-white/20 shadow-2xl">
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
              {/* Top Header - Enhanced with responsive design */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
                  <img src={logoImage} alt="Logo" className="h-10 lg:h-12 w-auto drop-shadow-lg flex-shrink-0" />
                  <div className="border-l border-white/30 pl-2 lg:pl-4 min-w-0 flex-1">
                    <h1 className="text-lg lg:text-2xl font-bold text-white drop-shadow-md truncate">Конфигуратор ИБП</h1>
                    <p className="text-white/70 text-xs lg:text-sm hidden sm:block">Профессиональная настройка систем</p>
                  </div>
                </div>
                <div className="flex items-center justify-between lg:justify-end space-x-2 lg:space-x-4 flex-shrink-0">
                  <div className="text-right flex-shrink-0">
                    <div className="text-white font-semibold drop-shadow-sm text-sm lg:text-base">Шаг {currentStep} из 6</div>
                    <div className="text-white/70 text-xs lg:text-sm">
                                              {Math.round((currentStep / 6) * 100)}% завершено
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={() => navigate('/dashboard')}
                      variant="outline"
                      className="relative group bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-all duration-300 text-xs lg:text-sm px-3 lg:px-4 py-2 flex-shrink-0 transform hover:scale-105 shadow-lg shadow-black/20 rounded-md"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
                      <span className="relative z-10 hidden sm:inline font-medium drop-shadow-sm">Панель</span>
                      <span className="relative z-10 sm:hidden drop-shadow-sm">←</span>
                    </Button>
                    <Button 
                      onClick={resetConfiguration}
                      variant="outline"
                      className="relative group bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-all duration-300 text-xs lg:text-sm px-3 lg:px-4 py-2 flex-shrink-0 transform hover:scale-105 shadow-lg shadow-black/20 rounded-md"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
                      <span className="relative z-10 hidden sm:inline font-medium drop-shadow-sm">Сбросить</span>
                      <span className="relative z-10 sm:hidden drop-shadow-sm">↺</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Enhanced Progress Bar with glassmorphism and responsive design */}
              <div className="relative overflow-visible px-2 sm:px-4">
                <div className="flex justify-between items-end mb-4 relative">
                  {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                    <div
                      key={step}
                      className="relative flex flex-col items-center flex-1"
                    >
                      {/* Circle */}
                      <div
                        className={`relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full text-sm sm:text-base font-bold transition-all duration-500 backdrop-blur-sm flex-shrink-0 ${
                          step <= currentStep
                            ? 'bg-gradient-to-br from-[#8AB73A] via-[#7aa332] to-[#6b8f2a] text-white shadow-lg shadow-[#8AB73A]/60 border border-[#8AB73A]/50'
                            : step === currentStep + 1
                            ? 'bg-white/30 text-white border-2 border-[#8AB73A]/40 shadow-md shadow-[#8AB73A]/20 animate-pulse'
                            : 'bg-white/15 text-white/50 border border-white/20'
                        } ${step === currentStep ? 'scale-110 ring-2 ring-[#8AB73A]/50 ring-offset-2 ring-offset-transparent' : ''}`}
                    >
                      {/* High-tech inner glow effect */}
                      {step <= currentStep && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                      )}
                      
                        {/* High-tech inner glow effect */}
                        {step <= currentStep && (
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                        )}
                        
                        {/* Number or check mark */}
                        <div className="relative z-10">
                          {step < currentStep ? (
                            <Check className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 drop-shadow-sm" />
                          ) : step === currentStep ? (
                            <div className="flex flex-col items-center">
                              <span className="text-sm sm:text-base font-bold">{step}</span>
                              <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full animate-ping"></div>
                            </div>
                          ) : (
                            <span className="font-mono text-sm">{step}</span>
                          )}
                        </div>
                        
                        {/* Corner accent for current step */}
                        {step === currentStep && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#60a5fa] rounded-full shadow-lg shadow-[#60a5fa]/50 animate-pulse"></div>
                        )}
                      </div>
                      
                      {/* Step Label directly under circle */}
                      <div className="text-center mt-3 px-1">
                        <span className="text-white/90 drop-shadow-sm font-medium block text-xs sm:text-sm">
                          {step === 1 && "Тип ИБП"}
                          {step === 2 && "Мощность"}
                          {step === 3 && "Резерв"}
                          {step === 4 && "Батареи"}
                          {step === 5 && "Стеллажи"}
                          {step === 6 && "ПНР"}
                          {step === 7 && "Коммерция"}
                        </span>
                        <div className="text-[#8AB73A]/70 text-[8px] sm:text-[10px] mt-0.5 font-mono hidden sm:block">
                          {step === 1 && "TYPE"}
                          {step === 2 && "POWER"}
                          {step === 3 && "BACKUP"}
                          {step === 4 && "BATTERY"}
                          {step === 5 && "RACK"}
                          {step === 6 && "SERVICE"}
                          {step === 7 && "QUOTE"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* High-tech Progress Line - Responsive */}
                <div className="absolute top-5 sm:top-6 lg:top-7 left-8 sm:left-12 lg:left-16 right-8 sm:right-12 lg:right-16 h-0.5 sm:h-1 bg-white/10 -z-10 backdrop-blur-sm rounded-full overflow-hidden">
                  {/* Background pulse effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#8AB73A]/20 to-[#60a5fa]/20 animate-pulse rounded-full"></div>
                  
                  {/* Main progress bar */}
                  <div 
                    className="h-full bg-gradient-to-r from-[#8AB73A] via-[#7aa332] to-[#60a5fa] transition-all duration-700 ease-out shadow-lg rounded-full relative overflow-hidden"
                                          style={{ width: `${((currentStep - 1) / 5) * 100}%` }}
                  >
                    {/* Moving shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-full"></div>
                  </div>
                  
                  {/* Grid pattern overlay - hidden on small screens */}
                  <div className="absolute inset-0 opacity-20 hidden lg:block">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px bg-white/30"
                        style={{ left: `${(i * 5)}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 container mx-auto px-6 py-8 pb-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
                className="fade-in"
              >
                {renderCurrentStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Navigation with glassmorphism - Enhanced responsive design */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/10 backdrop-blur-md border-t border-white/20 shadow-2xl">
          <div className={`container mx-auto px-4 lg:px-6 py-4 lg:py-6 transition-all duration-500 ${showSidebar && currentStep !== 6 ? 'lg:pr-96' : ''}`}>
            <div className="flex justify-between items-center gap-2 lg:gap-4">
              <Button
                onClick={previousStep}
                disabled={currentStep === 1}
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5 backdrop-blur-sm transition-all duration-200 flex-shrink-0 text-sm lg:text-base px-3 lg:px-4 py-2"
              >
                <ChevronLeft className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Назад</span>
                <span className="sm:hidden">←</span>
              </Button>
              


              <Button
                onClick={currentStep === 6 ? saveUPSQuote : nextStep}
                disabled={currentStep < 6 && !canProceedToNextStep()}
                className="bg-gradient-to-r from-[#8AB73A] to-[#60a5fa] hover:from-[#7ba233] hover:to-[#3b82f6] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg backdrop-blur-sm border border-white/20 transition-all duration-200 flex-shrink-0 text-sm lg:text-base px-3 lg:px-4 py-2"
              >
                <span className="hidden sm:inline">{currentStep === 6 ? 'Готово' : 'Далее'}</span>
                <span className="sm:hidden">{currentStep === 6 ? '✓' : '→'}</span>
                <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 ml-1 lg:ml-2" />
              </Button>
            </div>
          </div>
        </div>
        
        <ConfigurationSidebar />
      </div>
    </div>
  );
} 
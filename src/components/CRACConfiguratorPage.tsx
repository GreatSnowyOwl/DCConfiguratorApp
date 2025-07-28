import React, { useMemo, useState, useRef } from "react";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search, Plus, Minus, Download, FileText } from "lucide-react";
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit'; // Use the scoped version
import { useAuth } from '../contexts/AuthContext'; // Corrected path
// import { Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Assuming background and logo images are in the public folder as in other components
const backgroundImage = `${import.meta.env.BASE_URL}DATACENTER.png`;
const logoImage = `${import.meta.env.BASE_URL}logologo.png`;
// === Product photos ===
const rowImage = `${import.meta.env.BASE_URL}ROW2-removebg-preview.png`;       // Row-based plate condenser
const vTypeImage = `${import.meta.env.BASE_URL}V-type-removebg-preview.png`;  // V-type condenser (array)
const cabinetImage = `${import.meta.env.BASE_URL}shkaf-removebg-preview.png`;  // Cabinet plate / water

// ======================= DATA =========================

const RMB_TO_USD_RATE = 0.28;

// Main AC Types
export type MainACType = "cabinet" | "row_based";
// Sub AC Types
export type SubACType = "freon" | "water";
// Compressor Types (for Freon-based)
export type CompressorType = "standard" | "inverter";
// External Unit Types for Row-Based Freon
export type ExternalUnitType = "plate" | "array";

interface ProductCRAC {
  id: string;
  label: string;
  mainType: MainACType;
  subType: SubACType;
  compressorType?: CompressorType; // Optional, only for Freon
  power: string;
  dims?: string; // Optional as not all sheets have it clearly
  priceRMB: number;
  priceUSD: number;
  specificParams?: string; // From CM 5-120
  configStrategy?: string; // From CM 5-120 / CM(Chilled Water)
  documentationUrl?: string; // Optional URL for documentation
}

const ACCESSORY_CATEGORIES = {
  heating: "Нагреватели",
  humidification: "Увлажнители",
  network_control: "Сетевые компоненты и управление",
  air_handling: "Обработка и распределение воздуха",
  power: "Электропитание и защита",
  installation_kits: "Монтажные комплекты и опции трассы",
  sensors: "Датчики и мониторинг",
  drainage: "Дренаж и отвод конденсата",
  special_options: "Специальные опции",
};

interface AccessoryCRAC {
  id: string;
  label: string;
  priceRMB: number;
  priceUSD: number;
  note?: string;
  appliesTo?: string; 
  categoryKey: keyof typeof ACCESSORY_CATEGORIES;
}

// == UPDATED CABINET - FREON ==
const PRODUCTS_CABINET_FREON_RAW: Omit<ProductCRAC, 'priceUSD' | 'mainType' | 'subType'>[] = [
  // --- Constant Compressor Models (Standard) ---
  // Standard Compressor + Plate Condenser
  // CS Series - Prices and URLs from "CM (Constant compressor)" screenshot
  { id: "CS005TACP1B1_ACS08-A_STD_PLATE", label: "CS005TACP1B1/ACS08-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CS005T.pdf", compressorType: "standard", power: "5kW", priceRMB: 24630, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CS008TACT1B1_ACS10-A_STD_PLATE", label: "CS008TACT1B1/ACS10-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CS008T.pdf", compressorType: "standard", power: "8kW", priceRMB: 32050, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CS013TACT1B1_ACS16-A_STD_PLATE", label: "CS013TACT1B1/ACS16-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CS013T.pdf", compressorType: "standard", power: "13kW", priceRMB: 35660, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CS017TACT1B1_ACS22-A_STD_PLATE", label: "CS017TACT1B1/ACS22-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CS017T.pdf", compressorType: "standard", power: "17kW", priceRMB: 49710, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CS022TACT1B1_ACS28-A_STD_PLATE", label: "CS022TACT1B1/ACS28-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CS022T.pdf", compressorType: "standard", power: "22kW", priceRMB: 58480, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  
  // CM Series - Standard, Plate - Prices and URLs from "CM (Constant compressor)" screenshot
  { id: "CM025UA_DA_ACS50-A_STD_PLATE", label: "CM025UA,CM025DA/ACS50-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM025.pdf", compressorType: "standard", power: "25kW", priceRMB: 53200, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM030UA_DA_ACS50-A_STD_PLATE", label: "CM030UA,CM030DA/ACS50-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM030.pdf", compressorType: "standard", power: "30kW", priceRMB: 54400, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." }, // Removed _V2 from ID as this is now the definitive standard/plate version
  { id: "CM035UA_DA_ACS60-A_STD_PLATE", label: "CM035UA,CM035DA/ACS60-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM035.pdf", compressorType: "standard", power: "35kW", priceRMB: 62500, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM040UA_DA_ACS72-A_STD_PLATE", label: "CM040UA,CM040DA/ACS72-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM040.pdf", compressorType: "standard", power: "40kW", priceRMB: 67800, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM045UA_DA_ACS80-A_STD_PLATE", label: "CM045UA,CM045DA/ACS80-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM045.pdf", compressorType: "standard", power: "45kW", priceRMB: 73800, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM050UA_DA_ACS86-A_STD_PLATE", label: "CM050UA,CM050DA/ACS86-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM050.pdf", compressorType: "standard", power: "50kW", priceRMB: 79200, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM042UA_DA_2ACS32-A_STD_PLATE", label: "CM042UA,CM042DA/2*ACS32-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM042UA.pdf", compressorType: "standard", power: "42kW", priceRMB: 82500, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM052UA_DA_2ACS42-A_STD_PLATE", label: "CM052UA,CM052DA/2*ACS42-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM052.pdf", compressorType: "standard", power: "52kW", priceRMB: 97500, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM060UA_DA_2ACS50-A_STD_PLATE", label: "CM060UA,CM060DA/2*ACS50-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM060.pdf", compressorType: "standard", power: "60kW", priceRMB: 111300, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM070UA_DA_2ACS60-A_STD_PLATE", label: "CM070UA,CM070DA/2*ACS60-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM070.pdf", compressorType: "standard", power: "70kW", priceRMB: 117200, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM080UA_DA_2ACS72-A_STD_PLATE", label: "CM080UA,CM080DA/2*ACS72-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM080.pdf", compressorType: "standard", power: "80kW", priceRMB: 130800, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM090UA_DA_2ACS80-A_STD_PLATE", label: "CM090UA,CM090DA/2*ACS80-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM090.pdf", compressorType: "standard", power: "90kW", priceRMB: 137000, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM100UA_DA_2ACS86-A_STD_PLATE", label: "CM100UA,CM100DA/2*ACS86-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM100.pdf", compressorType: "standard", power: "100kW", priceRMB: 144800, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM110UA_DA_2ACS99-A_STD_PLATE", label: "CM110UA,CM110DA/2*ACS99-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM110.pdf", compressorType: "standard", power: "110kW", priceRMB: 167800, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM120UA_DA_2ACS106-A_STD_PLATE", label: "CM120UA,CM120DA/2*ACS106-A(Станд,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM120.pdf", compressorType: "standard", power: "120kW", priceRMB: 191200, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },

  // Standard Compressor + Array/V-Type Condenser ("-MA" models) — prices from constant compressor sheet
  { id: "CM025UA_DA_ACS50-MA_STD_ARRAY", label: "CM025UA,CM025DA/ACS50-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM025.pdf", compressorType: "standard", power: "25kW", priceRMB: 53800, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM030UA_DA_ACS50-MA_STD_ARRAY", label: "CM030UA,CM030DA/ACS50-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM030.pdf", compressorType: "standard", power: "30kW", priceRMB: 55000, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM035UA_DA_ACS62-MA_STD_ARRAY", label: "CM035UA,CM035DA/ACS62-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM035.pdf", compressorType: "standard", power: "35kW", priceRMB: 63300, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM040UA_DA_ACS79-MA_STD_ARRAY", label: "CM040UA,CM040DA/ACS79-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM040.pdf", compressorType: "standard", power: "40kW", priceRMB: 70300, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM045UA_DA_ACS86-MA_STD_ARRAY", label: "CM045UA,CM045DA/ACS86-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM045.pdf", compressorType: "standard", power: "45kW", priceRMB: 76800, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM050UA_DA_ACS86-MA_STD_ARRAY", label: "CM050UA,CM050DA/ACS86-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM050.pdf", compressorType: "standard", power: "50kW", priceRMB: 80300, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM042UA_DA_2ACS42-MA_STD_ARRAY", label: "CM042UA,CM042DA/2*ACS42-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM042UA.pdf", compressorType: "standard", power: "42kW", priceRMB: 85700, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM052UA_DA_2ACS42-MA_STD_ARRAY", label: "CM052UA,CM052DA/2*ACS42-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM052.pdf", compressorType: "standard", power: "52kW", priceRMB: 99000, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM060UA_DA_2ACS50-MA_STD_ARRAY", label: "CM060UA,CM060DA/2*ACS50-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM060.pdf", compressorType: "standard", power: "60kW", priceRMB: 112500, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM070UA_DA_2ACS62-MA_STD_ARRAY", label: "CM070UA,CM070DA/2*ACS62-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM070.pdf", compressorType: "standard", power: "70kW", priceRMB: 120000, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM080UA_DA_2ACS79-MA_STD_ARRAY", label: "CM080UA,CM080DA/2*ACS79-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM080.pdf", compressorType: "standard", power: "80kW", priceRMB: 135800, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM090UA_DA_2ACS86-MA_STD_ARRAY", label: "CM090UA,CM090DA/2*ACS86-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM090.pdf", compressorType: "standard", power: "90kW", priceRMB: 142800, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM100UA_DA_2ACS86-MA_STD_ARRAY", label: "CM100UA,CM100DA/2*ACS86-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM100.pdf", compressorType: "standard", power: "100kW", priceRMB: 148800, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM110UA_DA_2ACS125-MA_STD_ARRAY", label: "CM110UA,CM110DA/2*ACS125-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM110.pdf", compressorType: "standard", power: "110kW", priceRMB: 182700, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },
  { id: "CM120UA_DA_2ACS125-MA_STD_ARRAY", label: "CM120UA,CM120DA/2*ACS125-MA(Станд,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM120.pdf", compressorType: "standard", power: "120kW", priceRMB: 199900, configStrategy: "Компрессор постоянной производительности, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, V-образный матричный конденсатор." },

  // --- Inverter Compressor Models ---
  // Inverter Compressor + Array/V-Type Condenser ("-MA" models from "CM (Inverter compressor)" sheet)
  // ... (Data for these models, e.g., CM025UA_ACS42-MA_INV_ARRAY, is distinct and uses prices from the Inverter MA sheet)
  
  // Inverter Compressor + Plate Condenser ("-A" suffix CM models from "CM (Inverter compressor)" screenshot)
  // ... (Data for these models, e.g., CM025UA_DA_ACS50-A_INV_PLATE, is distinct and uses prices from the Inverter Plate section of that sheet)
  // CS Series Inverter + Plate also reside here
  // ...
  { id: "CS005TACP1B1_ACS08-A_INV_PLATE", label: "CS005TACP1B1/ACS08-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CS005T.pdf", compressorType: "inverter", power: "5kW", priceRMB: 26130, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CS008TACT1B1_ACS10-A_INV_PLATE", label: "CS008TACT1B1/ACS10-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CS008T.pdf", compressorType: "inverter", power: "8kW", priceRMB: 32050, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CS013TACT1B1_ACS16-A_INV_PLATE", label: "CS013TACT1B1/ACS16-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CS013T.pdf", compressorType: "inverter", power: "13kW", priceRMB: 35660, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CS017TACT1B1_ACS22-A_INV_PLATE", label: "CS017TACT1B1/ACS22-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CS017T.pdf", compressorType: "inverter", power: "17kW", priceRMB: 49710, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CS022TACT1B1_ACS28-A_INV_PLATE", label: "CS022TACT1B1/ACS28-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CS022T.pdf", compressorType: "inverter", power: "22kW", priceRMB: 58480, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM025UA_DA_ACS50-A_INV_PLATE", label: "CM025UA,CM025DA/ACS50-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM025.pdf", compressorType: "inverter", power: "25kW", priceRMB: 67400, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM030UA_DA_ACS50-A_INV_PLATE", label: "CM030UA,CM030DA/ACS50-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM030.pdf", compressorType: "inverter", power: "30kW", priceRMB: 73200, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM035UA_DA_ACS60-A_INV_PLATE", label: "CM035UA,CM035DA/ACS60-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM035.pdf", compressorType: "inverter", power: "35kW", priceRMB: 77500, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM040UA_DA_ACS72-A_INV_PLATE", label: "CM040UA,CM040DA/ACS72-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM040.pdf", compressorType: "inverter", power: "40kW", priceRMB: 83000, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM045UA_DA_ACS80-A_INV_PLATE", label: "CM045UA,CM045DA/ACS80-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM045.pdf", compressorType: "inverter", power: "45kW", priceRMB: 92000, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM050UA_DA_ACS86-A_INV_PLATE", label: "CM050UA,CM050DA/ACS86-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM050.pdf", compressorType: "inverter", power: "50kW", priceRMB: 96000, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM042UA_DA_2ACS32-A_INV_PLATE", label: "CM042UA,CM042DA/2*ACS32-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM042UA.pdf", compressorType: "inverter", power: "42kW", priceRMB: 126800, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM052UA_DA_2ACS42-A_INV_PLATE", label: "CM052UA,CM052DA/2*ACS42-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM052.pdf", compressorType: "inverter", power: "52kW", priceRMB: 136000, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM060UA_DA_2ACS50-A_INV_PLATE", label: "CM060UA,CM060DA/2*ACS50-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM060.pdf", compressorType: "inverter", power: "60kW", priceRMB: 146000, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM070UA_DA_2ACS60-A_INV_PLATE", label: "CM070UA,CM070DA/2*ACS60-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM070.pdf", compressorType: "inverter", power: "70kW", priceRMB: 151700, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM080UA_DA_2ACS72-A_INV_PLATE", label: "CM080UA,CM080DA/2*ACS72-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM080.pdf", compressorType: "inverter", power: "80kW", priceRMB: 166500, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM090UA_DA_2ACS80-A_INV_PLATE", label: "CM090UA,CM090DA/2*ACS80-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM090.pdf", compressorType: "inverter", power: "90kW", priceRMB: 173500, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM100UA_DA_2ACS86-A_INV_PLATE", label: "CM100UA,CM100DA/2*ACS86-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM100.pdf", compressorType: "inverter", power: "100kW", priceRMB: 179400, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM110UA_DA_2ACS99-A_INV_PLATE", label: "CM110UA,CM110DA/2*ACS99-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM110.pdf", compressorType: "inverter", power: "110kW", priceRMB: 204800, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },
  { id: "CM120UA_DA_2ACS106-A_INV_PLATE", label: "CM120UA,CM120DA/2*ACS106-A(Инверт,Пластин)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM120.pdf", compressorType: "inverter", power: "120kW", priceRMB: 226000, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан поддержания нагнетаемого давления, пластинчатый конденсатор." },

  // Inverter Compressor + Array/V-Type Condenser ("-MA" suffix) — prices from same sheet
  { id: "CM025UA_DA_ACS50-MA_INV_ARRAY", label: "CM025UA,CM025DA/ACS50-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM025.pdf", compressorType: "inverter", power: "25kW", priceRMB: 69400, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM030UA_DA_ACS50-MA_INV_ARRAY", label: "CM030UA,CM030DA/ACS50-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM030.pdf", compressorType: "inverter", power: "30kW", priceRMB: 75200, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM035UA_DA_ACS62-MA_INV_ARRAY", label: "CM035UA,CM035DA/ACS62-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM035.pdf", compressorType: "inverter", power: "35kW", priceRMB: 79500, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM040UA_DA_ACS79-MA_INV_ARRAY", label: "CM040UA,CM040DA/ACS79-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM040.pdf", compressorType: "inverter", power: "40kW", priceRMB: 93800, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM045UA_DA_ACS86-MA_INV_ARRAY", label: "CM045UA,CM045DA/ACS86-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM045.pdf", compressorType: "inverter", power: "45kW", priceRMB: 94000, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM042UA_DA_2ACS42-MA_INV_ARRAY", label: "CM042UA,CM042DA/2*ACS42-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM042UA.pdf", compressorType: "inverter", power: "42kW", priceRMB: 128800, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM052UA_DA_2ACS42-MA_INV_ARRAY", label: "CM052UA,CM052DA/2*ACS42-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM052.pdf", compressorType: "inverter", power: "52kW", priceRMB: 136000, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентилятор (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM060UA_DA_2ACS50-MA_INV_ARRAY", label: "CM060UA,CM060DA/2*ACS50-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM060.pdf", compressorType: "inverter", power: "60kW", priceRMB: 146000, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентилятор (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM070UA_DA_2ACS62-MA_INV_ARRAY", label: "CM070UA,CM070DA/2*ACS62-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM070.pdf", compressorType: "inverter", power: "70kW", priceRMB: 151700, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентилятор (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM080UA_DA_2ACS79-MA_INV_ARRAY", label: "CM080UA,CM080DA/2*ACS79-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM080.pdf", compressorType: "inverter", power: "80kW", priceRMB: 166500, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентилятор (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM090UA_DA_2ACS86-MA_INV_ARRAY", label: "CM090UA,CM090DA/2*ACS86-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM090.pdf", compressorType: "inverter", power: "90kW", priceRMB: 175500, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентилятор (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM100UA_DA_2ACS86-MA_INV_ARRAY", label: "CM100UA,CM100DA/2*ACS86-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM100.pdf", compressorType: "inverter", power: "100kW", priceRMB: 181400, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM110UA_DA_2ACS125-MA_INV_ARRAY", label: "CM110UA,CM110DA/2*ACS125-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM110.pdf", compressorType: "inverter", power: "110kW", priceRMB: 206800, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентилятор (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
  { id: "CM120UA_DA_2ACS125-MA_INV_ARRAY", label: "CM120UA,CM120DA/2*ACS125-MA(Инверт,V-тип)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM120.pdf", compressorType: "inverter", power: "120kW", priceRMB: 228000, configStrategy: "Инверторный компрессор, хладагент R410A, электронный расширительный вентилятор (EEV), вентилятор с EC-двигателем, без нагревателя, без увлажнителя, точечный датчик протечки воды, комплект для низкотемпературных условий, V-образный матричный конденсатор." },
];

const PRODUCTS_CABINET_FREON: ProductCRAC[] = PRODUCTS_CABINET_FREON_RAW.map(p => ({
    ...p,
    mainType: "cabinet",
    subType: "freon",
    priceUSD: parseFloat((p.priceRMB * RMB_TO_USD_RATE).toFixed(2))
}));

const ACCESSORIES_CABINET_FREON_RAW: Omit<AccessoryCRAC, 'priceUSD'>[] = [
    { id: "cf_heater6kw", label: "Нагреватель 6кВт", priceRMB: 1000, appliesTo: "Для 25~35кВт", categoryKey: "heating" },
    { id: "cf_heater9kw", label: "Нагреватель 9кВт", priceRMB: 1300, appliesTo: "Для 40~70кВт", categoryKey: "heating" },
    { id: "cf_heater12kw", label: "Нагреватель 12кВт", priceRMB: 1500, appliesTo: "Для 80~120кВт", categoryKey: "heating" },
    { id: "cf_humid5kg", label: "Увлажнитель 5кг/ч", priceRMB: 6000, appliesTo: "Для 25~35кВт", categoryKey: "humidification" },
    { id: "cf_humid8kg", label: "Увлажнитель 8кг/ч", priceRMB: 6500, appliesTo: "Для 40~70кВт", categoryKey: "humidification" },
    { id: "cf_humid10kg", label: "Увлажнитель 10кг/ч", priceRMB: 7000, appliesTo: "Для 80~120кВт", categoryKey: "humidification" },
    { id: "cf_airhood_type1", label: "Воздухозаборник тип 1: высота 400мм", priceRMB: 2500, appliesTo: "Для 25~35кВт", note: "Только для моделей с верхним потоком воздуха, воздухозаборник для фронтального потока.", categoryKey: "air_handling" },
    { id: "cf_airhood_type2", label: "Воздухозаборник тип 2: высота 400мм", priceRMB: 3000, appliesTo: "Для 35~50кВт", note: "Только для моделей с верхним потоком воздуха, воздухозаборник для фронтального потока.", categoryKey: "air_handling" },
    { id: "cf_airhood_type3", label: "Воздухозаборник тип 3: высота 400мм", priceRMB: 4000, appliesTo: "Для 42/52кВт", note: "Только для моделей с верхним потоком воздуха, воздухозаборник для фронтального потока.", categoryKey: "air_handling" },
    { id: "cf_airhood_type4", label: "Воздухозаборник тип 4: высота 400мм", priceRMB: 5000, appliesTo: "Для 60~100кВт", note: "Только для моделей с верхним потоком воздуха, воздухозаборник для фронтального потока.", categoryKey: "air_handling" },
    { id: "cf_airhood_type5", label: "Воздухозаборник тип 5: высота 400мм", priceRMB: 5500, appliesTo: "Для 110~120кВт", note: "Только для моделей с верхним потоком воздуха, воздухозаборник для фронтального потока.", categoryKey: "air_handling" },
    { id: "cf_spd_c", label: "УЗИП Класс C (устройство защиты от импульсных перенапряжений)", priceRMB: 800, categoryKey: "power" },
    { id: "cf_snmp_card", label: "Карта SNMP", priceRMB: 1200, note: "Порт RS485 по умолчанию с протоколом Modbus. Опциональная конфигурация для нескольких методов связи.", categoryKey: "network_control" },
    { id: "cf_tcpip_card", label: "Карта TCP/IP", priceRMB: 1200, note: "(Подразумевается из примечания к SNMP, обычно отдельно или в комбинации с SNMP)", categoryKey: "network_control" },
    { id: "cf_long_pipe_single", label: "Комплект для длинной трассы, один контур хладагента", priceRMB: 1200, appliesTo: "Для 25~52кВт", note: "Конфигурировать, если длина трубопровода превышает 30 метров.", categoryKey: "installation_kits" }, 
    { id: "cf_long_pipe_dual", label: "Комплект для длинной трассы, два контура хладагента", priceRMB: 2000, appliesTo: "Для 42~120кВт", note: "Конфигурировать, если длина трубопровода превышает 30 метров.", categoryKey: "installation_kits" },
    { id: "cf_diff_press_filter", label: "Реле перепада давления (воздушный фильтр)", priceRMB: 260, note: "Опциональный аксессуар", categoryKey: "sensors" },
    { id: "cf_diff_press_fan", label: "Реле перепада давления (внутренний вентилятор)", priceRMB: 260, note: "Опциональный аксессуар", categoryKey: "sensors" },
    { id: "cf_remote_th_sensor", label: "Выносной датчик температуры / влажности", priceRMB: 900, note: "Опциональный аксессуар", categoryKey: "sensors" },
    { id: "cf_condensate_pump", label: "Насос для отвода конденсата", priceRMB: 1500, note: "Опциональный аксессуар", categoryKey: "drainage" },
    { id: "cf_controller_ups", label: "Защита от сбоя питания для контроллера дисплея", priceRMB: 1500, note: "Опциональный аксессуар", categoryKey: "power" },
    { id: "cf_dual_power_input", label: "Двойной ввод питания (два контактора)", priceRMB: 1500, note: "Рекомендуемая конфигурация вместо АВР (ATS).", categoryKey: "power" },
];
const ACCESSORIES_CABINET_FREON: AccessoryCRAC[] = ACCESSORIES_CABINET_FREON_RAW.map(a => ({ ...a, priceUSD: parseFloat((a.priceRMB * RMB_TO_USD_RATE).toFixed(2)) }));

// == CABINET - WATER (CM Chilled water) - TRANSLATION UPDATE ==
const PRODUCTS_CABINET_WATER_RAW: Omit<ProductCRAC, 'priceUSD' | 'mainType' | 'subType' | 'compressorType'>[] = [
    { id: "CM031UC", label: "CM031UC", power: "31кВт", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM031UC.pdf", configStrategy: "Кондиционер на охлажденной воде...", priceRMB: 30200 },
    { id: "CM041UC", label: "CM041UC", power: "41кВт", priceRMB: 32000, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM041UC-_CM041DC-1.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM051UC", label: "CM051UC", power: "51кВт", priceRMB: 36000, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM051UC-_CM051DC.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM061UC", label: "CM061UC", power: "61кВт", priceRMB: 39000, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM061UC-_CM061DC.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM071UC", label: "CM071UC", power: "71кВт", priceRMB: 41500, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM071UC-_CM071DC-1.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM081UC", label: "CM081UC", power: "81кВт", priceRMB: 47500, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM081UC-_CM081DC-1.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM091UC", label: "CM091UC", power: "91кВт", priceRMB: 50300, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM091UC-_CM091DC-1.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM101UC", label: "CM101UC", power: "101кВт", priceRMB: 52000, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM101UC-_CM101DC-1.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM110UC", label: "CM110UC", power: "110кВт", priceRMB: 54800, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM110UC-_CM110DC-1.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM120UC", label: "CM120UC", power: "120кВт", priceRMB: 59800, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM120UC-_CM120DC-1.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM130UC", label: "CM130UC", power: "130кВт", priceRMB: 63800, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM130UC-_CM130DC-1.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM140UC", label: "CM140UC", power: "140кВт", priceRMB: 66300, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM140UC-_CM140DC.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM150UC", label: "CM150UC", power: "150кВт", priceRMB: 73000, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM150UC-_CM150DC.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM160UC", label: "CM160UC", power: "160кВт", priceRMB: 74800, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM160UC-_CM160DC.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM170UC", label: "CM170UC", power: "170кВт", priceRMB: 77500, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM170UC-_CM170DC.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM180UC", label: "CM180UC", power: "180кВт", priceRMB: 79200, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM180UC-_CM180DC.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM190UC", label: "CM190UC", power: "190кВт", priceRMB: 89500, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM190UC-_CM190DC.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
    { id: "CM200UC", label: "CM200UC", power: "200кВт", priceRMB: 95000, documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CM200UC-_CM200DC.pdf", configStrategy: "Кондиционер на охлажденной воде, ЕС-вентилятор с прямым приводом, только охлаждение, включая реле перепада давления на воздушном фильтре, датчик температуры воды на входе, датчик температуры приточного воздуха, датчик температуры и влажности обратного воздуха" },
];
const PRODUCTS_CABINET_WATER: ProductCRAC[] = PRODUCTS_CABINET_WATER_RAW.map(p => ({
    ...p,
    mainType: "cabinet",
    subType: "water",
    configStrategy: p.configStrategy || PRODUCTS_CABINET_WATER_RAW[0].configStrategy, 
    priceUSD: parseFloat((p.priceRMB * RMB_TO_USD_RATE).toFixed(2))
}));

const ACCESSORIES_CABINET_WATER_RAW: Omit<AccessoryCRAC, 'priceUSD'>[] = [
    { id: "cw_heater", label: "Нагреватель", priceRMB: 3300, appliesTo: "Для CM031~CM200UC", categoryKey: "heating" },
    { id: "cw_humidifier", label: "Увлажнитель", priceRMB: 2500, appliesTo: "Для CM031~CM200UC", categoryKey: "humidification" },
    { id: "cw_airhood1", label: "Воздухозаборник тип 1, высота 400мм", priceRMB: 2500, appliesTo: "Для CM031~061UC", categoryKey: "air_handling" },
    { id: "cw_airhood2", label: "Воздухозаборник тип 2, высота 400мм", priceRMB: 4500, appliesTo: "Для CM071~120UC", categoryKey: "air_handling" },
    { id: "cw_airhood3", label: "Воздухозаборник тип 3, высота 400мм", priceRMB: 6000, appliesTo: "Для CM130~150UC", categoryKey: "air_handling" },
    { id: "cw_airhood4", label: "Воздухозаборник тип 4, высота 400мм", priceRMB: 6500, appliesTo: "Для CM160~200UC", categoryKey: "air_handling" },
    { id: "cw_water_temp_sensor", label: "Датчик температуры воды", priceRMB: 700, note: "(применяется для определения температуры на входе или выходе воды)", categoryKey: "sensors" },
    { id: "cw_leak_detector", label: "Точечный датчик протечки", priceRMB: 500, categoryKey: "sensors" },
    { id: "cw_static_pressure", label: "Датчик статического давления воздуха", priceRMB: 6000, categoryKey: "sensors" },
];
const ACCESSORIES_CABINET_WATER: AccessoryCRAC[] = ACCESSORIES_CABINET_WATER_RAW.map(a => ({ ...a, priceUSD: parseFloat((a.priceRMB * RMB_TO_USD_RATE).toFixed(2)) }));

// == ROW-BASED - FREON (CR(AC)12-60 & MA Series) - Corrected Data ==
const PRODUCTS_ROW_FREON_RAW: Omit<ProductCRAC, 'priceUSD' | 'mainType' | 'subType'>[] = [
  // Plate Condenser Models (from CR(AC)12-60 general screenshot)
  { id: "CR012EA_ACS16A_ROW_PLATE", label: "CR012EA / ACS16-A (Пластинчатый)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR012.pdf", compressorType: "inverter", power: "12 кВт", dims: "300×1200×2000", priceRMB: 41180, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, воздухонаправляющая решётка, без нагревателя, без увлажнителя, верёвочный датчик утечки воды, комплект для низкотемпературных условий, клапан головного давления, пластинчатый конденсатор." },
  { id: "CR025EA_ACS50A_ROW_PLATE", label: "CR025EA / ACS50-A (Пластинчатый)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR025EA.pdf", compressorType: "inverter", power: "25 кВт", dims: "300×1200×2000", priceRMB: 65770, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, воздухонаправляющая решётка, без нагревателя, без увлажнителя, верёвочный датчик утечки воды, комплект для низкотемпературных условий, клапан головного давления, пластинчатый конденсатор." },
  { id: "CR035EA_B_ACS60A_ROW_PLATE", label: "CR035EA-B / ACS60-A (Пластинчатый)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR035EA.pdf", compressorType: "inverter", power: "35 кВт", dims: "300×1200×2000", priceRMB: 74930, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, воздухонаправляющая решётка, без нагревателя, без увлажнителя, верёвочный датчик утечки воды, комплект для низкотемпературных условий, клапан головного давления, пластинчатый конденсатор." },
  { id: "CR035EA_ACS80A_ROW_PLATE", label: "CR035EA / ACS80-A (Пластинчатый)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR035EA_600mm.pdf", compressorType: "inverter", power: "40 кВт", dims: "600×1200×2000", priceRMB: 82570, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, воздухонаправляющая решётка, без нагревателя, без увлажнителя, верёвочный датчик утечки воды, комплект для низкотемпературных условий, клапан головного давления, пластинчатый конденсатор." },
  { id: "CR045EA_ACS86A_ROW_PLATE", label: "CR045EA / ACS86-A (Пластинчатый)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR045EA.pdf", compressorType: "inverter", power: "48 кВт", dims: "600×1200×2000", priceRMB: 97690, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, воздухонаправляющая решётка, без нагревателя, без увлажнителя, верёвочный датчик утечки воды, комплект для низкотемпературных условий, клапан головного давления, пластинчатый конденсатор." },
  { id: "CR060EA_ACS99A_ROW_PLATE", label: "CR060EA / ACS99-A (Пластинчатый)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR060EA.pdf", compressorType: "inverter", power: "60 кВт", dims: "600×1200×2000", priceRMB: 113790, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, воздухонаправляющая решётка, без нагревателя, без увлажнителя, верёвочный датчик утечки воды, комплект для низкотемпературных условий, клапан головного давления, пластинчатый конденсатор." },
  { id: "CR060EA_ACS106A_ROW_PLATE", label: "CR060EA / ACS106-A (Пластинчатый)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR070.pdf", compressorType: "inverter", power: "70 кВт", dims: "600×1200×2001", priceRMB: 119220, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, воздухонаправляющая решётка, без нагревателя, без увлажнителя, верёвочный датчик утечки воды, комплект для низкотемпературных условий, клапан головного давления, пластинчатый конденсатор." }, // CR070.pdf for ACS106-A (70kW)
  // Array/V-Type Condenser Models (-MA series from screenshots)
  { id: "CR025EA_ACS42-MA_ROW_ARRAY", label: "CR025EA / ACS42-MA (Массивный)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR025MA.pdf", compressorType: "inverter", power: "25kW", dims: "300*1200*2000", priceRMB: 67280, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, нагреватель, увлажнитель, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан высокого давления, массивный V-образный конденсатор." },
  { id: "CR035EA-B_ACS62-MA_ROW_ARRAY", label: "CR035EA-B / ACS62-MA (Массивный)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR035EA.pdf", compressorType: "inverter", power: "35kW", dims: "300*1200*2000", priceRMB: 76970, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, нагреватель, увлажнитель, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан высокого давления, массивный V-образный конденсатор." },
  { id: "CR035EA_ACS79-MA_ROW_ARRAY", label: "CR035EA / ACS79-MA (Массивный)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR035EA_600mm.pdf", compressorType: "inverter", power: "40kW", dims: "600*1200*2000", priceRMB: 84610, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, нагреватель, увлажнитель, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан высокого давления, массивный V-образный конденсатор." },
  { id: "CR045EA_ACS86-MA_ROW_ARRAY", label: "CR045EA / ACS86-MA (Массивный)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR045EA.pdf", compressorType: "inverter", power: "48kW", dims: "600*1200*2000", priceRMB: 99915, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, нагреватель, увлажнитель, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан высокого давления, массивный V-образный конденсатор." },
  { id: "CR060EA_ACS96-MA_ROW_ARRAY", label: "CR060EA / ACS96-MA (Массивный)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR060EA.pdf", compressorType: "inverter", power: "60kW", dims: "600*1200*2000", priceRMB: 116670, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, нагреватель, увлажнитель, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан высокого давления, массивный V-образный конденсатор." },
  { id: "CR060EA_ACS106-MA_ROW_ARRAY", label: "CR060EA / ACS106-MA (Массивный)", documentationUrl: "https://iteaq.su/wp-content/uploads/2025/05/CR070.pdf", compressorType: "inverter", power: "70kW", dims: "600*1200*2000", priceRMB: 119220, configStrategy: "Стандартная конфигурация: Инверторный компрессор, хладагент R410A, электронный расширительный вентиль (EEV), вентилятор с EC-двигателем, нагреватель, увлажнитель, точечный датчик протечки воды, комплект для низкотемпературных условий, клапан высокого давления, массивный V-образный конденсатор." },
];

const PRODUCTS_ROW_FREON: ProductCRAC[] = PRODUCTS_ROW_FREON_RAW.map(p => ({
    ...p,
    mainType: "row_based",
    subType: "freon",
    compressorType: "inverter", 
    priceUSD: parseFloat((p.priceRMB * RMB_TO_USD_RATE).toFixed(2))
}));

const ACCESSORIES_ROW_FREON_RAW: Omit<AccessoryCRAC, 'priceUSD'>[] = [
  { id: "rf_heater3", label: "Нагреватель 3 кВт", priceRMB: 480, appliesTo: "Для CR012, CR025, CR035-B", categoryKey: "heating" },
  { id: "rf_heater6", label: "Нагреватель 6 кВт", priceRMB: 720, appliesTo: "Для CR035, CR045, CR060", categoryKey: "heating" },
  { id: "rf_humid1", label: "Увлажнитель 1 кг/ч", priceRMB: 1600, appliesTo: "Для CR012", categoryKey: "humidification" },
  { id: "rf_humid2", label: "Увлажнитель 2 кг/ч", priceRMB: 1850, appliesTo: "Для CR025~060", categoryKey: "humidification" }, 
  { id: "rf_tcpip", label: "Карта TCP/IP", priceRMB: 1280, categoryKey: "network_control" },
  { id: "rf_snmp", label: "Карта SNMP", priceRMB: 1280, categoryKey: "network_control" },
  { id: "rf_longdist", label: "Комплект для удлинения трассы", priceRMB: 1170, note: "Настройте, если длина трассы превышает 30 метров", categoryKey: "installation_kits" },
  { id: "rf_pressAir", label: "Реле разности давлений (воздушный фильтр)", priceRMB: 265, categoryKey: "sensors" },
  { id: "rf_pressFan", label: "Реле разности давлений (внутренний вентилятор)", priceRMB: 265, categoryKey: "sensors" },
  { id: "rf_remoteSensor", label: "Удаленный датчик температуры / влажности", priceRMB: 1070, categoryKey: "sensors" },
  { id: "rf_pump", label: "Дренажный насос для отвода конденсата", priceRMB: 1380, categoryKey: "drainage" },
  { id: "rf_ups", label: "Бесперебойное питание контроллера", priceRMB: 1800, categoryKey: "power" },
  { id: "rf_dualPower", label: "Двойной ввод питания (двойной контактор)", priceRMB: 1200, note: "Рекомендуемая конфигурация вместо ATS", categoryKey: "power" },
  { id: "rf_condenser_replace", label: "Замена пластинчатого конденсатора на массивный V-образный компактный конденсатор", priceRMB: 2500, appliesTo: "кроме модели 12.5", categoryKey: "special_options" }
];
const ACCESSORIES_ROW_FREON: AccessoryCRAC[] = ACCESSORIES_ROW_FREON_RAW.map(a => ({ ...a, priceUSD: parseFloat((a.priceRMB * RMB_TO_USD_RATE).toFixed(2)) }));

const PRODUCTS_ROW_WATER: ProductCRAC[] = [];
const ACCESSORIES_ROW_WATER: AccessoryCRAC[] = [];

// Combine all products and accessories
const ALL_PRODUCTS = [
    ...PRODUCTS_CABINET_FREON,
    ...PRODUCTS_CABINET_WATER,
    ...PRODUCTS_ROW_FREON,
    // ...PRODUCTS_ROW_WATER, // Add when data is available
];

const ALL_ACCESSORIES = [
    ...ACCESSORIES_CABINET_FREON,
    ...ACCESSORIES_CABINET_WATER,
    ...ACCESSORIES_ROW_FREON,
    // ...ACCESSORIES_ROW_WATER, // Add when data is available
];

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to extract numeric kW from power string
const getNumericPower = (powerString: string | undefined): number | null => {
  if (!powerString) return null;
  const match = powerString.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
};

// Helper function to check accessory applicability
const isAccessoryApplicable = (accessory: AccessoryCRAC, model: ProductCRAC | undefined): boolean => {
  if (!model) return true; 

  if (model.configStrategy) {
    const modelConfigLower = model.configStrategy.toLowerCase();
    if (accessory.categoryKey === 'heating' && (modelConfigLower.includes('нагревател') && !modelConfigLower.includes('без нагревателя'))) {
      return false; 
    }
    if (accessory.categoryKey === 'humidification' && (modelConfigLower.includes('увлажнител') && !modelConfigLower.includes('без увлажнителя'))) {
      return false; 
    }
  }

  if (!accessory.appliesTo) return true; 

  const modelPower = getNumericPower(model.power);
  const appliesToClean = accessory.appliesTo.toLowerCase();
  const modelIdClean = model.id.toLowerCase();
  const modelLabelClean = model.label.toLowerCase();
  const modelNumericIdPart = parseInt(model.id.replace(/[^0-9]/g, '').substring(0, 3), 10); // e.g., CR060 -> 60

  // Pattern 1: Exclusion rule
  const exclusionKwMatch = appliesToClean.match(/кроме модели\s*(\d+(?:\.\d+)?)/);
  if (exclusionKwMatch && modelPower !== null) {
    const excludedPower = parseFloat(exclusionKwMatch[1]);
    if (modelPower === excludedPower) return false; 
  }

  // Pattern 2: kW range
  const kwRangeRegex = /(?:для|for)?\s*(\d+(?:\.\d+)?)\s*(?:~|-)\s*(\d+(?:\.\d+)?)\s*квт/;
  const kwRangeMatch = appliesToClean.match(kwRangeRegex);
  if (kwRangeMatch && modelPower !== null) {
    const minKw = parseFloat(kwRangeMatch[1]);
    const maxKw = parseFloat(kwRangeMatch[2]);
    if (modelPower >= minKw && modelPower <= maxKw) return true;
  }

  // Pattern 3: Specific model IDs/Labels from a comma-separated list
  if (appliesToClean.includes(',')) {
    const applicableModelStrings = appliesToClean.replace(/(?:для|for)\s*/, '').split(',').map(m => m.trim().toLowerCase());
    if (applicableModelStrings.some(appModelStr => modelIdClean.includes(appModelStr) || modelLabelClean.includes(appModelStr))) {
      return true;
    }
  }
  
  // Pattern 4: Model prefix ranges like "Для CR025~070" or "Для CM031~061UC"
  const modelPrefixRangeRegex = /(?:для|for)?\s*([a-z]+)(\d+)(?:~|-)([a-z]*)(\d+)([a-z]*)/;
  const modelPrefixRangeMatch = appliesToClean.match(modelPrefixRangeRegex);
  if (modelPrefixRangeMatch && !isNaN(modelNumericIdPart)) {
    const prefix = modelPrefixRangeMatch[1]; // e.g., "cr" or "cm"
    const rangeStartNum = parseInt(modelPrefixRangeMatch[2]);
    const rangeEndPrefix = modelPrefixRangeMatch[3]; // usually empty for CR, might be 'uc' for CM
    const rangeEndNum = parseInt(modelPrefixRangeMatch[4]);
    const suffix = modelPrefixRangeMatch[5]; // e.g., "uc"

    // Check if model ID starts with the same prefix
    if (modelIdClean.startsWith(prefix)) {
      if (modelNumericIdPart >= rangeStartNum && modelNumericIdPart <= rangeEndNum) {
        // If suffix is present in rule (like UC), check model also matches
        if (suffix && modelIdClean.endsWith(suffix)) {
          return true;
        }
        // If no suffix in rule (common for CR ranges), match is good.
        if (!suffix && (!rangeEndPrefix || modelIdClean.endsWith(rangeEndPrefix))) { // ensure if end prefix exists, it also matches
            return true;
        }
      }
    }
  }

  // Pattern 5: Specific single model ID/Label (general fallback)
  const singleAppliesToString = appliesToClean.replace(/(?:для|for)\s*/, '').trim();
  if (modelIdClean.includes(singleAppliesToString) || modelLabelClean.includes(singleAppliesToString)) {
      return true;
  }

  return false; 
};

// Helper function to add page numbers to a PDFDocument
const addPageNumbers = async (pdfDoc: PDFDocument, startPage: number = 1) => {
  pdfDoc.registerFontkit(fontkit); // Correctly use the imported 'fontkit'
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  let robotoFontBytes;
  try {
    // Attempt to fetch Roboto font for pdf-lib
    // Using a direct CDN link. Ensure this is accessible.
    const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
    robotoFontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
  } catch (e) {
    console.error("Failed to fetch Roboto font for pdf-lib page numbers:", e);
    // Fallback or skip page numbering if font fetch fails
    return; 
  }

  if (!robotoFontBytes) return; // Should not happen if fetch is successful and no error thrown

  const customFont = await pdfDoc.embedFont(robotoFontBytes);

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    // Use `startPage` for correct numbering in merged documents
    const pageNumberText = `Страница ${startPage + i} из ${startPage + totalPages - 1}`;
    
    page.drawText(pageNumberText, {
      x: width / 2 - 30, // Adjust as needed for centering
      y: 20, // Position from bottom, slightly lower to avoid overlap
      size: 8, // Smaller font size for footer
      font: customFont, 
      // color: rgb(0.2, 0.2, 0.2), // Darker gray for better visibility
    });
  }
};

export default function CRACConfiguratorPage() {
  const { token } = useAuth(); // Get token for API calls
  const navigate = useNavigate(); // Initialize navigate
  const [mainAcType, setMainAcType] = useState<MainACType>("cabinet");
  const [subAcType, setSubAcType] = useState<SubACType>("freon");
  const [compressorAcType, setCompressorAcType] = useState<CompressorType | undefined>("standard");
  const [externalUnitRowFreon, setExternalUnitRowFreon] = useState<ExternalUnitType | undefined>(undefined); // For Row-Based Freon
  const [externalUnitCabinetFreon, setExternalUnitCabinetFreon] = useState<ExternalUnitType | undefined>('plate'); // For Cabinet Freon, default to plate for standard
  const [modelId, setModelId] = useState<string>("");
  const [extras, setExtras] = useState<string[]>([]);
  const [accessorySearch, setAccessorySearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const accessoriesContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const resetSelections = () => {
    setModelId("");
    setExtras([]);
    setAccessorySearch("");
  };

  const handleMainTypeChange = (newType: MainACType) => {
    setMainAcType(newType);
    resetSelections();

    if (newType === 'row_based') {
      setSubAcType('freon'); 
      setCompressorAcType('inverter'); 
      setExternalUnitRowFreon('plate'); 
      setExternalUnitCabinetFreon(undefined);
    } else { // Cabinet type
      setSubAcType('freon'); 
      setCompressorAcType('standard'); 
      setExternalUnitCabinetFreon('plate'); 
      setExternalUnitRowFreon(undefined); 
    }
  };

  const handleSubTypeChange = (newType: SubACType) => {
    setSubAcType(newType);
    resetSelections();

    if (mainAcType === 'row_based') {
      if (newType === 'freon') {
        setCompressorAcType('inverter'); 
        setExternalUnitRowFreon('plate'); 
        setExternalUnitCabinetFreon(undefined);
      } else { // row_based water (future)
        setCompressorAcType(undefined); 
        setExternalUnitRowFreon(undefined); 
        setExternalUnitCabinetFreon(undefined);
      }
    } else { // Cabinet type
      setExternalUnitRowFreon(undefined);
      if (newType === 'freon') {
        setCompressorAcType('standard');
        setExternalUnitCabinetFreon('plate');
      } else { // Cabinet water
        setCompressorAcType(undefined);
        setExternalUnitCabinetFreon(undefined);
      }
    }
  };

  const handleCompressorTypeChange = (newType: CompressorType) => {
    setCompressorAcType(newType);
    resetSelections();
    // For cabinet freon, changing compressor should also suggest a default external unit type
    if (mainAcType === 'cabinet' && subAcType === 'freon') {
      setExternalUnitCabinetFreon(newType === 'standard' ? 'plate' : 'array');
    }
  };

  const handleExternalUnitRowFreonChange = (newType: ExternalUnitType) => {
    setExternalUnitRowFreon(newType);
    resetSelections();
  };
  
  const handleExternalUnitCabinetFreonChange = (newType: ExternalUnitType) => {
    setExternalUnitCabinetFreon(newType);
    resetSelections();
  };

  const handleModelChange = (newModelId: string) => {
    setModelId(newModelId);
    // Keep extras, but they will be re-filtered by accessoriesToDisplay if model changes applicability
    // setExtras([]); // Optional: Reset extras when model changes, or let them be filtered
    setAccessorySearch("");
  };

  const toggleExtra = (extraId: string) => {
    setExtras((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  };

  const availableModels = useMemo(() => {
    if (mainAcType === 'cabinet' && subAcType === 'freon') {
      return ALL_PRODUCTS.filter(p =>
        p.mainType === 'cabinet' &&
        p.subType === 'freon' &&
        p.compressorType === compressorAcType && 
        p.configStrategy && (
          externalUnitCabinetFreon === 'plate' ? 
            (p.configStrategy.toLowerCase().includes('пластинчатый конденсатор')) : 
          externalUnitCabinetFreon === 'array' ? 
            ( 
              p.configStrategy.toLowerCase().includes('v-образный матричный конденсатор') || 
              p.configStrategy.toLowerCase().includes('конденсатор матричного v типа')
            ) :
          false
        )
      );
    }
    if (mainAcType === 'row_based' && subAcType === 'freon') {
        return ALL_PRODUCTS.filter(p =>
          p.mainType === 'row_based' &&
          p.subType === 'freon' &&
          p.compressorType === 'inverter' && 
          p.configStrategy && (
            externalUnitRowFreon === 'plate' ? 
              p.configStrategy.toLowerCase().includes('пластинчатый конденсатор') : 
            externalUnitRowFreon === 'array' ? 
             (// Match variants for array condenser for row-based units
              p.configStrategy.toLowerCase().includes('массивный v-образный конденсатор') || 
              p.configStrategy.toLowerCase().includes('массивный конденсатор') || // From new MA series screenshot
              p.configStrategy.toLowerCase().includes('array condenser') 
             ) :
            false
          )
        );
      }
      // For Cabinet Water or other future types
      return ALL_PRODUCTS.filter(p => 
          p.mainType === mainAcType && 
          p.subType === subAcType &&
          (p.subType === 'water' || p.compressorType === compressorAcType) 
      );
  }, [mainAcType, subAcType, compressorAcType, externalUnitRowFreon, externalUnitCabinetFreon, ALL_PRODUCTS]);

  const selectedModel = useMemo(() => {
    if (!modelId) return undefined;
    // console.log(`Finding model with ID: ${modelId} in ALL_PRODUCTS`); // Debug: Check modelId
    const model = ALL_PRODUCTS.find((p) => p.id === modelId);
    // console.log("Found model in useMemo:", model); // Debug: Check the found model object
    return model;
  }, [modelId, ALL_PRODUCTS]); // ALL_PRODUCTS must be stable or correctly memoized if it's complexly derived

  const accessoriesToDisplay = useMemo(() => {
    let baseAccessories: AccessoryCRAC[] = [];
    if (mainAcType === 'cabinet' && subAcType === 'freon') baseAccessories = ACCESSORIES_CABINET_FREON;
    else if (mainAcType === 'cabinet' && subAcType === 'water') baseAccessories = ACCESSORIES_CABINET_WATER;
    else if (mainAcType === 'row_based' && subAcType === 'freon') baseAccessories = ACCESSORIES_ROW_FREON;

    if (selectedModel) {
      return baseAccessories.filter(acc => isAccessoryApplicable(acc, selectedModel));
    }
    return baseAccessories;
  }, [mainAcType, subAcType, selectedModel]);

  const groupedAccessories = useMemo(() => {
    const groups: Record<string, AccessoryCRAC[]> = {};
    accessoriesToDisplay.forEach(acc => {
      const categoryName = ACCESSORY_CATEGORIES[acc.categoryKey];
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(acc);
    });
    return groups;
  }, [accessoriesToDisplay]);

  // Define category interaction functions here, after groupedAccessories is defined
  const toggleCategoryExpand = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(cat => cat !== categoryName) 
        : [...prev, categoryName]
    );
  };

  const expandAllCategories = () => {
    setExpandedCategories(Object.keys(groupedAccessories));
  };

  const collapseAllCategories = () => {
    setExpandedCategories([]);
  };

  const selectAllInCategory = (categoryName: string) => {
    const categoryAccessories = groupedAccessories[categoryName];
    if (!categoryAccessories) return;
    const categoryIds = categoryAccessories.map(acc => acc.id);
    setExtras(prev => {
      const currentWithoutCategory = prev.filter(id => 
        !categoryIds.includes(id)
      );
      return [...new Set([...currentWithoutCategory, ...categoryIds])]; // Use Set to avoid duplicates
    });
  };

  const unselectAllInCategory = (categoryName: string) => {
    const categoryAccessories = groupedAccessories[categoryName];
    if (!categoryAccessories) return;
    const categoryIds = categoryAccessories.map(acc => acc.id);
    setExtras(prev => prev.filter(id => !categoryIds.includes(id)));
  };

  const filteredGroupedAccessories = useMemo(() => {
    if (!accessorySearch.trim()) return groupedAccessories;
    const filtered: Record<string, AccessoryCRAC[]> = {};
    Object.entries(groupedAccessories).forEach(([categoryName, accessories]) => {
      const matchingAccessories = accessories.filter(acc => 
        acc.label.toLowerCase().includes(accessorySearch.toLowerCase()) ||
        (acc.note && acc.note.toLowerCase().includes(accessorySearch.toLowerCase())) ||
        (acc.appliesTo && acc.appliesTo.toLowerCase().includes(accessorySearch.toLowerCase()))
      );
      if (matchingAccessories.length > 0) {
        filtered[categoryName] = matchingAccessories;
      }
    });
    return filtered;
  }, [groupedAccessories, accessorySearch]);

  const totalUSD = useMemo(() => {
    let currentTotal = selectedModel?.priceUSD || 0;
    extras.forEach((extraId) => {
      const accessory = accessoriesToDisplay.find((acc) => acc.id === extraId);
      if (accessory) {
        currentTotal += accessory.priceUSD;
      }
    });
    return currentTotal;
  }, [selectedModel, extras, accessoriesToDisplay]);

  // --- Select appropriate product photo for summary card ---
  const productImageSrc = useMemo(() => {
    if (!selectedModel) return null;
    if (selectedModel.mainType === 'row_based') {
      // Row-based units are always freon/inverter
      return externalUnitRowFreon === 'plate' ? rowImage : vTypeImage;
    }
    // Cabinet type
    if (selectedModel.subType === 'water') return cabinetImage; // Water-cooled cabinets
    // Cabinet freon
    return externalUnitCabinetFreon === 'plate' ? cabinetImage : vTypeImage;
  }, [selectedModel, externalUnitRowFreon, externalUnitCabinetFreon]);

  const handleGenerateCRACQuote = async () => {
    if (!selectedModel) {
      alert("Пожалуйста, выберите модель перед формированием квоты.");
      return;
    }
    if (!token) {
      alert("Ошибка аутентификации. Пожалуйста, войдите снова.");
      return;
    }

    const selectedAccessoriesFull = extras
      .map(extraId => ALL_ACCESSORIES.find(acc => acc.id === extraId))
      .filter(acc => acc !== undefined) as AccessoryCRAC[];

    // Improved quote naming
    const modelShortName = selectedModel.label.split('/')[0].split(',')[0].trim(); // Extracts the first part of the model label
    const currentDate = new Date();
    const formattedDateForName = currentDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const quoteDisplayName = `CRAC: ${modelShortName} - ${formattedDateForName}`;

    const cracConfigData = {
        selectedModel: selectedModel,
        selectedAccessories: selectedAccessoriesFull,
        productImageSrc: productImageSrc,
        configSelections: { 
            mainAcType,
            subAcType,
            compressorAcType,
            externalUnitRowFreon,
            externalUnitCabinetFreon,
        },
        quoteType: 'CRAC' as const,
    };

    const newQuotePayload = {
      quoteName: quoteDisplayName, // Use the new user-friendly name
      date: currentDate.toISOString(), 
      totalCost: totalUSD, 
      configData: cracConfigData, 
      quoteType: 'CRAC' as const 
    };

    setIsGeneratingPdf(true); 

    try {
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

      // alert(`Квота "${newQuotePayload.quoteName}" успешно отправлена на сервер!`); // Remove alert
      navigate('/dashboard'); // Redirect to dashboard

    } catch (error: any) {
      console.error("Ошибка при отправке квоты CRAC на сервер:", error);
      alert(`Не удалось сохранить квоту на сервере: ${error.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // --- PDF Generation Logic ---
  const generateCRAC_PDF = async () => {
    if (!selectedModel) return;
    setIsGeneratingPdf(true);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      putOnlyUsedFonts: true
    });

    const primaryColor = '#0A2B6C'; // Dark blue from theme
    const secondaryColor = '#333333';
    const accentColor = '#8AB73A'; // Green accent
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    try {
      // Add Cyrillic font support (Roboto from CDN)
      doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf', 'Roboto', 'bold'); // Using Medium for Bold
      doc.setFont('Roboto');
    } catch (e) {
      console.warn("Roboto font could not be added from CDN. Using default font.", e);
      // Fallback to default font if Roboto is not available
    }


    const addWrappedText = (text: string, x: number, currentY: number, maxWidth: number, fontSize: number = 10, align: 'left' | 'center' | 'right' = 'left', fontStyle: 'normal' | 'bold' = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont('Roboto', fontStyle);
      const lines = doc.splitTextToSize(text, maxWidth);
      const lineHeight = fontSize * 0.5; // Adjust line height factor as needed
      
      let newY = currentY;
      if (align === 'center') {
        lines.forEach((line: string) => {
          const textWidth = doc.getStringUnitWidth(line) * fontSize / doc.internal.scaleFactor;
          doc.text(line, x + (maxWidth - textWidth) / 2, newY);
          newY += lineHeight;
        });
      } else if (align === 'right') {
        lines.forEach((line: string) => {
          const textWidth = doc.getStringUnitWidth(line) * fontSize / doc.internal.scaleFactor;
          doc.text(line, x + maxWidth - textWidth, newY);
          newY += lineHeight;
        });
      } else {
        doc.text(lines, x, newY);
        newY += lines.length * lineHeight;
      }
      return newY;
    };

    const addSectionHeader = (text: string, currentY: number) => {
      doc.setFillColor(primaryColor);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('Roboto', 'bold');
      doc.rect(margin, currentY, contentWidth, 10, 'F');
      currentY += 7; // Adjust for vertical centering of text in rect
      doc.text(text, margin + 3, currentY);
      currentY += 7; // Space after header rect + text
      doc.setTextColor(0, 0, 0);
      doc.setFont('Roboto', 'normal');
      return currentY;
    };
    
    const addTableRow = (label: string, value: string, currentY: number, labelWidthPercent = 0.4) => {
      const currentFontSize = 10;
      doc.setFontSize(currentFontSize);
      doc.setFont('Roboto', 'normal');
      doc.setTextColor(secondaryColor);

      const labelMaxWidth = contentWidth * labelWidthPercent - 2;
      const valueX = margin + contentWidth * labelWidthPercent;
      const valueMaxWidth = contentWidth * (1 - labelWidthPercent) -2;
      
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
      doc.text(valueLines, valueX, labelYStart); // Align value text with label's start
      const valueHeight = valueLines.length * valueLineHeight;

      return labelYStart + Math.max(labelHeight, valueHeight) + 3; // Advance y based on the taller element + spacing
    };

    // PDF Header
    if (logoImage) {
      try {
        const img = new Image();
        img.src = logoImage;
        await new Promise(resolve => img.onload = resolve); // Ensure image is loaded
        doc.addImage(img, 'PNG', pageWidth - margin - 30, margin -5 , 30, 10); // Adjust logo size and position
      } catch (e) { console.error("Error adding logo to PDF", e); }
    }
    y = addWrappedText("Спецификация прецизионного кондиционера", margin, y, contentWidth, 18, 'left', 'bold');
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor);
    doc.text(new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }), margin, y);
    y += 10;
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Selected Model Details
    y = addSectionHeader("Выбранная модель", y);
    y = addTableRow("Модель:", selectedModel.label, y);
    y = addTableRow("Мощность:", selectedModel.power, y);
    y = addTableRow("Основной тип:", mainAcType === 'cabinet' ? 'Шкафной' : 'Рядный', y);
    y = addTableRow("Тип охлаждения:", subAcType === 'freon' ? 'Фреоновый' : 'Водяной', y);

    if (subAcType === 'freon' && compressorAcType) {
      y = addTableRow("Компрессор:", compressorAcType === 'standard' ? 'Стандартный' : 'Инверторный', y);
      const externalUnitTypeLabel = (mainAcType === 'cabinet' ? externalUnitCabinetFreon : externalUnitRowFreon) === 'plate' 
                                      ? 'Пластинчатый конденсатор' 
                                      : 'Массивный V-образный конденсатор';
      y = addTableRow("Тип внешнего блока:", externalUnitTypeLabel, y);
    }
    if (selectedModel.dims) {
      y = addTableRow("Размеры (Ш×Г×В):", selectedModel.dims, y);
    }
    y = addTableRow("Цена модели:", formatCurrency(selectedModel.priceUSD), y);
    y += 2;
    doc.setFont('Roboto', 'bold');
    doc.text("Стандартная комплектация:", margin, y);
    y += 5;
    doc.setFont('Roboto', 'normal');
    y = addWrappedText(selectedModel.configStrategy || "Описание отсутствует.", margin, y, contentWidth, 9);
    y += 7;

    // Optional Accessories
    if (extras.length > 0) {
      if (y > pageHeight - margin - 40) { doc.addPage(); y = margin; } // Check for page break
      y = addSectionHeader("Опциональные аксессуары", y);
      extras.forEach(extraId => {
        const accessory = accessoriesToDisplay.find(acc => acc.id === extraId);
        if (accessory) {
          if (y > pageHeight - margin - 15) { doc.addPage(); y = margin; } // Check for page break
          y = addTableRow(accessory.label, formatCurrency(accessory.priceUSD), y);
        }
      });
      y += 5;
    } else {
      y = addSectionHeader("Опциональные аксессуары", y);
      y = addWrappedText("Не выбраны", margin, y, contentWidth, 10);
      y += 7;
    }

    // Total Cost
    if (y > pageHeight - margin - 30) { doc.addPage(); y = margin; } // Check for page break
    y = addSectionHeader("Итоговая стоимость", y);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(accentColor);
    y = addTableRow("Общая стоимость (USD):", formatCurrency(totalUSD), y, 0.6);
    y += 10;

    let finalPdfBytes = doc.output('arraybuffer');
    let specPagesCount = doc.internal.pages.length -1; // jspdf starts pages from 1, length is count

    // Fetch and merge documentation PDF if URL exists
    if (selectedModel.documentationUrl) {
      try {
        // Extract the filename from the documentation URL (works for both absolute and relative URLs)
        const fileName = selectedModel.documentationUrl.split('/').pop() || '';

        // Prepare filename variants to handle occasional typos (e.g. "-_" instead of "_")
        const base = import.meta.env.BASE_URL || '/';
        const fileNameVariants = new Set<string>();
        fileNameVariants.add(fileName);
        fileNameVariants.add(fileName.replace(/-_/g, '_')); // CM041UC-_CM041DC-1.pdf -> CM041UC_CM041DC-1.pdf
        fileNameVariants.add(fileName.replace(/-_/g, ''));  // CM041UC-_CM041DC-1.pdf -> CM041UCCM041DC-1.pdf
        // Also collapse double underscores that may appear after replacement
        fileNameVariants.forEach(fn => {
          if (fn.includes('__')) {
            fileNameVariants.add(fn.replace(/__+/g, '_'));
          }
        });

        const localCandidates: string[] = [];
        fileNameVariants.forEach(fn => {
          localCandidates.push(`${base}${fn}`);
          localCandidates.push(`${base}pdfs/${fn}`);
          localCandidates.push(`${base}documents/${fn}`);
        });

        let documentationPdfBytes: ArrayBuffer | null = null;

        // Try to fetch from candidate local paths first
        for (const candidateUrl of localCandidates) {
          try {
            const res = await fetch(candidateUrl);
            if (res.ok) {
              documentationPdfBytes = await res.arrayBuffer();
              break;
            }
          } catch (_) {
            // Continue trying other candidates
          }
        }

        // Fallback – try to fetch the original URL directly (useful if PDFs are still hosted remotely)
        if (!documentationPdfBytes) {
          try {
            const remoteRes = await fetch(selectedModel.documentationUrl);
            if (remoteRes.ok) {
              documentationPdfBytes = await remoteRes.arrayBuffer();
            }
          } catch (_) {
            /* Ignore – will handle below */
          }
        }

        if (!documentationPdfBytes) {
          throw new Error('Documentation PDF not found locally or remotely.');
        }

        // Merge the generated quote with the documentation PDF
        const mergedPdf = await PDFDocument.create();

        const specPdfDoc = await PDFDocument.load(finalPdfBytes);
        const specPages = await mergedPdf.copyPages(specPdfDoc, specPdfDoc.getPageIndices());
        specPages.forEach(page => mergedPdf.addPage(page));

        const docPdfDoc = await PDFDocument.load(documentationPdfBytes);
        const docPages = await mergedPdf.copyPages(docPdfDoc, docPdfDoc.getPageIndices());
        docPages.forEach(page => mergedPdf.addPage(page));

        // Add page numbers to the merged document
        await addPageNumbers(mergedPdf);

        finalPdfBytes = await mergedPdf.save();

      } catch (error) {
        console.error('Error fetching or merging documentation PDF:', error);
        alert('Не удалось загрузить или объединить PDF документации. Будет загружена только спецификация.');

        // Even if merging fails, make sure the spec has page numbers
        const specPdfDocForPageNumbers = await PDFDocument.load(finalPdfBytes);
        await addPageNumbers(specPdfDocForPageNumbers);
        finalPdfBytes = await specPdfDocForPageNumbers.save();
      }
    } else {
      // No documentation URL – just ensure the spec has page numbers
      const specPdfDocForPageNumbers = await PDFDocument.load(finalPdfBytes);
      await addPageNumbers(specPdfDocForPageNumbers);
      finalPdfBytes = await specPdfDocForPageNumbers.save();
    }

    // Trigger download
    const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeLabel = selectedModel.label.replace(/[^a-z0-9_.-]/gi, '_');
    link.download = `CRAC_Spec_${safeLabel}_${new Date().toISOString().slice(0,10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    setIsGeneratingPdf(false);
  };
  // --- End PDF Generation Logic ---

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative p-6 md:p-8 flex flex-col items-center"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: '#0A2B6C',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[#0A2B6C] bg-opacity-80 z-0"></div>
      <header className="relative z-10 w-full max-w-7xl flex items-center justify-between mb-8 md:mb-12 px-4">
        <img src={logoImage} alt="iTeaQ Logo" className="h-10 md:h-12" />
        <Button 
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="relative group bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-all duration-300 text-sm px-4 py-2 transform hover:scale-105 shadow-lg shadow-black/20 rounded-md"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
          <span className="relative z-10 hidden sm:inline font-medium drop-shadow-sm">Панель</span>
          <span className="relative z-10 sm:hidden drop-shadow-sm">←</span>
        </Button>
      </header>

      <div className="relative z-10 w-full max-w-7xl flex-grow">
        <Card className="bg-[#0A2B6C]/50 backdrop-blur-xl border border-white/15 text-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-3xl font-bold tracking-tight text-center md:text-left">Конфигуратор прецизионных кондиционеров</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 flex-grow grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column: Configuration Options */}
            <div className="md:col-span-2 space-y-6 md:space-y-8 pr-0 md:pr-8 md:border-r border-white/10">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-lg font-semibold text-white/90">Основной тип</Label>
                    <select 
                        value={mainAcType} 
                        onChange={(e) => handleMainTypeChange(e.target.value as MainACType)} 
                        className="w-full bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#8AB73A] focus:ring-[#8AB73A]/30 h-12 text-base rounded-md p-2 appearance-none pl-3 pr-8 bg-no-repeat" 
                        style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                    >
                        <option value="cabinet" className="bg-[#061640] text-white">Шкафной</option>
                        <option value="row_based" className="bg-[#061640] text-white">Рядный</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label className="text-lg font-semibold text-white/90">Тип охлаждения</Label>
                    <select 
                        value={subAcType} 
                        onChange={(e) => handleSubTypeChange(e.target.value as SubACType)} 
                        className="w-full bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#8AB73A] focus:ring-[#8AB73A]/30 h-12 text-base rounded-md p-2 appearance-none pl-3 pr-8 bg-no-repeat" 
                        style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                    >
                        <option value="freon" className="bg-[#061640] text-white">Фреоновый</option>
                        <option value="water" className="bg-[#061640] text-white">Водяной</option>
                    </select>
                </div>
              </div>

              {/* Compressor Type Selection */}
              {(subAcType === 'freon') && (
                <div className="space-y-2">
                  <Label className="text-lg font-semibold text-white/90">Тип компрессора</Label>
                  <select 
                    value={compressorAcType || ''} 
                    onChange={(e) => handleCompressorTypeChange(e.target.value as CompressorType)} 
                    disabled={mainAcType === 'row_based'} // Row-based is always inverter
                    className="w-full bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#8AB73A] focus:ring-[#8AB73A]/30 h-12 text-base rounded-md p-2 appearance-none pl-3 pr-8 bg-no-repeat disabled:opacity-70 disabled:cursor-not-allowed" 
                    style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                  >
                    {mainAcType === 'row_based' ? (
                        <option value="inverter" className="bg-[#061640] text-white">Инверторный</option>
                    ) : (
                        <>
                            <option value="standard" className="bg-[#061640] text-white">Стандартный (постоянный)</option>
                            <option value="inverter" className="bg-[#061640] text-white">Инверторный</option>
                        </>
                    )}
                  </select>
                </div>
              )}
              
              {/* External Unit Type for CABINET Freon */}
              {mainAcType === 'cabinet' && subAcType === 'freon' && (
                <div className="space-y-2">
                  <Label className="text-lg font-semibold text-white/90">Тип внешнего блока (Шкафной)</Label>
                  <select 
                    value={externalUnitCabinetFreon || ''} 
                    onChange={(e) => handleExternalUnitCabinetFreonChange(e.target.value as ExternalUnitType)}
                    className="w-full bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#8AB73A] focus:ring-[#8AB73A]/30 h-12 text-base rounded-md p-2 appearance-none pl-3 pr-8 bg-no-repeat" 
                    style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                  >
                    <option value="plate" className="bg-[#061640] text-white">Пластинчатый конденсатор</option>
                    <option value="array" className="bg-[#061640] text-white">Массивный V-образный конденсатор</option>
                  </select>
                </div>
              )}
              
              {/* External Unit Type for ROW-BASED Freon */}
              {mainAcType === 'row_based' && subAcType === 'freon' && (
                <div className="space-y-2">
                  <Label className="text-lg font-semibold text-white/90">Тип внешнего блока (Рядный)</Label>
                  <select 
                    value={externalUnitRowFreon || ''} 
                    onChange={(e) => handleExternalUnitRowFreonChange(e.target.value as ExternalUnitType)}
                    className="w-full bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#8AB73A] focus:ring-[#8AB73A]/30 h-12 text-base rounded-md p-2 appearance-none pl-3 pr-8 bg-no-repeat" 
                    style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                  >
                    <option value="plate" className="bg-[#061640] text-white">Пластинчатый конденсатор</option>
                    <option value="array" className="bg-[#061640] text-white">Массивный V-образный конденсатор</option> {/* (Array condenser type) */}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-lg font-semibold text-white/90">Модель</Label>
                <select 
                    value={modelId} 
                    onChange={(e) => handleModelChange(e.target.value)} 
                    disabled={!availableModels.length} 
                    className="w-full bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#8AB73A] focus:ring-[#8AB73A]/30 h-12 text-base rounded-md p-2 appearance-none pl-3 pr-8 bg-no-repeat" 
                    style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                >
                  <option value="" className="bg-[#061640] text-white">{availableModels.length ? "Выберите модель" : "Нет доступных моделей"}</option>
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#061640] text-white">
                      {m.label} — {m.power}{m.subType === 'freon' && m.compressorType ? (m.compressorType === 'standard' ? ' (Станд.)' : ' (Инверт.)') : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedModel && Object.keys(groupedAccessories).length > 0 && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold text-white/90">Опциональные аксессуары</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={expandAllCategories}
                        className="h-8 px-2 text-xs bg-transparent border border-white/20 text-white/70 hover:bg-white/10"
                      >
                        <ChevronDown className="h-3.5 w-3.5 mr-1" />
                        Развернуть все
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={collapseAllCategories}
                        className="h-8 px-2 text-xs bg-transparent border border-white/20 text-white/70 hover:bg-white/10"
                      >
                        <ChevronUp className="h-3.5 w-3.5 mr-1" />
                        Свернуть все
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      type="text"
                      placeholder="Поиск аксессуаров..."
                      value={accessorySearch}
                      onChange={(e) => setAccessorySearch(e.target.value)}
                      className="pl-10 bg-[#061640]/70 border-white/20 text-white placeholder-white/50 focus:border-[#8AB73A] focus:ring-[#8AB73A]/30"
                    />
                  </div>
                  
                  <div ref={accessoriesContainerRef} className="max-h-[26rem] overflow-y-auto space-y-3 pr-2 styled-scrollbar">
                    {Object.keys(filteredGroupedAccessories).length > 0 ? (
                      Object.entries(filteredGroupedAccessories).map(([categoryName, accessories]) => (
                        <div key={categoryName} className="rounded-lg overflow-hidden border border-white/10 transition-all">
                          <div 
                            className="flex items-center justify-between bg-[#112254] p-3 cursor-pointer group"
                            onClick={() => toggleCategoryExpand(categoryName)}
                          >
                            <h4 className="text-md font-semibold text-white flex items-center">
                              {expandedCategories.includes(categoryName) ? 
                                <ChevronDown className="h-4 w-4 mr-2 text-[#8AB73A]" /> : 
                                <ChevronUp className="h-4 w-4 mr-2 text-white/70" />
                              }
                              {categoryName} <span className="text-white/50 text-sm ml-2">({accessories.length})</span>
                            </h4>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectAllInCategory(categoryName);
                                }}
                                className="h-7 px-2 text-xs bg-[#8AB73A]/20 hover:bg-[#8AB73A]/30 text-[#8AB73A]"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Выбрать все
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unselectAllInCategory(categoryName);
                                }}
                                className="h-7 px-2 text-xs bg-white/10 hover:bg-white/20 text-white/70"
                              >
                                <Minus className="h-3 w-3 mr-1" />
                                Снять все
                              </Button>
                            </div>
                          </div>
                          
                          {expandedCategories.includes(categoryName) && (
                            <div className="space-y-1 p-2 bg-[#0A2050]/50">
                              {accessories.map((acc) => (
                                <div 
                                  key={acc.id} 
                                  className={`flex items-center space-x-3 p-3 rounded-md transition-colors hover:bg-white/10 ${
                                    extras.includes(acc.id) ? 'bg-[#8AB73A]/10 border-l-2 border-[#8AB73A]' : 'bg-[#061640]/30'
                                  }`}
                                >
                                  <Checkbox
                                    id={acc.id}
                                    checked={extras.includes(acc.id)}
                                    onCheckedChange={() => toggleExtra(acc.id)}
                                    className="border-white/30 data-[state=checked]:bg-[#8AB73A] data-[state=checked]:border-[#8AB73A]"
                                  />
                                  <div className="flex-grow">
                                    <Label htmlFor={acc.id} className="text-base text-white/90 cursor-pointer flex-grow">
                                      {acc.label}
                                    </Label>
                                    {(acc.note || acc.appliesTo) && (
                                      <div className="mt-1 space-y-0.5">
                                        {acc.note && <p className="text-xs text-white/60 italic">{acc.note}</p>}
                                        {acc.appliesTo && <p className="text-xs text-white/50">{acc.appliesTo}</p>}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium text-white/90 whitespace-nowrap">{formatCurrency(acc.priceUSD)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-white/60">
                        Нет аксессуаров, соответствующих критериям поиска{selectedModel && ' для выбранной модели'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Summary */}
            <div className="md:col-span-1 space-y-6 md:space-y-8 flex flex-col">
              <div className="bg-[#061640]/50 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg flex-grow space-y-4">
                <h3 className="text-2xl font-bold text-white border-b border-white/10 pb-3 mb-4">Итоговая конфигурация</h3>
                {selectedModel ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Модель:</span>
                      <span className="text-white font-medium text-right">{selectedModel.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Основной тип:</span>
                      <span className="text-white font-medium">{selectedModel.mainType === 'cabinet' ? 'Шкафной' : 'Рядный'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Тип охлаждения:</span>
                      <span className="text-white font-medium">{selectedModel.subType === 'freon' ? 'Фреоновый' : 'Водяной'}</span>
                    </div>
                    {(selectedModel.subType === 'freon') && (
                      <div className="flex justify-between">
                        <span className="text-white/70">Компрессор:</span>
                        <span className="text-white font-medium">
                          { selectedModel.compressorType === 'standard' ? 'Стандартный' : 'Инверторный' }
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-white/70">Мощность:</span>
                      <span className="text-white font-medium">{selectedModel.power}</span>
                    </div>
                    {selectedModel.dims && <div className="flex justify-between">
                      <span className="text-white/70">Размеры:</span>
                      <span className="text-white font-medium">{selectedModel.dims}</span>
                    </div>}
                     {selectedModel.configStrategy && <div className="mt-2 pt-2 border-t border-white/15">
                      <span className="text-white/70 block mb-1">Стратегия конфигурации:</span>
                      <p className="text-white/90 text-xs leading-relaxed">{selectedModel.configStrategy}</p>
                    </div>}
                    {/* External Unit Type Display in Summary */}
                    {(mainAcType === 'row_based' && subAcType === 'freon' && selectedModel && selectedModel.mainType === 'row_based' && selectedModel.subType === 'freon' && selectedModel.configStrategy) && (
                      <div className="flex justify-between">
                        <span className="text-white/70">Тип внешнего блока:</span>
                        <span className="text-white font-medium text-right">
                          {selectedModel.configStrategy.toLowerCase().includes('пластинчатый') ? 'Пластинчатый' : 
                           (selectedModel.configStrategy.toLowerCase().includes('array condenser') || selectedModel.configStrategy.toLowerCase().includes('массивный')) ? 'Массивный V-образный' : 
                           'N/A'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-white/15">
                      <span className="text-white/70">Цена модели:</span>
                      <span className="text-white font-medium">{formatCurrency(selectedModel.priceUSD)}</span>
                    </div>
                    {extras.length > 0 && (
                      <div className="pt-3 border-t border-white/10 space-y-2">
                        <p className="text-white/90 font-semibold">Аксессуары:</p>
                        {extras.map(extraId => {
                          const acc = accessoriesToDisplay.find(a => a.id === extraId);
                          return acc ? (
                            <div key={extraId} className="flex justify-between text-xs ml-2">
                              <span className="text-white/70">{acc.label}</span>
                              <span className="text-white/90 font-medium">{formatCurrency(acc.priceUSD)}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                    
                    {/* Download Documentation Button - ensure selectedModel AND selectedModel.documentationUrl are truthy */}
                    {selectedModel.documentationUrl && selectedModel.documentationUrl.trim() !== '' && (
                      <div className="mt-4 pt-4 border-t border-white/15">
                        <Button
                          variant="outline"
                          asChild
                          className="w-full h-11 bg-transparent hover:bg-[#8AB73A]/10 border-[#8AB73A]/70 hover:border-[#8AB73A] text-[#8AB73A] hover:text-[#9BCF4E] transition-colors duration-200 group"
                        >
                          <a href={selectedModel.documentationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                            <Download className="h-4 w-4 mr-2 text-[#8AB73A] group-hover:text-[#9BCF4E] transition-colors duration-200" />
                            Скачать Документацию
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4 text-[#8AB73A] group-hover:text-[#9BCF4E] transition-colors duration-200 transform group-hover:translate-x-0.5">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                          </a>
                        </Button>
                      </div>
                    )}
                    {productImageSrc && (
                      <div className="w-full flex justify-center mb-2">
                        <img
                          src={productImageSrc}
                          alt={selectedModel.label}
                          className="max-h-40 object-contain"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-white/60 text-center py-10">Выберите полную конфигурацию для просмотра деталей.</p>
                )}
              </div>
              
              <div className="bg-[#8AB73A]/20 rounded-xl p-4 border border-[#8AB73A]/40">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-white">Общая стоимость:</span>
                  <span className="text-3xl font-extrabold text-white">{formatCurrency(totalUSD)}</span>
                </div>
              </div>
              
              <Button
                size="lg"
                className="w-full bg-[#8AB73A] hover:bg-[#79a332] text-white text-lg font-semibold py-3 h-auto shadow-lg shadow-[#8AB73A]/30 transition-all disabled:opacity-50"
                disabled={!selectedModel}
                onClick={handleGenerateCRACQuote}
              >
                Сформировать квоту
              </Button>
              {selectedModel && (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full mt-3 bg-transparent hover:bg-[#8AB73A]/10 border-[#8AB73A]/70 hover:border-[#8AB73A] text-[#8AB73A] hover:text-[#9BCF4E] text-lg font-semibold py-3 h-auto transition-colors duration-200 group disabled:opacity-50"
                  disabled={isGeneratingPdf || !selectedModel}
                  onClick={generateCRAC_PDF}
                >
                  {isGeneratingPdf ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Генерация PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 mr-2 text-[#8AB73A] group-hover:text-[#9BCF4E] transition-colors duration-200" />
                      Скачать PDF спецификацию
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <style >{`
        .styled-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .styled-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .styled-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
} 
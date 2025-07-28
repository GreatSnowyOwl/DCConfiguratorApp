import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Adjust path if needed
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { jsPDF } from 'jspdf'; // Import jsPDF
import { PDFDocument } from 'pdf-lib'; // Import pdf-lib
import fontkit from '@pdf-lib/fontkit'; // Add fontkit import
import { Quote as UnifiedQuoteType, CRACQuoteAccessory } from './PartnerDashboard'; // Import the unified type and CRACQuoteAccessory

// Import background and logo (optional, adjust styling as needed)
import backgroundImage from '/DATACENTER.png';
import logoImage from '/logologo.png';

// --- Import Shared Data and Types ---
import {
    FormData, PDUType, translations, _dataUpsAc, _dataUpsIt, _dataAc,
    _dataPdu, _dataMon, _dataIso, _dataDist, _dataRacks, _dataBattery,
    calculateUPSConfig // Import the shared function
} from '../utils/configuratorData';

// --- Helper Functions (Restore necessary ones) ---

const getRecommendedUPS = (requiredPower: number) => {
  return _dataUpsAc.find(ups => ups.power >= requiredPower) || _dataUpsAc[_dataUpsAc.length - 1];
};

const getRecommendedITUPS = (itLoadKw: number) => {
    const requiredPower = itLoadKw * 1.3; // Adding 30% margin
    return _dataUpsIt.find(ups => ups.power >= requiredPower) || _dataUpsIt[_dataUpsIt.length - 1];
};

const getACPower = (formData: FormData) => {
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

const totalITLoad = (formData: FormData) => {
    const load600 = parseFloat(formData.racks600 || '0') * parseFloat(formData.power600 || '0');
    const load800 = parseFloat(formData.racks800 || '0') * parseFloat(formData.power800 || '0');
    return (load600 + load800);
};

const calculateACUnits = (formData: FormData) => {
    // Manual override has priority
    const manualUnits = (formData as any).acUnitsManual as number | undefined;
    if (manualUnits && manualUnits > 0) {
        return manualUnits;
    }
    const totalLoad = totalITLoad(formData);
    const unitPower = getACPower(formData);
    if (unitPower === 0) return 0;
    return Math.ceil(totalLoad / unitPower) + 1; // N+1 (auto)
};

const calculateTotalACPower = (formData: FormData) => {
    const unitPower = getACPower(formData);
    const units = calculateACUnits(formData);
    return unitPower * units;
};

const getRecommendedUPSForAC = (formData: FormData) => {
    // Use user-selected AC UPS if provided
    const manualUps = (formData as any).acUpsManual as {model:string;power:number;price:number}|undefined;
    if (manualUps) return manualUps;
    const totalACPower = calculateTotalACPower(formData);
    return getRecommendedUPS(totalACPower);
};

const calculateTotalPDUCost = (formData: FormData) => {
    const totalRacks = parseInt(formData.racks600 || '0') + parseInt(formData.racks800 || '0');
    const pduPrice = _dataPdu[formData.pduType as PDUType]?.[formData.pduCurrent];
    if (!pduPrice || totalRacks === 0) return 0;
    return pduPrice * totalRacks * 2;
};

const getPDUTypeLabel = (type: PDUType) => {
    return translations.pduTypes[type] || '';
};

// Keep formatPrice 
const formatPrice = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// --- End Helper Functions ---

// Interface for the detailed quote data fetched from backend
interface QuoteDetails {
  id: number;
  name: string;
  date: string;
  total_cost: number;
  configData: FormData; // Use the imported FormData type
}

// Interface for cost breakdown items
interface CostBreakdownItem {
  label: string;
  cost: number;
}

// Copied from CRACConfiguratorPage.tsx - ensure it's in ViewQuote.tsx scope
const addPageNumbersToPdfLibDoc = async (pdfDoc: PDFDocument, startPage: number = 1) => {
  pdfDoc.registerFontkit(fontkit);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  let robotoFontBytes;
  try {
    const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
    robotoFontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
  } catch (e) {
    console.error("Failed to fetch Roboto font for pdf-lib page numbers:", e);
    return; 
  }

  if (!robotoFontBytes) return;

  const customFont = await pdfDoc.embedFont(robotoFontBytes);

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const pageNumberText = `Страница ${startPage + i} из ${startPage + totalPages - 1}`;
    
    page.drawText(pageNumberText, {
      x: width / 2 - 30, 
      y: 20, 
      size: 8, 
      font: customFont, 
    });
  }
};

export default function ViewQuote() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  const [quoteData, setQuoteData] = useState<UnifiedQuoteType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  useEffect(() => {
    const fetchQuoteDetails = async () => {
      if (!quoteId) {
        setError('Quote ID not provided.');
        setIsLoading(false);
        return;
      }
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      // All quotes (DC and CRAC) are now fetched from the backend.
      // The localStorage fetch for CRAC quotes is removed.
      try {
        const response = await fetch(`/wp-json/partner-zone/v1/quotes/${quoteId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const responseText = await response.text();
        if (!response.ok) {
          let errorMessage = 'Failed to fetch quote details.';
          try { errorMessage = JSON.parse(responseText).message || errorMessage; } catch (e) {}
          if (response.status === 401 || response.status === 403) {
             errorMessage = 'Session expired or invalid. Please log in again.';
             logout();
             navigate('/login');
          } else if (response.status === 404) {
              errorMessage = 'Quote not found.';
          }
          throw new Error(errorMessage);
        }

        const responseData = JSON.parse(responseText);
        // Backend should return the full quote object including quoteType and all necessary fields.
        if (responseData.success && responseData.data) {
            let quote = responseData.data;
            
            console.log('Raw quote data from backend:', quote);
            
            // Detect UPS quotes if not properly set - check name pattern first
            if (quote.name && (quote.name.startsWith('UPS:') || quote.name.includes('UPS:'))) {
              quote.quoteType = 'UPS';
              console.log('Auto-detected UPS quote type from name');
            }
            
            // If configData is present and contains UPS structure, force UPS type
            if (quote.configData && typeof quote.configData === 'object' && 
                quote.configData.selectedProduct) {
              quote.quoteType = 'UPS';
              quote.upsConfigData = quote.configData;
              console.log('Auto-detected UPS quote type from configData structure');
            }
            
            // Ensure configData for DC quotes is parsed if it's a string
            if (quote.quoteType === 'DC' && typeof quote.configData === 'string') {
                 try {
                     quote.configData = JSON.parse(quote.configData);
                 } catch (parseError) {
                     console.error("Error parsing DC configData JSON:", parseError);
                     throw new Error('Failed to parse DC configuration data from quote.');
                 }
            }
            
            // For UPS quotes, ensure upsConfigData is set
            if (quote.quoteType === 'UPS') {
              if (!quote.upsConfigData && quote.configData) {
                quote.upsConfigData = quote.configData;
                console.log('Moved configData to upsConfigData for UPS quote');
              }
            }
            
            console.log('Processed quote data:', quote);
            setQuoteData(quote as UnifiedQuoteType); 
        } else {
            throw new Error(responseData.message || 'Invalid or incomplete data format received from server.');
        }

      } catch (fetchError: any) {
        console.error("Fetch Quote Details Error:", fetchError);
        setError(fetchError.message || 'An error occurred while fetching quote details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuoteDetails();
  }, [quoteId, token, logout, navigate]);

  // --- PDF Generation Logic (Adapted from DCConfiguratorApp) ---
  const generatePDF = async (currentQuoteData: UnifiedQuoteType) => {
    setIsGeneratingPdf(true);

    // Define PDF helper functions in the scope of generatePDF so both CRAC and DC can use them
    const commonAddWrappedText = (docInstance: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, align: 'left' | 'center' | 'right' = 'left', fontStyle: 'normal' | 'bold' = 'normal') => {
        docInstance.setFontSize(fontSize);
        docInstance.setFont('Roboto', fontStyle);
        const lines = docInstance.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.5;
        let newY = y;
        if (align === 'center') {
          lines.forEach((line: string) => {
            const textWidth = docInstance.getStringUnitWidth(line) * fontSize / docInstance.internal.scaleFactor;
            docInstance.text(line, x + (maxWidth - textWidth) / 2, newY);
            newY += lineHeight;
          });
        } else if (align === 'right') {
          lines.forEach((line: string) => {
            const textWidth = docInstance.getStringUnitWidth(line) * fontSize / docInstance.internal.scaleFactor;
            docInstance.text(line, x + maxWidth - textWidth, newY);
            newY += lineHeight;
          });
        } else {
          docInstance.text(lines, x, newY);
          newY += lines.length * lineHeight;
        }
        return newY;
    };

    const commonAddSectionHeader = (docInstance: jsPDF, text: string, marginVal: number, currentY: number, contentWidthVal: number, primaryColorVal: string) => {
        docInstance.setFillColor(primaryColorVal);
        docInstance.setTextColor(255, 255, 255);
        docInstance.setFontSize(14);
        docInstance.setFont('Roboto', 'bold');
        docInstance.rect(marginVal, currentY, contentWidthVal, 10, 'F');
        currentY += 7;
        docInstance.text(text, marginVal + 3, currentY);
        currentY += 7;
        docInstance.setTextColor(0, 0, 0);
        docInstance.setFont('Roboto', 'normal');
        return currentY;
    };

    const commonAddTableRow = (docInstance: jsPDF, label: string, value: string, marginVal: number, currentY: number, contentWidthVal: number, secondaryColorVal: string, labelWidthPercent = 0.4) => {
        const currentFontSize = 10; // Or 11 depending on the section
        docInstance.setFontSize(currentFontSize);
        docInstance.setFont('Roboto', 'normal');
        docInstance.setTextColor(secondaryColorVal);
        const labelMaxWidth = contentWidthVal * labelWidthPercent - 2;
        const valueX = marginVal + contentWidthVal * labelWidthPercent;
        const valueMaxWidth = contentWidthVal * (1 - labelWidthPercent) - 2;
        const labelYStart = currentY;
        docInstance.setFont('Roboto', 'bold');
        const labelLines = docInstance.splitTextToSize(label, labelMaxWidth);
        const labelLineHeight = currentFontSize * 0.5;
        docInstance.text(labelLines, marginVal, labelYStart);
        const labelHeight = labelLines.length * labelLineHeight;
        docInstance.setFont('Roboto', 'normal');
        const valueTrimmed = String(value).trim(); // Ensure value is string
        const valueLines = docInstance.splitTextToSize(valueTrimmed, valueMaxWidth);
        const valueLineHeight = currentFontSize * 0.5;
        docInstance.text(valueLines, valueX, labelYStart);
        const valueHeight = valueLines.length * valueLineHeight;
        return labelYStart + Math.max(labelHeight, valueHeight) + 3;
    };

    if (currentQuoteData.quoteType === 'CRAC') {
      if (!currentQuoteData.configData) {
        alert("Ошибка: Данные конфигурации для CRAC квоты отсутствуют в объекте квоты.");
        setIsGeneratingPdf(false);
        return;
      }
      const configDataForCRAC = currentQuoteData.configData as any;
      const { selectedModel, selectedAccessories, productImageSrc: cracProductImageSrc, configSelections } = configDataForCRAC;
      const { total_cost, name: cracName, date: cracDate } = currentQuoteData;
      if (!selectedModel) {
        alert("Модель не найдена в данных конфигурации квоты CRAC.");
        setIsGeneratingPdf(false);
        return;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', putOnlyUsedFonts: true });
      doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf', 'Roboto', 'bold');
      doc.setFont('Roboto');

      const primaryColor = '#0A2B6C'; 
      const secondaryColor = '#333333';
      const accentColor = '#8AB73A'; 
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let y = margin;

      const viewQuoteLogoImage = `${import.meta.env.BASE_URL}logologo.png`;
      if (viewQuoteLogoImage) {
        try {
          const img = new Image(); img.src = viewQuoteLogoImage;
          await new Promise(resolve => { img.onload = resolve; img.onerror = () => resolve(null);});
          if (img.complete && img.naturalHeight !== 0) doc.addImage(img, 'PNG', pageWidth - margin - 30, margin -5 , 30, 10);
        } catch (e) { console.error("Error adding logo to CRAC PDF", e); }
      }
      y = commonAddWrappedText(doc, cracName, margin, y, contentWidth, 18, 'left', 'bold');
      y += 5;
      y = commonAddWrappedText(doc, new Date(cracDate).toLocaleString('ru-RU', {dateStyle: 'long', timeStyle: 'short'}), margin, y, contentWidth, 10, 'left');
      y += 10;
      doc.setDrawColor(primaryColor); doc.setLineWidth(0.5); doc.line(margin, y, pageWidth - margin, y); y += 10;

      if (cracProductImageSrc) {
        try {
          const img = new Image();
          img.src = cracProductImageSrc;
          await new Promise(resolve => { img.onload = resolve; img.onerror = () => resolve(null);});
          if (img.complete && img.naturalHeight !== 0) {
            const imgHeight = 50;
            const imgWidth = (img.width * imgHeight) / img.height;
            doc.addImage(img, 'PNG', (pageWidth - imgWidth) / 2, y, imgWidth, imgHeight);
            y += imgHeight + 10;
          }
        } catch (e) { console.error("Error adding product image to CRAC PDF", e); }
      }

      y = commonAddSectionHeader(doc, "Выбранная модель", margin, y, contentWidth, primaryColor);
      y = commonAddTableRow(doc, "Наименование:", selectedModel.label, margin, y, contentWidth, secondaryColor);
      y = commonAddTableRow(doc, "Мощность:", selectedModel.power, margin, y, contentWidth, secondaryColor);
      if (configSelections) {
        y = commonAddTableRow(doc, "Основной тип:", configSelections.mainAcType === 'cabinet' ? 'Шкафной' : 'Рядный', margin, y, contentWidth, secondaryColor);
        y = commonAddTableRow(doc, "Тип охлаждения:", configSelections.subAcType === 'freon' ? 'Фреоновый' : 'Водяной', margin, y, contentWidth, secondaryColor);
        if (configSelections.subAcType === 'freon' && configSelections.compressorAcType) {
          y = commonAddTableRow(doc, "Компрессор:", configSelections.compressorAcType === 'standard' ? 'Стандартный' : 'Инверторный', margin, y, contentWidth, secondaryColor);
        }
        if (configSelections.mainAcType === 'cabinet' && configSelections.subAcType === 'freon' && configSelections.externalUnitCabinetFreon) {
            y = commonAddTableRow(doc, "Внешний блок (Шкафной):", configSelections.externalUnitCabinetFreon === 'plate' ? 'Пластинчатый конденсатор' : 'Массивный V-образный конденсатор' ,margin, y, contentWidth, secondaryColor);
        }
        if (configSelections.mainAcType === 'row_based' && configSelections.subAcType === 'freon' && configSelections.externalUnitRowFreon) {
            y = commonAddTableRow(doc, "Внешний блок (Рядный):", configSelections.externalUnitRowFreon === 'plate' ? 'Пластинчатый конденсатор' : 'Массивный V-образный конденсатор' ,margin, y, contentWidth, secondaryColor);
        }
      }
      y = commonAddTableRow(doc, "Цена модели (USD):", selectedModel.priceUSD !== undefined ? formatPrice(selectedModel.priceUSD) : 'N/A', margin, y, contentWidth, secondaryColor, 0.6);
      y += 7;

      if (selectedAccessories && selectedAccessories.length > 0) {
        y = commonAddSectionHeader(doc, "Опциональные аксессуары", margin, y, contentWidth, primaryColor);
        selectedAccessories.forEach((acc: CRACQuoteAccessory) => { // Explicitly type acc
          if (y > pageHeight - margin - 15) { doc.addPage(); y = margin; }
          y = commonAddTableRow(doc, acc.label, acc.priceUSD !== undefined ? formatPrice(acc.priceUSD) : 'N/A', margin, y, contentWidth, secondaryColor);
        });
        y += 5;
      } else {
        y = commonAddSectionHeader(doc, "Опциональные аксессуары", margin, y, contentWidth, primaryColor);
        y = commonAddWrappedText(doc, "Не выбраны", margin, y, contentWidth, 10);
        y += 7;
      }

      y = commonAddSectionHeader(doc, "Итоговая стоимость", margin, y, contentWidth, primaryColor);
      doc.setFont('Roboto', 'bold'); doc.setFontSize(14); doc.setTextColor(accentColor);
      y = commonAddTableRow(doc, "Общая стоимость (USD):", total_cost !== undefined ? formatPrice(total_cost) : 'N/A', margin, y, contentWidth, secondaryColor, 0.6);
      y += 10;
      
      // At the end of jsPDF content generation for CRAC spec:
      let finalPdfBytes = doc.output('arraybuffer'); // Changed const to let

      // Now, attempt to fetch and merge documentation PDF
      if (selectedModel.documentationUrl) {
        try {
          const fileName = selectedModel.documentationUrl.split('/').pop() || '';
          const base = import.meta.env.BASE_URL || '/';
          const fileNameVariants = new Set<string>();
          fileNameVariants.add(fileName); fileNameVariants.add(fileName.replace(/-_/g, '_')); fileNameVariants.add(fileName.replace(/-_/g, ''));
          fileNameVariants.forEach(fn => { if (fn.includes('__')) { fileNameVariants.add(fn.replace(/__+/g, '_')); } });

          const localCandidates: string[] = [];
          fileNameVariants.forEach(fn => {
            localCandidates.push(`${base}${fn}`);
            localCandidates.push(`${base}pdfs/${fn}`);
            localCandidates.push(`${base}documents/${fn}`);
          });

          let documentationPdfBytes: ArrayBuffer | null = null;
          for (const candidateUrl of localCandidates) {
            try {
              const res = await fetch(candidateUrl);
              if (res.ok) { documentationPdfBytes = await res.arrayBuffer(); break; }
            } catch (_) {}
          }
          if (!documentationPdfBytes) {
            try {
              const remoteRes = await fetch(selectedModel.documentationUrl);
              if (remoteRes.ok) { documentationPdfBytes = await remoteRes.arrayBuffer(); }
            } catch (_) { /* Ignore */ }
          }

          if (documentationPdfBytes) {
            const mergedPdf = await PDFDocument.create();
            const specPdfLibDoc = await PDFDocument.load(finalPdfBytes); // Load the spec from jsPDF output
            const docPdfLibDoc = await PDFDocument.load(documentationPdfBytes);

            const specPages = await mergedPdf.copyPages(specPdfLibDoc, specPdfLibDoc.getPageIndices());
            specPages.forEach(page => mergedPdf.addPage(page));
            const docPages = await mergedPdf.copyPages(docPdfLibDoc, docPdfLibDoc.getPageIndices());
            docPages.forEach(page => mergedPdf.addPage(page));
            
            await addPageNumbersToPdfLibDoc(mergedPdf); // Use the newly added helper
            finalPdfBytes = await mergedPdf.save();
          } else {
            console.warn("Documentation PDF not found, providing spec only.");
            // If doc not found, just add page numbers to the spec itself
            const specPdfLibDocOnly = await PDFDocument.load(finalPdfBytes);
            await addPageNumbersToPdfLibDoc(specPdfLibDocOnly);
            finalPdfBytes = await specPdfLibDocOnly.save();
          }
        } catch (error) {
          console.error('Error fetching/merging documentation PDF for CRAC quote:', error);
          alert('Не удалось загрузить или объединить PDF документации. Будет загружена только спецификация.');
          // Fallback: ensure page numbers on the spec if merging fails mid-way
          try {
            const specPdfLibDocFallback = await PDFDocument.load(finalPdfBytes);
            await addPageNumbersToPdfLibDoc(specPdfLibDocFallback);
            finalPdfBytes = await specPdfLibDocFallback.save();
          } catch (pnError) {
            console.error("Error adding page numbers during fallback:", pnError);
          }
        }
      } else {
        // No documentation URL, just add page numbers to the spec
        const specPdfLibDoc = await PDFDocument.load(finalPdfBytes);
        await addPageNumbersToPdfLibDoc(specPdfLibDoc);
        finalPdfBytes = await specPdfLibDoc.save();
      }

      // Trigger download with finalPdfBytes
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeLabel = selectedModel.label.replace(/[^a-z0-9_.-]/gi, '_');
      link.download = `CRAC_Quote_${safeLabel}_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      setIsGeneratingPdf(false);
      return;
    }

    // --- Continue with DC Quote PDF Generation --- 
    const formData = currentQuoteData.configData as FormData | undefined;
    if (!formData) {
        alert("Данные конфигурации для DC квоты отсутствуют.");
        setIsGeneratingPdf(false);
        return;
    }
    const topLevelQuoteName = currentQuoteData.name;
    const quoteDate = currentQuoteData.date;

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

    // Helper function for text wrapping (same as before)
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12, align: 'left' | 'center' | 'right' = 'left') => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.5;

        if (align === 'center') {
        lines.forEach((line: string) => {
            const textWidth = doc.getStringUnitWidth(line) * fontSize / doc.internal.scaleFactor; // Corrected width calc
            doc.text(line, x + (maxWidth - textWidth) / 2, y);
            y += lineHeight;
        });
        } else if (align === 'right') {
        lines.forEach((line: string) => {
            const textWidth = doc.getStringUnitWidth(line) * fontSize / doc.internal.scaleFactor; // Corrected width calc
            doc.text(line, x + maxWidth - textWidth, y);
            y += lineHeight;
        });
        } else {
        doc.text(lines, x, y);
        y += lines.length * lineHeight;
        }
        return y;
    };

    // Helper function for adding section headers (same as before)
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

    // Helper function for adding a table row (same as before)
    const addTableRow = (label: string, value: string) => {
        doc.setFontSize(11);
        doc.setFont('Roboto', 'normal');
        doc.setTextColor(secondaryColor);

        const labelMaxWidth = contentWidth * 0.45;
        const valueStartX = margin + labelMaxWidth + 2;
        const valueMaxWidth = contentWidth - labelMaxWidth - 2;

        const labelLines = doc.splitTextToSize(label, labelMaxWidth);
        const labelLineHeight = 11 * 0.5;
        doc.text(labelLines, margin, y);
        const labelHeight = labelLines.length * labelLineHeight;

        const valueLines = doc.splitTextToSize(value, valueMaxWidth);
        const valueLineHeight = 11 * 0.5;
        doc.text(valueLines, valueStartX, y);
        const valueHeight = valueLines.length * valueLineHeight;

        y += Math.max(labelHeight, valueHeight) + 5;
    };

    // Add Logo (same as before)
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

    // Title (using quote name)
    doc.setTextColor(primaryColor);
    doc.setFontSize(28);
    doc.setFont('Roboto', 'bold');
    const title = topLevelQuoteName || translations.title; // Use saved quote name
    const titleY = margin + (logoHeight > 10 ? 10 : 0);
    doc.text(title, margin, titleY);
    y = titleY + 15;

    // Date - Use the quote's creation date if available
    doc.setTextColor(secondaryColor);
    doc.setFontSize(12);
    doc.setFont('Roboto', 'normal');
    // Format the fetched date string
    const displayDate = quoteDate 
      ? new Date(quoteDate).toLocaleDateString('ru-RU', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : new Date().toLocaleDateString('ru-RU', { // Fallback
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
    doc.text(displayDate, margin, y);
    y += 15;

    // Add horizontal line (same as before)
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // --- FIX: Use Correct Data for Customer/Quote Info --- 
    addSectionHeader(translations.steps.customerQuoteInfo);
    // Use topLevelQuoteName for the quote name itself
    addTableRow(translations.fields.quoteName, topLevelQuoteName || 'N/A');
    // Use formData (which is configData) for customer details
    addTableRow(translations.fields.customerName, formData.customerName || 'N/A'); 
    addTableRow(translations.fields.customerPhone, formData.customerPhone || 'N/A'); 
    addTableRow(translations.fields.customerEmail, formData.customerEmail || 'N/A'); 
    y += 10;

    // Rack Configuration (from saved data)
    addSectionHeader(translations.steps.racks);
    addTableRow(translations.fields.racks600, `${formData.racks600 || '0'} (${formData.power600 || '0'}kW ${translations.fields.each})`);
    addTableRow(translations.fields.racks800, `${formData.racks800 || '0'} (${formData.power800 || '0'}kW ${translations.fields.each})`);
    const currentTotalITLoad = totalITLoad(formData); // Use helper with saved data
    addTableRow(translations.fields.totalLoad, `${currentTotalITLoad.toFixed(2)} kW`);
    y += 10;

    // Check if we need a new page
    if (y > pageHeight - 100) {
      doc.addPage();
      y = margin;
    }

    // Cooling System (from saved data)
    addSectionHeader(translations.steps.cooling);
    const selectedCoolingAC = _dataAc.find(unit => unit.power.toString() === formData.acModel || unit.model.includes(formData.acModel));
    addTableRow(translations.fields.acModel, selectedCoolingAC ? `${selectedCoolingAC.model} (${formData.acModel} kW)` : `${formData.acModel} kW`);
    const currentAcUnits = calculateACUnits(formData); // Use helper with saved data
    addTableRow(translations.fields.acUnits, currentAcUnits.toString());
    const currentTotalAcPower = calculateTotalACPower(formData); // Use helper with saved data
    addTableRow(translations.fields.totalPower, `${currentTotalAcPower.toFixed(2)} kW`);
    addTableRow(translations.fields.backupPower, formData.backupCooling ? translations.fields.yes : translations.fields.no);
    y += 10;

    // IT UPS Section (from saved data)
    if (y > pageHeight - 80) { doc.addPage(); y = margin; }
    const itLoadForSummaryCost = totalITLoad(formData); // Renamed variable to avoid conflict
    // Use selected UPS if index is present, otherwise fallback to recommended
    const selectedUpsIndex = formData.selectedUpsIndex !== undefined && formData.selectedUpsIndex >= 0
      ? formData.selectedUpsIndex
      : -1; // Use -1 or similar to indicate fallback
    const selectedITUPS = selectedUpsIndex !== -1 && selectedUpsIndex < _dataUpsIt.length
      ? _dataUpsIt[selectedUpsIndex]
      : getRecommendedITUPS(itLoadForSummaryCost); // Use renamed variable
      
    // Check for 2N redundancy
    const isRedundant = !!formData.redundancyEnabled; // Ensure boolean evaluation
    
    if(selectedITUPS) {
      const upsCount = isRedundant ? 2 : 1;
      const upsLabel = isRedundant 
        ? `${selectedITUPS.model} - 2N резервирование (2x)` // Simplified label
        : selectedITUPS.model;
        
    addSectionHeader(translations.steps.ups); // Reusing UPS title for IT UPS
      addTableRow(translations.fields.model, upsLabel); // Use combined label
      addTableRow(translations.fields.powerRating, `${selectedITUPS.power} kW`);
    y = addWrappedText(`Описание: ${selectedITUPS.description}`, margin, y, contentWidth, 11);
    y += 10;
    }

    // PDU Section (from saved data)
    if (y > pageHeight - 80) { doc.addPage(); y = margin; }
    addSectionHeader(translations.steps.pdu); // Use PDU title
    addTableRow(translations.fields.current, `${formData.pduCurrent}A`);
    addTableRow(translations.fields.phase, formData.pduPhase === '1' ? translations.fields.single : translations.fields.three);
    addTableRow(translations.fields.type, getPDUTypeLabel(formData.pduType));
    y += 10;

    // Battery Configuration Section
    if (y > pageHeight - 100) { doc.addPage(); y = margin; }
    // Use saved selectedBattery if available
    const selectedBattery = formData.selectedBattery; 
    if (selectedBattery && selectedBattery.model) {
      addSectionHeader(translations.steps.battery);
      const batteryMultiplier = isRedundant ? 2 : 1;
      addTableRow(translations.fields.model, selectedBattery.model);
      addTableRow(translations.fields.capacity, `${selectedBattery.capacity_ah} Ah`);
      // Ensure total_batteries exists before using it
      if (typeof selectedBattery.total_batteries === 'number') {
        addTableRow(translations.fields.totalBatteries, (selectedBattery.total_batteries * batteryMultiplier).toString() + (isRedundant ? ' (2N)' : ''));
      }
      // Ensure total_weight_kg exists before using it
      if (typeof selectedBattery.total_weight_kg === 'number') {
        addTableRow(translations.fields.totalWeight, `${(selectedBattery.total_weight_kg * batteryMultiplier).toFixed(2)} kg`);
      }
      addTableRow(translations.fields.dimensions, selectedBattery.dimensions);
      y += 10;
    } else {
      // Optionally add a note if no battery info is saved
      console.log("[ViewQuote PDF] No selected battery data found in quote.");
    }

    // Additional Systems Section (Monitoring, Isolation, Distribution - from saved data)
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
    }
    if (formData.corridorIsolation) {
        addAdditionalSystemsHeader();
        addTableRow(translations.fields.corridorIsolation, translations.fields.included);
    }
    if (formData.distributionSystem === 'yes') {
        addAdditionalSystemsHeader();
        addTableRow(_dataDist.name, translations.fields.included);
    }
    if (additionalSystemsAdded) {
        y += 10;
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
    if(selectedITUPS) { // Use the already defined selectedITUPS and isRedundant
      const upsCount = isRedundant ? 2 : 1;
      const upsLabel = isRedundant 
        ? `${selectedITUPS.model} - 2N резервирование (2x)` // Simplified label
        : selectedITUPS.model;
        
      costItems.push({ 
        label: upsLabel, 
        cost: selectedITUPS.price * upsCount 
      });
      subTotal += selectedITUPS.price * upsCount;
    }

    // Improved AC unit lookup for cost calculation
    if (formData.acModel) {
        // First try to find AC by comparing power values as numbers
        const acPower = getACPower(formData);
        const selectedAC = _dataAc.find(unit => 
            Math.abs(unit.power - parseFloat(formData.acModel)) < 0.1
        );
        
    if (selectedAC) {
        const acUnitsCount = calculateACUnits(formData);
            const acCost = selectedAC.price * acUnitsCount;
            costItems.push({ 
                label: `Кондиционеры (${acUnitsCount}x ${selectedAC.model})`, 
                cost: acCost 
            });
            subTotal += acCost;

        // AC UPS (if backup selected)
        if (formData.backupCooling) {
            const recommendedACUPS = getRecommendedUPSForAC(formData);
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
                const acUnitsCount = calculateACUnits(formData);
                const acCost = acByModelString.price * acUnitsCount;
                costItems.push({ 
                    label: `Кондиционеры (${acUnitsCount}x ${acByModelString.model})`, 
                    cost: acCost 
                });
                subTotal += acCost;
                
                // AC UPS (if backup selected)
                if (formData.backupCooling) {
                    const recommendedACUPS = getRecommendedUPSForAC(formData);
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
                const acUnitsCount = calculateACUnits(formData);
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
                    const recommendedACUPS = getRecommendedUPSForAC(formData);
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
    const totalPDUCost = calculateTotalPDUCost(formData);
    if (totalPDUCost > 0) {
        const pduTypeLabel = getPDUTypeLabel(formData.pduType);
        costItems.push({ label: `PDU (${pduTypeLabel} ${formData.pduCurrent}A)`, cost: totalPDUCost });
        subTotal += totalPDUCost;
    }

    // --- Battery Cost (Use Saved Selection or Recalculate) --- 
    let batteryCost = 0;
    let batteryModel = 'N/A';
    let batteryLabelSuffix = ""; // To indicate if recalculated
    let totalBatteriesCount = 0;

    // Prioritize using the saved selected battery if available and valid
    if (formData.selectedBattery && typeof formData.selectedBattery.total_price === 'number' && formData.selectedBattery.model) {
        console.log("[ViewQuote UI] Using saved selectedBattery:", formData.selectedBattery); 
        batteryModel = formData.selectedBattery.model;
        batteryCost = isRedundant ? formData.selectedBattery.total_price * 2 : formData.selectedBattery.total_price;
        totalBatteriesCount = isRedundant && typeof formData.selectedBattery.total_batteries === 'number' 
            ? formData.selectedBattery.total_batteries * 2 
            : formData.selectedBattery.total_batteries ?? 0; // Handle potential undefined
    } else {
        // Fallback: Recalculate if selectedBattery is not saved or invalid
        const backupTime = parseFloat(formData.batteryTime || '0');
        console.log(`[ViewQuote UI] Saved selectedBattery not found or invalid. Falling back to recalculation. BackupTime: ${backupTime}`); 
        if (backupTime > 0) { 
            // Need itLoad for recalculation 
            console.log(`[ViewQuote UI] Recalculating battery options for itLoad: ${itLoadForSummaryCost}, backupTime: ${backupTime}`);
            const recalculatedOptions = calculateUPSConfig(itLoadForSummaryCost, backupTime);
            console.log("[ViewQuote UI] Recalculated Options:", recalculatedOptions);
            
            if (recalculatedOptions && recalculatedOptions.length > 0) {
                const cheapestOption = recalculatedOptions[0]; // Use cheapest as fallback
                batteryModel = cheapestOption.model;
                // Apply redundancy multiplier to recalculated cost and count
                batteryCost = isRedundant ? cheapestOption.total_price * 2 : cheapestOption.total_price;
                totalBatteriesCount = isRedundant ? cheapestOption.total_batteries * 2 : cheapestOption.total_batteries;
                batteryLabelSuffix = " - пересчитано (самый дешевый)"; 
            } else {
                 batteryModel = "Ошибка расчета";
                 batteryCost = 0;
                 totalBatteriesCount = 0;
            }
        } // Else: No battery configured (backupTime <= 0)
    }

    // Add the battery item to the breakdown if a cost was determined or error occurred
    if (batteryCost > 0 || batteryModel === "Ошибка расчета") { 
      // Construct the label considering redundancy
      const batteryLabel = `Батареи (${totalBatteriesCount}x ${batteryModel})${isRedundant ? ' (2N)' : ''}${batteryLabelSuffix}`;
      costItems.push({ label: batteryLabel, cost: batteryCost });
        subTotal += batteryCost; // Add cost to subtotal
    }
    // --- End Battery Cost --- 

    // Monitoring Cost
    if (formData.monitoring && _dataMon) {
        costItems.push({ label: translations.fields.monitoringSystem, cost: _dataMon.price });
        subTotal += _dataMon.price;
    }
    if (formData.corridorIsolation && _dataIso) {
        costItems.push({ label: translations.fields.corridorIsolation, cost: _dataIso.price });
        subTotal += _dataIso.price;
    }
    if (formData.distributionSystem === 'yes' && _dataDist) {
        costItems.push({ label: _dataDist.name, cost: _dataDist.price });
        subTotal += _dataDist.price;
    }

    // --- Establish base cost before Warranty & PNR ---
    const subTotalBeforeWarrantyAndPnr = subTotal;

    // --- Warranty calculation (after all equipment added) ---
    let warrantyCost = 0;
    const wExt = (formData as any).warrantyExtension as '1' | '3' | 'none' | undefined;
    if (wExt === '1') {
        warrantyCost = subTotalBeforeWarrantyAndPnr * 0.04;
    } else if (wExt === '3') {
        warrantyCost = subTotalBeforeWarrantyAndPnr * 0.10;
    }
    if (warrantyCost > 0) {
        const label = wExt === '1'
          ? 'Продление гарантии на 1 год'
          : 'Продление гарантии на 3 года';
        costItems.push({ label, cost: warrantyCost });
    }

    // --- PNR cost (after warranty added) ---
    let pnrCost = 0;
    if (formData.pnrSelected) {
        pnrCost = subTotalBeforeWarrantyAndPnr * 0.10; // 10% of base (equipment only)
        costItems.push({ label: "Пуско-наладочные работы", cost: pnrCost });
    }

    const calculatedTotalCost = subTotalBeforeWarrantyAndPnr + warrantyCost + pnrCost;

    // Draw cost table using calculated costItems
    costItems.forEach((item) => {
      addTableRow(item.label, formatPrice(item.cost));
      // Check for page break before drawing next item
      if (y > pageHeight - 40) { 
          doc.addPage(); 
          y = margin; 
      }
    });

    // Add total cost with special styling
    if (y > pageHeight - 40) { doc.addPage(); y = margin; }
    y += 5;
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.text(translations.fields.totalCost, margin, y);
    
    // Use our calculated total cost based on individual components for consistency
    // But log a warning if it differs significantly from the stored value
    const calculatedTotal = calculatedTotalCost;
    const databaseTotal = currentQuoteData.total_cost;
    const totalDifference = Math.abs(calculatedTotal - databaseTotal);
    
    if (totalDifference > 1) { // Allow for minor floating point differences
        console.warn(
            `Total cost discrepancy: Calculated: ${calculatedTotal}, Database: ${databaseTotal}, ` +
            `Difference: ${totalDifference}. Using calculated value for consistency.`
        );
    }
    
    // Use the calculated total cost for the PDF display for consistency
    const totalCostText = formatPrice(calculatedTotal);
    
    // Manually calculate right alignment
    const totalTextWidth = doc.getStringUnitWidth(totalCostText) * 14 / doc.internal.scaleFactor; // Adjust font size for width calc
    const totalValueX = pageWidth - margin - totalTextWidth;
    doc.text(totalCostText, totalValueX, y);

    // Add footer with page numbers
    const pages = doc.internal.pages;
    const totalPages = Object.keys(pages).length;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor);
      doc.text(
        `${i} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // --- 2. Get the generated PDF as an ArrayBuffer (same as before) ---
    const generatedPdfBytes = doc.output('arraybuffer');

    // --- 3. Fetch the static PDF (same as before) ---
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
      const blob = new Blob([generatedPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${topLevelQuoteName || 'quote'}-report.pdf`; // Use quote name
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsGeneratingPdf(false);
      return; // Stop execution if static PDF fetch failed
    }
    
    if (!staticPdfBytes) {
        console.error("Static PDF bytes are null after fetch.");
        alert("Произошла ошибка при обработке статического PDF-файла.");
        setIsGeneratingPdf(false);
        return;
    }

    // --- 4. Merge the PDFs using pdf-lib (same as before) ---
    try {
        const mergedPdf = await PDFDocument.create();
        
        // Load the generated PDF
        const generatedPdfDoc = await PDFDocument.load(generatedPdfBytes);
        const generatedPages = await mergedPdf.copyPages(generatedPdfDoc, generatedPdfDoc.getPageIndices());
        generatedPages.forEach(page => mergedPdf.addPage(page));

        // Load the static PDF
        const staticPdfDoc = await PDFDocument.load(staticPdfBytes);
        const staticPages = await mergedPdf.copyPages(staticPdfDoc, staticPdfDoc.getPageIndices());
        staticPages.forEach(page => mergedPdf.addPage(page));

        // --- 5. Save the merged PDF ---
        const mergedPdfBytes = await mergedPdf.save();

        // --- 6. Trigger download ---
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        // Use quote name for the download
        const safeQuoteName = topLevelQuoteName.replace(/[^a-z0-9\s]/gi, '_').replace(/\s+/g, '-');
        link.download = `${safeQuoteName || 'quote'}-configuration-merged.pdf`; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Error merging PDFs:", error);
        alert("Произошла ошибка при объединении PDF-файлов.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = () => {
    if (quoteData) {
        // Pass the whole quoteData object
        generatePDF(quoteData);
    }
  };

  // --- Implement renderCostBreakdown --- 
  const renderCostBreakdown = (dcFormData: FormData) => {
    // This function now explicitly expects FormData for DC quotes
    const costItemsList: CostBreakdownItem[] = []; // Renamed to avoid conflict with component name
    let subTotal = 0;
    
    // Rack Costs
    const racks600Count = parseInt(dcFormData.racks600 || '0');
    const racks800Count = parseInt(dcFormData.racks800 || '0');
    if (racks600Count > 0) {
      const cost = racks600Count * _dataRacks.R600.price;
      costItemsList.push({ label: `${_dataRacks.R600.name} (${racks600Count}x)`, cost });
      subTotal += cost;
    }
    if (racks800Count > 0) {
      const cost = racks800Count * _dataRacks.R800.price;
      costItemsList.push({ label: `${_dataRacks.R800.name} (${racks800Count}x)`, cost });
      subTotal += cost;
    }

    // IT UPS Cost
    const itLoad = totalITLoad(dcFormData);
    const selectedUpsIndex = dcFormData.selectedUpsIndex !== undefined && dcFormData.selectedUpsIndex >= 0
      ? dcFormData.selectedUpsIndex
      : -1; 
    const selectedITUPS = selectedUpsIndex !== -1 
      ? _dataUpsIt[selectedUpsIndex]
      : getRecommendedITUPS(itLoad);
    const isRedundant = !!dcFormData.redundancyEnabled; 
    if(selectedITUPS) {
      const upsCount = isRedundant ? 2 : 1;
      const upsLabel = isRedundant 
        ? `${selectedITUPS.model} - 2N резервирование (2x)`
        : selectedITUPS.model;
      costItemsList.push({ 
        label: upsLabel, 
        cost: selectedITUPS.price * upsCount 
      });
      subTotal += selectedITUPS.price * upsCount;
    }

    // AC Cost
    if (dcFormData.acModel) {
        const acPower = getACPower(dcFormData);
        const selectedAC = _dataAc.find(unit => Math.abs(unit.power - parseFloat(dcFormData.acModel)) < 0.1);
        if (selectedAC) {
            const acUnitsCount = calculateACUnits(dcFormData);
            const acCost = selectedAC.price * acUnitsCount;
            costItemsList.push({ label: `Кондиционеры (${acUnitsCount}x ${selectedAC.model})`, cost: acCost });
            subTotal += acCost;
            if (dcFormData.backupCooling) {
                const recommendedACUPS = getRecommendedUPSForAC(dcFormData);
                if (recommendedACUPS) {
                    costItemsList.push({ label: `ИБП для кондиционирования (${recommendedACUPS.model})`, cost: recommendedACUPS.price });
                    subTotal += recommendedACUPS.price;
                }
            }
        } else {
            const acByModelString = _dataAc.find(unit => unit.model.includes(dcFormData.acModel) || dcFormData.acModel.includes(unit.model));
            if (acByModelString) {
                const acUnitsCount = calculateACUnits(dcFormData);
                const acCost = acByModelString.price * acUnitsCount;
                costItemsList.push({ label: `Кондиционеры (${acUnitsCount}x ${acByModelString.model})`, cost: acCost });
                subTotal += acCost;
                
                // AC UPS (if backup selected)
                if (dcFormData.backupCooling) {
                    const recommendedACUPS = getRecommendedUPSForAC(dcFormData);
                    if (recommendedACUPS) {
                        costItemsList.push({ label: `ИБП для кондиционирования (${recommendedACUPS.model})`, cost: recommendedACUPS.price });
                        subTotal += recommendedACUPS.price;
                    }
                }
            } else if (acPower > 0) {
                const acUnitsCount = calculateACUnits(dcFormData);
                const similarPowerUnit = _dataAc.find(unit => unit.power >= acPower) || _dataAc[0];
                const estimatedPrice = similarPowerUnit ? similarPowerUnit.price : 10000;
                const acCost = estimatedPrice * acUnitsCount;
                costItemsList.push({ label: `Кондиционеры (${acUnitsCount}x ${acPower}kW)`, cost: acCost });
                subTotal += acCost;
                
                // AC UPS (if backup selected)
                if (dcFormData.backupCooling) {
                    const recommendedACUPS = getRecommendedUPSForAC(dcFormData);
                    if (recommendedACUPS) {
                        costItemsList.push({ label: `ИБП для кондиционирования (${recommendedACUPS.model})`, cost: recommendedACUPS.price });
                        subTotal += recommendedACUPS.price;
                    }
                }
            }
        }
    }

    // PDU
    const totalPDUCost = calculateTotalPDUCost(dcFormData);
    if (totalPDUCost > 0) {
        const pduTypeLabel = getPDUTypeLabel(dcFormData.pduType);
        costItemsList.push({ label: `PDU (${pduTypeLabel} ${dcFormData.pduCurrent}A)`, cost: totalPDUCost });
        subTotal += totalPDUCost;
    }

    // Battery Cost
    let batteryCost = 0;
    let batteryModel = 'N/A';
    let batteryLabelSuffix = "";
    let totalBatteriesCount = 0;
    if (dcFormData.selectedBattery && typeof dcFormData.selectedBattery.total_price === 'number' && dcFormData.selectedBattery.model) {
        batteryModel = dcFormData.selectedBattery.model;
        batteryCost = isRedundant ? dcFormData.selectedBattery.total_price * 2 : dcFormData.selectedBattery.total_price;
        totalBatteriesCount = isRedundant && typeof dcFormData.selectedBattery.total_batteries === 'number' 
            ? dcFormData.selectedBattery.total_batteries * 2 
            : dcFormData.selectedBattery.total_batteries ?? 0;
    } else {
        const backupTime = parseFloat(dcFormData.batteryTime || '0');
        if (backupTime > 0) { 
            const itLoadForBatteryCalc = totalITLoad(dcFormData); // ensure itLoad is defined here if not passed
            const recalculatedOptions = calculateUPSConfig(itLoadForBatteryCalc, backupTime);
            if (recalculatedOptions && recalculatedOptions.length > 0) {
                const cheapestOption = recalculatedOptions[0];
                batteryModel = cheapestOption.model;
                batteryCost = isRedundant ? cheapestOption.total_price * 2 : cheapestOption.total_price;
                totalBatteriesCount = isRedundant ? cheapestOption.total_batteries * 2 : cheapestOption.total_batteries;
                batteryLabelSuffix = " - пересчитано (самый дешевый)"; 
            } else {
                 batteryModel = "Ошибка расчета"; batteryCost = 0; totalBatteriesCount = 0;
            }
        }
    }
    if (batteryCost > 0 || batteryModel === "Ошибка расчета") { 
      const batteryLabel = `Батареи (${totalBatteriesCount}x ${batteryModel})${isRedundant ? ' (2N)' : ''}${batteryLabelSuffix}`;
      costItemsList.push({ label: batteryLabel, cost: batteryCost });
        subTotal += batteryCost;
    }

    // Additional Systems
    if (dcFormData.monitoring && _dataMon) {
        costItemsList.push({ label: translations.fields.monitoringSystem, cost: _dataMon.price });
        subTotal += _dataMon.price;
    }

    // Corridor Isolation Cost
    if (dcFormData.corridorIsolation && _dataIso) {
        costItemsList.push({ label: translations.fields.corridorIsolation, cost: _dataIso.price });
        subTotal += _dataIso.price;
    }

    // Power Distribution Cost
    if (dcFormData.distributionSystem === 'yes' && _dataDist) {
        costItemsList.push({ label: _dataDist.name, cost: _dataDist.price });
        subTotal += _dataDist.price;
    }

    // --- Warranty & PNR calculations (same as Summary) ---
    const subTotalBeforeWarrantyAndPnr = subTotal;

    let warrantyCost = 0;
    const wExt = (dcFormData as any).warrantyExtension as '1' | '3' | 'none' | undefined;
    if (wExt === '1') {
        warrantyCost = subTotalBeforeWarrantyAndPnr * 0.04;
    } else if (wExt === '3') {
        warrantyCost = subTotalBeforeWarrantyAndPnr * 0.10;
    }
    if (warrantyCost > 0) {
        costItemsList.push({ label: wExt === '1' ? 'Продление гарантии на 1 год' : 'Продление гарантии на 3 года', cost: warrantyCost });
    }

    // --- PNR cost ---
    let pnrCost = 0;
    if (dcFormData.pnrSelected) {
        pnrCost = subTotalBeforeWarrantyAndPnr * 0.10; // 10% of base
        costItemsList.push({ label: "Пуско-наладочные работы", cost: pnrCost });
    }

    // --- Final total ---
    const finalTotal = subTotalBeforeWarrantyAndPnr + warrantyCost + pnrCost;

    // Compare with stored total and log any discrepancies
    // For DC quotes, compare against currentQuoteData.total_cost
    if (quoteData && quoteData.quoteType === 'DC') {
        const storedTotalCost = quoteData.total_cost;
        if (Math.abs(finalTotal - storedTotalCost) > 1) {
            console.warn(
                `Total cost discrepancy in UI (DC): Calculated: ${finalTotal}, Stored: ${storedTotalCost}, ` +
                `Difference: ${Math.abs(finalTotal - storedTotalCost)}. Using calculated value for consistency.`
            );
        }
    }

    // Display the breakdown and the final live calculated total
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Расчет стоимости (DC)</h3>
            <div className="bg-gradient-to-r from-white/10 to-white/20 rounded-lg p-6 space-y-4">
                {costItemsList.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-white/20 last:border-0">
                        <span className="text-white/80">{item.label}</span>
                        <span className="font-medium text-white">
                            {item.cost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </span>
                    </div>
                ))}
                {costItemsList.length === 0 && <p className="text-white/70 text-center py-4">Нет элементов для отображения.</p>}
            </div>
            <div className="bg-gradient-to-r from-[#8AB73A]/20 to-[#8AB73A]/10 rounded-lg">
                <div className="flex justify-between items-center p-6">
                    <h3 className="text-xl font-bold text-[#8AB73A]">Общая стоимость (DC)</h3>
                    <span className="text-2xl font-bold text-[#8AB73A]">
                        {finalTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </span>
                </div>
            </div>
        </div>
    );
  };

  const renderCRACQuoteDetails = () => {
    if (!quoteData || quoteData.quoteType !== 'CRAC' || !quoteData.configData) { 
        console.error("[ViewQuote] CRAC quote is missing configData block.", quoteData);
        return <p className="text-center text-red-400 py-4">Ошибка: Данные конфигурации для CRAC квоты отсутствуют.</p>;
    }
    const configDataForCRAC = quoteData.configData as any; 
    const { selectedModel, selectedAccessories, productImageSrc, configSelections } = configDataForCRAC;
    const { total_cost, name: quoteName, date: quoteDate } = quoteData;

    if (!selectedModel) {
        return <p className="text-center text-white/70 py-4">Информация о выбранной модели отсутствует в этой квоте.</p>;
    }

    return (
      <div className="space-y-6 py-4">
        {productImageSrc && (
          <div className="my-4 flex justify-center">
            <img src={productImageSrc} alt={selectedModel?.label || 'Product Image'} className="max-h-52 object-contain rounded-lg bg-white/5 p-1 shadow-lg" />
          </div>
        )}

        <Card className="bg-white/5 border-white/10 text-white/90">
          <CardHeader><CardTitle className="text-lg text-[#8AB73A]">Выбранная модель</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5 pt-4">
            <p><strong className="text-white/70">Наименование:</strong> {selectedModel.label}</p>
            <p><strong className="text-white/70">Мощность:</strong> {selectedModel.power}</p>
            {configSelections && (
              <>
                <p><strong className="text-white/70">Основной тип:</strong> {configSelections.mainAcType === 'cabinet' ? 'Шкафной' : 'Рядный'}</p>
                <p><strong className="text-white/70">Тип охлаждения:</strong> {configSelections.subAcType === 'freon' ? 'Фреоновый' : 'Водяной'}</p>
                {configSelections.subAcType === 'freon' && configSelections.compressorAcType && (
                  <p><strong className="text-white/70">Компрессор:</strong> {configSelections.compressorAcType === 'standard' ? 'Стандартный' : 'Инверторный'}</p>
                )}
                {(configSelections.mainAcType === 'cabinet' && configSelections.subAcType === 'freon' && configSelections.externalUnitCabinetFreon) && (
                    <p><strong className="text-white/70">Внешний блок (Шкафной):</strong> {configSelections.externalUnitCabinetFreon === 'plate' ? 'Пластинчатый конденсатор' : 'Массивный V-образный конденсатор'}</p>
                )}
                {(configSelections.mainAcType === 'row_based' && configSelections.subAcType === 'freon' && configSelections.externalUnitRowFreon) && (
                    <p><strong className="text-white/70">Внешний блок (Рядный):</strong> {configSelections.externalUnitRowFreon === 'plate' ? 'Пластинчатый конденсатор' : 'Массивный V-образный конденсатор'}</p>
                )}
              </>
            )}
            <p className="mt-2"><strong className="text-white/70">Цена модели (USD):</strong> {selectedModel.priceUSD !== undefined ? formatPrice(selectedModel.priceUSD) : 'N/A'}</p>
          </CardContent>
        </Card>

        {selectedAccessories && selectedAccessories.length > 0 && (
          <Card className="bg-white/5 border-white/10 text-white/90">
            <CardHeader><CardTitle className="text-lg text-[#8AB73A]">Опциональные аксессуары</CardTitle></CardHeader>
            <CardContent className="text-sm pt-4">
              <ul className="space-y-1">
                {selectedAccessories.map((acc: CRACQuoteAccessory) => ( 
                  <li key={acc.id} className="flex justify-between">
                    <span className="font-medium">{acc.label}</span>
                    <span className="text-white/90">{acc.priceUSD !== undefined ? formatPrice(acc.priceUSD) : 'N/A'}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="bg-gradient-to-r from-[#8AB73A]/20 to-[#8AB73A]/10 rounded-lg mt-6">
          <div className="flex justify-between items-center p-5">
            <h3 className="text-xl font-bold text-[#A0D568]">Общая стоимость</h3>
            <span className="text-2xl font-bold text-white">
              {total_cost !== undefined ? formatPrice(total_cost) : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderDCQuoteCustomerInfo = () => {
    if (!quoteData || quoteData.quoteType !== 'DC' || !quoteData.configData) return null;
    const { customerName, customerPhone, customerEmail } = quoteData.configData;
    return (
        <div className="bg-white/5 rounded-lg p-5 border border-white/10 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8AB73A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Информация о клиенте (DC)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                    <span className="text-white/70">Название компании: </span>
                    <span className="text-white font-medium">{customerName || 'Не указано'}</span>
                </div>
                <div>
                    <span className="text-white/70">Телефон: </span>
                    <span className="text-white font-medium">{customerPhone || 'Не указан'}</span>
                </div>
                <div className="md:col-span-2">
                    <span className="text-white/70">Email: </span>
                    <span className="text-white font-medium">{customerEmail || 'Не указан'}</span>
                </div>
            </div>
        </div>
    );
  }

  const renderUPSQuoteDetails = () => {
    console.log('[renderUPSQuoteDetails] Called with quoteData:', quoteData);
    console.log('[renderUPSQuoteDetails] quoteType:', quoteData?.quoteType);
    console.log('[renderUPSQuoteDetails] upsConfigData:', quoteData?.upsConfigData);
    console.log('[renderUPSQuoteDetails] configData:', quoteData?.configData);
    
    if (!quoteData || quoteData.quoteType !== 'UPS') {
      console.error("[ViewQuote] Quote is not UPS type. quoteType:", quoteData?.quoteType);
      return <p className="text-center text-red-400 py-4">Ошибка: Котировка не является UPS типом.</p>;
    }
    
    if (!quoteData.upsConfigData && !quoteData.configData) {
      console.error("[ViewQuote] UPS quote is missing both upsConfigData and configData.", quoteData);
      return <p className="text-center text-red-400 py-4">Ошибка: Данные конфигурации для UPS квоты отсутствуют.</p>;
    }

    // Use upsConfigData if available, otherwise fall back to configData
    const configData = quoteData.upsConfigData || quoteData.configData;
    console.log('[renderUPSQuoteDetails] Using configData:', configData);
    
    // Just use the exact data that was saved from the configurator
    const {
      selectedProduct,
      selectedBatteryTime,
      bcbBoxConfig,
      selectedPNRService,
      selectedWarrantyOption,
      totalCost
    } = configData;

    const { total_cost } = quoteData;

    if (!selectedProduct) {
      return <p className="text-center text-white/70 py-4">Информация о выбранном ИБП отсутствует в этой квоте.</p>;
    }

    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-[#8AB73A] mb-6">Полная конфигурация UPS</h3>
        
        {/* UPS Section */}
        <div className="bg-[#061640]/50 border-2 border-white/20 rounded-xl p-6">
          <h4 className="text-xl text-[#8AB73A] mb-4 border-b border-white/20 pb-2">ИБП</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-white/70">Модель:</span>
              <span className="text-white font-medium">{selectedProduct.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Мощность:</span>
              <span className="text-[#8AB73A] font-bold">{selectedProduct.capacity} kVA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Тип:</span>
              <span className="text-white font-medium">
                {selectedProduct.type === 'UR' ? 'Стоечный' : 
                 selectedProduct.type === 'UE' ? 'Напольный' : 'Модульный'}
              </span>
            </div>
            {selectedProduct.type === 'UM' && selectedProduct.frame && (
              <div className="flex justify-between">
                <span className="text-white/70">Рамка:</span>
                <span className="text-white font-medium">{selectedProduct.frame}</span>
              </div>
            )}
                         <div className="flex justify-between items-center pt-2 border-t border-white/10">
               <span className="text-white/70">Стоимость:</span>
               <span className="text-[#8AB73A] font-bold">${(selectedProduct.priceUSD || 0).toLocaleString()}</span>
             </div>
          </div>
        </div>

        {/* Battery Section */}
        <div className="bg-[#061640]/50 border-2 border-white/20 rounded-xl p-6">
          <h4 className="text-xl text-[#8AB73A] mb-4 border-b border-white/20 pb-2">Батареи</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-white/70">Время поддержки:</span>
              <span className="text-white font-medium">{selectedBatteryTime} мин</span>
            </div>
          </div>
        </div>

        {/* BCB-BOX Section */}
        {bcbBoxConfig && (
          <div className="bg-[#061640]/50 border-2 border-white/20 rounded-xl p-6">
            <h4 className="text-xl text-[#8AB73A] mb-4 border-b border-white/20 pb-2">BCB-BOX</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Модель:</span>
                <span className="text-white font-medium">{bcbBoxConfig.bcb_box}</span>
              </div>
                             <div className="flex justify-between items-center pt-2 border-t border-white/10">
                 <span className="text-white/70">Стоимость:</span>
                 <span className="text-[#8AB73A] font-bold">${(bcbBoxConfig?.priceUSD || 0).toLocaleString()}</span>
               </div>
            </div>
          </div>
        )}

        {/* PNR Services Section */}
        {selectedPNRService && (
          <div className="bg-[#061640]/50 border-2 border-white/20 rounded-xl p-6">
            <h4 className="text-xl text-[#8AB73A] mb-4 border-b border-white/20 pb-2">ПНР услуги</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Услуга:</span>
                <span className="text-white font-medium">Пуско-наладочные работы</span>
              </div>
                             <div className="flex justify-between items-center pt-2 border-t border-white/10">
                 <span className="text-white/70">Стоимость:</span>
                 <span className="text-[#8AB73A] font-bold">Включено</span>
               </div>
             </div>
           </div>
         )}
 
         {/* Warranty Section */}
         {selectedWarrantyOption && (
           <div className="bg-[#061640]/50 border-2 border-white/20 rounded-xl p-6">
             <h4 className="text-xl text-[#8AB73A] mb-4 border-b border-white/20 pb-2">Расширенная гарантия</h4>
             <div className="space-y-3">
               <div className="flex justify-between">
                 <span className="text-white/70">Тип:</span>
                 <span className="text-white font-medium">Расширенная гарантия</span>
               </div>
               <div className="flex justify-between items-center pt-2 border-t border-white/10">
                 <span className="text-white/70">Стоимость:</span>
                 <span className="text-[#8AB73A] font-bold">Включено</span>
               </div>
             </div>
           </div>
         )}
 
         {/* Total Cost */}
         <div className="bg-gradient-to-r from-[#8AB73A]/20 to-[#8AB73A]/10 rounded-lg">
           <div className="flex justify-between items-center p-6">
             <h3 className="text-xl font-bold text-[#8AB73A]">Общая стоимость</h3>
             <span className="text-2xl font-bold text-[#8AB73A]">
               ${(totalCost || total_cost || 0).toLocaleString()}
             </span>
           </div>
         </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative p-6 md:p-8"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: '#0A2B6C',
        backgroundSize: 'cover',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0A2B6C] bg-opacity-80 z-0"></div>

      {/* Content container */}
      <div className="relative z-10 max-w-4xl mx-auto">
         {/* Header with Logo and Back Button */}
         <header className="flex items-center justify-between mb-8 md:mb-12">
            <img src={logoImage} alt="iTeaQ Logo" className="h-10 md:h-12" />
            <Button 
                variant="outline"
                onClick={() => navigate('/dashboard')} 
                className="bg-transparent border-white/50 hover:bg-white/10 text-white/90 hover:text-white"
            >
                 Назад в личный кабинет
            </Button>
        </header>

        <Card className="bg-[#0A2B6C]/30 backdrop-blur-lg border border-white/10 text-white rounded-2xl shadow-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-semibold">
                {isLoading ? 'Загрузка квоты...' : quoteData ? `${quoteData.name}` : 'Детали квоты'} 
            </CardTitle>
             {quoteData && <p className="text-sm text-white/70 pt-1">Создано: {new Date(quoteData.date).toLocaleString('ru-RU', {dateStyle: 'long', timeStyle: 'short'})}</p>}
          </CardHeader>
          <CardContent className="space-y-6 min-h-[300px] py-6 flex flex-col">
            {isLoading && (
                 <div className="flex flex-col items-center justify-center text-white/80 py-8 flex-grow">
                    <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Загрузка данных квоты...</span>
                </div>
            )}
            {error && (
              <p className="text-center text-red-400 py-8">Ошибка: {error}</p>
            )}
            {!isLoading && !error && !quoteData && (
              <p className="text-center text-white/80 py-8">Не удалось загрузить данные квоты.</p>
            )}
            
            {!isLoading && !error && quoteData && (
              <>
                {(() => {
                  console.log('[Main render] quoteData.quoteType:', quoteData.quoteType);
                  console.log('[Main render] quoteData.name:', quoteData.name);
                  
                  // Check if this is a UPS quote by name pattern if quoteType is not set correctly
                  const isUPSQuote = quoteData.quoteType === 'UPS' || 
                                   (quoteData.name && quoteData.name.startsWith('UPS:'));
                  
                  if (isUPSQuote) {
                    console.log('[Main render] Rendering as UPS quote');
                    return renderUPSQuoteDetails();
                  } else if (quoteData.quoteType === 'DC') {
                    return (
                      <>
                        {renderDCQuoteCustomerInfo()}
                        {quoteData.configData ? renderCostBreakdown(quoteData.configData as FormData) : <p className="text-center text-white/70 py-4">Нет данных конфигурации для DC квоты.</p>}
                      </>
                    );
                  } else if (quoteData.quoteType === 'CRAC') {
                    return renderCRACQuoteDetails();
                  } else {
                    return <p className="text-center text-white/80 py-8">Не удалось определить тип квоты. Type: {quoteData.quoteType}, Name: {quoteData.name}</p>;
                  }
                })()}

                <div className="flex justify-end mt-6">
                    <Button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf || !quoteData}
                        className="bg-[#1e88e5]/90 hover:bg-[#1e88e5] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-[#1e88e5]/20 backdrop-blur-sm text-base flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                         {isGeneratingPdf ? (
                           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                         ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3M14 3H8a2 2 0 00-2 2v5m12 0V5a2 2 0 00-2-2h-2m-4 8h8" />
                            </svg>
                         )}
                        <span>{isGeneratingPdf ? 'Генерация...' : 'Скачать PDF'}</span>
                    </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
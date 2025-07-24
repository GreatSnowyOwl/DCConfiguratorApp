import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { motion } from 'framer-motion';

// Import useAuth hook
import { useAuth } from '../contexts/AuthContext'; // Adjust path if needed

// Import background and logo
import backgroundImage from '/DATACENTER.png';
import logoImage from '/logologo.png';

// --- Import Product Icons ---
import coolMasterIcon from '/CoolMaster-removebg-preview.png';
import modularBRCenterIcon from '/modularProcessingCenter.png';
import pduIcon from '/PDU-removebg-preview.png';
import coolRowIcon from '/CoolRow-removebg-preview.png';
import containerCenterIcon from '/ContainerDataCenter-removebg-preview.png';
import dataCenterBLIcon from '/Data_Center-BL.png'; // Use renamed file
import dataCenterBMIcon from '/Data_Center-BM.png'; // Use renamed file
import ueUpsIcon from '/UE_UPS.png'; // Use renamed file
import modularUMIcon from '/Modular_UPS_UM.png'; // Use renamed file
import rackIcon from '/warderobe-removebg-preview.png';
// --- End Import Product Icons ---

// Define types for different quote structures
interface DCQuoteConfigData {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  // ... other DC-specific configData fields
  [key: string]: any;
}

interface CRACQuoteProduct {
  id: string;
  label: string;
  power: string;
  priceUSD: number;
  // ... other ProductCRAC fields if needed for display in ViewQuote
}

export interface CRACQuoteAccessory {
  id: string;
  label: string;
  priceUSD: number;
  // ... other AccessoryCRAC fields if needed
}

interface CRACQuoteSelections {
  mainAcType: string;
  subAcType: string;
  compressorAcType?: string;
  externalUnitRowFreon?: string;
  externalUnitCabinetFreon?: string;
}

export interface Quote {
  id: string | number; // number for old DC, string for new CRAC
  name: string;
  date: string;
  total_cost: number; // Should be present in both
  quoteType: 'DC' | 'CRAC';

  // DC Specific (optional)
  configData?: DCQuoteConfigData;

  // CRAC Specific (optional)
  selectedModel?: CRACQuoteProduct;
  selectedAccessories?: CRACQuoteAccessory[];
  productImageSrc?: string | null;
  configSelections?: CRACQuoteSelections;
}

// Catalog path (assuming it's in the public folder)
const catalogPath = '/catalog.pdf'; // Adjust if your path is different

// Define product data array using imported icons
const products = [
  {
    icon: coolMasterIcon,
    name: 'Шкафной кондиционер серии CoolMaster',
    pdf: 'https://iteaq.su/wp-content/uploads/2024/07/1_CoolMaster.pdf',
  },
  {
    icon: modularBRCenterIcon,
    name: 'Модульный дата-центр iTeaQ BR',
    pdf: 'https://iteaq.su/wp-content/uploads/2024/08/BR-Modular-Data-Center.pdf',
  },
  {
    icon: pduIcon,
    name: 'PDU',
    pdf: 'https://iteaq.su/wp-content/uploads/2025/04/r-PDU-Brochure-98125349-A00-20240806.pdf',
  },
  {
    icon: coolRowIcon,
    name: 'Прецизионный рядный кондиционер CoolRow',
    pdf: 'https://iteaq.su/wp-content/uploads/2024/10/CoolRow-Precision-Air-Conditioner-2024-русский.pdf',
  },
  {
    icon: containerCenterIcon,
    name: 'Контейнерный Дата-центр',
    pdf: 'https://iteaq.su/wp-content/uploads/2024/09/AIO-Container-Data-Center-integrated-solutionRUS.pdf',
  },
  {
    icon: dataCenterBLIcon,
    name: 'Модульный дата-центр iTeaQ BL',
    pdf: 'https://iteaq.su/wp-content/uploads/2024/09/BL-Modular-Data-Center-Brochure-1.pdf',
  },
  {
    icon: dataCenterBMIcon,
    name: 'Модульный дата-центр BM',
    pdf: 'https://iteaq.su/wp-content/uploads/2024/09/BM-Modular-Data-Center-Brochure.pdf',
  },
  {
    icon: ueUpsIcon,
    name: 'ИБП напольного исполнения серии UE',
    pdf: 'https://iteaq.su/wp-content/uploads/2024/10/UE-UPS-10-160kVA-BrochueRU.pdf',
  },
  {
    icon: modularUMIcon,
    name: 'Модульный ИБП UM',
    pdf: 'https://iteaq.su/wp-content/uploads/2024/09/Модульный-ИБП-50-кВА-Брошюра-1.pdf',
  },
  {
    icon: rackIcon,
    name: 'Шкафы для IT оборудования',
    pdf: 'https://iteaq.su/wp-content/uploads/2025/04/RACK.pdf',
  },
];

// Promo carousel images
const promoImages = [
  {
    src: `${import.meta.env.BASE_URL}vsualisatorPROMO.png`,
    alt: 'Визуализатор конфигурации'
  },
  {
    src: `${import.meta.env.BASE_URL}UPS-PROMO.png`,
    alt: 'ИБП для дата-центра'
  },
  {
    src: `${import.meta.env.BASE_URL}batteries-promo.png`,
    alt: 'Батареи для ИБП'
  }
];

// Helper function to parse various date string formats into a consistent ISO string
const parseDateToISO = (dateStr: string | undefined | null): string => {
  if (!dateStr) return new Date(0).toISOString(); // Fallback for missing dates (epoch)

  // 1. Try direct ISO string (should be the case for new CRAC quotes and good backend dates)
  let date = new Date(dateStr);
  if (!isNaN(date.getTime()) && dateStr.includes('T') && dateStr.includes('Z')) {
    return date.toISOString();
  }

  // 2. Try YYYY-MM-DD (common for backend date-only) -> set to end of day for fair sort
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1; // JS months are 0-indexed
    const day = parseInt(ymdMatch[3], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(Date.UTC(year, month, day, 23, 59, 59, 999)).toISOString();
    }
  }

  // 3. Try DD.MM.YYYY (potentially from old localStorage CRAC quotes or other formats)
  const dmyMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // JS months are 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      // If it's just date, time will default to midnight UTC upon ISOString conversion.
      // This is acceptable for old data that didn't store time.
      return new Date(Date.UTC(year, month, day)).toISOString();
    }
  }
  
  // 4. Fallback to direct parsing (might be DD/MM/YYYY or MM/DD/YYYY etc., less reliable)
  // If new Date(dateStr) worked initially but it wasn't a full ISO, use that.
  // Otherwise, this is a last resort.
  date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  console.warn(`Failed to parse date string: "${dateStr}". Defaulting to epoch.`);
  return new Date(0).toISOString(); // Fallback for unparseable dates
};

export default function PartnerDashboard() {
  const { logout, user, token } = useAuth();
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const QUOTES_PER_PAGE = 6;

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!token) {
        // Clear quotes and set error if no token, then stop loading.
        setQuotes([]); 
        setError('Authentication token not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      let allServerQuotes: Quote[] = [];

      try {
        const response = await fetch('/wp-json/partner-zone/v1/quotes', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const responseText = await response.text();
        if (response.ok) {
          const responseData = JSON.parse(responseText);
          // Backend now returns both DC and CRAC quotes. 
          // Ensure `quoteType` is present and date is parsed.
          allServerQuotes = (responseData.data || []).map((q: any) => {
            // The backend should ideally set quoteType. If not, we might need to infer or default.
            // For now, assume backend sends quoteType or we default/error if missing.
            const quoteType = q.quoteType === 'CRAC' ? 'CRAC' : 'DC'; 
            return { 
              ...q, 
              quoteType: quoteType, 
              id: String(q.id), // Ensure ID is string for consistency if backend sends number for DC
              date: parseDateToISO(q.date) 
            };
          });
        } else {
          let errorMessage = 'Failed to fetch quotes from server.';
          try { errorMessage = JSON.parse(responseText).message || errorMessage; } catch (e) {}
          if (response.status === 401 || response.status === 403) {
            errorMessage = 'Session expired or invalid. Please log in again.';
            logout();
          }
          console.error("Server Quote Fetch Error:", errorMessage);
          setError(errorMessage);
        }
      } catch (fetchError: any) {
        console.error("Fetch Server Quotes Error:", fetchError);
        setError(fetchError.message || 'An error occurred while fetching quotes.');
      }
      
      // No longer fetching from localStorage here.
      // All quotes (DC and CRAC) are expected from the backend.
      setQuotes(allServerQuotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); 
      setIsLoading(false);
    };

    fetchQuotes();
  }, [token, logout]);

  // Add handler for viewing a quote
  const handleViewQuote = (quoteId: string | number) => {
    // The quoteId for CRAC quotes is already a string. For DC quotes, it's a number from backend.
    // The navigation expects a string.
    navigate(`/dashboard/quote/${String(quoteId)}`);
  };

  const handleLogout = () => {
    logout();
    // Navigation to /login is handled automatically by ProtectedRoute in App.tsx
    // when isAuthenticated becomes false after calling logout().
  };

  // Determine if configurator access is allowed
  const canAccessConfigurator = user?.approvalStatus === 'approved';

  // --- Pagination Logic ---
  const totalPages = Math.ceil(quotes.length / QUOTES_PER_PAGE);
  const startIndex = currentPage * QUOTES_PER_PAGE;
  const endIndex = startIndex + QUOTES_PER_PAGE;
  const visibleQuotes = quotes.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  // --- End Pagination Logic ---

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
      <div className="absolute inset-0 bg-[#0A2B6C] bg-opacity-60 z-0"></div>

      {/* Content container */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 md:mb-12">
          <img src={logoImage} alt="iTeaQ Logo" className="h-10 md:h-12" />
          {/* Wrap nav and logout in a flex container */}
          <div className="flex items-center space-x-4 md:space-x-6">
             <nav className="flex items-center space-x-2 md:space-x-4">
                {/* Button 1: Blue Hover */}
                <Button asChild variant="outline" size="sm" className="bg-transparent border-white/30 hover:bg-blue-600/20 hover:border-blue-500/50 text-white/80 hover:text-white text-xs md:text-sm transition-colors duration-200">
                    <a href="https://iteaq.su/project_registration/" target="_blank" rel="noopener noreferrer">
                        Зарегистрировать проект
                    </a>
                </Button>
                
                {/* Button 2: My Quotes (Blue Hover, slightly distinct base style) */}
                <Button asChild variant="outline" size="sm" className="bg-transparent border-white/50 hover:bg-blue-600/20 hover:border-blue-500/50 text-white hover:text-white font-semibold text-xs md:text-sm transition-colors duration-200">
                     <Link to="/dashboard">Мои квоты</Link>
                 </Button>
                
                {/* Button 3: Green Hover */}
                 <Button asChild variant="outline" size="sm" className="bg-transparent border-white/30 hover:bg-green-600/20 hover:border-green-500/50 text-white/80 hover:text-white text-xs md:text-sm transition-colors duration-200">
                    <a href="https://iteaq.su/new_service_partner/" target="_blank" rel="noopener noreferrer">
                        Стать сервисным партнером
                    </a>
                </Button>
             </nav>
             {/* Add Welcome message and Logout Button */}
             <div className="flex items-center space-x-3 border-l border-white/20 pl-4 md:pl-6">
               {user && (
                 <span className="text-white/80 text-sm hidden md:inline">
                    Добро пожаловать, {user.displayName || user.email}!
                 </span>
               )}
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm" // Make button smaller
                  className="bg-transparent border-red-500/50 hover:bg-red-500/20 text-red-400 hover:text-red-300"
                >
                  Выйти
                </Button>
             </div>
          </div>
        </header>

        {/* Main Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 md:mb-12">Личный кабинет</h1>

        {/* Grid Layout for Content Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Left Column (Configurator + Download) */}
          <div className="lg:col-span-1 flex flex-col gap-6 md:gap-8">
            {/* Access Configurator Card - Conditionally Render Button */}
            <Card className="bg-[#0A2B6C]/20 backdrop-blur-lg border border-white/10 text-white rounded-2xl shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-semibold text-center">Конфигуратор Data Center</CardTitle>
              </CardHeader>
              <CardContent>
                {canAccessConfigurator ? (
                  <Button asChild className="w-full bg-[#8AB73A]/70 hover:bg-[#8AB73A] text-white h-12 text-base font-semibold rounded-lg backdrop-blur-sm border border-white/20 shadow-lg transition-all duration-300">
                    <Link to="/configurator">Открыть DC конфигуратор</Link>
                  </Button>
                ) : (
                  <div className="text-center text-white/70 p-4 border border-dashed border-white/20 rounded-lg flex flex-col items-center space-y-2">
                    <p className="text-sm">Доступ к конфигуратору требует одобрения менеджером.</p>
                    <p className="text-sm font-medium text-yellow-400">
                      Статус: Запрошено 🟡
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* New CRAC Configurator Card */}
            {canAccessConfigurator && (
            <Card className="bg-[#0A2B6C]/20 backdrop-blur-lg border border-white/10 text-white rounded-2xl shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-semibold text-center">Конфигуратор Air Conditioning</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full bg-[#1e88e5]/80 hover:bg-[#1e88e5] text-white h-12 text-base font-semibold rounded-lg backdrop-blur-sm border border-blue-400/50 shadow-lg hover:shadow-blue-500/30 transition-all duration-300">
                  <Link to="/acconfig">Открыть AC конфигуратор</Link>
                </Button>
              </CardContent>
            </Card>
            )}

            {/* New UPS Configurator Card */}
            {canAccessConfigurator && (
            <Card className="bg-[#0A2B6C]/20 backdrop-blur-lg border border-white/10 text-white rounded-2xl shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-semibold text-center">Конфигуратор UPS</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full bg-[#e53e3e]/80 hover:bg-[#e53e3e] text-white h-12 text-base font-semibold rounded-lg backdrop-blur-sm border border-red-400/50 shadow-lg hover:shadow-red-500/30 transition-all duration-300">
                  <Link to="/upsconfig">Открыть UPS конфигуратор</Link>
                </Button>
              </CardContent>
            </Card>
            )}

            {/* Download Catalog Card */}
             <Card className="bg-[#0A2B6C]/20 backdrop-blur-lg border border-white/10 text-white rounded-2xl shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-semibold text-center">Загрузить материалы</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild variant="default" className="w-full bg-[#1e88e5]/70 hover:bg-[#1e88e5] text-white h-12 text-base font-semibold rounded-lg backdrop-blur-sm border border-white/20 shadow-lg transition-all duration-300">  
                  <a href="/wp-content/partner-zone-test/catalog2025.pdf" target="_blank" rel="noopener noreferrer">
                    Загрузить каталог 
                  </a>
                </Button>
              </CardContent>
            </Card>
            
            {/* New Configurator Promo Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5,
                delay: 0.2,
                ease: "easeOut"
              }}
            >
              <Card className="bg-[#0A2B6C]/20 backdrop-blur-lg border border-white/10 hover:border-white/20 text-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_5px_rgba(138,183,58,0.25)]">
                <CardHeader className="pb-2 bg-gradient-to-r from-[#0A2B6C]/80 to-[#1A3B7C]/80 border-b border-white/10">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <CardTitle className="text-xl font-semibold text-center">
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#8AB73A] to-[#A8D758] drop-shadow-sm">
                        Попробуйте новую версию конфигуратора!
                      </span>
                    </CardTitle>
                  </motion.div>
                </CardHeader>
                <CardContent className="p-0">
                  {(() => {
                    const [currentSlide, setCurrentSlide] = useState(0);
                    const api = useRef<any>(null);

                    const onSelect = useCallback(() => {
                      if (!api.current) return;
                      setCurrentSlide(api.current.selectedScrollSnap());
                    }, []);

                    useEffect(() => {
                      if (!api.current) return;
                      onSelect();
                      api.current.on("select", onSelect);
                      api.current.on("reInit", onSelect);
                      return () => {
                        if (!api.current) return;
                        api.current.off("select", onSelect);
                        api.current.off("reInit", onSelect);
                      };
                    }, [api, onSelect]);

                    return (
                      <>
                        <Carousel
                          plugins={[
                            Autoplay({
                              delay: 4000,
                              stopOnInteraction: true,
                            })
                          ]}
                          opts={{
                            align: "center",
                            loop: true,
                          }}
                          className="w-full group"
                          setApi={(newApi) => (api.current = newApi)}
                        >
                          <CarouselContent>
                            {promoImages.map((image, index) => (
                              <CarouselItem key={index} className="pl-0">
                                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-b-xl group">
                                  {/* Subtle shine effect overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10"></div>
                                  <img
                                    src={image.src}
                                    alt={image.alt}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent flex items-end justify-center">
                                    <div className="p-4 text-center w-full mb-2">
                                      <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Link to="/configurator">
                                          <Button className="bg-[#8AB73A]/60 hover:bg-[#8AB73A]/90 backdrop-blur-sm text-white font-medium px-6 py-2 rounded-full shadow-lg border border-white/20 transition-all duration-300">
                                            Открыть конфигуратор
                                          </Button>
                                        </Link>
                                      </motion.div>
                                    </div>
                                  </div>
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          
                          {/* Navigation arrows - subtle and only visible on hover */}
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full bg-black/20 backdrop-blur-sm text-white border border-white/20 hover:bg-[#8AB73A]/40"
                              onClick={() => api.current?.scrollPrev()}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                              </svg>
                            </Button>
                          </div>
                          
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full bg-black/20 backdrop-blur-sm text-white border border-white/20 hover:bg-[#8AB73A]/40"
                              onClick={() => api.current?.scrollNext()}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            </Button>
                          </div>
                          
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-30">
                            {promoImages.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => api.current?.scrollTo(index)}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  index === currentSlide ? "w-8 bg-[#8AB73A] shadow-[0_0_6px_0px_rgba(138,183,58,0.8)]" : "w-2 bg-white/50 hover:bg-white/70"
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                              />
                            ))}
                          </div>
                        </Carousel>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column (My Quotes) */}
          <div className="lg:col-span-2">
             <Card className="bg-[#0A2B6C]/20 backdrop-blur-lg border border-white/10 text-white rounded-2xl shadow-xl overflow-hidden h-full">
              <CardHeader>
                <CardTitle className="text-xl md:text-2xl font-semibold">Мои квоты</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col px-2 md:px-4 pt-2 pb-4"> 
                {/* Conditional Rendering for loading/error/empty states - remove min-h */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center text-white/80 py-4 flex-grow"> {/* Keep flex-grow here for centering */}
                        {/* Loading Spinner SVG */}
                        <svg className="animate-spin h-8 w-8 text-white mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Загрузка квот...</span>
                    </div>
                )}
                {error && <p className="text-center text-red-400 py-4">Error: {error}</p>} 
                {!isLoading && !error && quotes.length === 0 && (
                  <p className="text-center text-white/80 py-4">Сохраненных квот пока нет.</p> 
                )}
                
                {/* Display Quotes */}
                {!isLoading && !error && quotes.length > 0 && (
                  <div className="space-y-3"> {/* Container for vertical quote cards */}
                    {visibleQuotes.map((quote) => ( 
                      <div 
                        key={quote.id} 
                        className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors duration-200"
                      >
                        {/* Left side: Name, Date, Type, Customer */}
                        <div className="flex flex-col mr-3 flex-grow min-w-0"> 
                          <span className="font-medium text-white text-base leading-tight break-words truncate">{quote.name}</span>
                          <span className="text-sm text-white/70 mt-1">
                            {new Date(quote.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                          <span 
                            className={`px-1.5 py-0.5 text-xs font-semibold rounded-full w-fit mt-1.5 ${ 
                              quote.quoteType === 'CRAC' 
                                ? 'bg-sky-500/20 text-sky-300' 
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                            {quote.quoteType === 'CRAC' ? 'AC' : 'DC'}
                          </span>
                          {quote.quoteType === 'DC' && quote.configData?.customerName && (
                            <span className="text-sm text-[#8AB73A]/80 mt-1.5 flex items-center truncate">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 flex-shrink-0">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                              </svg>
                              {quote.configData.customerName}
                            </span>
                          )}
                        </div>
                        {/* Right side: Button */}
                        <div className="flex-shrink-0">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewQuote(quote.id)} 
                            className="bg-green-600/10 border-green-500/30 hover:bg-green-600/20 text-green-300 hover:text-green-200 transition-colors px-4 py-2 text-sm" 
                          >
                              Просмотр
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination Controls - Reduce top padding */}
                {!isLoading && !error && quotes.length > QUOTES_PER_PAGE && (
                  <div className="flex justify-center items-center space-x-3 pt-2"> 
                    <Button
                      onClick={handlePrevPage}
                      disabled={currentPage === 0}
                      variant="outline"
                      size="sm"
                      className="disabled:opacity-50 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      Назад
                    </Button>
                    <span className="text-sm text-white/80">
                      {currentPage + 1} / {totalPages}
                    </span>
                    <Button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                      variant="outline"
                      size="sm"
                      className="disabled:opacity-50 bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      Дальше
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Product Carousel Section */} 
        <div className="mt-10 md:mt-16"> {/* Add margin top */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
            Узнать больше о продукции
          </h2>
          <Carousel
            plugins={[
              Autoplay() // Use default options for testing
              /* Autoplay({
                delay: 8000, // Updated to 8 seconds
                stopOnInteraction: true,
                stopOnMouseEnter: true,
              }) */
            ]}
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full max-w-4xl mx-auto" 
          >
            <CarouselContent className="-ml-4">
              {products.map((product, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="p-1 h-full">
                    <Card className="bg-transparent backdrop-blur-lg border border-white/10 hover:border-white/30 transition-all text-white rounded-2xl shadow-xl hover:shadow-[0_0_15px_3px_rgba(66,165,245,0.4)] overflow-hidden h-full flex flex-col">
                      <CardContent className="flex flex-col items-center justify-between p-6 flex-grow">
                        <div className="w-full aspect-square rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                           <img
                              src={product.icon}
                              alt={product.name}
                              className="max-h-full max-w-full object-contain p-2"
                              loading="lazy"
                            />
                        </div>
                        <p className="text-lg font-semibold text-center mb-4 h-14 flex items-center justify-center">
                           {product.name}
                         </p>
                        <Button 
                          variant="outline" 
                          className="w-full mt-auto bg-transparent border-white/50 text-white hover:bg-[#8AB73A] hover:border-[#8AB73A] hover:text-white transition-colors"
                          onClick={() => window.open(product.pdf, '_blank')}
                        >
                          Открыть PDF
                        </Button>
                      </CardContent>
                    </Card>
                  </div> 
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-[-50px] top-1/2 -translate-y-1/2 hidden sm:inline-flex bg-white/10 border-white/30 text-white hover:bg-white/30 hover:scale-105 transition-all h-9 w-9" />
            <CarouselNext className="absolute right-[-50px] top-1/2 -translate-y-1/2 hidden sm:inline-flex bg-white/10 border-white/30 text-white hover:bg-white/30 hover:scale-105 transition-all h-9 w-9" />
          </Carousel>
        </div>
      </div>
    </div>
  );
} 
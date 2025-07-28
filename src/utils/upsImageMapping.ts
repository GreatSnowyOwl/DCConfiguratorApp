// UPS Image and Documentation Mapping
export interface UPSImageMapping {
  image: string;
  documentationUrl: string;
  documentationName: string;
}

export const UPS_IMAGE_MAPPING: { [key: string]: UPSImageMapping } = {
  // UR Series (1-40kVA Rack Mount)
  "UR": {
    image: "/URRacksUPS1tire40KVA-removebg-preview.png",
    documentationUrl: "/UR%20Rack%20UPS%201-40kVA%20-%20BrochueRU.pdf",
    documentationName: "UR Rack UPS 1-40kVA - Техническая спецификация"
  },
  
  // UE Series (10-160kVA Tower)
  "UE-LOW": {
    image: "/UEUPS160MAX-removebg-preview.png", 
    documentationUrl: "/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf",
    documentationName: "UE Tower UPS 10-160kVA - Техническая спецификация"
  },
  
  // UE Series (200-800kVA Tower)
  "UE-HIGH": {
    image: "/UE200-800-removebg-preview.png", 
    documentationUrl: "/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf",
    documentationName: "UE Tower UPS 200-800kVA - Техническая спецификация"
  },
  
  // UM Series - Different images based on frame size
  "UM-90": {
    image: "/UMблокимощности15ква-removebg-preview.png",
    documentationUrl: "/UM%20Modularized%20UPS%2015kVA.pdf", 
    documentationName: "UM Modular UPS 15kVA - Техническая спецификация"
  },
  
  "UM-120": {
    image: "/UMблокимощности15ква-removebg-preview.png",
    documentationUrl: "/UM20-30kVA.pdf",
    documentationName: "UM Modular UPS 20-30kVA - Техническая спецификация"
  },
  
  "UM-125": {
    image: "/UMблокимощности15ква-removebg-preview.png", 
    documentationUrl: "/UM20-30kVA.pdf",
    documentationName: "UM Modular UPS 25kVA - Техническая спецификация"
  },
  
  "UM-150": {
    image: "/UMпо50квамодули-removebg-preview.png",
    documentationUrl: "/Модульный%20ИБП%2050%20кВА%20-%20Брошюра.pdf",
    documentationName: "UM Modular UPS 150kVA - Техническая спецификация"
  },
  
  "UM-180": {
    image: "/UMпо50квамодули-removebg-preview.png",
    documentationUrl: "/Модульный%20ИБП%2050%20кВА%20-%20Брошюра.pdf",
    documentationName: "UM Modular UPS 180kVA - Техническая спецификация"
  },
  
  "UM-200": {
    image: "/UMпо50квамодули-removebg-preview.png",
    documentationUrl: "/Модульный%20ИБП%2050%20кВА%20-%20Брошюра.pdf",
    documentationName: "UM Modular UPS 200kVA - Техническая спецификация"
  },
  
  "UM-300": {
    image: "/UMпо50квамодули-removebg-preview.png",
    documentationUrl: "/Модульный%20ИБП%2050%20кВА%20-%20Брошюра.pdf",
    documentationName: "UM Modular UPS 300kVA - Техническая спецификация"
  },
  
  "UM-400": {
    image: "/UMпо50квамодули-removebg-preview.png",
    documentationUrl: "/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf",
    documentationName: "UM Modular UPS 400kVA - Техническая спецификация"
  },
  
  "UM-500": {
    image: "/UMпо50квамодули-removebg-preview.png",
    documentationUrl: "/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf",
    documentationName: "UM Modular UPS 500kVA - Техническая спецификация"
  },
  
  "UM-600": {
    image: "/UMпо50квамодули-removebg-preview.png",
    documentationUrl: "/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf",
    documentationName: "UM Modular UPS 600kVA - Техническая спецификация"
  },
  
  "UM-800": {
    image: "/UMпо50квамодули-removebg-preview.png",
    documentationUrl: "/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf",
    documentationName: "UM Modular UPS 800kVA - Техническая спецификация"
  },
  
  "UM-1200": {
    image: "/UM100Kva.png",
    documentationUrl: "/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf",
    documentationName: "UM Modular UPS 100-1200kVA - Техническая спецификация"
  }
};

export const getAssetUrl = (path: string) => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  // Ensure the base URL ends with a slash and the path doesn't start with one
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${cleanBaseUrl}${cleanPath}`;
};

export function getUPSImageMapping(upsType: string, frame?: number, capacity?: number): UPSImageMapping {
  switch (upsType) {
    case 'UR':
      return {
        image: getAssetUrl('URRacksUPS1tire40KVA-removebg-preview.png'),
        documentationUrl: getAssetUrl('UR Rack UPS 1-40kVA - BrochueRU.pdf'),
        documentationName: 'UR Rack UPS 1-40kVA'
      };
    case 'UE':
      if (frame && frame >= 10 && frame <= 40) {
        return {
          image: getAssetUrl('UE_UPS.png'),
          documentationUrl: getAssetUrl('UM20-30kVA.pdf'),
          documentationName: 'UE Tower UPS 10-40kVA'
        };
      } else if (frame && frame >= 60 && frame <= 160) {
        return {
          image: getAssetUrl('UEUPS160MAX-removebg-preview.png'),
          documentationUrl: getAssetUrl('UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf'),
          documentationName: 'UE Tower UPS 60-160kVA'
        };
      } else {
        return {
          image: getAssetUrl('UE200-800-removebg-preview.png'),
          documentationUrl: getAssetUrl('UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf'),
          documentationName: 'UE Tower UPS 200-800kVA'
        };
      }
    case 'UM':
      if (frame && frame <= 180) {
        return {
          image: getAssetUrl('UMблокимощности15ква-removebg-preview.png'),
          documentationUrl: getAssetUrl('UM Modularized UPS 15kVA.pdf'),
          documentationName: 'UM Modular UPS 15kVA Modules'
        };
      } else {
        return {
          image: getAssetUrl('UMпо50квамодули-removebg-preview.png'),
          documentationUrl: getAssetUrl('Модульный ИБП 50 кВА - Брошюра.pdf'),
          documentationName: 'UM Modular UPS 50kVA Modules'
        };
      }
    // Default fallback
    default:
      return {
        image: getAssetUrl('DATACENTER.png'),
        documentationUrl: getAssetUrl('catalog2025.pdf'),
        documentationName: 'Full Catalog 2025'
      };
  }
} 
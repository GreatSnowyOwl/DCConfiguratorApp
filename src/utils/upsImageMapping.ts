// UPS Image and Documentation Mapping
export interface UPSImageMapping {
  image: string;
  documentationUrl: string;
  documentationName: string;
}

const BASE_PATH = '/wp-content/partner-zone-test';

export const UPS_IMAGE_MAPPING: { [key: string]: UPSImageMapping } = {
  // UR Series (1-40kVA Rack Mount)
  "UR": {
    image: `${BASE_PATH}/URRacksUPS1tire40KVA-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/UR%20Rack%20UPS%201-40kVA%20-%20BrochueRU.pdf`,
    documentationName: "UR Rack UPS 1-40kVA - Техническая спецификация"
  },
  
  // UE Series (10-160kVA Tower)
  "UE-LOW": {
    image: `${BASE_PATH}/UEUPS160MAX-removebg-preview.png`, 
    documentationUrl: `${BASE_PATH}/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf`,
    documentationName: "UE Tower UPS 10-160kVA - Техническая спецификация"
  },
  
  // UE Series (200-800kVA Tower)
  "UE-HIGH": {
    image: `${BASE_PATH}/UE200-800-removebg-preview.png`, 
    documentationUrl: `${BASE_PATH}/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf`,
    documentationName: "UE Tower UPS 200-800kVA - Техническая спецификация"
  },
  
  // UM Series - Different images based on frame size
  "UM-90": {
    image: `${BASE_PATH}/UMблокимощности15ква-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/UM%20Modularized%20UPS%2015kVA.pdf`, 
    documentationName: "UM Modular UPS 15kVA - Техническая спецификация"
  },
  
  "UM-120": {
    image: `${BASE_PATH}/UMблокимощности15ква-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/UM20-30kVA.pdf`,
    documentationName: "UM Modular UPS 20-30kVA - Техническая спецификация"
  },
  
  "UM-125": {
    image: `${BASE_PATH}/UMблокимощности15ква-removebg-preview.png`, 
    documentationUrl: `${BASE_PATH}/UM20-30kVA.pdf`,
    documentationName: "UM Modular UPS 25kVA - Техническая спецификация"
  },
  
  "UM-150": {
    image: `${BASE_PATH}/UMпо50квамодули-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/Модульный%20ИБП%2050%20кВА%20-%20Брошюра.pdf`,
    documentationName: "UM Modular UPS 150kVA - Техническая спецификация"
  },
  
  "UM-180": {
    image: `${BASE_PATH}/UMпо50квамодули-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/Модульный%20ИБП%2050%20кВА%20-%20Брошюра.pdf`,
    documentationName: "UM Modular UPS 180kVA - Техническая спецификация"
  },
  
  "UM-200": {
    image: `${BASE_PATH}/UMпо50квамодули-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/Модульный%20ИБП%2050%20кВА%20-%20Брошюра.pdf`,
    documentationName: "UM Modular UPS 200kVA - Техническая спецификация"
  },
  
  "UM-300": {
    image: `${BASE_PATH}/UMпо50квамодули-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/Модульный%20ИБП%2050%20кВА%20-%20Брошюра.pdf`,
    documentationName: "UM Modular UPS 300kVA - Техническая спецификация"
  },
  
  "UM-400": {
    image: `${BASE_PATH}/UMпо50квамодули-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf`,
    documentationName: "UM Modular UPS 400kVA - Техническая спецификация"
  },
  
  "UM-500": {
    image: `${BASE_PATH}/UMпо50квамодули-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf`,
    documentationName: "UM Modular UPS 500kVA - Техническая спецификация"
  },
  
  "UM-600": {
    image: `${BASE_PATH}/UMпо50квамодули-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf`,
    documentationName: "UM Modular UPS 600kVA - Техническая спецификация"
  },
  
  "UM-800": {
    image: `${BASE_PATH}/UMпо50квамодули-removebg-preview.png`,
    documentationUrl: `${BASE_PATH}/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf`,
    documentationName: "UM Modular UPS 800kVA - Техническая спецификация"
  },
  
  "UM-1200": {
    image: `${BASE_PATH}/UM100Kva.png`,
    documentationUrl: `${BASE_PATH}/UM_Modularized_UPS_100kVA_Brochure_98125289_A01_20250612.pdf`,
    documentationName: "UM Modular UPS 100-1200kVA - Техническая спецификация"
  }
};

export function getUPSImageMapping(upsType: string, frame?: number, capacity?: number): UPSImageMapping {
  // For UR series
  if (upsType === "UR") {
    return UPS_IMAGE_MAPPING["UR"];
  }
  
  // For UE series - determine by capacity
  if (upsType === "UE") {
    if (capacity && capacity >= 200 && capacity <= 800) {
      return UPS_IMAGE_MAPPING["UE-HIGH"];  // 200-800kVA models
    } else {
      return UPS_IMAGE_MAPPING["UE-LOW"];   // 10-160kVA models
    }
  }
  
  // For UM series - determine by frame size
  if (upsType === "UM" && frame) {
    if (frame === 90) {
      return UPS_IMAGE_MAPPING["UM-90"];
    } else if (frame === 120) {
      return UPS_IMAGE_MAPPING["UM-120"];
    } else if (frame === 125) {
      return UPS_IMAGE_MAPPING["UM-125"];
    } else if (frame === 150) {
      return UPS_IMAGE_MAPPING["UM-150"];
    } else if (frame === 180) {
      return UPS_IMAGE_MAPPING["UM-180"];
    } else if (frame === 200) {
      return UPS_IMAGE_MAPPING["UM-200"];
    } else if (frame === 300) {
      return UPS_IMAGE_MAPPING["UM-300"];
    } else if (frame === 400) {
      return UPS_IMAGE_MAPPING["UM-400"];
    } else if (frame === 500) {
      return UPS_IMAGE_MAPPING["UM-500"];
    } else if (frame === 600) {
      return UPS_IMAGE_MAPPING["UM-600"];
    } else if (frame === 800) {
      return UPS_IMAGE_MAPPING["UM-800"];
    } else if (frame === 1200) {
      return UPS_IMAGE_MAPPING["UM-1200"];
    }
  }
  
  // Default fallback for UM series - determine by capacity if frame not found
  if (upsType === "UM") {
    if (capacity && capacity >= 50 && capacity <= 150) {
      return UPS_IMAGE_MAPPING["UM-150"];
    } else if (capacity && capacity >= 150 && capacity <= 300) {
      return UPS_IMAGE_MAPPING["UM-300"];
    } else if (capacity && capacity >= 300 && capacity <= 600) {
      return UPS_IMAGE_MAPPING["UM-600"];
    } else if (capacity && capacity >= 600) {
      return UPS_IMAGE_MAPPING["UM-800"];
    }
    return UPS_IMAGE_MAPPING["UM-1200"];
  }
  
  // Default fallback
  return UPS_IMAGE_MAPPING["UE-LOW"];
} 
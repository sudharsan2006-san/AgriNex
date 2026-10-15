type LanguageHelpers = {
    t: (key: string) => string;
    crop: (label: string) => string;
};

const translations: Record<string, string> = {
    Marketplace: "Marketplace",
    "View Detailed Pricing": "View Detailed Pricing",
    "Agricultural Market Prices": "Agricultural Market Prices",
    Min: "Min",
    Max: "Max",
    Modal: "Modal",
    Unit: "Unit",
    "Book Now": "Book Now",
    Paddy: "Paddy",
    Maize: "Maize",
    Wheat: "Wheat",
    Millet: "Millet",
    Sugarcane: "Sugarcane",
    Groundnut: "Groundnut",
    Cotton: "Cotton",
    Tomato: "Tomato",
    Onion: "Onion",
    Potato: "Potato",
    Brinjal: "Brinjal",
    Banana: "Banana",
    Mango: "Mango",
    Coconut: "Coconut",
    Chilli: "Chilli",
};

export function useLanguage(): LanguageHelpers {
    const t = (key: string) => translations[key] ?? key;
    const crop = (label: string) => translations[label] ?? label;

    return { t, crop };
}

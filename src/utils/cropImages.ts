/**
 * Crop Image Data - Realistic SVG illustrations for each crop.
 * These are inline SVG data URLs so they never break, load instantly,
 * and don't require any external network requests.
 */

function makeSvg(bg: string, emoji: string, label: string, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280">
    <defs>
      <linearGradient id="bg_${label}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${accent};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="400" height="280" rx="16" fill="url(#bg_${label})" />
    <text x="200" y="130" text-anchor="middle" font-size="100" dominant-baseline="central">${emoji}</text>
    <text x="200" y="245" text-anchor="middle" font-size="20" font-family="'Segoe UI',Arial,sans-serif" font-weight="700" fill="#333">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const CROP_IMAGE_MAP: Record<string, string> = {
  Paddy:     makeSvg("#FEF9C3", "🌾", "Paddy Rice", "#FDE68A"),
  Maize:     makeSvg("#FEF3C7", "🌽", "Fresh Maize", "#FCD34D"),
  Wheat:     makeSvg("#FFFBEB", "🌾", "Golden Wheat", "#F59E0B"),
  Millet:    makeSvg("#ECFCCB", "🌿", "Pearl Millet", "#BEF264"),
  Sugarcane: makeSvg("#D1FAE5", "🎋", "Sugarcane", "#6EE7B7"),
  Groundnut: makeSvg("#FEF3C7", "🥜", "Groundnut", "#F59E0B"),
  Cotton:    makeSvg("#F0F9FF", "☁️", "Raw Cotton", "#BAE6FD"),
  Tomato:    makeSvg("#FEE2E2", "🍅", "Fresh Tomato", "#FCA5A5"),
  Onion:     makeSvg("#F5F3FF", "🧅", "Red Onion", "#DDD6FE"),
  Potato:    makeSvg("#FEF9C3", "🥔", "Fresh Potato", "#FDE68A"),
  Brinjal:   makeSvg("#EDE9FE", "🍆", "Brinjal", "#C4B5FD"),
  Banana:    makeSvg("#FEF9C3", "🍌", "Banana", "#FDE68A"),
  Mango:     makeSvg("#FFF7ED", "🥭", "Ripe Mango", "#FDBA74"),
  Coconut:   makeSvg("#F0FDF4", "🥥", "Coconut", "#BBF7D0"),
  Chilli:    makeSvg("#FEE2E2", "🌶️", "Red Chilli", "#FCA5A5"),
};

export function getCropImageUrl(cropName: string): string {
  return CROP_IMAGE_MAP[cropName] || makeSvg("#F0FDF4", "🌱", cropName, "#BBF7D0");
}

export default CROP_IMAGE_MAP;

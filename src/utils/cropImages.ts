import bananaImage from "../assets/images/banana_realistic_1788423373706.jpg";
import brinjalImage from "../assets/images/brinjal_realistic_1788423360402.jpg";
import chilliImage from "../assets/images/chilli_realistic_1788423420382.jpg";
import coconutImage from "../assets/images/coconut_realistic_1788423404696.jpg";
import cottonImage from "../assets/images/cotton_realistic_1788423275186.jpg";
import groundnutImage from "../assets/images/groundnut_realistic_1788423449690.jpg";
import maizeImage from "../assets/images/maize_realistic_1788423123774.jpg";
import mangoImage from "../assets/images/mango_realistic_1788423388083.jpg";
import milletImage from "../assets/images/millet_realistic_1788423158373.jpg";
import onionImage from "../assets/images/onion_realistic_1788423319492.jpg";
import paddyImage from "../assets/images/paddy_realistic_1788423107962.jpg";
import potatoImage from "../assets/images/potato_realistic_1788423340061.jpg";
import sugarcaneImage from "../assets/images/sugarcane_realistic_1788423179854.jpg";
import tomatoImage from "../assets/images/tomato_realistic_1788423293307.jpg";
import wheatImage from "../assets/images/wheat_realistic_1788423144242.jpg";

const CROP_IMAGE_MAP: Record<string, string> = {
    Paddy: paddyImage,
    Maize: maizeImage,
    Wheat: wheatImage,
    Millet: milletImage,
    Sugarcane: sugarcaneImage,
    Groundnut: groundnutImage,
    Cotton: cottonImage,
    Tomato: tomatoImage,
    Onion: onionImage,
    Potato: potatoImage,
    Brinjal: brinjalImage,
    Banana: bananaImage,
    Mango: mangoImage,
    Coconut: coconutImage,
    Chilli: chilliImage,
};

export function getCropImageUrl(cropName: string): string | undefined {
    return CROP_IMAGE_MAP[cropName];
}

export default CROP_IMAGE_MAP;

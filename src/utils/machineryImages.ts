const PRODUCT_IMAGE_BY_NAME: Record<string, string> = {
  "fieldking 9-tyne heavy duty cultivator":
    "https://www.fieldking.com/images/tillage/cultivator-and-tiller/lg/heavy-duty-type-cultivator.png",
  "honda multi-row rotary power weeder":
    "https://www.hondaindiapower.com/admin/public/uploads/Products/Isr1rIL2tl.jpg",
  "kirloskar 5 hp portable diesel irrigation pump":
    "https://tiimg.tistatic.com/fp/1/007/337/air-cooled-2600-rpm-kirloskar-5-hp-agricultural-diesel-engine-pump-set--418.jpg",
};

export function getMachineryImageUrl(name: string, fallback: unknown): string | undefined {
  const productImage = PRODUCT_IMAGE_BY_NAME[name.trim().toLowerCase()];
  if (productImage) return productImage;
  return typeof fallback === "string" && fallback.trim() ? fallback : undefined;
}

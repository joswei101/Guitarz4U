/** Public business information. The exact collection/drop-off address is deliberately NOT here. */
export const site = {
  name: "Guitarz4U",
  tagline: "Second-hand equipment. First-hand service.",
  description:
    "Guitarz4U buys and sells inspected second-hand guitars and equipment and offers professional guitar and amplifier repairs in Sandringham, Johannesburg.",
  area: "Sandringham, Johannesburg",
  country: "South Africa",
  whatsappDisplay: "064 856 7019",
  whatsappE164: "27648567019",
  email: "Joshuaweinfas@gmail.com",
  socialHandle: "Shuaweinfas",
  hoursNote: "Closed on Saturdays.",
  collectionNote:
    "Collection only, in the Sandringham area of Johannesburg. The exact collection address is shared privately once your purchase is confirmed.",
} as const;

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${site.whatsappE164}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function mailtoLink(subject?: string): string {
  return `mailto:${site.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}

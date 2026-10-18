// Default website copy. Most of it can be overridden in Admin → Website content
// without editing code. Written in South African English.

export const HERO_DEFAULT = {
  title: "Pre-owned guitars, given a new life.",
  subtitle:
    "Guitarz4U buys, sells and repairs second-hand guitars in Johannesburg. Every instrument is personally checked and honestly described — so you know exactly what you're getting.",
};

export const ABOUT_DEFAULT = `Guitarz4U was started by Shua Weinfas — a self-taught pianist, guitarist and vocalist with a lifelong passion for music and the instruments that make it possible.

That hands-on experience shapes how every guitar is assessed and valued here: with an ear and an eye for genuine quality, not just a price tag. Whether you're parting with an old favourite or looking for your next guitar, you deal directly with someone who understands what an instrument means to the person playing it.

## What we do

- **Buy** second-hand electric, bass, acoustic and classical guitars — including broken guitars that deserve a second chance.
- **Sell** pre-owned guitars and selected guitar equipment, each one checked, described honestly and priced fairly.
- **Repair** guitars — from a fresh set of strings and a proper setup to electronics, hardware, body and fret work.

## How we work

- **Honest descriptions.** Wear, defects and known history are disclosed in every listing.
- **Personal service.** You deal with the owner directly — no call centres, no automated sales.
- **No pressure.** Requests and offers are the start of a conversation, never an obligation.
- **Your privacy matters.** We only collect what we need, and our collection address is shared privately once a purchase has been agreed.`;

export const REPAIRS_INTRO_DEFAULT =
  "From a fresh set of strings to electronics, hardware and fretwork, Guitarz4U offers personal, careful guitar repairs in Johannesburg. Every guitar is assessed individually and you receive a quotation before any work begins.";

export const HOW_IT_WORKS = {
  buying: [
    {
      title: "Browse and choose",
      body: "Explore the shop. Every listing shows real photos, the condition grade, disclosed defects and the price in rand.",
    },
    {
      title: "Send a request",
      body: "Add items to your request cart and submit a purchase enquiry, or request a reservation. This is not a payment — nothing is charged online.",
    },
    {
      title: "We confirm personally",
      body: "Guitarz4U checks availability and contacts you (WhatsApp is usually quickest) to confirm the details and agree on payment, normally by EFT.",
    },
    {
      title: "Collect your guitar",
      body: "Once payment is confirmed, we arrange collection. The collection address is shared privately at this stage. Courier delivery may be arranged at the buyer's cost and risk.",
    },
  ],
  selling: [
    {
      title: "Tell us about your guitar",
      body: "Complete the sell form with the brand, model, condition, any defects and a few clear photos. Broken guitars are welcome; loose parts are not.",
    },
    {
      title: "We review it personally",
      body: "We may ask for more information or photos. If it's a good fit, we'll invite you to bring it in for inspection.",
    },
    {
      title: "Receive an offer",
      body: "After inspection we make a personal, no-obligation offer. You can accept or decline it from your account.",
    },
    {
      title: "Handover and payment",
      body: "If you accept, we arrange the handover and pay you directly, normally by EFT.",
    },
  ],
  repairs: [
    {
      title: "Book online",
      body: "Describe the problem, choose the type of repair and add photos. Pick a preferred date if you have one.",
    },
    {
      title: "Assessment and quote",
      body: "We review your request and give you a quotation. Prices are assessed per guitar — nothing is fixed until you've seen a quote.",
    },
    {
      title: "You approve",
      body: "Accept or decline the quote from your account. Work only starts once we've both confirmed.",
    },
    {
      title: "Track and collect",
      body: "Follow the repair status in your account. We'll let you know when your guitar is ready for collection.",
    },
  ],
};

export const FAQS: { q: string; a: string; group: string }[] = [
  {
    group: "Buying",
    q: "Is adding something to the cart the same as buying it?",
    a: "No. The cart is a request cart. Submitting it sends Guitarz4U an enquiry. We then confirm availability with you and agree on payment directly. No payment is taken on this website and nothing is final until we confirm it with you.",
  },
  {
    group: "Buying",
    q: "How do I pay?",
    a: "Payment is arranged directly with Guitarz4U once your request has been accepted — normally by EFT (bank transfer) or another arrangement we agree on. We will never ask for your card details on this website.",
  },
  {
    group: "Buying",
    q: "What do the condition grades mean?",
    a: "Mint: as new. Excellent: very light signs of use. Very good: minor cosmetic wear. Good: noticeable cosmetic wear but fully functional. Fair: heavy wear or minor functional issues. Needs repair: sold as-is for repair or restoration. Specific defects are always described in the listing.",
  },
  {
    group: "Buying",
    q: "Can I see a guitar before I buy it?",
    a: "Viewings can be arranged by appointment. Send us a WhatsApp message or a request through the website and we'll arrange a suitable time.",
  },
  {
    group: "Buying",
    q: "Where do I collect? Why isn't your address on the website?",
    a: "For privacy and security, the collection address is only shared privately once a purchase or appointment has been agreed. We're based in Sandringham, Johannesburg. Courier delivery may be arranged at the buyer's cost and risk.",
  },
  {
    group: "Reservations",
    q: "How do reservations work?",
    a: "You can request a reservation on any available item. A request is not a confirmed reservation — Guitarz4U reviews it personally. If approved, the item is held for you for a limited time (usually a few days) while payment is arranged. Unpaid reservations expire automatically.",
  },
  {
    group: "Selling",
    q: "Do you buy broken guitars?",
    a: "Yes — we consider broken guitars (electric, bass, acoustic and classical). Describe the problem honestly and include photos. We don't buy loose guitar parts on their own.",
  },
  {
    group: "Selling",
    q: "Will I definitely get an offer?",
    a: "Not necessarily. Every guitar is assessed personally, usually including an in-person inspection. If we make an offer, there's no obligation to accept it.",
  },
  {
    group: "Repairs",
    q: "How much does a repair cost?",
    a: "Every repair is quoted individually after we've assessed the guitar. Any prices shown on the repairs page are guides only, unless stated otherwise. Work only starts after you've approved the quote.",
  },
  {
    group: "Repairs",
    q: "How long do repairs take?",
    a: "It depends on the repair and parts availability. We'll give you an estimate with your quote and you can track progress in your account.",
  },
  {
    group: "General",
    q: "When are you open?",
    a: "We work by arrangement. Please note we are closed on Saturdays. WhatsApp is the quickest way to reach us.",
  },
  {
    group: "General",
    q: "Do I need an account?",
    a: "You can browse without one. A free account lets you submit requests, track their status, keep a wishlist and receive updates. Prefer not to sign up? Contact us on WhatsApp instead.",
  },
  {
    group: "General",
    q: "How is my personal information used?",
    a: "Only to handle your requests and contact you about them. We don't sell your information. You can download your data or ask us to delete your account at any time from your account page. See the privacy policy for details.",
  },
];

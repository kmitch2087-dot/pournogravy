export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  sizes: string[];
  image?: string;
  images: string[];
  badge?: string;
  humor: string;
}

export const products: Product[] = [
  {
    id: "tip-your-bartender",
    name: "Tip Your Bartender or Stay Home",
    price: 29.99,
    description: "For every customer who leaves a $2 tip on a $50 tab. We see you. And we hate you.",
    category: "best-sellers",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/tip-your-bartender.jpg",
    badge: "BEST SELLER",
    humor: "Because apparently 4% is 'generous' to some people.",
  },
  {
    id: "on-my-last-nerve",
    name: "I'm On My Last Nerve & You're Tap Dancing On It",
    price: 29.99,
    description: "The perfect shirt for that Wednesday double when Karen asks for her 4th remake.",
    category: "best-sellers",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    badge: "BEST SELLER",

    humor: "Yes, I smiled. No, I didn't mean it.",
  },
  {
    id: "no-karen",
    name: "No Karen, I Can't Make It Stronger",
    price: 29.99,
    description: "It's a standard pour, Karen. The alcohol content doesn't change because you snapped at me.",
    category: "karens",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    humor: "The recipe is the recipe. Your attitude won't change chemistry.",
  },
  {
    id: "last-call",
    name: "Last Call Was 20 Minutes Ago",
    price: 29.99,
    description: "For every soul who thinks 'one more' means three more after we already flipped the lights.",
    category: "nightlife",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    humor: "The lights are on. You don't look as good as you thought.",
  },
  {
    id: "bartender-therapist",
    name: "Bartender. Not Your Therapist.",
    price: 29.99,
    description: "I make drinks. I don't fix your marriage, your job, or your questionable life choices.",
    category: "best-sellers",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/bartender-therapist.jpg",
    badge: "NEW",
    humor: "That'll be $14 for the drink. The unsolicited therapy is free but unwelcome.",
  },
  {
    id: "86-your-attitude",
    name: "86 Your Attitude",
    price: 29.99,
    description: "We 86'd the tequila and your entitlement on the same night.",
    category: "nightlife",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/86-your-attitude.jpg",
    humor: "If we can run out of Tito's, we can run out of patience too.",
  },
  {
    id: "server-not-servant",
    name: "Server, Not Servant",
    price: 29.99,
    description: "There's a difference. Learn it. Tip accordingly.",
    category: "industry",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/server-not-servant.jpg",
    humor: "I serve food, not your ego.",
  },
  {
    id: "behind-the-bar",
    name: "Behind The Bar Since Before You Could Drink",
    price: 32.99,
    description: "Veterans only. If you haven't broken a glass with your bare hands, you're not ready.",
    category: "industry",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    badge: "PREMIUM",
    humor: "I was free-pouring before you had a fake ID.",
  },
  {
    id: "i-love-cheese-wiz",
    name: "I Love Cheese Wiz",
    price: 29.99,
    description: "Some people have standards. You have Cheese Wiz. Own it.",
    category: "nightlife",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/i-love-cheese-wiz.jpg",
    badge: "NEW",
    humor: "Fine dining is overrated. Pass the can.",
  },
];

export const collections = [
  { id: "best-sellers", name: "Best Sellers", description: "The shirts that started bar fights (the good kind)." },
  { id: "karens", name: "Karen Collection", description: "Dedicated to every 'I want to speak to your manager' moment." },
  { id: "nightlife", name: "Nightlife", description: "For the hours between midnight and regret." },
  { id: "industry", name: "Industry Life", description: "If you know, you know. If you don't, tip better." },
];

export const quotes = [
  "I'm not arguing. I'm explaining why I'm right and you're ordering wrong.",
  "Your cocktail takes 3 minutes. Your complaint takes my will to live.",
  "I've cut off better people than you.",
  "I don't have a drinking problem. I have a customer problem.",
  "Yes, the music is loud. That's because I don't want to hear you.",
  "My face says 'welcome.' My eyes say 'don't test me.'",
];

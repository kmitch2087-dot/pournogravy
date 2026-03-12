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
  featured?: boolean;
}

export const products: Product[] = [
  // 🔥 Salty Bartender
  {
    id: "tip-your-bartender",
    name: "Tip Your Bartender or Stay Home",
    price: 29.99,
    description: "For every customer who leaves a $2 tip on a $50 tab. We see you. And we hate you.",
    category: "salty-bartender",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/tip-your-bartender.jpg",
    badge: "BEST SELLER",
    featured: true,
    humor: "Because apparently 4% is 'generous' to some people.",
  },
  {
    id: "86-your-attitude",
    name: "86 Your Attitude",
    price: 29.99,
    description: "We 86'd the tequila and your entitlement on the same night.",
    category: "salty-bartender",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/86-your-attitude.jpg",
    featured: true,
    humor: "If we can run out of Tito's, we can run out of patience too.",
  },
  {
    id: "server-not-servant",
    name: "Server, Not Servant",
    price: 29.99,
    description: "There's a difference. Learn it. Tip accordingly.",
    category: "salty-bartender",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/server-not-servant.jpg",
    featured: true,
    humor: "I serve food, not your ego.",
  },
  {
    id: "yes-i-work-here",
    name: "Yes I Work Here. No I Don't Care.",
    price: 29.99,
    description: "The shirt that says what your nametag can't.",
    category: "salty-bartender",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    humor: "My apron is on. My empathy is off.",
  },
  {
    id: "tip-your-therapist",
    name: "Tip Your Therapist",
    price: 29.99,
    description: "Because your bartender IS your therapist. The least you can do is tip properly.",
    category: "salty-bartender",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/tip-your-therapist.jpg",
    badge: "NEW",
    featured: true,
    humor: "Therapy dog vest not included.",
  },

  // 🍸 Industry Truths
  {
    id: "bartender-therapist",
    name: "Bartender. Not Your Therapist.",
    price: 29.99,
    description: "I make drinks. I don't fix your marriage, your job, or your questionable life choices.",
    category: "industry-truths",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/bartender-therapist.jpg",
    badge: "BEST SELLER",
    featured: true,
    humor: "That'll be $14 for the drink. The unsolicited therapy is free but unwelcome.",
  },
  {
    id: "believe-in-bartenders",
    name: "You Cannot Be An Atheist If You Believe In Bartenders",
    price: 29.99,
    description: "We perform miracles nightly. Turning strangers into best friends since forever.",
    category: "industry-truths",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/believe-in-bartenders.jpg",
    featured: true,
    humor: "Patron saints of last call.",
  },
  {
    id: "believe-in-bartenders-female",
    name: "Believe In Bartenders (Women's)",
    price: 29.99,
    description: "Same divine bartending energy. Different silhouette.",
    category: "industry-truths",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/believe-in-bartenders-female.jpg",
    humor: "Angel wings earned behind the bar.",
  },
  {
    id: "introverted-bartender",
    name: "Introverted Bartender",
    price: 29.99,
    description: "I like what I do. I just don't like you. There's a difference.",
    category: "industry-truths",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/introverted-bartender.jpg",
    badge: "NEW",
    featured: true,
    humor: "I hate people. It says so on my bag.",
  },

  // ☠️ Customer Horror Stories
  {
    id: "no-karen",
    name: "No Karen, I Can't Make It Stronger",
    price: 29.99,
    description: "It's a standard pour, Karen. The alcohol content doesn't change because you snapped at me.",
    category: "customer-horror",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    humor: "The recipe is the recipe. Your attitude won't change chemistry.",
  },
  {
    id: "dear-karen-you-stink",
    name: "Dear Karen, You Stink",
    price: 29.99,
    description: "A love letter to every Karen who ever asked to speak to the manager.",
    category: "customer-horror",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/dear-karen-you-stink.jpg",
    badge: "NEW",
    featured: true,
    humor: "Peace was never an option. ✌️",
  },
  {
    id: "last-call-for-karen",
    name: "Last Call For Karen",
    price: 29.99,
    description: "The skull says it all. Every bartender has that one Karen burned into their memory.",
    category: "customer-horror",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/last-call-for-karen-dark.jpg",
    humor: "Roses are red, Karen's are loud, last call was an hour ago, please leave now.",
  },
  {
    id: "i-love-cheese-wiz",
    name: "I Love Cheese Wiz",
    price: 29.99,
    description: "Some people have standards. You have Cheese Wiz. Own it.",
    category: "customer-horror",
    sizes: ["S", "M", "L", "XL", "2XL"],
    images: [],
    image: "/products/i-love-cheese-wiz.jpg",
    humor: "Fine dining is overrated. Pass the can.",
  },
];

export const collections = [
  { id: "salty-bartender", name: "Salty Bartender", emoji: "🔥", description: "The aggressive, blunt humor shirts. For bartenders who've stopped pretending to be nice." },
  { id: "industry-truths", name: "Industry Truths", emoji: "🍸", description: "Relatable bartender sayings that hit different after a Friday close." },
  { id: "customer-horror", name: "Customer Horror Stories", emoji: "☠️", description: "Focused on the chaos of dealing with guests. Especially the Karens." },
];

export const quotes = [
  "I'm not arguing. I'm explaining why I'm right and you're ordering wrong.",
  "Your cocktail takes 3 minutes. Your complaint takes my will to live.",
  "I've cut off better people than you.",
  "I don't have a drinking problem. I have a customer problem.",
  "Yes, the music is loud. That's because I don't want to hear you.",
  "My face says 'welcome.' My eyes say 'don't test me.'",
];

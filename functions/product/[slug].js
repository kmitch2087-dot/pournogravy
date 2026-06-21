const BASE_URL = 'https://pournogravy.com';

// Minimal product data for server-side OG tag injection.
// Crawlers (Facebook, Twitter, iMessage) don't run JavaScript, so they need
// product-specific meta tags served in the initial HTML response.
const PRODUCTS = {
  'im-your-favorite-bartenders-favorite-bartender-tee': {
    name: "I'm Your Favorite Bartender's Favorite Bartender",
    description: "Let your guests know that you're the property value of this establishment and your coworkers are only here as supporting cast.",
    image: '/products/im-your-favorite-bartenders-favorite-bartender-tee-0.webp',
  },
  'i-would-totally-tap-that-keg-tee': {
    name: "I Would Totally Tap That",
    description: "However, be careful when tapping. It might spray!",
    image: '/products/i-would-totally-tap-that-keg-tee-0.webp',
  },
  'saving-my-bar-from-the-socially-stupid-one-karen-at-a-time-tee': {
    name: "Saving My Bar From the Socially Stupid, One Karen at a Time",
    description: "Karens create Karens. And we need to put a stop to it! This shirt lets everyone know you're on the frontlines of sanity.",
    image: '/products/saving-my-bar-from-the-socially-stupid-one-karen-at-a-time-tee-0.webp',
  },
  'pournogravy-og-tee-the-official-uniform-for-bartender-legends': {
    name: "OG Branded Tee",
    description: "Rep the brand that's repping you! For the bartender who stands up to any Karen regardless of the situation.",
    image: '/products/pournogravy-og-tee-the-official-uniform-for-bartender-legends-0.webp',
  },
  'last-call-for-karen-tee': {
    name: "Last Call for Karen",
    description: "This design signifies that you are part of the movement to end the Post-Pandemic Karen Entitlement Act.",
    image: '/products/last-call-for-karen-tee-0.webp',
  },
  'service-bartender-do-not-approach-tee': {
    name: "Service Bartender, Do Not Approach",
    description: "For bartenders running service bar — dedicated cocktail makers for the wait staff. No small talk. No phone charging. No Pina Coladas (blender's broken).",
    image: '/products/service-bartender-do-not-approach-tee-0.webp',
  },
  'atheist-tee': {
    name: "You Cannot Be an Atheist if You Believe in Bartenders",
    description: "They come in and confuse us for a higher power. What they don't realize yet is that we are going to hold all confessions over their head for a larger tip.",
    image: '/products/atheist-tee-0.webp',
  },
  'atheist-with-text-only': {
    name: "You Cannot Be an Atheist if You Believe in Bartenders",
    description: "Prefer your divinity without the imagery? Same message, cleaner design. Still holds all your confessions over your head until you tip accordingly.",
    image: '/products/atheist-with-text-only-0.webp',
  },
  'the-finger-tee': {
    name: "The Finger - Male",
    description: "This shirt is for bartenders who put the \"B\" in \"subtle\". Wear it as a badge of honor.",
    image: '/products/the-finger-tee-0.webp',
  },
  'pourn-hand-tee': {
    name: "Pourn Hand",
    description: "For the bartender who is stuck under a manager that has never tended bar before. This is for the bartender who pours in a little love.",
    image: '/products/pourn-hand-tee-0.webp',
  },
  'second-most-fun-job-tee': {
    name: "Second Most Fun Job in the World",
    description: "Which of history's oldest professions is better? It might be a 'trick' question. There are a lot of similarities, just different outcomes.",
    image: '/products/second-most-fun-job-tee-0.webp',
  },
  'introverted-bartender-tee': {
    name: "Introverted Bartender",
    description: "This design is for the bartender that loves the job but hates the public.",
    image: '/products/introverted-bartender-tee-0.webp',
  },
  'legally-fun-tee-text-only': {
    name: "Second Most Fun Job in the World",
    description: "Same ancient debate, now in text-only format for those who want the joke without having to explain the graphic.",
    image: '/products/legally-fun-tee-text-only-0.webp',
  },
  'tip-your-therapist-tee': {
    name: "Tip Your Therapist",
    description: "Tipping is cheaper than the cost of therapy. Let's remind the ones that keep yapping our ears off.",
    image: '/products/tip-your-therapist-tee-0.webp',
  },
  'strn-drink-tee-text-and-image': {
    name: "Your Next Drink is Only as Strong as Your Last Tip",
    description: "Excuse me! I don't taste any alcohol in my drink! Well, that's funny. I don't see any love in my tip bucket.",
    image: '/products/strn-drink-tee-text-and-image-0.webp',
  },
  'well-it-ain-t-gonna-lick-itself-tee': {
    name: "Well, It Ain't Gonna Lick Itself",
    description: "Make sure to wash and wipe your glass before rimming. And tell your friends to buy this shirt for Cinco de Mayo!",
    image: '/products/well-it-ain-t-gonna-lick-itself-tee-0.webp',
  },
  'tea-toes-and-vodka-please-tee': {
    name: "Tea, Toes, and Vodka Please",
    description: "It might not be three of your favorite things, but when united, it becomes one of the most ordered cocktails at any bar.",
    image: '/products/tea-toes-and-vodka-please-tee-0.webp',
  },
  'dear-karen-you-stink-tee': {
    name: "Dear Karen, You Stink",
    description: "Yes, I know it's immature. But it's also hilarious, so you're welcome! Perfect as a gift for your fellow bartender.",
    image: '/products/dear-karen-you-stink-tee-0.webp',
  },
  'i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-text-only': {
    name: "My Real Job (Text Only)",
    description: "Be a little empathetic when the Karens question your career choice. They come from a place of work envy.",
    image: '/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-text-only-0.webp',
  },
  'i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee': {
    name: "My Real Job",
    description: "Be a little empathetic when the Karens question your career choice. They come from a place of work envy.",
    image: '/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-0.webp',
  },
  'your-next-drink-is-only-as-strong-as-your-last-tip-tee': {
    name: "Your Next Drink is Only as Strong as Your Last Tip (Text)",
    description: "No graphic, just the message. Sometimes the words alone say everything. And if your last tip was weak, so is this drink.",
    image: '/products/your-next-drink-is-only-as-strong-as-your-last-tip-tee-0.webp',
  },
  'do-you-like-it-in-a-glass-or-do-you-take-it-in-the-can-tee': {
    name: "Do You Like It in a Glass? Or Do You Take It in the Can?",
    description: "I always smirk and ask this every time I serve a hard seltzer. And the side eyed laughs that I receive are worth the price of the shirt.",
    image: '/products/do-you-like-it-in-a-glass-or-do-you-take-it-in-the-can-tee-0.webp',
  },
  'f-off-karen': {
    name: "F Off Karen",
    description: "A politically correct way of waving hello to your favorite Karen. She will love it!",
    image: '/products/f-off-karen-0.webp',
  },
  'cow-tipping': {
    name: "Cow Tipping",
    description: "This design will remind your guests that you are an udderly amazing bartender, and that they should be throwing money at you just for being in your presence!",
    image: '/products/cow-tipping-0.webp',
  },
};

function escAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function onRequestGet({ request, env, params }) {
  const slug = params.slug;
  const product = PRODUCTS[slug];

  // Fetch index.html from static assets
  const assetUrl = new URL(request.url);
  assetUrl.pathname = '/';
  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString()));

  if (!assetResponse.ok) return assetResponse;

  let html = await assetResponse.text();

  if (!product) {
    // Unknown slug — serve default index.html with 200 so React Router handles it
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const pageTitle = `${product.name} | POURnogravy`;
  const desc = product.description.length > 200
    ? product.description.slice(0, 197) + '...'
    : product.description;
  const imageUrl = `${BASE_URL}${product.image}`;
  const pageUrl = `${BASE_URL}/product/${slug}`;

  html = html
    .replace(/<title>[^<]*<\/title>/, `<title>${escAttr(pageTitle)}</title>`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/g, `$1${escAttr(pageTitle)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/g, `$1${escAttr(desc)}$2`)
    .replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/g, `$1${imageUrl}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/g, `$1${escAttr(pageTitle)}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/g, `$1${escAttr(desc)}$2`)
    .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/g, `$1${imageUrl}$2`);

  // Add og:url if not already present
  if (!html.includes('og:url')) {
    html = html.replace(
      /(<meta\s+property="og:type"[^>]*>)/,
      `$1\n    <meta property="og:url" content="${pageUrl}" />`
    );
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

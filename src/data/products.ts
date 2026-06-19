export interface ProductVariant {
  /** Stable id slug — used in URLs and cart key. "unisex" for all products. */
  id: string;
  /** Display label — "Unisex" */
  label: string;
  /** Variant-specific images (first one is the gallery default when this variant is selected) */
  images: string[];
}

export interface ProductColor {
  /** Stable id slug — used in cart key and storage. e.g. "black", "white" */
  id: string;
  /** Display label — "Black", "Cream" */
  label: string;
  /** CSS color used to render the swatch chip */
  hex: string;
  /**
   * Per-fit photo overrides for this color. Keys are variant ids.
   * If a fit isn't represented here we fall back to `images` below, then to
   * the variant's own images, then to the product's top-level images.
   */
  imagesByFit?: Record<string, string[]>;
  /** Color-only photo override shared by both fits. */
  images?: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  /** Long-form description split into paragraphs, rendered on the product page */
  longDescription?: string[];
  sizes: string[];
  image?: string;
  images: string[];
  badge?: string;
  /** Short, punchy zinger — shown in the "Bad Bartender Advice" callout */
  humor: string;
  /** Optional multi-paragraph "Bad Bartender Advice" story shown below the description */
  badAdvice?: {
    title: string;
    paragraphs: string[];
  };
  /**
   * Fit variants. All products use a single "unisex" variant.
   */
  variants?: ProductVariant[];
  /**
   * Color options. Today every product offers Black + Cream. Photo lookup falls
   * back gracefully — color.imagesByFit > color.images > variant.images > product.images.
   */
  colors?: ProductColor[];
  /** @deprecated — use `variants` instead */
  featured?: boolean;
  /** Public visibility flag. Only products with `published: true` appear in shop/featured/search. */
  published?: boolean;
  /** ISO timestamp of when the product first went live — used for the 14-day NEW badge. */
  wentLiveAt?: string;
  /** Thumbnail zoom focal point X (0–100, default 40). */
  thumbnailFocalX?: number;
  /** Thumbnail zoom focal point Y (0–100, default 40). */
  thumbnailFocalY?: number;
}

export const products: Product[] = [
  {
    id: "im-your-favorite-bartenders-favorite-bartender-tee",
    name: "I'm Your Favorite Bartender's Favorite Bartender",
    price: 27.99,
    description: "Let your guests know that you’re the property value of this establishment and your coworkers are only here as supporting cast.",
    humor: "I'm here.  All Rise!",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/im-your-favorite-bartenders-favorite-bartender-tee-0.png",
    images: [
      "/products/im-your-favorite-bartenders-favorite-bartender-tee-0.png",
      "/products/im-your-favorite-bartenders-favorite-bartender-tee-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/im-your-favorite-bartenders-favorite-bartender-tee-0.png",
          "/products/im-your-favorite-bartenders-favorite-bartender-tee-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "It's one thing to walk into a bar on your day off and announce to the working bartender that you're a bartender too in comradery.  It's another thing to announce that you're a bartender in an attempt to get hooked up.   You're annoying and you're putting a fellow bartender's job at risk.  We can all sniff out one of our own.  No need to announce your arrival.",
        "Chad: Let me get a Bacardi and diet.",
        "Opie: Lime?",
        "Chad: No thanks. And put a little love into that pour. I'm a bartender too.",
        "Opie: Oh yeah?",
        "Chad: Yeah man.",
        "Opie: Well...Why don’t you get a real job!?",
        "Chad looks confused.",
      ],
      title: "My Name is Opie and I'll Be Your Bartender:",
    },
  },
  {
    id: "i-would-totally-tap-that-keg-tee",
    published: true,
    name: "I Would Totally Tap That",
    price: 27.99,
    description: "However, be careful when tapping.  It might spray!",
    humor: "Don't Make it Weird.  It's just a Keg.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/i-would-totally-tap-that-keg-tee-0.png",
    images: [
      "/products/i-would-totally-tap-that-keg-tee-0.png",
      "/products/i-would-totally-tap-that-keg-tee-1.jpg",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/i-would-totally-tap-that-keg-tee-0.png",
          "/products/i-would-totally-tap-that-keg-tee-1.jpg",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "Dude:  Do you like being a bartender?",
        "Opie: Why?",
        "Dude:  You barely ever smile.",
        "Opie leans over the bar.",
        "Opie:  Look around.  Do you see what I’m surrounded by?!",
        "Dude: Yeah?",
        "Opie: No.  I mean really take it in.  You see it?",
        "Dude: Yeah.",
        "Opie leans in closer.",
        "Opie:  Now blow into my ear and whisper “I can take you away from all this.”",
        "Dude:  Dude!  You’re fucked up.",
        "Opie:  But seriously though…Thanks for asking.",
      ],
      title: "My Name is Opie and I'll Be Your Bartender:",
    },
  },
  {
    id: "saving-my-bar-from-the-socially-stupid-one-karen-at-a-time-tee",
    name: "Saving My Bar From the Socially Stupid, One Karen at a Time",
    price: 27.99,
    description: "Karens create Karens.  And we need to put a stop to it!  Sure, most guests witnessing a Karen's entitled rant will feel bad for you and roll their eyes.  But there might be someone who notices that if we bend to the demands, they too could use similar tactics to get what they want.  Thus, giving birth to an up-and-coming Karen and strengthening their movement.",
    humor: "It's Not Just a Tagline.  It's a Warning.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/saving-my-bar-from-the-socially-stupid-one-karen-at-a-time-tee-0.png",
    images: [
      "/products/saving-my-bar-from-the-socially-stupid-one-karen-at-a-time-tee-0.png",
      "/products/saving-my-bar-from-the-socially-stupid-one-karen-at-a-time-tee-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/saving-my-bar-from-the-socially-stupid-one-karen-at-a-time-tee-0.png",
          "/products/saving-my-bar-from-the-socially-stupid-one-karen-at-a-time-tee-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    longDescription: [
      "This shirt lets everyone know you’re on the frontlines of sanity.  Perfect for bartenders who aren’t afraid to take a stand against bad attitudes, loud complaints, and the endless “Can I speak to your manager?”",
    ],
    badAdvice: {
      paragraphs: [
        "Dude: Can I get a Bud Heavy?",
        "Opie: Why do you call it a Bud Heavy? Why not just say Budweiser?",
        "Dude: I don't know. I guess it's just shorter to say.",
        "Opie: Hold on. Doesn't Budweiser and Bud Heavy have the same amount of syllables? How does that ease your pain of pronouncing Budweiser?",
        "Dude:...",
        "Opie:...",
        "Short stare off",
        "Opie: Or why not just call it a Bud?",
        "Dude: Because I don't want you to mistake it for a Bud Light.",
        "Opie: You mean Bud Heavy Light?",
        "Dude:...",
        "Opie:....",
        "Short stare off",
        "Opie: What would you ask for if you wanted a Bud Lite?",
        "Dude: A Bud Light.",
        "Opie: So, what makes you think that if you said Bud, that I would get you a Bud Light?",
        "Dude: Okay man, I get it.  Good Point. I'll have a Bud.",
        "Opie: $6.00",
        "Dude: Thanks Buddy.",
        "Opie: You mean Bud?",
      ],
      title: "My Name is Opie and I'll Be Your Bartender:",
    },
  },
  {
    id: "pournogravy-og-tee-the-official-uniform-for-bartender-legends",
    published: true,
    name: "OG Branded Tee",
    price: 27.99,
    description: "Rep the brand that's repping you!  For the bartender who stands up to any Karen regardless of the situation.  Stand up for yourself and your fellow bartender by pointing out Karen's social failures in such an embarrassing way that they are silenced before the thought of asking for a manager hits their signature haircut.",
    humor: "It's my logo!  But It's Your Logo too",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/pournogravy-og-tee-the-official-uniform-for-bartender-legends-0.png",
    images: [
      "/products/pournogravy-og-tee-the-official-uniform-for-bartender-legends-0.png",
      "/products/pournogravy-og-tee-the-official-uniform-for-bartender-legends-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/pournogravy-og-tee-the-official-uniform-for-bartender-legends-0.png",
          "/products/pournogravy-og-tee-the-official-uniform-for-bartender-legends-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "Play Psychological Games for Better Credit Card Tips!",
        "Keep a few signed credit card slips with good tips displayed on your bar top.  When presenting someone with their slip, place it in between a couple of the signed slips so that they’re in the peripheral of the guest.  As if being subliminally peer pressured, they will be encouraged to leave a tip because everyone else seems to be doing the same on their slips.   Sometimes people need to see or be reminded of the social norms in order to follow suit.  I think you’ll find that you now have a lot less blank credit card slips to close out at the end of the night.",
      ],
      title: "Bad Bartender Advice:",
    },
    featured: true,
  },
  {
    id: "last-call-for-karen-tee",
    published: true,
    name: "Last Call for Karen",
    price: 27.99,
    description: "This design signifies that you are part of the movement to end the Post-Pandemic Karen Entitlement Act.  Sporting this shirt behind the bar is a subtle invitation to your arch nemesis to climb down from their self-declared entitlement ladder and join the rest of the normals.",
    humor: "Time to Put Karen in the Corner and Have Her Think About What She Said.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/last-call-for-karen-tee-0.png",
    images: [
      "/products/last-call-for-karen-tee-0.png",
      "/products/last-call-for-karen-tee-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/last-call-for-karen-tee-0.png",
          "/products/last-call-for-karen-tee-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "Caution: Do not pet the fruit!  Bartender will bite!",
        "Question: How do you stop someone from putting their dirty nub-knuckles deep inside your fruit garnish tray in an attempt to dig out a cherry or olive for a quick snack?",
        "Answer: Offer them some more.  Grab as many cherries and olives as you can with your hand, put them in a cup and offer it to them.   Then ask them if they know that some bartenders don’t wash their hands after they pee.  Next, grab another cherry from the tray, pop it in your mouth and suckle your fingers as loud as you can.  Remember to tell them to enjoy their meal as they walk away with a lesson learned and a look of disgust.  And always clean out your tray, restock your fruit, and wash your hands.  Or don’t.  Who am I to judge.",
      ],
      title: "Bad Bartending Advice:",
    },
    featured: true,
  },
  {
    id: "service-bartender-do-not-approach-tee",
    published: true,
    name: "Service Bartender, Do Not Approach",
    price: 27.99,
    description: "For bartenders running service bar — dedicated cocktail makers for the wait staff. No small talk. No phone charging. No Pina Coladas (blender's broken).",
    humor: "Excuse me?!  Can I Order From You?!",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/service-bartender-do-not-approach-tee-0.png",
    images: [
      "/products/service-bartender-do-not-approach-tee-0.png",
      "/products/service-bartender-do-not-approach-tee-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/service-bartender-do-not-approach-tee-0.png",
          "/products/service-bartender-do-not-approach-tee-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "Service Bartender:  A dedicated bartender tasked with mixing cocktails for the entire wait staff.  This bartender is quick, has a serious workflow, and is not available to the public.  Why would one want this position as opposed to working with the public?  Because they're over it and need a mental break. It's the perfect position for someone who loves the work but hates the noise.  And if they do have a minute to breathe after a rush, it's to be used to reset their bar top and not to be hassled by someone trying to skip the line.",
        "Hey service bartenders!! Have you ever had a drink sent back to you because the guest thought it was made incorrectly?  So, you stick your finger in it, swirl it around and send it back out to the guest as is?  Yeah, me neither.",
        "In memory of Cricket, my soul pup.",
        "Dude: Can you charge my phone for me?",
        "Opie: No.",
        "Dude: You don’t have an outlet back there?",
        "Opie: I do, but it’s for the blender.",
        "Dude: Oh.",
        "Opie: You want a Pina Colada?",
        "Dude: No, I’m good.",
        "Opie: Good.  Blenders broken.",
      ],
      title: "New Phone. Who's this?",
    },
    featured: true,
  },
  {
    id: "atheist-tee",
    name: "You Cannot Be an Atheist if You Believe in Bartenders",
    price: 27.99,
    description: "They come in and confuse us for a higher power.  What they don't realize yet is that we are going hold all confessions over their head for a larger tip.",
    humor: "I'll Have a Sin and Tonic Please.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/atheist-tee-0.png",
    images: [
      "/products/atheist-tee-0.png",
      "/products/atheist-tee-1.png",
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/atheist-tee-0.png",
          "/products/atheist-tee-1.png",
        ],
      },
    ],
    longDescription: [
      "Inspired by the loss of my first swag t-shirt from a Finlandia Vodka sponsored event with the tag line “Bartenders Are Gods!”  I was never able to find a replacement, but I gained an idea for a t-shirt brand.",
    ],
    badAdvice: {
      paragraphs: [
        "Lady: I'll tip you $5 If you smile.",
        "Opie: Make it $10 and I'll give you paw.",
      ],
      title: "Hi, My Name is Opie and I'll Be Your Bartender:",
    },
    featured: true,
  },
  {
    id: "atheist-with-text-only",
    name: "You Cannot Be an Atheist if You Believe in Bartenders",
    price: 27.99,
    description: "Prefer your divinity without the imagery?  Same message, cleaner design.  Still holds all your confessions over your head until you tip accordingly.",
    humor: "I'll Have a Sin and Tonic Please.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/atheist-with-text-only-0.png",
    images: [
      "/products/atheist-with-text-only-0.png",
      "/products/atheist-with-text-only-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/atheist-with-text-only-0.png",
          "/products/atheist-with-text-only-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    longDescription: [
      "Inspired by the loss of my first swag t-shirt from a Finlandia Vodka sponsored event with the tag line “Bartenders Are Gods!”  I was never able to find a replacement, but I gained an idea for a t-shirt brand.",
    ],
    badAdvice: {
      paragraphs: [
        "Lady: I'll tip you $5 If you smile.",
        "Opie: Make it $10 and I'll give you paw.",
      ],
      title: "Hi, My Name is Opie and I'll Be Your Bartender:",
    },
  },
  {
    id: "the-finger-tee",
    published: true,
    name: "The Finger - Male",
    price: 27.99,
    description: "This shirt is for bartenders who put the \"B\" in \"subtle\".  And should continue to do so by yelling \"cheers\" to our favorite Karens and remind them that they're number 1!",
    humor: "Wear It as a Badge of Honor",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/the-finger-tee-0.png",
    images: [
      "/products/the-finger-tee-0.png",
      "/products/the-finger-tee-1.png",
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
        images: [
          "/products/the-finger-tee-2.png",
          "/products/the-finger-tee-3.png",
        ],
      },
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/the-finger-tee-0.png",
          "/products/the-finger-tee-1.png",
        ],
      },
    ],
    badAdvice: {
      paragraphs: [
        "NEVER SAY THANK YOU WHEN SOMEONE HANDS YOU A TIP.",
        "ALWAYS LEAVE THEM THINKING THEY COULD HAVE DONE BETTER.",
        "Obviously, we are grateful for any monetary gratitude that is sent our way, but by not acknowledging a tip will trigger patrons into questioning themselves, leaving them eager to come back and prove to you that they're not cheap.  This creates a great and easy way to gain a new regular and a larger income.",
      ],
      title: "Bad Bartending Advice:",
    },
    featured: true,
  },
  {
    id: "pourn-hand-tee",
    name: "Pourn Hand",
    price: 27.99,
    description: "This is for the bartender who is stuck under a manager that has never tend bar before and doesn't have the know how to count your pours.  This is also for the bartender that has experienced management but doesn't give a damn if they get caught taking care of their high tipping regular regardless of the risk is.  This is for the bartender who pours in a little love.",
    humor: "Heavy Is the Tip That Pours the Booze!",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/pourn-hand-tee-0.png",
    images: [
      "/products/pourn-hand-tee-0.png",
      "/products/pourn-hand-tee-1.png",
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/pourn-hand-tee-0.png",
          "/products/pourn-hand-tee-1.png",
        ],
      },
    ],
    longDescription: [
      "However, please move on if you are one of those naive bartenders who continue to fall for the guy that says \"Hey!  I'll hook you up if you hook me up!\"  Make them prove.  Don't be scared to ask them ahead of time what \"hooking up\" means to them.  Then decide if it's worth your time or gamble.  We all know anyone that say this is trying to get more and pay less.  PAY LESS!  Meaning they are cheap.  And a cheap guest normally doesn't tip well.  A good tip to them is a subpar tip for us.  Why do some of you still gamble with the awful odds and fall for it each and every time?!  Suckers!",
      "\"I'll give you $5.00!!\"",
      "\"Great, now I can go get fired, take the $5.00 and buy myself a \"deal of the day\" 6 inch Subway sandwich that will hopefully last me though my unemployment as I look for another job.\"",
      "If you're willing to risk getting caught, they better make it worth it!",
    ],
    badAdvice: {
      paragraphs: [
        "What to do when she confuses their bra for a wallet.  It’s a supportive undergarment!  Not a treasure \"chest!\"",
        "Beginner: Her pull out game is strong.  Show her that yours is stronger.  Keep a pen on the inside of your waistband near your plumber’s smile.  Also, keep a damp dollar bill inside the side of your sock.  If they reach into their shirt and present you with a slippery sweaty card, hand them back the credit card slip and reveal the butt pen.  If they reach in and grab moist cash, grab the damp dollar from your sock for change.  If they complain about how gross that is, remind them where they took their payment from.",
        "Advanced: Make it rain.  Reach into your tip bucket and hand her four quarters.  When asked why, tell her it’s her tip for the show.",
        "Pro level: Act as if you might have a sign in your front yard and someone locked in your basement.  Hold credit card under your nose.  Make a loud sniffing noise while moving the card back and forth and side to side.  Keep straight faced.  Hold eye contact.",
        "Game Over: Retreat!  If they reach in and grab some change, look back in disgust and walk away.  We can’t win ever battle.",
      ],
      title: "Bad Bartender Advice:",
    },
    featured: true,
  },
  {
    id: "second-most-fun-job-tee",
    name: "Second Most Fun Job in the World",
    price: 27.99,
    description: "Which of history's oldest professions is better? It might be a 'trick' question. There are a lot of similarities, just different outcomes.",
    humor: "If you don't get it, then this design is not for you.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/second-most-fun-job-tee-0.png",
    images: [
      "/products/second-most-fun-job-tee-0.png",
      "/products/second-most-fun-job-tee-1.png",
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/second-most-fun-job-tee-0.png",
          "/products/second-most-fun-job-tee-1.png",
        ],
      },
    ],
    longDescription: [
      "\"Thank you, come again.\" will cost you double, but one is a lot cheaper, and if it's not, you should probably rethink this moment!",
      "Getting caught after too much can land everyone in front of a judge.",
      "\"Can I get another?  This one must have a hole in it.\": One will get you an eye roll, the other will get you beat up and probably a divorce.",
      "Only the \"E\" separates a barback from bare back.",
      "Remember to always where a glove when prepping the fruit.",
      "At least if their order accidentally has a hair in it, they can return it to the bar.",
    ],
    badAdvice: {
      paragraphs: [
        "If they’re cheap?  Be Petty!",
        "They didn't leave a tip on the credit card slip?!  Let's remedy this.",
        "Sometimes, fighting for that dollar tip isn’t just a battle for your bank account, it’s also a fight for a small piece of pride.  Sometimes the win is more valuable than the amount they leave.  And if you still lose the battle, there are ways to leave the war in a tie.  They might not have left you a dollar, but we can still kick them in the feels before they walk off.",
        "If they leave the tip line and total blank:",
        "“Excuse me?!  Would you mind filling this in for me?  You’re not supposed to leave it blank.”   If they ask why, it’s to protect them against fraud and It could also prevent a shady bartender (wink at them) from taking matters into their own hands by filling in the amount themselves.  Personally, I think we should normalize this tactic.  One might even think that we are looking out for them and should appreciate the teaching moment.",
        "Result: They just got caught with their empty pockets and a bit embarrassed.  They return to the scene of the crime and stare at the credit card slip with pen in hand.   Make sure to hover over them so that they feel your judgement and presence.  They will either add a little love on the tip line or put a “0” or slash.  If we win, don’t expect much from this cheap prick.  Remember, we’re only using this to give our ego a little stroke.  But if we lose this round, we stay in the batter’s box and keep going.",
        "Next Step:",
        "If they draw a slash, instruct that they need to redo it and put in a zero.  Slashes are not considered to have a numbered value, and our accounting department is trying to crack down on it.  Here you are taking away any comfortability they had left by lengthening the transaction while they stand cheap in front of you.  It also hurts their pride a tad if their friends are dialed in, trying to see what is going on.  Chances are that they will want to save face this time and write in a small tip.",
        "If they double down and then put a “0”, instruct them to spell out the word “zero” when leaving a zero-dollar tip.  When they ask why, tell them that it stops a shady bartender (wink again) from placing a “1” in front of the “0” and making it a $10 tip.  It is also designed to make you feel the value of zero in each of the four letters that you write out.  At this point, if they still don’t rethink the tip, it’s okay.  They’re walking away, not feeling very good about themselves.  Not only did you backhandedly call them cheap a number of times, you made them feel it too.  They probably will avoid you and look for another bartender the next time they need a beverage.  And now you can focus on the guests that do appreciate your skills and service and are helping you pay your bills.",
        "And for those who will say that I am spending way too much time on this and should have just moved on to serve someone else: Shut your hole!  This could be the transaction that sets my mood and expectations for the rest of my shift!  This is the victory that I needed!",
      ],
      title: "BAD BARTENDER ADVICE:",
    },
  },
  {
    id: "introverted-bartender-tee",
    name: "Introverted Bartender",
    price: 27.99,
    description: "This design is for the bartender that loves the job but hates the public.",
    humor: "Jekyll and Hyde",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/introverted-bartender-tee-0.jpg",
    images: [
      "/products/introverted-bartender-tee-0.jpg",
      "/products/introverted-bartender-tee-1.png",
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/introverted-bartender-tee-0.jpg",
          "/products/introverted-bartender-tee-1.png",
        ],
      },
    ],
    longDescription: [
      "This design is for the bartender that loves the job but hates the public.  It's for the tired, the mentally and emotionally disengaged, and the ones who are exhausted of the post-covid entitlement that has lingered for years way too long.  this is for the many of us that loves the spotlight behind the bar, only to shy away from it when anywhere else.  It's for the ones that love the movements, the creativity, and sarcastic banter, but hate the faces.",
      "\"Oh…but this is the hospitality industry and the guest comes first.  If you're not people person you should probably try and find another line of work!\"",
      "Shut up you Pretentious Sub that still believes in a post covid world in which hospitality comes first no matter how difficult the guest!  You need to shut your mouth, put on a zippered gimp suit and go be a sub somewhere else!",
      "The customer is always right.  Just not right in the head",
    ],
    badAdvice: {
      paragraphs: [
        "How to get the holidays off:",
        "Tell your boss at bar 1 that you're already scheduled at bar 2.  Tell your boss at bar 2 that you're scheduled at bar 1.  Bonus: Tell your family that you're working.  Spend the day off on the couch with your dogs.",
        "\"But I only work at 1 bar!?\"",
        "Cool.  Your employer doesn't need to know that.  It's always a good idea to let them think that you have a 2nd job in your back pocket even if you don't.  Makes it easier to force your manager's hand when you need a shift off.",
      ],
      title: "BAD BARTENDER ADVICE:",
    },
  },
  {
    id: "legally-fun-tee-text-only",
    name: "Second Most Fun Job in the World",
    price: 27.99,
    description: "Same ancient debate, now in text-only format for those who want the joke without having to explain the graphic.  You know what it means.  They probably do too.",
    humor: "If you don't get it, then this design is not for you.",
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/legally-fun-tee-text-only-0.png",
    images: [
      "/products/legally-fun-tee-text-only-0.png",
      "/products/legally-fun-tee-text-only-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/legally-fun-tee-text-only-0.png",
          "/products/legally-fun-tee-text-only-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    longDescription: [
      "\"Thank you, come again.\" will cost you double, but one is a lot cheaper, and if it's not, you should probably rethink this moment!",
      "Getting caught after too much can land everyone in front of a judge.",
      "\"Can I get another?  This one must have a hole in it.\": One will get you an eye roll, the other will get you beat up and probably a divorce.",
      "Only the \"E\" separates a barback from bare back.",
      "Remember to always where a glove when prepping the fruit.",
      "At least if their order accidentally has a hair in it, they can return it to the bar.",
    ],
    badAdvice: {
      paragraphs: [
        "If they're cheap?  Be Petty!",
        "They didn't leave a tip on the credit card slip?!  Let's remedy this.",
        "Sometimes, fighting for that dollar tip isn't just a battle for your bank account, it's also a fight for a small piece of pride.  Sometimes the win is more valuable than the amount they leave.  And if you still lose the battle, there are ways to leave the war in a tie.  They might not have left you a dollar, but we can still kick them in the feels before they walk off.",
        "If they leave the tip line and total blank:",
        "\"Excuse me?!  Would you mind filling this in for me?  You're not supposed to leave it blank.\"   If they ask why, it's to protect them against fraud and It could also prevent a shady bartender (wink at them) from taking matters into their own hands by filling in the amount themselves.  Personally, I think we should normalize this tactic.  One might even think that we are looking out for them and should appreciate the teaching moment.",
        "Result: They just got caught with their empty pockets and a bit embarrassed.  They return to the scene of the crime and stare at the credit card slip with pen in hand.   Make sure to hover over them so that they feel your judgement and presence.  They will either add a little love on the tip line or put a \"0\" or slash.  If we win, don't expect much from this cheap prick.  Remember, we're only using this to give our ego a little stroke.  But if we lose this round, we stay in the batter's box and keep going.",
        "Next Step:",
        "If they draw a slash, instruct that they need to redo it and put in a zero.  Slashes are not considered to have a numbered value, and our accounting department is trying to crack down on it.  Here you are taking away any comfortability they had left by lengthening the transaction while they stand cheap in front of you.  It also hurts their pride a tad if their friends are dialed in, trying to see what is going on.  Chances are that they will want to save face this time and write in a small tip.",
        "If they double down and then put a \"0\", instruct them to spell out the word \"zero\" when leaving a zero-dollar tip.  When they ask why, tell them that it stops a shady bartender (wink again) from placing a \"1\" in front of the \"0\" and making it a $10 tip.  It is also designed to make you feel the value of zero in each of the four letters that you write out.  At this point, if they still don't rethink the tip, it's okay.  They're walking away, not feeling very good about themselves.  Not only did you backhandedly call them cheap a number of times, you made them feel it too.  They probably will avoid you and look for another bartender the next time they need a beverage.  And now you can focus on the guests that do appreciate your skills and service and are helping you pay your bills.",
        "And for those who will say that I am spending way too much time on this and should have just moved on to serve someone else: Shut your hole!  This could be the transaction that sets my mood and expectations for the rest of my shift!  This is the victory that I needed!",
      ],
      title: "BAD BARTENDER ADVICE:",
    },
  },
  {
    id: "tip-your-therapist-tee",
    name: "Tip Your Therapist",
    price: 27.99,
    description: "Let's remind the ones that keep yapping our ears off that although results may vary, they can either pay someone $90/hour, or they can purchase an adult beverage and leave a good tip for a lot less.  If they want our attention, make them pay for it...otherwise tell them that they didn't pay you enough to stand there and listen.",
    humor: "Tipping Is Cheaper Than the Cost of Therapy!",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/tip-your-therapist-tee-0.png",
    images: [
      "/products/tip-your-therapist-tee-0.png",
      "/products/tip-your-therapist-tee-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/tip-your-therapist-tee-0.png",
          "/products/tip-your-therapist-tee-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    longDescription: [
      "\"I lost my job today.\"",
      "\"It's okay buddy.  When one door closes, a better one opens.\"",
      "\"My husband is filing for divorce.  Now what am I going to do?!\"",
      "\"Oh, stop it.  You will be fine.  One man's trash is another man's treasure.\"",
      "In truth, bartenders really do love listening to all of your problems.  Not because we want to get to know you better, but because knowing that we are not you will make us feel better about ourselves.",
      "In memory of my first senior rescue pup, Dookie.",
    ],
    badAdvice: {
      paragraphs: [
        "Lady: Excuse me!  Do you have another pen.  This one is broken.",
        "Opie: Push the button!",
        "Dude: Can I get a frozen strawberry margarita?",
        "Opie: Sorry.  Blenders broken.",
        "Dude: Again?  Why is it always broken every time I come here?",
        "Opie: You know the soft serve ice cream machine that they have at McDonald's?",
        "Dude: Yeah?",
        "Opie: Same repair guy.",
      ],
      title: "My name is Opie and I will be your bartender:",
    },
  },
  {
    id: "strn-drink-tee-text-and-image",
    name: "Your Next Drink is Only as Strong as Your Last Tip",
    price: 27.99,
    description: "Excuse me!  I don't taste any alcohol in my drink!",
    humor: "Wear This Shirt as a Teaching Moment",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/strn-drink-tee-text-and-image-0.png",
    images: [
      "/products/strn-drink-tee-text-and-image-0.png",
      "/products/strn-drink-tee-text-and-image-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/strn-drink-tee-text-and-image-0.png",
          "/products/strn-drink-tee-text-and-image-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    longDescription: [
      "\"Well, that's funny.  I don't see any love in my tip bucket.\"",
      "Remind your customers that their drink is directly proportional to their generosity.",
    ],
    badAdvice: {
      paragraphs: [
        "Dude: Can I have a Mich Ultra?",
        "Opie: Here you go.",
        "Dude: Let me also have a Sam Adams draft.",
        "Opie rolls eyes.",
        "Opie: Sure...here you go.",
        "Dude: And a bottle of water?",
        "Opie: Anything else before I get this? (frustration in his tone)",
        "Dude: Nope.  That's it.",
        "Opie: $7.50 please.",
        "Dude pays and turns to leave.",
        "Opie: $7.50 please.",
        "Dude turns back, confused.",
        "Dude: I just paid you.",
        "Opie: No, you paid for this draft. The other beer is $7.50 and the bottle of water is $2.50.",
        "Dude: Why didn't you give it to me all at once?",
        "Opie: Why didn't you give it to me all at once?",
        "Dude has a blank stare and says nothing.",
        "Opie: Good teaching moment?",
      ],
      title: "My name is Opie and I will be your bartender:",
    },
  },
  {
    id: "well-it-ain-t-gonna-lick-itself-tee",
    published: true,
    name: "Well, It Ain't Gonna Lick Itself",
    price: 27.99,
    description: "Also, if you're one of those freaks that add a splash of OJ to your margarita, you're diabolical and need to go back to work for a TGI Fridays.  Stop being so salty and stubborn and make the drink correctly.  This is not the hill that you should want to die on.  I said what I said!  Oh, and one more thing!  Tell your friends to buy this shirt for Cinco de Mayo! Thanks!",
    humor: "Make Sure to Wash and Wipe your Glass Before Rimming.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/well-it-ain-t-gonna-lick-itself-tee-0.png",
    images: [
      "/products/well-it-ain-t-gonna-lick-itself-tee-0.png",
      "/products/well-it-ain-t-gonna-lick-itself-tee-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/well-it-ain-t-gonna-lick-itself-tee-0.png",
          "/products/well-it-ain-t-gonna-lick-itself-tee-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "How to tell an annoyance to STFU!!",
        "\"Hey, would you mind lowering you voice?  Some people are starting to complain.\"",
        "or",
        "\"Hey, would you mind changing the subject?  Some people are starting to complain.\"",
        "These are great ways to tell somebody that they are obnoxious without putting the blame on yourself.  Now, you're not the one complaining.  They think the complaint is coming from others sitting nearby.  You're just the bartender pretending to politely lower the temperature of the room.  The best part is the look on their face as they come to the realization, they are unintentionally becoming the room's social nuisance.  It's a priceless look of embarrassment and a feeling of a fish out of water.",
        "This is a great way of telling a Chad/Karen that they suck.  And now they need to make it right within themselves by proving to you that they belong here.  Imagine getting a large tip after subtly telling someone they are garbage.  And it's more than okay if they don't leave you anything.  Sometimes the look on their face is our tip.",
      ],
      title: "Bad Bartender Advice:",
    },
  },
  {
    id: "tea-toes-and-vodka-please-tee",
    name: "Tea, Toes, and Vodka Please",
    price: 27.99,
    description: "It might not be three of your favorite things, but when united, it becomes one of the most ordered cocktails at any bar.  Let us celebrate this popular libation and raise its awareness with this shirt.",
    humor: "Because Two Vodkas Are Better Than One!",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/tea-toes-and-vodka-please-tee-0.png",
    images: [
      "/products/tea-toes-and-vodka-please-tee-0.png",
      "/products/tea-toes-and-vodka-please-tee-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/tea-toes-and-vodka-please-tee-0.png",
          "/products/tea-toes-and-vodka-please-tee-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "Make Them Feel like They're VIPs",
        "When a patron walks up to you after patiently waiting for their turn to order, ask them if they are a member.  After allowing a little time for the confusion to set onto their face, apologize and let them know that they have been standing in the members only line.  As they turn around and leave to find another bartender, stop them and ask again \"Hey guys!  Are you a member?\" Nod your head and wink.  They will think you're doing them a huge solid and say yes.  And since they now think that you are saving them from another wait, they will most likely leave you a little extra love.  Wait until they start signing that credit card slip to hammer home how happy you are to help save them some time.",
      ],
      title: "BAD BARTENDER ADVICE:",
    },
  },
  {
    id: "dear-karen-you-stink-tee",
    name: "Dear Karen, You Stink",
    price: 27.99,
    description: "Yes, I know it's immature.  But it's also hilarious, so you're welcome!  Even my designer tried talking me out of this while crying from laughter.  I even compromised and placed the design on the back of the shirt so that you can have a normal conversation with someone without them shaking their head at you.   Buy this as a gift for your fellow bartender or give it to your favorite Karen, but please have some self-respect and do not buy it for yourself!",
    humor: "The Shocker!",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/dear-karen-you-stink-tee-0.png",
    images: [
      "/products/dear-karen-you-stink-tee-0.png",
      "/products/dear-karen-you-stink-tee-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/dear-karen-you-stink-tee-0.png",
          "/products/dear-karen-you-stink-tee-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "HEY LADIES!  DON'T EVER WASH YOUR SOCKS AGAIN!",
        "This industry is a doorway into great side hustles.  Did you know that there is a guy in every city that will buy your dirty socks and underwear for hundreds of dollars on Craigslist?  You can find him under the \"Jobs/Hospitality\" category.  Search under the keyword \"bartender.\"  The posting is usually titled something like \"Dirty socks wanted.  Will pay $$$.\"  Don't worry.  He doesn't want to meet in person.  The last thing he wants to do is put a face to the foot.",
        "Also, do not tell him where you work. Not only as a safety concern, but also as a precautionary measure to hold on to your share of the market. You don't want him to come in and look at your coworkers as your competition.",
        "At the end of the day, a $4.00 bag of socks and a little shift sweat can potentially bring you riches.  Unfortunately for me, my feet are nasty, so I have to resort to selling these stupid t-shirts.",
      ],
      title: "BAD BARTENDER ADVICE:",
    },
  },
  {
    id: "i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-text-only",
    name: "My Real Job (Text Only)",
    price: 27.99,
    description: "Yes, I know the description below says the same thing as the other shirt with the same message, but some people don't like the graphic/design of the other one.  And since I need to make as much money as I can off of all of you, I am trying to appease those who want the graphic and those who don't.  And yes, I am being lazy by copy/pasting the description below from the shirt with the graphic, but some people might have skipped over the it since they would rather have this design over the other.  Plus, its hard coming up with these BS descriptions for 20+ designs.  So, give me a break, stop being so judgmental, pick which version you want, give me your money and leave me alone.",
    humor: "This Is My Real Job T-shirt",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-text-only-0.png",
    images: [
      "/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-text-only-0.png",
      "/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-text-only-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-text-only-0.png",
          "/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-text-only-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    longDescription: [
      "Be a little empathetic when the Karens question your career choice. They come from a place of work envy.   Remember, Karen must work 9-5 for 40 years of her life so that she can spend her last 20 years striving for the lifestyle that we have been living our whole career; having afternoons off, eating good food, and enjoying a few adult beverages on the porch or at our favorite bar.",
      "She's just a bit jealous that we are able to pay our bills, save for our future, and live a life without the 6am alarm clock and a rush hour commute.  Now go remind them of that with this T-shirt!",
      "Perfect for any bartender who's done explaining themselves.",
    ],
    badAdvice: {
      paragraphs: [
        "HOW TO EMBARASS THE KAREN THAT INSISTS YOU GET A REAL JOB:",
        "1. Look at them and politely smirk.  But say nothing.",
        "2. Take their card as payment when it's time to cash them out.",
        "3. Insert card into card reader…backwards.",
        "4. After what looks like two failed attempts, politely smirk again and tell Karen that their card is not working.  But say it loud enough for others to hear.",
        "5. Wait for Karen to compose herself, tell you this is impossible, and demand that you try again.",
        "6. Look at them and politely smirk.  But say nothing",
        "7. Insert card backwards into credit card reader again.  Remember to stay out of Karens sight.  You need to sell this as if you are going through the motions.",
        "8. After another failed attempt, politely smirk and let them know that it's still not working.  Ask if they have an alternative method of payment.  Reminder during this step to be loud enough for those invested in the situation to hear.",
        "9. Watch Karen get mad and embarrassed as people in proximity are side eyeing the person that told you to get a real job but is unable to pay their bill.",
        "10. Relish in this moment by letting them know that your card always works when you go out, and that maybe they wouldn't have this problem if they too got a real job.",
        "Bonus:  If they ask to use their cell phone for payment, tap the phone to the credit card reader, then look into the phone, politely smirk and take a selfie for them to remember you by.  Give it back but say nothing.",
      ],
      title: "BAD BARTENDER ADVICE:",
    },
  },
  {
    id: "i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee",
    name: "My Real Job",
    price: 27.99,
    description: "Be a little empathetic when the Karens question your career choice. They come from a place of work envy.   Remember, Karen must work 9-5 for 40 years of her life so that she can spend her last 20 years striving for the lifestyle that we have been living our whole career; having afternoons off, eating good food, and enjoying a few adult beverages on the porch or at our favorite bar.",
    humor: "This Is My Real Job T-shirt",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-0.png",
    images: [
      "/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-0.png",
      "/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-0.png",
          "/products/i-bought-this-real-shirt-with-my-real-money-from-my-real-job-tee-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    longDescription: [
      "She's just a bit jealous that we are able to pay our bills, save for our future, and live a life without the 6am alarm clock and a rush hour commute.  Now go remind them of that with this T-shirt!",
      "Perfect for any bartender who's done explaining themselves.",
    ],
    badAdvice: {
      paragraphs: [
        "HOW TO EMBARASS THE KAREN THAT INSISTS YOU GET A REAL JOB:",
        "1. Look at them and politely smirk.  But say nothing.",
        "2. Take their card as payment when it's time to cash them out.",
        "3. Insert card into card reader…backwards.",
        "4. After what looks like two failed attempts, politely smirk again and tell Karen that their card is not working.  But say it loud enough for others to hear.",
        "5. Wait for Karen to compose herself, tell you this is impossible, and demand that you try again.",
        "6. Look at them and politely smirk.  But say nothing",
        "7. Insert card backwards into credit card reader again.  Remember to stay out of Karens sight.  You need to sell this as if you are going through the motions.",
        "8. After another failed attempt, politely smirk and let them know that it's still not working.  Ask if they have an alternative method of payment.  Reminder during this step to be loud enough for those invested in the situation to hear.",
        "9. Watch Karen get mad and embarrassed as people in proximity are side eyeing the person that told you to get a real job but is unable to pay their bill.",
        "10. Relish in this moment by letting them know that your card always works when you go out, and that maybe they wouldn't have this problem if they too got a real job.",
        "Bonus:  If they ask to use their cell phone for payment, tap the phone to the credit card reader, then look into the phone, politely smirk and take a selfie for them to remember you by.  Give it back but say nothing.",
      ],
      title: "BAD BARTENDER ADVICE:",
    },
  },
  {
    id: "your-next-drink-is-only-as-strong-as-your-last-tip-tee",
    name: "Your Next Drink is Only as Strong as Your Last Tip (Text)",
    price: 27.99,
    description: "No graphic, just the message.  Sometimes the words alone say everything.  And if your last tip was weak, so is this drink.  You've been warned.",
    humor: "Wear This Shirt as a Teaching Moment",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/your-next-drink-is-only-as-strong-as-your-last-tip-tee-0.png",
    images: [
      "/products/your-next-drink-is-only-as-strong-as-your-last-tip-tee-0.png",
      "/products/your-next-drink-is-only-as-strong-as-your-last-tip-tee-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/your-next-drink-is-only-as-strong-as-your-last-tip-tee-0.png",
          "/products/your-next-drink-is-only-as-strong-as-your-last-tip-tee-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    longDescription: [
      "\"Well, that's funny.  I don't see any love in my tip bucket.\"",
      "Remind your customers that their drink is directly proportional to their generosity.",
    ],
    badAdvice: {
      paragraphs: [
        "Dude: Can I have a Mich Ultra?",
        "Opie: Here you go.",
        "Dude: Let me also have a Sam Adams draft.",
        "Opie rolls eyes.",
        "Opie: Sure...here you go.",
        "Dude: And a bottle of water?",
        "Opie: Anything else before I get this? (frustration in his tone)",
        "Dude: Nope.  That's it.",
        "Opie: $7.50 please.",
        "Dude pays and turns to leave.",
        "Opie: $7.50 please.",
        "Dude turns back, confused.",
        "Dude: I just paid you.",
        "Opie: No, you paid for this draft. The other beer is $7.50 and the bottle of water is $2.50.",
        "Dude: Why didn't you give it to me all at once?",
        "Opie: Why didn't you give it to me all at once?",
        "Dude has a blank stare and says nothing.",
        "Opie: Good teaching moment?",
      ],
      title: "My name is Opie and I will be your bartender:",
    },
  },
  {
    id: "do-you-like-it-in-a-glass-or-do-you-take-it-in-the-can-tee",
    name: "Do You Like It in a Glass? Or Do You Take It in the Can?",
    price: 27.99,
    description: "I always smirk and ask this every time I serve a hard seltzer.  And the side eyed laughs that I receive are worth the price of the shirt.  Dirty!!",
    humor: "How Do You Take It?",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/do-you-like-it-in-a-glass-or-do-you-take-it-in-the-can-tee-0.png",
    images: [
      "/products/do-you-like-it-in-a-glass-or-do-you-take-it-in-the-can-tee-0.png",
      "/products/do-you-like-it-in-a-glass-or-do-you-take-it-in-the-can-tee-1.jpg",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/do-you-like-it-in-a-glass-or-do-you-take-it-in-the-can-tee-0.png",
          "/products/do-you-like-it-in-a-glass-or-do-you-take-it-in-the-can-tee-1.jpg",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "YOUR BLENDER IS NO LONGER BROKEN!!!!",
        "Hey bartenders!  We are starting to sound like every fast-food establishment that has an ice cream machine.  Customers are finally catching on, seeing right through us, and sometimes even calling us out to the boss.  Stop!!  It's time for a change.  Instead, just put the blender in the dishwasher and keep it there.  Now you can tell anyone who orders a frozen cocktail that the blender is being cleaned, and it will be about 15 minutes.  No one in their right mind will want to wait that long for a Miami Vice.  Also, you don't risk them complaining to your boss about the forever broken blender.  If your manager asks where it is, point to the dishwasher.  They will think that you are not only using it, but you're also making sure it stays clean to avoid any cross contamination.  Zero complaints = Zero questions = Zero frozen drinks!",
        "Does not apply to those who have a 3-sink system or an Island Oasis machine.",
      ],
      title: "BAD BARTENDER ADVICE:",
    },
  },
  {
    id: "f-off-karen",
    name: "F Off Karen",
    price: 27.99,
    description: "A politically correct way of waving hello to your favorite Karen.  She will love it!",
    humor: "Anti-Karen T-shirt",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/f-off-karen-0.png",
    images: [
      "/products/f-off-karen-0.png",
      "/products/f-off-karen-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/f-off-karen-0.png",
          "/products/f-off-karen-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "Most experienced bartenders will advise you not to sleep with your patrons.  I however disrespectfully disagree (HEY! That's a Double negative!  STFU!).  Take advantage of the one of the greatest benefits of being a bartender and Smash! Smash! Smash!  However, please remember to evaluate before you fornicate!  You do not want to hurt your income or the income of your fellow coworkers.  You can easily run the risk of losing a great bar regular to an awkward extra-curricular encounter, therefore, only sleep with really bad tippers.  And remember, the more awkward you make it after (or during.  Make it weird.), the less likely they come back and take up valuable real estate on one of your bar stools during a busy shift.   So now you might want to think twice about the person who leaves their number on the tip line of the credit card slip.   No standards gained, but no income lost.",
      ],
      title: "BAD BARTENDER ADVICE:",
    },
  },
  {
    id: "cow-tipping",
    name: "Cow Tipping",
    price: 27.99,
    description: "This design will remind your guests that you are an udderly amazing bartender, and that they should be throwing money at you just for being in your presence!  Now get out there and milk all the tips out of them Karens!",
    humor: "Cow Tipping T-shirt:",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    image: "/products/cow-tipping-0.png",
    images: [
      "/products/cow-tipping-0.png",
      "/products/cow-tipping-1.png",
    ],
    variants: [
      {
        id: "unisex",
        label: "Unisex",
        images: [
          "/products/cow-tipping-0.png",
          "/products/cow-tipping-1.png",
        ],
      },
    ],
    colors: [
      {
        id: "black",
        label: "Black",
        hex: "#0a0a0a",
      },
      {
        id: "white",
        label: "White",
        hex: "#ffffff",
      },
    ],
    badAdvice: {
      paragraphs: [
        "TAKE ADVANTAGE OF YOUR FRIENDS BEFORE THEY TAKE ADVANTAGE OF YOU!",
        "Do not put your job at risk when your friends come to the bar and expect to be hooked up.  Instead capitalize on this commonly missed opportunity.",
        "Repeat the following:  \"Hey guys, I can't hook you up because I'll get in trouble.  Instead, just don't tip me.  This way I save you $30 or 40 and I get to have a better time at work with my friends here.\"",
        "When it's time to pay their bill and discuss who owes what, someone is going to suggest that they can't just leave you nothing.  And when all is said and done, chances are that they will agree to leave what you subliminally put into their heads…$30 to $40.  Be the bad friend first.",
      ],
      title: "BAD BARTENDER ADVICE:",
    },
  },
];

export const collections = [
  { id: "salty-bartender", name: "Salty Bartender", emoji: "\uD83D\uDD25", description: "The aggressive, blunt humor shirts. For bartenders who've stopped pretending to be nice." },
  { id: "industry-truths", name: "Industry Truths", emoji: "\uD83C\uDF78", description: "Relatable bartender sayings that hit different after a Friday close." },
  { id: "customer-horror", name: "Customer Horror Stories", emoji: "\u2620\uFE0F", description: "Focused on the chaos of dealing with guests. Especially the Karens." },
];

export const quotes = [
  "Offend a Karen without having to open your mouth.",
  "I'm not arguing. I'm explaining why I'm right and you're ordering wrong.",
  "Show fellow bartenders you're one of them — no verbal announcement required.",
  "Your cocktail takes 3 minutes. Your complaint takes my will to live.",
  "Call out the general public on certain undesirable behaviors.",
  "I've cut off better people than you.",
  "Receive looks of disgust from pretentious bartenders who still think the customer is always right. (They're guests. GUESTS. Oh, shut up.)",
  "I don't have a drinking problem. I have a customer problem.",
  "Yes, the music is loud. That's because I don't want to hear you.",
  "My face says 'welcome.' My eyes say 'don't test me.'",
];

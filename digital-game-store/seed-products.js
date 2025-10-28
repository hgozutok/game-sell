const axios = require("axios");

const products = [
  {
    title: "Grand Theft Auto V Premium Edition",
    handle: "grand-theft-auto-v-premium-edition-steam",
    description: "Experience Rockstar Games' critically acclaimed open world game, Grand Theft Auto V. When a young street hustler, a retired bank robber and a terrifying psychopath land themselves in trouble, they must pull off a series of dangerous heists to survive in a city they can't trust anybody in.",
    status: "published",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg",
    metadata: {
      platform: "Steam",
      region: "Global",
      genre: "Action",
      featured: true,
      bestseller: true
    },
    variants: [{
      title: "Default",
      prices: [{ amount: 2999, currency_code: "usd" }],
      manage_inventory: false,
    }]
  },
  {
    title: "Cyberpunk 2077",
    handle: "cyberpunk-2077-gog",
    description: "Cyberpunk 2077 is an open-world, action-adventure RPG set in the dark future of Night City — a dangerous megalopolis obsessed with power, glamor, and ceaseless body modification.",
    status: "published",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
    metadata: {
      platform: "GOG",
      region: "Global",
      genre: "RPG",
      featured: true
    },
    variants: [{
      title: "Default",
      prices: [{ amount: 5999, currency_code: "usd" }],
      manage_inventory: false,
    }]
  },
  {
    title: "The Witcher 3: Wild Hunt - Game of the Year Edition",
    handle: "witcher-3-wild-hunt-goty-steam",
    description: "Become a professional monster slayer and embark on an adventure of epic proportions! Upon its release, The Witcher 3: Wild Hunt became an instant classic, claiming over 250 Game of the Year awards.",
    status: "published",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg",
    metadata: {
      platform: "Steam",
      region: "Global",
      genre: "RPG",
      bestseller: true
    },
    variants: [{
      title: "Default",
      prices: [{ amount: 3999, currency_code: "usd" }],
      manage_inventory: false,
    }]
  },
  {
    title: "Red Dead Redemption 2",
    handle: "red-dead-redemption-2-rockstar",
    description: "Winner of over 175 Game of the Year Awards and recipient of over 250 perfect scores, RDR2 is the epic tale of outlaw Arthur Morgan and the infamous Van der Linde gang, on the run across America at the dawn of the modern age.",
    status: "published",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg",
    metadata: {
      platform: "Rockstar",
      region: "Global",
      genre: "Action",
      featured: true,
      bestseller: true
    },
    variants: [{
      title: "Default",
      prices: [{ amount: 5999, currency_code: "usd" }],
      manage_inventory: false,
    }]
  },
  {
    title: "Elden Ring",
    handle: "elden-ring-steam",
    description: "THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.",
    status: "published",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
    metadata: {
      platform: "Steam",
      region: "Global",
      genre: "RPG"
    },
    variants: [{
      title: "Default",
      prices: [{ amount: 4999, currency_code: "usd" }],
      manage_inventory: false,
    }]
  },
  {
    title: "Hogwarts Legacy",
    handle: "hogwarts-legacy-steam",
    description: "Hogwarts Legacy is an immersive, open-world action RPG set in the world first introduced in the Harry Potter books. Now you can take control of the action and be at the center of your own adventure in the wizarding world.",
    status: "published",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg",
    metadata: {
      platform: "Steam",
      region: "Global",
      genre: "RPG",
      featured: true
    },
    variants: [{
      title: "Default",
      prices: [{ amount: 5999, currency_code: "usd" }],
      manage_inventory: false,
    }]
  },
  {
    title: "Call of Duty: Modern Warfare III",
    handle: "call-of-duty-modern-warfare-3-steam",
    description: "In the direct sequel to the record-breaking Call of Duty®: Modern Warfare® II, Captain Price and Task Force 141 face off against the ultimate threat.",
    status: "published",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/2519060/header.jpg",
    metadata: {
      platform: "Steam",
      region: "Global",
      genre: "Action",
      bestseller: true
    },
    variants: [{
      title: "Default",
      prices: [{ amount: 6999, currency_code: "usd" }],
      manage_inventory: false,
    }]
  },
  {
    title: "Baldur's Gate 3",
    handle: "baldurs-gate-3-steam",
    description: "Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.",
    status: "published",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg",
    metadata: {
      platform: "Steam",
      region: "Global",
      genre: "RPG",
      featured: true,
      bestseller: true
    },
    variants: [{
      title: "Default",
      prices: [{ amount: 5999, currency_code: "usd" }],
      manage_inventory: false,
    }]
  },
  {
    title: "Counter-Strike 2",
    handle: "counter-strike-2-steam",
    description: "For over two decades, Counter-Strike has offered an elite competitive experience, one shaped by millions of players from across the globe. And now the next chapter in the CS story is about to begin.",
    status: "published",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
    metadata: {
      platform: "Steam",
      region: "Global",
      genre: "Action",
      bestseller: true
    },
    variants: [{
      title: "Default",
      prices: [{ amount: 0, currency_code: "usd" }],
      manage_inventory: false,
    }]
  },
  {
    title: "Starfield Premium Edition",
    handle: "starfield-premium-edition-steam",
    description: "Starfield is the first new universe in 25 years from Bethesda Game Studios, the award-winning creators of The Elder Scrolls V: Skyrim and Fallout 4.",
    status: "published",
    thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg",
    metadata: {
      platform: "Steam",
      region: "Global",
      genre: "RPG",
      featured: true
    },
    variants: [{
      title: "Default",
      prices: [{ amount: 9999, currency_code: "usd" }],
      manage_inventory: false,
    }]
  }
];

async function seedProducts() {
  console.log("🌱 Starting product seeding...\n");

  const API_KEY = "YOUR_ADMIN_API_KEY"; // Will be created after backend starts
  const API_URL = "http://localhost:9000";

  try {
    let successCount = 0;
    
    for (const product of products) {
      try {
        console.log(`Creating: ${product.title}...`);
        
        // Using direct SDK approach for seeding
        const response = await axios.post(
          `${API_URL}/admin/products`,
          product,
          {
            headers: {
              "Content-Type": "application/json",
              // Authorization will be added once backend is running
            }
          }
        );
        
        successCount++;
        console.log(`✅ Created: ${product.title}`);
      } catch (error) {
        console.log(`❌ Failed: ${product.title}`);
        if (error.response) {
          console.log(`   Error: ${error.response.status} - ${error.response.statusText}`);
        }
      }
    }

    console.log(`\n🎉 Seeding complete: ${successCount}/${products.length} products created\n`);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
  }
}

// Export for use as a module or run directly
if (require.main === module) {
  seedProducts();
}

module.exports = { seedProducts, products };


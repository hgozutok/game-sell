import { MedusaContainer } from "@medusajs/framework/types"

export default async function seedProducts(container: MedusaContainer) {
  const logger = container.resolve("logger")
  const productModuleService = container.resolve("product") as any

  logger.info("🌱 Starting product seeding...")

  const products = [
    {
      id: "prod_gta5",
      title: "Grand Theft Auto V Premium Edition",
      handle: "grand-theft-auto-v-premium-edition",
      description: "Experience Rockstar Games critically acclaimed open world game. When a young street hustler, a retired bank robber and a terrifying psychopath land themselves in trouble, they must pull off a series of dangerous heists.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg",
      metadata: {
        platform: "Steam",
        region: "Global",
        genre: "Action",
        featured: true,
        bestseller: true
      }
    },
    {
      id: "prod_cyberpunk",
      title: "Cyberpunk 2077",
      handle: "cyberpunk-2077",
      description: "Cyberpunk 2077 is an open-world, action-adventure RPG set in the dark future of Night City — a dangerous megalopolis obsessed with power, glamor, and ceaseless body modification.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
      metadata: {
        platform: "GOG",
        region: "Global",
        genre: "RPG",
        featured: true
      }
    },
    {
      id: "prod_witcher3",
      title: "The Witcher 3: Wild Hunt GOTY",
      handle: "witcher-3-wild-hunt-goty",
      description: "Become a professional monster slayer and embark on an adventure of epic proportions! The Witcher 3: Wild Hunt became an instant classic, claiming over 250 Game of the Year awards.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg",
      metadata: {
        platform: "Steam",
        region: "Global",
        genre: "RPG",
        bestseller: true
      }
    },
    {
      id: "prod_rdr2",
      title: "Red Dead Redemption 2",
      handle: "red-dead-redemption-2",
      description: "Winner of over 175 Game of the Year Awards. RDR2 is the epic tale of outlaw Arthur Morgan and the infamous Van der Linde gang, on the run across America.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg",
      metadata: {
        platform: "Rockstar",
        region: "Global",
        genre: "Action",
        featured: true,
        bestseller: true
      }
    },
    {
      id: "prod_eldenring",
      title: "Elden Ring",
      handle: "elden-ring",
      description: "THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
      metadata: {
        platform: "Steam",
        region: "Global",
        genre: "RPG"
      }
    },
    {
      id: "prod_hogwarts",
      title: "Hogwarts Legacy",
      handle: "hogwarts-legacy",
      description: "Hogwarts Legacy is an immersive, open-world action RPG set in the world first introduced in the Harry Potter books. Take control of the action in the wizarding world.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg",
      metadata: {
        platform: "Steam",
        region: "Global",
        genre: "RPG",
        featured: true
      }
    },
    {
      id: "prod_codmw3",
      title: "Call of Duty: Modern Warfare III",
      handle: "call-of-duty-modern-warfare-3",
      description: "In the direct sequel to Call of Duty: Modern Warfare II, Captain Price and Task Force 141 face off against the ultimate threat.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/2519060/header.jpg",
      metadata: {
        platform: "Steam",
        region: "Global",
        genre: "Action",
        bestseller: true
      }
    },
    {
      id: "prod_bg3",
      title: "Baldurs Gate 3",
      handle: "baldurs-gate-3",
      description: "Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg",
      metadata: {
        platform: "Steam",
        region: "Global",
        genre: "RPG",
        featured: true,
        bestseller: true
      }
    },
    {
      id: "prod_cs2",
      title: "Counter-Strike 2",
      handle: "counter-strike-2",
      description: "For over two decades, Counter-Strike has offered an elite competitive experience. Now the next chapter in the CS story is about to begin.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
      metadata: {
        platform: "Steam",
        region: "Global",
        genre: "Action",
        bestseller: true
      }
    },
    {
      id: "prod_starfield",
      title: "Starfield Premium Edition",
      handle: "starfield-premium-edition",
      description: "Starfield is the first new universe in 25 years from Bethesda Game Studios, the award-winning creators of The Elder Scrolls V: Skyrim and Fallout 4.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg",
      metadata: {
        platform: "Steam",
        region: "Global",
        genre: "RPG",
        featured: true
      }
    }
  ]

  try {
    for (const productData of products) {
      try {
        // Create product
        const product = await productModuleService.createProducts(productData)
        
        // Create variant with price
        await productModuleService.createProductVariants([{
          product_id: product.id,
          title: "Default",
          manage_inventory: false,
          allow_backorder: false,
          prices: [{
            amount: Math.floor(Math.random() * 5000) + 2000, // Random price between $20-$70
            currency_code: "usd"
          }]
        }])

        logger.info(`✅ Created: ${productData.title}`)
      } catch (error) {
        logger.error(`❌ Failed to create ${productData.title}:`, error)
      }
    }

    logger.info("🎉 Product seeding completed!")
  } catch (error) {
    logger.error("Product seeding failed:", error)
    throw error
  }
}


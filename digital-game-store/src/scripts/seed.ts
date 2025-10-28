export default async function({ container }: any) {
  const productModuleService = container.resolve("product")
  const logger = container.resolve("logger")

  logger.info("🌱 Starting to seed 10 products...")

  const products = [
    {
      title: "Grand Theft Auto V Premium Edition",
      handle: "grand-theft-auto-v-premium-edition",
      description: "Experience Rockstar Games critically acclaimed open world game.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg",
      metadata: { platform: "Steam", region: "Global", genre: "Action", featured: true, bestseller: true }
    },
    {
      title: "Cyberpunk 2077",
      handle: "cyberpunk-2077",
      description: "Open-world RPG set in the dark future of Night City.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
      metadata: { platform: "GOG", region: "Global", genre: "RPG", featured: true }
    },
    {
      title: "The Witcher 3 GOTY",
      handle: "witcher-3-wild-hunt-goty",
      description: "Become a professional monster slayer in this epic RPG.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg",
      metadata: { platform: "Steam", region: "Global", genre: "RPG", bestseller: true }
    },
    {
      title: "Red Dead Redemption 2",
      handle: "red-dead-redemption-2",
      description: "Winner of over 175 Game of the Year Awards.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg",
      metadata: { platform: "Rockstar", region: "Global", genre: "Action", featured: true, bestseller: true }
    },
    {
      title: "Elden Ring",
      handle: "elden-ring",
      description: "THE NEW FANTASY ACTION RPG by FromSoftware.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
      metadata: { platform: "Steam", region: "Global", genre: "RPG" }
    },
    {
      title: "Hogwarts Legacy",
      handle: "hogwarts-legacy",
      description: "Immersive open-world RPG in the Harry Potter universe.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg",
      metadata: { platform: "Steam", region: "Global", genre: "RPG", featured: true }
    },
    {
      title: "Call of Duty MW3",
      handle: "call-of-duty-modern-warfare-3",
      description: "Captain Price and Task Force 141 face the ultimate threat.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/2519060/header.jpg",
      metadata: { platform: "Steam", region: "Global", genre: "Action", bestseller: true }
    },
    {
      title: "Baldurs Gate 3",
      handle: "baldurs-gate-3",
      description: "Gather your party and return to the Forgotten Realms.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg",
      metadata: { platform: "Steam", region: "Global", genre: "RPG", featured: true, bestseller: true }
    },
    {
      title: "Counter-Strike 2",
      handle: "counter-strike-2",
      description: "The next chapter in the CS story.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
      metadata: { platform: "Steam", region: "Global", genre: "Action", bestseller: true }
    },
    {
      title: "Starfield Premium",
      handle: "starfield-premium-edition",
      description: "First new universe in 25 years from Bethesda Game Studios.",
      status: "published",
      thumbnail: "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg",
      metadata: { platform: "Steam", region: "Global", genre: "RPG", featured: true }
    }
  ]

  for (const productData of products) {
    try {
      const created = await productModuleService.createProducts(productData)
      
      // Add variant and price
      await productModuleService.createProductVariants([{
        product_id: created.id,
        title: "Default",
        manage_inventory: false,
        prices: [{
          amount: Math.floor(Math.random() * 5000) + 2000,
          currency_code: "usd"
        }]
      }])

      logger.info(`✅ ${productData.title}`)
    } catch (error) {
      logger.error(`❌ ${productData.title}:`, error)
    }
  }

  logger.info("🎉 10 products seeded!")
}


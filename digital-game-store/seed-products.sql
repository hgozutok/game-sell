-- Insert 10 sample products directly into database

-- Product 1: GTA V
INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
VALUES (
  'prod_gta5',
  'Grand Theft Auto V Premium Edition',
  'grand-theft-auto-v-premium-edition',
  'Experience Rockstar Games critically acclaimed open world game. When a young street hustler, a retired bank robber and a terrifying psychopath land themselves in trouble, they must pull off a series of dangerous heists.',
  'published',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
  '{"platform": "Steam", "region": "Global", "genre": "Action", "featured": true, "bestseller": true}',
  NOW(),
  NOW()
);

INSERT INTO product_variant (id, title, product_id, manage_inventory, allow_backorder, created_at, updated_at)
VALUES ('var_gta5', 'Default', 'prod_gta5', false, false, NOW(), NOW());

INSERT INTO price (id, amount, currency_code, variant_id, created_at, updated_at)
VALUES ('price_gta5', 2999, 'usd', 'var_gta5', NOW(), NOW());

-- Product 2: Cyberpunk 2077
INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
VALUES (
  'prod_cyberpunk',
  'Cyberpunk 2077',
  'cyberpunk-2077',
  'Cyberpunk 2077 is an open-world, action-adventure RPG set in the dark future of Night City — a dangerous megalopolis obsessed with power, glamor, and ceaseless body modification.',
  'published',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
  '{"platform": "GOG", "region": "Global", "genre": "RPG", "featured": true}',
  NOW(),
  NOW()
);

INSERT INTO product_variant (id, title, product_id, manage_inventory, allow_backorder, created_at, updated_at)
VALUES ('var_cyberpunk', 'Default', 'prod_cyberpunk', false, false, NOW(), NOW());

INSERT INTO price (id, amount, currency_code, variant_id, created_at, updated_at)
VALUES ('price_cyberpunk', 5999, 'usd', 'var_cyberpunk', NOW(), NOW());

-- Product 3: Witcher 3
INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
VALUES (
  'prod_witcher3',
  'The Witcher 3: Wild Hunt GOTY',
  'witcher-3-wild-hunt-goty',
  'Become a professional monster slayer and embark on an adventure of epic proportions! The Witcher 3: Wild Hunt became an instant classic, claiming over 250 Game of the Year awards.',
  'published',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg',
  '{"platform": "Steam", "region": "Global", "genre": "RPG", "bestseller": true}',
  NOW(),
  NOW()
);

INSERT INTO product_variant (id, title, product_id, manage_inventory, allow_backorder, created_at, updated_at)
VALUES ('var_witcher3', 'Default', 'prod_witcher3', false, false, NOW(), NOW());

INSERT INTO price (id, amount, currency_code, variant_id, created_at, updated_at)
VALUES ('price_witcher3', 3999, 'usd', 'var_witcher3', NOW(), NOW());

-- Product 4: Red Dead Redemption 2
INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
VALUES (
  'prod_rdr2',
  'Red Dead Redemption 2',
  'red-dead-redemption-2',
  'Winner of over 175 Game of the Year Awards. RDR2 is the epic tale of outlaw Arthur Morgan and the infamous Van der Linde gang, on the run across America.',
  'published',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
  '{"platform": "Rockstar", "region": "Global", "genre": "Action", "featured": true, "bestseller": true}',
  NOW(),
  NOW()
);

INSERT INTO product_variant (id, title, product_id, manage_inventory, allow_backorder, created_at, updated_at)
VALUES ('var_rdr2', 'Default', 'prod_rdr2', false, false, NOW(), NOW());

INSERT INTO price (id, amount, currency_code, variant_id, created_at, updated_at)
VALUES ('price_rdr2', 5999, 'usd', 'var_rdr2', NOW(), NOW());

-- Product 5: Elden Ring
INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
VALUES (
  'prod_eldenring',
  'Elden Ring',
  'elden-ring',
  'THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.',
  'published',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
  '{"platform": "Steam", "region": "Global", "genre": "RPG"}',
  NOW(),
  NOW()
);

INSERT INTO product_variant (id, title, product_id, manage_inventory, allow_backorder, created_at, updated_at)
VALUES ('var_eldenring', 'Default', 'prod_eldenring', false, false, NOW(), NOW());

INSERT INTO price (id, amount, currency_code, variant_id, created_at, updated_at)
VALUES ('price_eldenring', 4999, 'usd', 'var_eldenring', NOW(), NOW());

-- Product 6: Hogwarts Legacy
INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
VALUES (
  'prod_hogwarts',
  'Hogwarts Legacy',
  'hogwarts-legacy',
  'Hogwarts Legacy is an immersive, open-world action RPG set in the world first introduced in the Harry Potter books. Take control of the action in the wizarding world.',
  'published',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg',
  '{"platform": "Steam", "region": "Global", "genre": "RPG", "featured": true}',
  NOW(),
  NOW()
);

INSERT INTO product_variant (id, title, product_id, manage_inventory, allow_backorder, created_at, updated_at)
VALUES ('var_hogwarts', 'Default', 'prod_hogwarts', false, false, NOW(), NOW());

INSERT INTO price (id, amount, currency_code, variant_id, created_at, updated_at)
VALUES ('price_hogwarts', 5999, 'usd', 'var_hogwarts', NOW(), NOW());

-- Product 7: Call of Duty MW3
INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
VALUES (
  'prod_codmw3',
  'Call of Duty: Modern Warfare III',
  'call-of-duty-modern-warfare-3',
  'In the direct sequel to Call of Duty: Modern Warfare II, Captain Price and Task Force 141 face off against the ultimate threat.',
  'published',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/2519060/header.jpg',
  '{"platform": "Steam", "region": "Global", "genre": "Action", "bestseller": true}',
  NOW(),
  NOW()
);

INSERT INTO product_variant (id, title, product_id, manage_inventory, allow_backorder, created_at, updated_at)
VALUES ('var_codmw3', 'Default', 'prod_codmw3', false, false, NOW(), NOW());

INSERT INTO price (id, amount, currency_code, variant_id, created_at, updated_at)
VALUES ('price_codmw3', 6999, 'usd', 'var_codmw3', NOW(), NOW());

-- Product 8: Baldur's Gate 3
INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
VALUES (
  'prod_bg3',
  'Baldurs Gate 3',
  'baldurs-gate-3',
  'Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.',
  'published',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg',
  '{"platform": "Steam", "region": "Global", "genre": "RPG", "featured": true, "bestseller": true}',
  NOW(),
  NOW()
);

INSERT INTO product_variant (id, title, product_id, manage_inventory, allow_backorder, created_at, updated_at)
VALUES ('var_bg3', 'Default', 'prod_bg3', false, false, NOW(), NOW());

INSERT INTO price (id, amount, currency_code, variant_id, created_at, updated_at)
VALUES ('price_bg3', 5999, 'usd', 'var_bg3', NOW(), NOW());

-- Product 9: Counter-Strike 2
INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
VALUES (
  'prod_cs2',
  'Counter-Strike 2',
  'counter-strike-2',
  'For over two decades, Counter-Strike has offered an elite competitive experience. Now the next chapter in the CS story is about to begin.',
  'published',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
  '{"platform": "Steam", "region": "Global", "genre": "Action", "bestseller": true}',
  NOW(),
  NOW()
);

INSERT INTO product_variant (id, title, product_id, manage_inventory, allow_backorder, created_at, updated_at)
VALUES ('var_cs2', 'Default', 'prod_cs2', false, false, NOW(), NOW());

INSERT INTO price (id, amount, currency_code, variant_id, created_at, updated_at)
VALUES ('price_cs2', 1499, 'usd', 'var_cs2', NOW(), NOW());

-- Product 10: Starfield
INSERT INTO product (id, title, handle, description, status, thumbnail, metadata, created_at, updated_at)
VALUES (
  'prod_starfield',
  'Starfield Premium Edition',
  'starfield-premium-edition',
  'Starfield is the first new universe in 25 years from Bethesda Game Studios, the award-winning creators of The Elder Scrolls V: Skyrim and Fallout 4.',
  'published',
  'https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg',
  '{"platform": "Steam", "region": "Global", "genre": "RPG", "featured": true}',
  NOW(),
  NOW()
);

INSERT INTO product_variant (id, title, product_id, manage_inventory, allow_backorder, created_at, updated_at)
VALUES ('var_starfield', 'Default', 'prod_starfield', false, false, NOW(), NOW());

INSERT INTO price (id, amount, currency_code, variant_id, created_at, updated_at)
VALUES ('price_starfield', 9999, 'usd', 'var_starfield', NOW(), NOW());


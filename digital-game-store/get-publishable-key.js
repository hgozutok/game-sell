const { Client } = require('pg');

async function getPublishableKey() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/medusa-store"
  });

  try {
    await client.connect();
    
    // Get publishable API key
    const result = await client.query(`
      SELECT * FROM publishable_api_key 
      WHERE revoked_at IS NULL 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      console.log('Publishable API Key:', result.rows[0].id);
      return result.rows[0].id;
    } else {
      console.log('No publishable API key found');
      return null;
    }
  } catch (error) {
    console.error('Error getting publishable key:', error);
    return null;
  } finally {
    await client.end();
  }
}

getPublishableKey();

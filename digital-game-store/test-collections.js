const axios = require('axios');

async function testCollections() {
  try {
    console.log('Testing collections API...');
    
    // Test collections endpoint
    const response = await axios.get('http://localhost:9000/store/collections', {
      headers: {
        'x-publishable-api-key': 'pk_01JQZ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8'
      }
    });
    
    console.log('Collections response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.collections && response.data.collections.length > 0) {
      const firstCollection = response.data.collections[0];
      console.log('\nTesting products for first collection:', firstCollection.title);
      
      // Test products in collection
      const productsResponse = await axios.get(`http://localhost:9000/store/collections/${firstCollection.id}/products`, {
        headers: {
          'x-publishable-api-key': 'pk_01JQZ8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8'
        }
      });
      
      console.log('Products in collection:', JSON.stringify(productsResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing collections:', error.response?.data || error.message);
  }
}

testCollections();

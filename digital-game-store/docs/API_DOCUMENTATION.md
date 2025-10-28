# API Documentation

Complete API reference for the Digital Game Store platform.

## Base URLs

- **Development**: `http://localhost:9000`
- **Production**: `https://api.digitalgamestore.com`

## Authentication

### Admin API
All admin endpoints require authentication via JWT token:

```bash
Authorization: Bearer <jwt_token>
```

### Store API
Customer endpoints require authentication for protected resources:

```bash
Authorization: Bearer <customer_token>
```

---

## Admin Endpoints

### Digital Keys Management

#### List All Digital Keys
```http
GET /admin/digital-keys
```

**Query Parameters:**
- `product_id` (optional): Filter by product ID
- `status` (optional): Filter by status (available, assigned, delivered, revoked)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "digital_keys": [
    {
      "id": "dkey_01H...",
      "key_code": "XXXXX-XXXXX-XXXXX",
      "product_id": "prod_01H...",
      "variant_id": "variant_01H...",
      "provider": "codesWholesale",
      "sku": "GAME123",
      "status": "available",
      "platform": "Steam",
      "region": "GLOBAL",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 150,
  "limit": 50,
  "offset": 0
}
```

#### Bulk Import Keys
```http
POST /admin/digital-keys/bulk-import
```

**Request Body:**
```json
{
  "keys": [
    {
      "key_code": "XXXXX-XXXXX-XXXXX",
      "product_id": "prod_01H...",
      "variant_id": "variant_01H...",
      "provider": "manual",
      "platform": "Steam",
      "region": "GLOBAL"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Successfully imported 100 keys",
  "digital_keys": [...]
}
```

#### Get Specific Key
```http
GET /admin/digital-keys/:id
```

**Response:**
```json
{
  "digital_key": {
    "id": "dkey_01H...",
    "key_code": "XXXXX-XXXXX-XXXXX",
    "product_id": "prod_01H...",
    "status": "delivered",
    "order_id": "order_01H...",
    "customer_id": "cus_01H...",
    "assigned_at": "2024-01-01T12:00:00Z",
    "delivered_at": "2024-01-01T12:02:00Z"
  }
}
```

#### Update Key
```http
POST /admin/digital-keys/:id
```

**Request Body:**
```json
{
  "status": "revoked",
  "metadata": {
    "reason": "Fraudulent order"
  }
}
```

#### Revoke Key
```http
DELETE /admin/digital-keys/:id
```

**Response:**
```json
{
  "message": "Digital key revoked successfully",
  "digital_key": {...}
}
```

---

## Store Endpoints

### Products

#### List Products
```http
GET /store/products
```

**Query Parameters:**
- `q` (optional): Search query
- `category_id` (optional): Filter by category
- `limit` (optional): Results per page
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "products": [
    {
      "id": "prod_01H...",
      "title": "Game Title",
      "description": "Game description",
      "thumbnail": "https://cdn.example.com/image.jpg",
      "variants": [
        {
          "id": "variant_01H...",
          "prices": [
            {
              "amount": 5999,
              "currency_code": "usd"
            }
          ]
        }
      ],
      "metadata": {
        "is_digital": true,
        "platform": "Steam",
        "region": "GLOBAL"
      }
    }
  ],
  "count": 1000,
  "limit": 20,
  "offset": 0
}
```

#### Get Product
```http
GET /store/products/:id
```

### Cart Operations

#### Create Cart
```http
POST /store/carts
```

**Request Body:**
```json
{
  "region_id": "reg_01H..."
}
```

#### Add Item to Cart
```http
POST /store/carts/:id/line-items
```

**Request Body:**
```json
{
  "variant_id": "variant_01H...",
  "quantity": 1
}
```

#### Complete Cart (Checkout)
```http
POST /store/carts/:id/complete
```

**Response:**
```json
{
  "type": "order",
  "data": {
    "id": "order_01H...",
    "status": "pending",
    "payment_status": "awaiting",
    "fulfillment_status": "not_fulfilled"
  }
}
```

### Customer Digital Keys

#### Get My Keys
```http
GET /store/customers/me/digital-keys
```

**Headers:**
```
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
  "digital_keys": [
    {
      "id": "dkey_01H...",
      "key_code": "XXXXX-XXXXX-XXXXX",
      "product_id": "prod_01H...",
      "platform": "Steam",
      "region": "GLOBAL",
      "status": "delivered",
      "delivered_at": "2024-01-01T12:02:00Z"
    }
  ],
  "count": 5
}
```

#### Get Keys for Order
```http
GET /store/orders/:id/digital-keys
```

**Headers:**
```
Authorization: Bearer <customer_token>
```

**Response:**
```json
{
  "digital_keys": [
    {
      "id": "dkey_01H...",
      "key_code": "XXXXX-XXXXX-XXXXX",
      "platform": "Steam",
      "status": "delivered"
    }
  ],
  "count": 1
}
```

---

## Webhooks

### Order Placed
Triggered when an order is successfully placed and paid.

**Event:** `order.placed`

**Payload:**
```json
{
  "id": "order_01H...",
  "customer_id": "cus_01H...",
  "email": "customer@example.com",
  "items": [
    {
      "id": "item_01H...",
      "product_id": "prod_01H...",
      "variant_id": "variant_01H...",
      "quantity": 1
    }
  ],
  "payment_status": "captured",
  "total": 5999
}
```

### Key Delivered
Triggered when digital keys are successfully delivered to customer.

**Event:** `key.delivered`

**Payload:**
```json
{
  "order_id": "order_01H...",
  "customer_id": "cus_01H...",
  "keys": [
    {
      "id": "dkey_01H...",
      "product_id": "prod_01H...",
      "key_code": "XXXXX-XXXXX-XXXXX"
    }
  ]
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Product not found",
    "code": "product_not_found"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

### Common Error Codes

- `invalid_request_error` - Invalid request parameters
- `authentication_error` - Authentication failed
- `not_found` - Resource not found
- `rate_limit_error` - Too many requests
- `api_error` - Internal server error
- `key_unavailable` - No keys available for product
- `fulfillment_failed` - Key fulfillment failed

---

## Rate Limits

### Admin API
- 1000 requests per minute per API key

### Store API
- 100 requests per minute per IP address
- 500 requests per hour per customer

### Webhook Endpoints
- 60 requests per minute per endpoint

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @medusajs/js-sdk
```

```typescript
import Medusa from "@medusajs/js-sdk"

const client = new Medusa({
  baseUrl: "https://api.digitalgamestore.com",
  publishableKey: "pk_..."
})

// List products
const products = await client.store.product.list()

// Add to cart
await client.store.cart.lineItems.create(cartId, {
  variant_id: variantId,
  quantity: 1
})
```

---

## Postman Collection

Download our Postman collection for easy API testing:
- [Download Collection](https://api.digitalgamestore.com/postman/collection.json)

## Support

For API support:
- Email: api-support@digitalgamestore.com
- Documentation: https://docs.digitalgamestore.com
- Status Page: https://status.digitalgamestore.com


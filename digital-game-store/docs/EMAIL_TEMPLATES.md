# Email Templates

Email templates for the Digital Game Store platform using SendGrid.

## Template Configuration

Templates are stored in SendGrid and referenced by ID in the application.

### Template IDs (Environment Variables)

```env
SENDGRID_TEMPLATE_ORDER_CONFIRMATION=d-xxxxx
SENDGRID_TEMPLATE_DIGITAL_KEYS=d-xxxxx
SENDGRID_TEMPLATE_ORDER_CANCELLED=d-xxxxx
SENDGRID_TEMPLATE_KEY_RESEND=d-xxxxx
```

---

## 1. Order Confirmation Email

**Template ID:** `order-confirmation`

**Sent When:** Order is successfully placed and payment is confirmed.

**Dynamic Data:**
```json
{
  "customer_name": "John Doe",
  "order_id": "order_01H...",
  "order_date": "January 1, 2024",
  "total": "$59.99",
  "items": [
    {
      "name": "Game Title",
      "quantity": 1,
      "price": "$59.99"
    }
  ],
  "order_url": "https://digitalgamestore.com/account/orders/order_01H..."
}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
    <h1 style="color: white; margin: 0;">🎮 Order Confirmed!</h1>
  </div>
  
  <div style="padding: 40px; background: #f7fafc;">
    <p>Hi {{customer_name}},</p>
    
    <p>Thank you for your order! Your digital game keys are being processed and will be delivered shortly.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2>Order Details</h2>
      <p><strong>Order ID:</strong> {{order_id}}</p>
      <p><strong>Date:</strong> {{order_date}}</p>
      
      <table style="width: 100%; margin-top: 20px;">
        {{#each items}}
        <tr>
          <td>{{name}}</td>
          <td>x{{quantity}}</td>
          <td style="text-align: right;">{{price}}</td>
        </tr>
        {{/each}}
        <tr style="border-top: 2px solid #e2e8f0; font-weight: bold;">
          <td colspan="2">Total</td>
          <td style="text-align: right;">{{total}}</td>
        </tr>
      </table>
    </div>
    
    <p style="text-align: center;">
      <a href="{{order_url}}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Order</a>
    </p>
    
    <p style="color: #718096; font-size: 14px;">Your game keys will be delivered to this email address within 2 minutes.</p>
  </div>
</body>
</html>
```

---

## 2. Digital Keys Delivery Email

**Template ID:** `order-digital-keys`

**Sent When:** Digital keys are successfully procured and ready for delivery.

**Dynamic Data:**
```json
{
  "customer_name": "John Doe",
  "order_id": "order_01H...",
  "keys": [
    {
      "product_name": "Game Title",
      "key_code": "XXXXX-XXXXX-XXXXX",
      "platform": "Steam",
      "region": "GLOBAL",
      "redemption_url": "https://store.steampowered.com/account/registerkey"
    }
  ],
  "keys_url": "https://digitalgamestore.com/account/keys"
}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your Game Keys Are Ready!</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
    <h1 style="color: white; margin: 0;">🎮 Your Game Keys Are Ready!</h1>
  </div>
  
  <div style="padding: 40px; background: #f7fafc;">
    <p>Hi {{customer_name}},</p>
    
    <p>Great news! Your digital game keys are ready. Here are your activation codes:</p>
    
    {{#each keys}}
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="margin-top: 0;">{{product_name}}</h3>
      <p><strong>Platform:</strong> {{platform}} | <strong>Region:</strong> {{region}}</p>
      
      <div style="background: #f7fafc; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 18px; text-align: center; margin: 15px 0;">
        <strong>{{key_code}}</strong>
      </div>
      
      <p style="text-align: center;">
        <a href="{{redemption_url}}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">Redeem on {{platform}}</a>
      </p>
    </div>
    {{/each}}
    
    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin-top: 30px;">
      <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> Save these keys in a safe place. You can always access them in your account.</p>
    </div>
    
    <p style="text-align: center; margin-top: 30px;">
      <a href="{{keys_url}}" style="color: #667eea; text-decoration: none;">View All My Keys →</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="color: #718096; font-size: 12px;">
      <strong>Need help?</strong> Contact our support team at support@digitalgamestore.com
    </p>
  </div>
</body>
</html>
```

---

## 3. Key Resend Email

**Template ID:** `key-resend`

**Sent When:** Customer requests to resend their keys.

**Dynamic Data:**
```json
{
  "customer_name": "John Doe",
  "keys": [...],
  "support_email": "support@digitalgamestore.com"
}
```

---

## 4. Order Cancelled Email

**Template ID:** `order-cancelled`

**Sent When:** Order is cancelled (payment failed, key unavailable, etc.).

**Dynamic Data:**
```json
{
  "customer_name": "John Doe",
  "order_id": "order_01H...",
  "cancellation_reason": "Payment authorization failed",
  "refund_amount": "$59.99",
  "refund_timeline": "3-5 business days"
}
```

---

## Setup Instructions

### 1. Create Templates in SendGrid

1. Log in to SendGrid Dashboard
2. Navigate to Email API → Dynamic Templates
3. Create a new template for each email type
4. Copy the template ID
5. Add to environment variables

### 2. Configure in Application

```typescript
// src/subscribers/order-placed.ts
await notificationService.send({
  to: customer.email,
  channel: "email",
  template: "order-digital-keys",
  data: {
    customer_name: customer.first_name,
    order_id: order.id,
    keys: digitalKeys.map(key => ({
      product_name: key.product.title,
      key_code: key.key_code,
      platform: key.platform,
      region: key.region,
      redemption_url: getRedemptionUrl(key.platform)
    }))
  }
})
```

### 3. Test Templates

```bash
# Send test email
curl -X POST https://api.digitalgamestore.com/admin/test/send-email \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "order-digital-keys",
    "to": "test@example.com",
    "data": {...}
  }'
```

---

## Best Practices

1. **Always include unsubscribe link** (required by law)
2. **Mobile-responsive design** - 60%+ users open on mobile
3. **Plain text alternative** - Include text version for accessibility
4. **Test across email clients** - Gmail, Outlook, Apple Mail
5. **Keep it concise** - Focus on key information
6. **Clear CTAs** - Make actions obvious
7. **Personalization** - Use customer name and relevant data
8. **Branding** - Consistent with website design

---

## Deliverability Tips

1. **Authenticate domain** - SPF, DKIM, DMARC records
2. **Monitor bounce rates** - Keep below 2%
3. **Avoid spam triggers** - No all caps, excessive punctuation
4. **Warm up sending** - Gradually increase volume
5. **Clean email list** - Remove invalid addresses
6. **Monitor reputation** - Check SendGrid analytics

---

## Metrics to Track

- Open Rate (target: >40%)
- Click Rate (target: >10%)
- Bounce Rate (keep <2%)
- Spam Complaints (keep <0.1%)
- Unsubscribe Rate (keep <0.5%)
- Time to Delivery (target: <30 seconds)


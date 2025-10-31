# User Preferences Module

## Overview
This module provides backend storage for user preferences and settings, replacing localStorage with a proper database solution.

## Database Table: `user_preference`

### Schema
```sql
CREATE TABLE user_preference (
  id text PRIMARY KEY,
  user_id text NULL,           -- NULL for anonymous users, or specific user ID
  key text NOT NULL,            -- e.g., "admin.products.limit", "admin.products.filters"
  value jsonb NOT NULL,         -- Any JSON value
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);
```

### Indexes
- `IDX_user_preference_user_id` - For querying by user
- `IDX_user_preference_key` - For querying by preference key
- `IDX_user_preference_deleted_at` - For soft-delete support

## API Endpoints

### GET /admin/preferences
Get all preferences or a specific preference by key

**Query Parameters:**
- `key` (optional) - Get specific preference

**Example:**
```bash
GET /admin/preferences?key=admin.products.limit
```

**Response:**
```json
{
  "preference": {
    "id": "01HXXX",
    "user_id": null,
    "key": "admin.products.limit",
    "value": 50,
    "created_at": "2025-10-31T12:00:00Z",
    "updated_at": "2025-10-31T12:00:00Z"
  }
}
```

### POST /admin/preferences
Create or update a preference

**Body:**
```json
{
  "key": "admin.products.filters",
  "value": {
    "hideZeroPrice": true,
    "hideZeroStock": true
  }
}
```

**Response:**
```json
{
  "message": "Preference saved successfully",
  "preference": { ... }
}
```

### DELETE /admin/preferences
Delete a preference

**Query Parameters:**
- `key` (required) - Preference key to delete

**Example:**
```bash
DELETE /admin/preferences?key=admin.products.limit
```

## Service Methods

### UserPreferencesService

```typescript
// Get preference value
await userPreferencesService.getPreferenceValue('admin.products.limit', null, 50)

// Set preference
await userPreferencesService.setPreference('admin.products.limit', 100)

// Delete preference
await userPreferencesService.deletePreference('admin.products.limit')

// Get all user preferences
await userPreferencesService.getUserPreferences(userId)
```

## Current Usage

### Admin Products Page
The admin products page now saves filter settings to the database:
- **Key:** `admin.products.limit` - Number of products per page (25, 50, 100)
- **Key:** `admin.products.filters` - Filter settings object
  ```json
  {
    "hideZeroPrice": true,
    "hideZeroStock": true
  }
  ```

## Files Created

### Module Files
- `src/modules/user-preferences/models/user-preference.ts` - Database model
- `src/modules/user-preferences/service.ts` - Service layer
- `src/modules/user-preferences/index.ts` - Module registration
- `src/modules/user-preferences/migrations/Migration20251031120000.ts` - Database migration

### API Files
- `src/api/admin/preferences/route.ts` - REST API endpoints

### Configuration
- Updated `medusa-config.ts` to register the module

## Benefits

✅ **Persistent Settings** - Settings saved in database, not browser
✅ **Multi-Device Sync** - Same settings across all devices
✅ **User-Specific** - Can support per-user preferences in future
✅ **Secure** - Settings stored server-side
✅ **Flexible** - JSON storage allows any data structure
✅ **Scalable** - Easy to add new preferences

## Future Enhancements

- Add user authentication to support user-specific preferences
- Add preference categories/namespacing
- Add preference versioning
- Add bulk preference updates
- Add preference sharing between users


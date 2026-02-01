# Token Failure Handling

## What Happens When Access Token Fails

### Current Implementation

When an access token fails or becomes invalid, the application now handles it gracefully:

## Failure Scenarios

### 1. **Token Not Found in Database** (Invalid Token)
**When it happens:**
- Token was deleted from database
- Token was never stored properly
- Database was reset

**What happens:**
- API returns `401 Unauthorized` with error: "Invalid or expired token"
- Frontend detects 401 status
- Token is automatically cleared from localStorage
- User sees reconnect message
- "Reconnect X Account" button is shown

### 2. **Token Expired** (X API Rejects Token)
**When it happens:**
- Token was revoked by user on X
- Token expired (rare for X, but possible)
- X API credentials were regenerated

**What happens:**
- X API returns `401` or `403` when posting
- Server detects authentication error
- Error message: "Your X account access has expired or been revoked"
- User is prompted to reconnect

### 3. **Token Not in Request** (Missing Token)
**When it happens:**
- User cleared browser data
- Token was manually removed
- First time visiting

**What happens:**
- API returns `401` with error: "Access token required"
- Frontend shows connect button
- User can connect their account

### 4. **Network Errors** (Temporary Issues)
**When it happens:**
- Internet connection lost
- Server temporarily unavailable
- Network timeout

**What happens:**
- Error is caught but token is NOT cleared (might be temporary)
- User sees: "Unable to load profile data. Please check your connection."
- Token remains in localStorage
- User can retry when connection is restored

## Error Handling Flow

```
User Action
    ↓
API Call with Token
    ↓
Token Valid? ──No──→ 401 Error
    │                      ↓
   Yes              Clear localStorage
    ↓                      ↓
Success              Show Reconnect Message
                           ↓
                    User Clicks "Reconnect"
                           ↓
                    OAuth Flow Starts
```

## User Experience

### When Token Fails:

1. **Automatic Detection**
   - App detects 401 errors automatically
   - No manual intervention needed

2. **Clear Messaging**
   - Warning message: "Your session has expired or the access token is invalid"
   - Action button: "Reconnect X Account"

3. **Seamless Recovery**
   - One click to reconnect
   - OAuth flow handles re-authentication
   - User data is preserved (user record stays in database)

4. **No Data Loss**
   - Posts remain in database
   - User account is not deleted
   - Only token needs to be refreshed

## Code Locations

### Frontend Error Handling
- **File**: `src/views/index.ejs`
- **Function**: `handleTokenFailure()`
- **Triggers**: 401 responses from API

### Backend Error Handling
- **File**: `src/routers/apiRouter.js`
- **Endpoints**: `/api/user`, `/post`, `/api/posts/:id/post`
- **Response**: 401 status with clear error messages

### Token Validation
- **File**: `src/utils/userHelpers.js`
- **Function**: `getUserFromToken()`
- **Returns**: `null` if token invalid

## Testing Token Failures

### Simulate Token Failure:

1. **Clear token manually:**
   ```javascript
   localStorage.removeItem('x_access_token');
   location.reload();
   ```

2. **Use invalid token:**
   ```javascript
   localStorage.setItem('x_access_token', 'invalid-token');
   location.reload();
   ```

3. **Revoke on X:**
   - Go to X settings → Apps and sessions
   - Revoke your app's access
   - Try to use the app

## Best Practices

✅ **What We Do:**
- Automatically detect token failures
- Clear invalid tokens
- Show clear error messages
- Provide easy reconnection path
- Preserve user data

❌ **What We Don't Do:**
- Keep invalid tokens in localStorage
- Show confusing error messages
- Require manual token cleanup
- Delete user data on token failure

## Future Improvements

1. **Token Refresh** (if X provides refresh tokens)
   - Automatically refresh expired tokens
   - Seamless user experience

2. **Retry Logic**
   - Retry failed requests once
   - Handle temporary network issues

3. **Token Validation on Page Load**
   - Check token validity immediately
   - Show loading state while validating

4. **Background Token Check**
   - Periodically validate token
   - Warn user before expiration

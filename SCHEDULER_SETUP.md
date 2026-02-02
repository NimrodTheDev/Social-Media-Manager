# Post Scheduler - Setup & Usage

## ✅ Implementation Complete!

The automatic post scheduler has been implemented and is ready to use.

---

## 📦 Installation

Install the required dependency:

```bash
npm install
```

This will install `node-cron` (already added to `package.json`).

---

## 🚀 How It Works

### **Automatic Execution**

1. **Scheduler runs every 1 minute** (configurable)
2. **Queries database** for posts where:
   - `status = 'scheduled'`
   - `scheduled_at <= NOW()`
   - Account is active
3. **Posts to X API** using the account's access token
4. **Updates database**:
   - Success → `status = 'posted'`
   - Failure → `status = 'failed'` with error message

### **On Server Start**

- Scheduler starts automatically when the server starts
- Immediately checks for any missed posts
- Then runs every minute

### **On Server Shutdown**

- Scheduler stops gracefully
- No posts are lost (will be caught on next startup)

---

## ⚙️ Configuration

### **Environment Variables**

Add to your `.env` file (optional):

```env
# Enable/disable scheduler (default: true)
SCHEDULER_ENABLED=true

# Cron expression (default: every minute)
SCHEDULER_INTERVAL="*/1 * * * *"
```

### **Cron Expression Examples**

- `*/1 * * * *` - Every minute (default)
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 9 * * *` - Every day at 9 AM

---

## 📊 Monitoring

### **Console Logs**

The scheduler logs its activity:

```
[Scheduler] Starting scheduler (interval: */1 * * * *)
[Scheduler] Scheduler started successfully
[Scheduler] Found 2 post(s) ready to publish
[Scheduler] Posting post #123...
[Scheduler] ✓ Posted post #123 successfully (Tweet ID: 1234567890)
[Scheduler] Completed cycle. Processed 2 post(s)
```

### **Error Logs**

```
[Scheduler] ✗ Failed to post #123: Invalid or expired token
[Scheduler] Error processing scheduled posts: [error details]
```

---

## 🧪 Testing

### **Manual Test**

1. **Create a scheduled post:**
   - Use the UI to create a post
   - Check "Schedule for later"
   - Set time to 2 minutes in the future
   - Click "Create Draft"

2. **Wait and verify:**
   - Wait 2 minutes
   - Check console logs for scheduler activity
   - Check database: `status` should be `'posted'`
   - Check X account: Tweet should appear

### **Database Query**

Check scheduled posts:

```sql
SELECT id, content, status, scheduled_at, posted_at, error_message
FROM posts
WHERE status = 'scheduled'
ORDER BY scheduled_at;
```

---

## 🛡️ Safety Features

✅ **Idempotency**: Checks `status` before posting (won't double-post)  
✅ **Batch Processing**: Max 10 posts per cycle (prevents overload)  
✅ **Error Handling**: Failed posts marked with error message  
✅ **Token Validation**: Skips posts with invalid/missing tokens  
✅ **Account Validation**: Only processes active accounts  
✅ **Graceful Shutdown**: Stops cleanly on server shutdown  

---

## 📁 Files Created

1. **`src/services/postService.js`**
   - Reusable posting logic
   - Handles all post modes (single, thread, reply, quote)
   - Used by both API router and scheduler

2. **`src/schedulers/postScheduler.js`**
   - Cron job setup
   - Database queries
   - Post processing logic
   - Error handling

3. **`src/app.js`** (updated)
   - Initializes scheduler on startup
   - Handles graceful shutdown

4. **`src/routers/apiRouter.js`** (updated)
   - Now uses `postService` (reduced code duplication)

---

## 🔍 Troubleshooting

### **Scheduler not running?**

1. Check console for `[Scheduler] Starting scheduler...`
2. Verify `SCHEDULER_ENABLED` is not `false`
3. Check for errors in console

### **Posts not posting?**

1. Check console logs for error messages
2. Verify access token is valid
3. Check database: `SELECT * FROM posts WHERE status = 'scheduled'`
4. Verify account is active: `SELECT * FROM social_accounts WHERE is_active = true`

### **Posts stuck in scheduled?**

1. Check `scheduled_at` timestamp (should be <= NOW())
2. Check for error messages in `error_message` column
3. Verify account has valid access token

---

## 🎯 Next Steps

The scheduler is ready to use! Just:

1. **Install dependencies**: `npm install`
2. **Start server**: `npm start` or `npm run dev`
3. **Create scheduled posts** via the UI
4. **Monitor logs** to see posts being published

---

## 📈 Future Enhancements

- Retry logic for failed posts
- Webhook notifications
- Analytics dashboard
- Timezone support
- Batch parallel processing

---

**Happy Scheduling! 🚀**

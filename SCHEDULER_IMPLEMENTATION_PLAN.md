# Automatic Post Scheduler - Implementation Plan

## 📋 Overview

Implement automatic posting of scheduled posts using `node-cron` to run a background job that checks for and posts scheduled content.

---

## ⏱️ Efficiency Analysis: 1-Minute Interval

### **Is 1 minute efficient?**

**✅ YES - For most use cases:**
- **Precision**: Posts will be published within 1 minute of scheduled time (max 59 seconds delay)
- **Resource Usage**: Minimal - only runs when there are scheduled posts
- **Database Load**: Single query per minute (very efficient with indexed `scheduled_at`)
- **API Rate Limits**: X API allows 1,500 tweets/day per user - 1-minute checks won't hit limits

### **Considerations:**

| Interval | Pros | Cons | Use Case |
|----------|------|------|----------|
| **1 minute** | High precision, simple | More frequent checks | ✅ **Recommended** - Good balance |
| **5 minutes** | Less frequent checks | Up to 5 min delay | Good for lower volume |
| **30 seconds** | Very precise | More overhead | Only if sub-minute precision needed |

### **Performance Impact:**
- **Database Query**: ~1-5ms (indexed query)
- **Memory**: Negligible (runs in same process)
- **CPU**: Minimal (only when posts exist)
- **Network**: Only when posting (X API calls)

**Verdict: 1 minute is optimal for this use case.**

---

## 🏗️ Architecture

### **File Structure:**
```
SocialMediaManager/
├── src/
│   ├── app.js                    # Start scheduler here
│   ├── schedulers/
│   │   └── postScheduler.js      # Main scheduler logic
│   ├── services/
│   │   └── postService.js        # Reusable posting logic
│   └── ...
```

### **Component Responsibilities:**

1. **`postScheduler.js`** (Scheduler)
   - Runs cron job every minute
   - Queries ready posts
   - Calls postService for each post
   - Handles errors gracefully

2. **`postService.js`** (Service)
   - Extracted posting logic from API router
   - Handles all post modes (single, thread, reply, quote)
   - Returns success/failure status
   - Pure function (no HTTP context)

3. **`app.js`** (Entry Point)
   - Starts Express server
   - Initializes scheduler
   - Handles graceful shutdown

---

## 🔄 Data Flow

```
┌─────────────────┐
│  node-cron      │ Every 1 minute
│  (Scheduler)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Query Database  │ SELECT posts WHERE status='scheduled' 
│                 │ AND scheduled_at <= NOW()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ For each post:  │
│ 1. Get account  │
│ 2. Get token    │
│ 3. Post to X    │
│ 4. Update DB    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Success:        │ status = 'posted'
│ Failure:        │ status = 'failed'
└─────────────────┘
```

---

## 📝 Implementation Details

### **1. Database Query**

```sql
SELECT 
  p.*,
  sa.platform,
  sa.access_token,
  sa.is_active
FROM posts p
JOIN social_accounts sa ON p.account_id = sa.id
WHERE p.status = 'scheduled'
  AND p.scheduled_at <= NOW()
  AND sa.is_active = true
ORDER BY p.scheduled_at ASC
LIMIT 10;  -- Process in batches
```

**Why LIMIT 10?**
- Prevents overwhelming the system
- Processes oldest first
- Next run will catch remaining posts

### **2. Posting Logic Extraction**

Extract the posting logic from `POST /api/posts/:id/post` into a reusable service:

**Current**: Logic in API router (HTTP context)
**New**: Service function (pure, reusable)

```javascript
// postService.js
async function postToPlatform(post, accessToken, platform) {
  // All the posting logic here
  // Returns: { success: true/false, tweetId, error }
}
```

### **3. Error Handling**

**Scenarios to handle:**
- ✅ Post succeeds → Update to `posted`
- ❌ API error → Update to `failed` with error message
- ❌ Invalid token → Update to `failed`, log for admin
- ❌ Network timeout → Retry next cycle (don't mark failed yet)
- ❌ Database error → Log, continue with other posts

### **4. Concurrency & Safety**

- **Lock mechanism**: Use database transaction to prevent double-posting
- **Idempotency**: Check `status` before posting (already in code)
- **Rate limiting**: Process max 10 posts per cycle

---

## 🛡️ Edge Cases

| Case | Handling |
|------|----------|
| Post scheduled in past | Query catches it immediately |
| Multiple posts same time | Process in order (ORDER BY scheduled_at) |
| Account deactivated | Skip (WHERE is_active = true) |
| Token expired | Mark as failed, log for user |
| Server restart | Scheduler resumes, catches missed posts |
| Very long thread | Process sequentially (already handled) |

---

## 📦 Dependencies

**Add to package.json:**
```json
{
  "dependencies": {
    "node-cron": "^3.0.3"
  }
}
```

---

## 🚀 Implementation Steps

1. **Install dependency**: `npm install node-cron`
2. **Create `src/services/postService.js`**: Extract posting logic
3. **Create `src/schedulers/postScheduler.js`**: Cron job + query logic
4. **Update `src/app.js`**: Initialize scheduler on startup
5. **Add graceful shutdown**: Stop scheduler on SIGTERM/SIGINT
6. **Add logging**: Console logs for monitoring
7. **Test**: Create scheduled post, wait 1 minute, verify

---

## 🧪 Testing Strategy

1. **Unit Test**: Post service function
2. **Integration Test**: Scheduler with test database
3. **Manual Test**: 
   - Schedule post 2 minutes in future
   - Wait and verify it posts
   - Check database status updates

---

## 📊 Monitoring

**Logs to add:**
- `[Scheduler] Checking for scheduled posts...`
- `[Scheduler] Found X posts ready to publish`
- `[Scheduler] Posted post #123 successfully`
- `[Scheduler] Failed to post #123: [error]`
- `[Scheduler] Completed cycle. Processed X posts`

---

## ⚙️ Configuration

**Environment Variables (optional):**
- `SCHEDULER_ENABLED=true` (default: true)
- `SCHEDULER_INTERVAL='*/1 * * * *'` (cron expression, default: every minute)

---

## 🔒 Security Considerations

- ✅ Uses existing access tokens (no new auth needed)
- ✅ Validates account is active before posting
- ✅ Handles token expiration gracefully
- ✅ No user input in scheduler (all from database)

---

## 📈 Future Enhancements

- **Retry logic**: Retry failed posts (with backoff)
- **Batch processing**: Process multiple posts in parallel
- **Webhooks**: Notify users when scheduled post publishes
- **Analytics**: Track scheduling success rate
- **Time zones**: Support user timezone preferences

---

## ✅ Acceptance Criteria

- [ ] Scheduler runs every 1 minute
- [ ] Queries for ready posts correctly
- [ ] Posts scheduled posts to X API
- [ ] Updates database status correctly
- [ ] Handles errors gracefully
- [ ] Logs activity for monitoring
- [ ] Works on server restart
- [ ] Doesn't double-post

---

## 🎯 Estimated Implementation Time

- **Service extraction**: 30 min
- **Scheduler creation**: 45 min
- **Integration & testing**: 30 min
- **Total**: ~2 hours

---

Ready to implement? Let me know and I'll start coding! 🚀

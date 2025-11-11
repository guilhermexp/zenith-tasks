# AI Features Deployment Guide

**Version**: 1.0.0
**Last Updated**: 2025-11-11
**Deployment Target**: Vercel + Neon PostgreSQL

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migration](#database-migration)
3. [Environment Variables Setup](#environment-variables-setup)
4. [Feature Flag Configuration](#feature-flag-configuration)
5. [Monitoring & Alerting Setup](#monitoring--alerting-setup)
6. [Deployment Steps](#deployment-steps)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`npm run test`)
- [ ] TypeScript checks passing (`npm run typecheck`)
- [ ] Linting passing with zero warnings (`npm run lint:ci`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors in development

### Documentation
- [ ] API documentation reviewed and up-to-date
- [ ] Feature flags documented
- [ ] Environment variables documented
- [ ] Deployment checklist reviewed

### Dependencies
- [ ] All npm packages up-to-date and security-audited
- [ ] No critical vulnerabilities (`npm audit`)
- [ ] Lockfile clean (no conflicts)

### AI Provider Setup
- [ ] AI provider API keys obtained and tested
- [ ] Rate limits understood and configured
- [ ] Billing alerts configured at provider level
- [ ] Backup provider keys ready (for failover)

### Database
- [ ] Database backup completed
- [ ] Migration scripts tested on staging
- [ ] Connection pooling configured
- [ ] Database URL verified

---

## Database Migration

### 1. Review Migration Files

Check all migration files in `src/db/migrations/`:

```bash
ls -la src/db/migrations/
```

**Expected migrations**:
- `0000_*_initial_schema.sql` - Base tables (mind_flow_items, subtasks, etc.)
- `0001_*_ai_prioritization.sql` - AI prioritization tables
- Additional migrations as needed

### 2. Backup Current Database

**Production Backup** (Neon Console):
1. Log into Neon Console: https://console.neon.tech
2. Select your project
3. Go to "Branches" tab
4. Create a backup branch: `backup-pre-ai-features-YYYYMMDD`
5. Verify backup branch is accessible

**Command-line Backup** (Alternative):
```bash
# Export current schema and data
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup file
ls -lh backup-*.sql
```

### 3. Test Migrations on Staging

**Create Staging Environment**:
```bash
# In Neon Console, create a staging branch
# Copy production data to staging

# Or use local test database
export DATABASE_URL="postgresql://test:test@localhost:5432/test"
```

**Run Migrations**:
```bash
# Generate migration files (if needed)
npm run db:generate

# Review generated SQL
cat src/db/migrations/*.sql

# Apply migrations
npm run db:migrate
```

**Verify Migration Success**:
```bash
# Check tables exist
psql $DATABASE_URL -c "\dt"

# Verify schema
npm run db:studio
```

### 4. Apply Migrations to Production

**Pre-Flight Checks**:
```bash
# Verify DATABASE_URL is production
echo $DATABASE_URL

# Check current schema version
psql $DATABASE_URL -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

**Apply Migrations**:
```bash
# Run migrations (this will apply only new migrations)
npm run db:migrate

# Verify success
psql $DATABASE_URL -c "\dt"
```

**Expected Tables** (after migration):
- `mind_flow_items` - Core task data
- `subtasks` - Task subtasks
- `task_analyses` - AI prioritization results
- `pattern_suggestions` - Detected patterns
- `user_performance_patterns` - User behavior patterns
- `detected_conflicts` - Scheduling conflicts
- `drizzle.__drizzle_migrations` - Migration history

### 5. Verify Data Integrity

```sql
-- Check row counts
SELECT 'mind_flow_items' as table_name, COUNT(*) FROM mind_flow_items
UNION ALL
SELECT 'subtasks', COUNT(*) FROM subtasks
UNION ALL
SELECT 'task_analyses', COUNT(*) FROM task_analyses;

-- Check for any data corruption
SELECT * FROM mind_flow_items WHERE title IS NULL OR title = '';
SELECT * FROM subtasks WHERE parent_item_id NOT IN (SELECT id FROM mind_flow_items);
```

---

## Environment Variables Setup

### 1. Required Variables

**Vercel Dashboard** → Your Project → Settings → Environment Variables

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | Production, Preview |
| `AI_SDK_PROVIDER` | `google` | All |
| `GEMINI_API_KEY` | `your-key` | All |
| `NODE_ENV` | `production` | Production |

### 2. Authentication Variables (When Enabled)

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_...` | All |
| `CLERK_SECRET_KEY` | `sk_...` | Production, Preview |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | Production |

### 3. AI Provider Variables (Optional)

```bash
# OpenAI (for Whisper and GPT models)
OPENAI_API_KEY=sk-...

# Anthropic Claude (optional backup)
ANTHROPIC_API_KEY=sk-ant-...

# XAI Grok (optional)
XAI_API_KEY=xai-...

# OpenRouter (optional unified access)
OPENROUTER_API_KEY=sk-or-...

# AI Gateway (Portkey) - optional
PORTKEY_API_KEY=pk-...
PORTKEY_VIRTUAL_KEY=...
```

### 4. Feature Flags

```bash
# Core AI Features (all enabled by default)
FEATURE_AI_PRIORITIZATION=true
FEATURE_PATTERN_ANALYSIS=true
FEATURE_CONFLICT_DETECTION=true
FEATURE_PRODUCTIVITY_INSIGHTS=true

# AI Provider Features
FEATURE_MULTI_PROVIDER=true
FEATURE_PROVIDER_SWITCHING=true
FEATURE_AI_GATEWAY=false

# Performance & Monitoring
FEATURE_ANALYTICS_CACHING=true
FEATURE_PERFORMANCE_MONITORING=true
FEATURE_AI_COST_MONITORING=true

# Experimental Features
FEATURE_VOICE_INPUT=true
FEATURE_SUBTASK_GENERATION=true
FEATURE_SMART_INBOX=true
```

### 5. Monitoring & Budget Configuration

```bash
# AI Cost Budgets (USD)
AI_BUDGET_DAILY=10
AI_BUDGET_WEEKLY=50
AI_BUDGET_MONTHLY=200
AI_BUDGET_PER_USER=5

# Budget alert thresholds (%)
AI_BUDGET_WARNING_THRESHOLD=80
AI_BUDGET_CRITICAL_THRESHOLD=95

# Performance Thresholds (milliseconds)
PERFORMANCE_SLOW_ENDPOINT_THRESHOLD=3000
PERFORMANCE_SLOW_QUERY_THRESHOLD=1000
PERFORMANCE_SLOW_AI_THRESHOLD=5000

# Cache Configuration
ANALYTICS_CACHE_TTL=3600000
ANALYTICS_CACHE_MAX_SIZE=1000

# Rate Limiting
RATE_LIMIT_AI_PRIORITIZATION=10
RATE_LIMIT_WINDOW=3600000
```

### 6. Logging Configuration

```bash
# Log level
LOG_LEVEL=info

# Structured logging
LOG_STRUCTURED=true

# Error reporting
ENABLE_ERROR_REPORTING=true
```

### 7. Verify Environment Variables

**In Vercel Dashboard**:
```bash
# List all environment variables
vercel env ls

# Pull environment to local (for testing)
vercel env pull .env.production
```

**Test Configuration Locally**:
```bash
# Load production env vars
cp .env.production .env.local

# Verify they load correctly
npm run dev

# Check /api/debug/health endpoint
curl http://localhost:3457/api/debug/health
```

---

## Feature Flag Configuration

### 1. Default Configuration

All feature flags are defined in `src/config/features.ts`.

**Production Defaults**:
- ✅ All core AI features enabled (100% rollout)
- ✅ Multi-provider support enabled
- ✅ Performance monitoring enabled
- ✅ Cost monitoring enabled
- ❌ AI Gateway disabled (optional feature)
- ❌ Beta features disabled

### 2. Gradual Rollout Strategy

For a safer rollout, gradually increase `rolloutPercentage`:

**Week 1** - Internal Testing (10%):
```typescript
'ai-task-prioritization': {
  enabled: true,
  rolloutPercentage: 10,  // Only 10% of users
}
```

**Week 2** - Beta Users (30%):
```typescript
rolloutPercentage: 30
```

**Week 3** - General Availability (100%):
```typescript
rolloutPercentage: 100
```

### 3. Runtime Feature Flag Management

**Check Feature Status**:
```bash
curl https://zenith-tasks.vercel.app/api/admin/feature-flags
```

**Enable/Disable Feature** (Admin):
```bash
# Disable a feature temporarily
curl -X POST https://zenith-tasks.vercel.app/api/admin/feature-flags \
  -H "Content-Type: application/json" \
  -d '{
    "featureKey": "ai-pattern-analysis",
    "enabled": false
  }'

# Re-enable
curl -X POST https://zenith-tasks.vercel.app/api/admin/feature-flags \
  -H "Content-Type: application/json" \
  -d '{
    "featureKey": "ai-pattern-analysis",
    "enabled": true
  }'
```

**Update Rollout Percentage**:
```bash
curl -X PATCH https://zenith-tasks.vercel.app/api/admin/feature-flags \
  -H "Content-Type: application/json" \
  -d '{
    "featureKey": "ai-task-prioritization",
    "rolloutPercentage": 50
  }'
```

### 4. User-Specific Access

**Allow Specific Users** (for beta testing):
```typescript
'ai-context-awareness': {
  enabled: false,
  rolloutPercentage: 0,
  allowedUsers: ['user-123', 'user-456'],  // Beta testers
}
```

**Block Specific Users** (if needed):
```typescript
blockedUsers: ['user-789']
```

---

## Monitoring & Alerting Setup

### 1. Health Check Endpoint

**Verify API Health**:
```bash
# Check overall health
curl https://zenith-tasks.vercel.app/api/debug/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-11T04:30:00.000Z",
  "environment": "production",
  "database": "connected",
  "ai": "available"
}
```

### 2. Performance Monitoring

**Check Performance Metrics**:
```bash
curl https://zenith-tasks.vercel.app/api/monitoring/performance
```

**Key Metrics to Monitor**:
- Average response time < 1000ms
- P95 response time < 3000ms
- Error rate < 1%
- AI provider success rate > 95%

**Set Up Alerts**:
```javascript
// Performance thresholds trigger automatic alerts
// Configure via environment variables:
PERFORMANCE_SLOW_ENDPOINT_THRESHOLD=3000
PERFORMANCE_SLOW_QUERY_THRESHOLD=1000
PERFORMANCE_SLOW_AI_THRESHOLD=5000
```

### 3. AI Cost Monitoring

**Check AI Costs**:
```bash
# Daily costs
curl "https://zenith-tasks.vercel.app/api/monitoring/ai-cost?period=day"

# Weekly costs
curl "https://zenith-tasks.vercel.app/api/monitoring/ai-cost?period=week"

# Per-user costs
curl "https://zenith-tasks.vercel.app/api/monitoring/ai-cost?period=day&userId=test-user"
```

**Cost Alerts**:
- Warning alert at 80% of budget
- Critical alert at 95% of budget
- Automatic notifications in logs

**Adjust Budgets**:
```bash
curl -X PATCH https://zenith-tasks.vercel.app/api/monitoring/ai-cost \
  -H "Content-Type: application/json" \
  -d '{
    "daily": 15,
    "weekly": 75,
    "monthly": 300
  }'
```

### 4. Cache Performance

**Monitor Cache Hit Rates**:
```bash
curl https://zenith-tasks.vercel.app/api/analytics/cache-metrics
```

**Expected Metrics**:
- Cache hit rate > 70%
- Average response time (cached) < 100ms
- Average response time (uncached) < 2000ms

### 5. External Monitoring Setup

**Vercel Analytics** (built-in):
- Automatically tracks Web Vitals
- Real-time performance metrics
- Error tracking

**Recommended External Tools**:

**Uptime Monitoring** (UptimeRobot / Pingdom):
```
Monitor URL: https://zenith-tasks.vercel.app/api/debug/health
Check interval: 5 minutes
Expected status: 200
Alert on: Status != 200 or response time > 5s
```

**Error Tracking** (Sentry - optional):
```bash
# Add to environment variables
SENTRY_DSN=https://...@sentry.io/...
```

**Log Aggregation** (Datadog / LogDNA - optional):
- Stream Vercel logs to external service
- Set up custom alerts and dashboards

---

## Deployment Steps

### 1. Pre-Deployment

**Code Freeze**:
```bash
# Create release branch
git checkout -b release/ai-features-v1.0.0

# Final checks
npm run lint:ci
npm run typecheck
npm run build

# Tag release
git tag -a v1.0.0-ai-features -m "AI Features v1.0.0"
git push origin --tags
```

**Notify Team**:
- [ ] Send deployment notification to team
- [ ] Schedule deployment window (off-peak hours recommended)
- [ ] Prepare rollback plan

### 2. Deploy to Vercel

**Option A: Automatic Deployment** (Recommended):
```bash
# Push to main branch
git checkout main
git merge release/ai-features-v1.0.0
git push origin main

# Vercel automatically deploys
# Monitor: https://vercel.com/your-team/zenith-tasks/deployments
```

**Option B: Manual Deployment**:
```bash
# Deploy specific branch
vercel --prod

# Or deploy with specific environment
vercel deploy --prod --env-file .env.production
```

**Option C: CLI Deployment with Preview**:
```bash
# Deploy to preview first
vercel

# Verify preview URL
# Then promote to production
vercel --prod
```

### 3. Deployment Verification

**Wait for Build**:
- Build typically takes 2-5 minutes
- Monitor build logs in Vercel dashboard
- Check for any build errors

**Verify Deployment**:
```bash
# Check deployment status
vercel ls

# Get production URL
vercel inspect <deployment-url>
```

### 4. Smoke Tests

Run these tests immediately after deployment:

```bash
# 1. Health check
curl https://zenith-tasks.vercel.app/api/debug/health

# 2. Database connectivity
curl https://zenith-tasks.vercel.app/api/items

# 3. AI prioritization
curl -X POST https://zenith-tasks.vercel.app/api/ai/prioritize \
  -H "Content-Type: application/json" \
  -d '{"availableTime": 120}'

# 4. Analytics
curl "https://zenith-tasks.vercel.app/api/analytics/insights?period=week"

# 5. Conflict detection
curl -X POST https://zenith-tasks.vercel.app/api/conflicts/check \
  -H "Content-Type: application/json" \
  -d '{}'

# 6. Feature flags
curl https://zenith-tasks.vercel.app/api/admin/feature-flags

# 7. Performance metrics
curl https://zenith-tasks.vercel.app/api/monitoring/performance

# 8. AI cost tracking
curl "https://zenith-tasks.vercel.app/api/monitoring/ai-cost?period=day"
```

**Expected Results**:
- All endpoints return 200 OK
- No 500 errors
- Response times < 3s
- AI features functional

---

## Post-Deployment Verification

### 1. Functional Testing

**Test AI Prioritization**:
1. Log into application
2. Create 5+ tasks with different priorities
3. Click "AI Prioritize" button
4. Verify tasks are reordered with reasoning
5. Check response time < 3s

**Test Analytics**:
1. Navigate to Analytics page
2. Verify insights displayed
3. Check chart rendering
4. Verify caching (second load should be faster)

**Test Conflict Detection**:
1. Create two meetings at same time
2. Verify conflict alert appears
3. Check resolution suggestions provided

**Test Pattern Analysis**:
1. Create recurring tasks
2. Wait for cron job or trigger manually
3. Verify pattern suggestions appear

### 2. Performance Verification

```bash
# Check average response times
curl https://zenith-tasks.vercel.app/api/monitoring/performance | jq '.data.overallStats'

# Verify cache is working
curl https://zenith-tasks.vercel.app/api/analytics/cache-metrics | jq '.data.hitRate'

# Check AI costs are being tracked
curl "https://zenith-tasks.vercel.app/api/monitoring/ai-cost?period=day" | jq '.data.summary'
```

**Expected Metrics**:
- Average response time: < 1000ms
- P95 response time: < 3000ms
- Cache hit rate: > 0% (will increase over time)
- Error rate: < 1%

### 3. Monitor Logs

**Vercel Dashboard** → Your Project → Logs

**Watch for**:
- [ ] No error logs in first hour
- [ ] AI provider calls successful
- [ ] Database queries performing well
- [ ] No memory or timeout issues

**Common Log Patterns**:
```
✅ [INFO] AI cost monitoring initialized
✅ [INFO] Performance monitoring initialized
✅ [INFO] Prioritization completed successfully
❌ [ERROR] AI generation failed - Check API keys
❌ [WARN] Slow endpoint detected - Monitor performance
```

### 4. User Acceptance Testing

**Internal Testing** (First 24 hours):
- [ ] Test with real user accounts
- [ ] Verify all features work as expected
- [ ] Collect feedback from team

**Beta User Testing** (If applicable):
- [ ] Enable features for beta users only
- [ ] Collect feedback via forms/interviews
- [ ] Monitor usage metrics

### 5. Monitoring Dashboard

**Create Monitoring Dashboard** with:
- Total requests per hour
- Average response time
- Error rate
- AI cost per day
- Cache hit rate
- Active users

**Tools**:
- Vercel Analytics (built-in)
- Custom dashboard using monitoring APIs
- Grafana/Datadog (optional)

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- Error rate > 5%
- Critical bugs affecting core functionality
- Database corruption detected
- AI costs exceeding budget by 200%
- Performance degradation > 50%

### Rollback Methods

#### Method 1: Vercel Instant Rollback (Fastest)

**Via Dashboard**:
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click three dots → "Promote to Production"
4. Confirm rollback

**Via CLI**:
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

**Verification**:
```bash
# Check current deployment
vercel inspect --prod

# Verify rollback successful
curl https://zenith-tasks.vercel.app/api/debug/health
```

**Time to Complete**: < 2 minutes

#### Method 2: Git Revert (If needed)

```bash
# Revert commit
git revert <commit-hash>
git push origin main

# Vercel will auto-deploy reverted code
```

**Time to Complete**: 5-10 minutes (includes build time)

#### Method 3: Feature Flag Disable (Partial Rollback)

Disable problematic features without full rollback:

```bash
# Disable specific feature
curl -X POST https://zenith-tasks.vercel.app/api/admin/feature-flags \
  -H "Content-Type: application/json" \
  -d '{
    "featureKey": "ai-task-prioritization",
    "enabled": false
  }'

# Or via environment variable in Vercel dashboard
FEATURE_AI_PRIORITIZATION=false
```

**Time to Complete**: Immediate (no redeployment needed)

#### Method 4: Database Rollback (If needed)

**⚠️ Use only if database migration caused issues**

```bash
# Restore from backup branch (Neon)
# 1. Go to Neon Console
# 2. Find backup branch
# 3. Reset main branch to backup

# Or restore from pg_dump
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql
```

**Time to Complete**: 10-30 minutes (depending on data size)

### Post-Rollback Actions

1. **Verify System Stability**:
   ```bash
   # Run smoke tests
   npm run test:smoke

   # Check all endpoints
   curl https://zenith-tasks.vercel.app/api/debug/health
   ```

2. **Notify Team**:
   - Send rollback notification
   - Document reason for rollback
   - Schedule postmortem

3. **Root Cause Analysis**:
   - Review error logs
   - Identify what went wrong
   - Document learnings

4. **Plan Fix**:
   - Create bug fix branch
   - Test thoroughly on staging
   - Schedule new deployment

---

## Troubleshooting

### Issue: AI Prioritization Not Working

**Symptoms**:
- 503 Service Unavailable
- "AI service temporarily unavailable"

**Diagnosis**:
```bash
# Check AI provider configuration
curl https://zenith-tasks.vercel.app/api/debug/providers

# Check feature flag
curl https://zenith-tasks.vercel.app/api/admin/feature-flags | jq '.data.flags[] | select(.key=="ai-task-prioritization")'

# Check environment variables
vercel env ls
```

**Solutions**:
1. Verify `GEMINI_API_KEY` is set correctly
2. Check API key has sufficient quota
3. Verify `AI_SDK_PROVIDER` is set to correct provider
4. Try switching providers temporarily
5. Check rate limits at provider level

### Issue: Database Connection Failed

**Symptoms**:
- 500 Internal Server Error
- "Database connection failed"

**Diagnosis**:
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions**:
1. Verify `DATABASE_URL` is correct in Vercel
2. Check Neon database is running
3. Verify IP allowlist (if configured)
4. Check connection pool limits
5. Restart database (Neon console)

### Issue: High AI Costs

**Symptoms**:
- Cost alerts firing
- Budget exceeded warnings

**Diagnosis**:
```bash
# Check current costs
curl "https://zenith-tasks.vercel.app/api/monitoring/ai-cost?period=day"

# Check cost by user
curl "https://zenith-tasks.vercel.app/api/monitoring/ai-cost?period=day&userId=test-user"

# Check call frequency
curl https://zenith-tasks.vercel.app/api/monitoring/performance | jq '.data.aiProviders'
```

**Solutions**:
1. Reduce rate limits temporarily
2. Switch to cheaper models (e.g., gemini-flash)
3. Increase cache TTL
4. Review and optimize prompts
5. Implement user quotas
6. Disable non-essential AI features

### Issue: Slow Performance

**Symptoms**:
- Response times > 5s
- Timeout errors

**Diagnosis**:
```bash
# Check performance metrics
curl https://zenith-tasks.vercel.app/api/monitoring/performance

# Check cache performance
curl https://zenith-tasks.vercel.app/api/analytics/cache-metrics

# Check database query times
# (Review logs in Vercel dashboard)
```

**Solutions**:
1. Increase cache size: `ANALYTICS_CACHE_MAX_SIZE=2000`
2. Optimize database queries
3. Enable connection pooling
4. Switch to faster AI models
5. Reduce context size in AI prompts
6. Scale Vercel plan (if needed)

### Issue: Cache Not Working

**Symptoms**:
- Cache hit rate 0%
- Slow analytics loading every time

**Diagnosis**:
```bash
# Check cache configuration
curl https://zenith-tasks.vercel.app/api/analytics/cache-metrics

# Verify feature flag
curl https://zenith-tasks.vercel.app/api/admin/feature-flags | jq '.data.flags[] | select(.key=="analytics-caching")'
```

**Solutions**:
1. Verify `FEATURE_ANALYTICS_CACHING=true`
2. Check cache is not being invalidated too frequently
3. Increase cache TTL if needed
4. Review cache invalidation logic
5. Consider Redis for production (optional)

### Issue: Feature Flags Not Working

**Symptoms**:
- Features not enabling/disabling
- Unexpected feature behavior

**Diagnosis**:
```bash
# Check feature flags
curl https://zenith-tasks.vercel.app/api/admin/feature-flags

# Check environment variables
vercel env ls | grep FEATURE_
```

**Solutions**:
1. Clear feature flag overrides: `DELETE /api/admin/feature-flags`
2. Verify environment variables set correctly
3. Check feature dependencies
4. Review rollout percentage
5. Restart Vercel functions (redeploy)

---

## Emergency Contacts

**Team Contacts**:
- Development Lead: [Name] - [Contact]
- DevOps Lead: [Name] - [Contact]
- On-Call Engineer: [Rotation schedule]

**External Services**:
- Vercel Support: support@vercel.com
- Neon Support: support@neon.tech
- Google AI Support: [Support link]

**Escalation Path**:
1. On-call engineer (immediate)
2. Development lead (< 30 min)
3. DevOps lead (< 1 hour)
4. CTO (critical issues only)

---

## Success Metrics

Track these metrics for 7 days post-deployment:

**Performance**:
- [ ] Average response time < 1s
- [ ] P95 response time < 3s
- [ ] Error rate < 1%
- [ ] Uptime > 99.9%

**AI Features**:
- [ ] AI prioritization success rate > 95%
- [ ] Pattern detection running successfully
- [ ] Conflict detection accuracy > 90%
- [ ] Analytics insights generated successfully

**Cost**:
- [ ] Daily AI cost within budget
- [ ] Cost per user < $5/day
- [ ] No unexpected cost spikes

**User Adoption**:
- [ ] > 60% of users try AI prioritization
- [ ] > 70% of suggestions accepted
- [ ] Positive user feedback

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-11
**Next Review**: After first deployment
**Maintained By**: Development Team

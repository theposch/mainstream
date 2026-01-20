# Scheduled Drops Feature

**Status:** ✅ Complete and Production-Ready  
**Last Updated:** January 2026

> **Quick Links:** [Create a Schedule](./QUICK_START.md#schedule-recurring-newsletters) | [API Reference](./API_REFERENCE.md#schedules) | [Troubleshooting](./DATABASE_SETUP.md#troubleshooting)

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph ui [UI Layer]
        SeriesTab[Series Tab Component]
        CreateDialog[Create Series Dialog]
        DropsPage[Drops Page with Dynamic Tabs]
    end
    
    subgraph api [API Layer]
        SchedulesAPI[/api/schedules/*]
        GenerateAPI[/api/schedules/:id/generate]
    end
    
    subgraph db [Database]
        DropSchedules[(drop_schedules)]
        Drops[(drops)]
        Notifications[(notifications)]
        PgCron[pg_cron job]
    end
    
    DropsPage --> SeriesTab
    DropsPage --> CreateDialog
    CreateDialog --> SchedulesAPI
    SeriesTab --> SchedulesAPI
    SeriesTab --> GenerateAPI
    SchedulesAPI --> DropSchedules
    GenerateAPI --> Drops
    GenerateAPI --> Notifications
    PgCron --> DropSchedules
    PgCron --> Drops
    PgCron --> Notifications
```

---

## Phase 1: Database Schema

### Migration: `037_add_drop_schedules.sql`

Create new `drop_schedules` table:
- `id`, `created_by`, `name` (tab title)
- Schedule fields: `frequency`, `day_of_week`, `day_of_month`, `custom_interval_days`, `generation_time`, `timezone`
- Filter fields: `stream_ids`, `user_ids`, `date_range_mode`, `date_range_days`
- State: `status` (active/paused), `next_run_at`, `last_run_at`

Modify `drops` table:
- Add `schedule_id UUID REFERENCES drop_schedules(id) ON DELETE SET NULL`
- Add `is_superseded BOOLEAN DEFAULT FALSE`

Add RLS policies for schedules (same pattern as drops - owner only).

### Update Types

Add to `lib/types/database.ts`:
- `DropSchedule` interface
- `ScheduleFrequency` type: `'weekly' | 'biweekly' | 'monthly' | 'custom'`
- `DateRangeMode` type: `'last_n_days' | 'since_last'`
- Update `Drop` interface with `schedule_id` and `is_superseded`

---

## Phase 2: API Endpoints

### `app/api/schedules/route.ts`
- `GET` - List user's schedules (for tabs)
- `POST` - Create new schedule

### `app/api/schedules/[id]/route.ts`
- `GET` - Get schedule details + current draft info
- `PATCH` - Update schedule settings
- `DELETE` - Delete schedule (with confirmation)

### `app/api/schedules/[id]/pause/route.ts`
- `POST` - Pause schedule (set status to 'paused', clear next_run_at)

### `app/api/schedules/[id]/resume/route.ts`
- `POST` - Resume schedule (set status to 'active', calculate next_run_at)

### `app/api/schedules/[id]/generate/route.ts`
- `POST` - Generate draft now (early trigger)
- Reuses drop creation logic from existing `POST /api/drops`
- Creates notification for user

---

## Phase 3: UI Components

### 3.1 Dynamic Tabs in `drops-page-client.tsx`

Current static tabs:
```typescript
const tabs = [
  { id: "all", label: "All Drops" },
  { id: "weekly", label: "Weekly" },
  { id: "drafts", label: "My Drafts" },
];
```

Change to fetch schedules and build dynamic tabs:
```typescript
const tabs = [
  { id: "all", label: "All Drops", type: "static" },
  { id: "drafts", label: "My Drafts", type: "static" },
  ...schedules.map(s => ({ id: s.id, label: s.name, type: "schedule" })),
];
```

Remove hardcoded "weekly" tab (replaced by user-created schedules).

### 3.2 `components/drops/create-series-dialog.tsx`

New dialog for creating a schedule/series:
- Name input (becomes tab title)
- Frequency selector (weekly/biweekly/monthly/custom)
- Day picker (day of week for weekly, day of month for monthly)
- Time picker
- Date range mode (last N days / since last drop)
- Stream/User pickers (reuse existing `StreamPicker`, `UserPicker`)
- "Generate first draft now" checkbox

### 3.3 `components/drops/series-tab-content.tsx`

Content shown when a series tab is selected:
- Header: Series name, schedule summary, Edit button
- Status indicator (Active/Paused) + Next generation date
- Action buttons: Generate Now, Pause/Resume
- Current draft card (if exists) with Open Editor / Publish buttons
- Warning banner if draft is unpublished and next generation is soon

### 3.4 `components/drops/edit-series-dialog.tsx`

Same form as create, but for editing existing schedule. Pre-filled with current values.

---

## Phase 4: Server Page Updates

### `app/drops/page.tsx`

Add schedule fetching:
```typescript
const { data: schedules } = await supabase
  .from('drop_schedules')
  .select('id, name, status, next_run_at')
  .eq('created_by', user.id)
  .order('created_at');
```

Pass schedules to `DropsPageClient` as prop.

When `tab` param matches a schedule ID:
- Fetch that schedule's details
- Fetch the current draft (if any) for that schedule
- Render `SeriesTabContent` instead of `DropsGrid`

---

## Phase 5: Background Job

### Primary: Supabase pg_cron (self-hosted)

Create PostgreSQL function and pg_cron job in migration `038_add_schedule_cron.sql`:

```sql
-- Helper function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_run(
  p_frequency TEXT,
  p_day_of_week INT,
  p_day_of_month INT,
  p_generation_time TIME,
  p_timezone TEXT
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_run TIMESTAMPTZ;
  current_time_in_tz TIMESTAMPTZ;
BEGIN
  current_time_in_tz := NOW() AT TIME ZONE p_timezone;
  
  CASE p_frequency
    WHEN 'weekly' THEN
      -- Find next occurrence of day_of_week
      next_run := date_trunc('week', current_time_in_tz) 
                  + (p_day_of_week || ' days')::interval 
                  + p_generation_time;
      IF next_run <= current_time_in_tz THEN
        next_run := next_run + interval '7 days';
      END IF;
    WHEN 'biweekly' THEN
      next_run := date_trunc('week', current_time_in_tz) 
                  + (p_day_of_week || ' days')::interval 
                  + p_generation_time;
      IF next_run <= current_time_in_tz THEN
        next_run := next_run + interval '14 days';
      END IF;
    WHEN 'monthly' THEN
      next_run := date_trunc('month', current_time_in_tz) 
                  + ((p_day_of_month - 1) || ' days')::interval 
                  + p_generation_time;
      IF next_run <= current_time_in_tz THEN
        next_run := next_run + interval '1 month';
      END IF;
    ELSE
      -- Custom: handled separately with custom_interval_days
      next_run := current_time_in_tz + interval '1 day';
  END CASE;
  
  RETURN next_run AT TIME ZONE p_timezone;
END;
$$ LANGUAGE plpgsql;

-- Main function to process due schedules
CREATE OR REPLACE FUNCTION process_scheduled_drops()
RETURNS void AS $$
DECLARE
  schedule RECORD;
  new_drop_id UUID;
  date_start TIMESTAMPTZ;
  date_end TIMESTAMPTZ;
BEGIN
  FOR schedule IN 
    SELECT * FROM drop_schedules 
    WHERE status = 'active' AND next_run_at <= NOW()
  LOOP
    -- Calculate date range
    date_end := NOW();
    IF schedule.date_range_mode = 'last_n_days' THEN
      date_start := NOW() - (schedule.date_range_days || ' days')::interval;
    ELSE
      date_start := COALESCE(schedule.last_run_at, NOW() - interval '7 days');
    END IF;
    
    -- Mark existing drafts as superseded
    UPDATE drops 
    SET is_superseded = true 
    WHERE schedule_id = schedule.id AND status = 'draft';
    
    -- Create new draft drop
    INSERT INTO drops (
      title, schedule_id, created_by, status, use_blocks,
      date_range_start, date_range_end, 
      filter_stream_ids, filter_user_ids
    )
    VALUES (
      schedule.name,
      schedule.id,
      schedule.created_by,
      'draft',
      true,
      date_start,
      date_end,
      schedule.stream_ids,
      schedule.user_ids
    )
    RETURNING id INTO new_drop_id;
    
    -- Create notification
    INSERT INTO notifications (
      type, recipient_id, actor_id, 
      resource_type, resource_id, content
    )
    VALUES (
      'scheduled_drop_ready',
      schedule.created_by,
      schedule.created_by,
      'drop',
      new_drop_id,
      'Your ' || schedule.name || ' is ready to review'
    );
    
    -- Update schedule timestamps
    UPDATE drop_schedules 
    SET 
      last_run_at = NOW(), 
      next_run_at = calculate_next_run(
        schedule.frequency, 
        schedule.day_of_week, 
        schedule.day_of_month, 
        schedule.generation_time, 
        schedule.timezone
      )
    WHERE id = schedule.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule to run every 15 minutes
SELECT cron.schedule(
  'process-scheduled-drops', 
  '*/15 * * * *', 
  'SELECT process_scheduled_drops()'
);
```

### Future: Vercel Cron (cloud deployment)

Create `app/api/cron/process-schedules/route.ts` as HTTP endpoint for Vercel Cron. Same logic but in TypeScript.

---

## Phase 6: Notifications Integration

Extend existing notification system:

Add new notification type to schema/types:
- `'scheduled_drop_ready'` - Draft generated and ready to review

Update `lib/types/database.ts` NotificationType union.

Update `components/layout/notifications-popover.tsx` to handle new type with appropriate icon and link.

---

## File Summary

**New files:**
- `scripts/migrations/037_add_drop_schedules.sql`
- `scripts/migrations/038_add_schedule_cron.sql`
- `scripts/migrations/039_simplify_schedule_drafts.sql`
- `scripts/migrations/040_fix_schedule_cron.sql`
- `app/api/schedules/route.ts`
- `app/api/schedules/[id]/route.ts`
- `app/api/schedules/[id]/pause/route.ts`
- `app/api/schedules/[id]/resume/route.ts`
- `app/api/schedules/[id]/generate/route.ts`
- `components/drops/create-series-dialog.tsx`
- `components/drops/series-tab-content.tsx`
- `components/drops/edit-series-dialog.tsx`

**Modified files:**
- `lib/types/database.ts` - Add DropSchedule type, update Drop
- `app/drops/page.tsx` - Fetch schedules
- `app/drops/drops-page-client.tsx` - Dynamic tabs, series tab rendering
- `components/layout/notifications-popover.tsx` - Handle new notification type
- `docs/DROPS_FEATURE.md` - Document new feature

---

## Implementation Order

1. [x] Create feature branch `feature/scheduled-drops`
2. [x] Migration: `037_add_drop_schedules.sql` - tables and RLS
3. [x] Types: Add `DropSchedule` to `database.ts`
4. [x] API: CRUD endpoints for schedules
5. [x] API: Action endpoints (pause/resume/generate)
6. [x] UI: `CreateSeriesDialog` component
7. [x] UI: `SeriesTabContent` component
8. [x] UI: `EditSeriesDialog` component
9. [x] UI: Dynamic tabs in `drops-page-client.tsx`
10. [x] Server: Update `drops/page.tsx` for schedule fetching
11. [x] Migration: `038_add_schedule_cron.sql` - pg_cron job
12. [x] Migration: `039_simplify_schedule_drafts.sql` - Delete-and-replace logic
13. [x] Migration: `040_fix_schedule_cron.sql` - Cron fixes
14. [x] Notifications: Add type and update popover
15. [x] Cron service: Docker container for HTTP cron
16. [x] Docs: Update `DROPS_FEATURE.md`

---

## Key Implementation Details

### Design Decisions

1. **One Draft Per Schedule**: New generation deletes existing draft (not superseded)
   - Unpublished drafts = user intentionally skipped that week (holidays, etc.)
   - Simpler than maintaining draft history

2. **Biweekly Tracking**: Uses `last_run_at` for accurate 2-week spacing
   - Falls back to epoch week parity when no history exists
   - Properly handles edge cases (immediate generation, schedule updates)

3. **Cron Recovery**: If processing fails after claiming, `next_run_at` is restored
   - Prevents permanently orphaned schedules

4. **Timezone Support**: Full IANA timezone support for schedule generation times

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedules` | List user's schedules |
| POST | `/api/schedules` | Create new schedule (+ optional generate_now) |
| GET | `/api/schedules/[id]` | Get schedule with drafts |
| PATCH | `/api/schedules/[id]` | Update schedule (recalculates next_run_at) |
| DELETE | `/api/schedules/[id]` | Delete schedule |
| POST | `/api/schedules/[id]/pause` | Pause schedule |
| POST | `/api/schedules/[id]/resume` | Resume schedule |
| POST | `/api/schedules/[id]/generate` | Generate draft now |
| POST | `/api/cron/process-schedules` | Internal cron endpoint (requires CRON_SECRET) |

### Environment Variables

```env
# Required for cron endpoint
CRON_SECRET=your-secure-random-string
```

### Docker Cron Service

A lightweight Alpine container runs `crond` to call the process-schedules endpoint every 15 minutes:

```yaml
cron:
  image: alpine:3.19
  environment:
    - CRON_SECRET=${CRON_SECRET}
    - APP_URL=http://mainstream:3000
  command: |
    apk add --no-cache curl
    echo "*/15 * * * * curl -sf -X POST $${APP_URL}/api/cron/process-schedules -H 'Authorization: Bearer '$${CRON_SECRET}" > /etc/crontabs/root
    crond -f -l 2
```


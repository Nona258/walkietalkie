# Implementation Checklist - Site Member Slots

## ✅ Files Created
- [x] `utils/siteMemberSlots.ts` - All slot management functions
- [x] `SLOT_MANAGEMENT_GUIDE.md` - Complete documentation

## ✅ Files Updated
- [x] `pages/employee/SiteDetails.tsx` - Integrated slot checking and UI

## ✅ Features Implemented

### Core Functionality
- [x] `getCurrentMemberCount()` - Count active site members
- [x] `getAvailableSlots()` - Calculate remaining slots
- [x] `hasSiteSlots()` - Quick availability check
- [x] `joinSiteWithSlotManagement()` - Validate joins with slot checking
- [x] `checkAndMarkSiteAsFull()` - Auto-mark sites as full
- [x] `getSiteMemberInfo()` - Fetch complete member info

### SiteDetails Integration
- [x] Import slot management functions
- [x] Add member info state variables
- [x] Load member info on site change
- [x] Update handleAcceptSite with slot checking
- [x] Show slot availability before allowing join
- [x] Block full sites with clear error messages
- [x] Auto-update site status to Pending when full

### UI Improvements
- [x] Member slots card in site details
- [x] Show current/max members
- [x] Display available slots count
- [x] Full/Available status indicator
- [x] Color-coded UI (green=available, red=full)
- [x] Loading state for member info

## 🔄 How It Works

### Join Flow
1. Employee views "Pending" site with leader
2. Employee taps "Accept Deployment" 
3. System calls `joinSiteWithSlotManagement()`
4. If slots available → Allow join
5. If slots full → Block with message
6. After join → Call `checkAndMarkSiteAsFull()`
7. If full → Auto-update status to "Pending"

### Display Flow
1. Load site details
2. Fetch member info via `getSiteMemberInfo()`
3. Display in new member slots card
4. Show remaining slots / Full status
5. Update in real-time as members join

## 📊 Database Schema Requirements

```sql
-- Ensure sites table has members_count
ALTER TABLE sites ADD COLUMN members_count integer;

-- Ensure group_members tracks memberships
CREATE TABLE group_members (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid references sites(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  created_at timestamp default now()
);

-- Index for faster queries
CREATE INDEX idx_group_members_site_id on group_members(site_id);
CREATE INDEX idx_group_members_user_id on group_members(user_id);
```

## 🧪 Testing Checklist

### Manual Testing
- [ ] Create site with `members_count = 3`
- [ ] Assign leader via admin panel
- [ ] Try joining as 3 different employees
- [ ] 4th employee should see "Site is full" message
- [ ] Verify site status changes to "Pending" after 3rd join
- [ ] Verify member slots card updates correctly

### Edge Cases
- [ ] Site with `members_count = NULL` (should allow unlimited)
- [ ] Site with `members_count = 0` (should be immediately full)
- [ ] Concurrent joins (database constraints prevent duplicates)
- [ ] Member removal from site

## ⚙️ Configuration Options

### In `siteMemberSlots.ts`
No configuration needed - all functions work based on database values

### In `SiteDetails.tsx`
- Slot card styling: Tailwind classes (green/red colors)
- Loading indicators: Built-in ActivityIndicator
- Error messages: Customizable in handleAcceptSite

## 🚀 Deployment Notes

1. Ensure `group_members` table exists and has proper RLS
2. Database must support `members_count` column
3. Test with sample data before production
4. Monitor error logs for "Failed to get current member count"
5. RLS policies should allow user to read group_members

## 📝 Error Messages Shown to Users

| Scenario | Message |
|----------|---------|
| Site full | "This site is full and no longer accepting new members" |
| Successful join | Log remaining slots or "Site accepted. This site is now full!" |
| No leader assigned | "This site has no leader assigned yet." |
| Already accepted | "This site is already assigned to you." |
| Load error | "Failed to check available slots" |

## 🔐 Security Considerations

- ✅ RLS rules should prevent non-members from seeing member count
- ✅ Only authenticated users can join
- ✅ Users can only join sites with assigned leaders
- ✅ Join count verified server-side via database constraints
- ✅ No client-side only validation

## 🎯 Next Steps

1. Test core functionality with sample data
2. Validate UI displays correctly on all devices
3. Check performance with large member counts
4. Add admin interface to remove/manage members
5. Consider queue system for full sites

---

**Status:** ✅ Ready for testing
**Version:** 1.0
**Last Updated:** 2026-03-27

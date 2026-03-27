# Site Member Slot Management System

## Overview
This system manages site member capacity based on the `members_count` column in the sites table. Employees can only join sites if slots are available, and sites automatically transition to "Pending" status when full.

## How It Works

### Admin Flow (Site Deployment)
1. Admin sets a site with `members_count` (e.g., 10 members max)
2. Admin assigns an employee as the leader
3. Site status changes to "Pending" 
4. Site becomes available for non-leader employees to join

### Employee Flow (Site Joining)
1. Employee sees available "Pending" sites with leaders assigned
2. Employee clicks "Accept Deployment"
3. System checks available slots (max members - current members)
4. If slots available: Employee joins successfully
5. If no slots available: System blocks join with message
6. When site reaches max members: Status auto-updates to "Pending" (full)

## Key Features

### ✅ Slot Availability Checking
- Counts current members from `group_members` table
- Compares against `sites.members_count`
- Blocks joins when site is full

### ✅ Automatic Status Management
- When members reach `members_count` limit
- Site status automatically changes to "Pending"
- Prevents further joins

### ✅ User-Friendly Display
- Shows current members vs max in UI
- Displays remaining slots count
- "FULL" badge when no slots available
- Loading states for async operations

### ✅ No Limit Support
- If `members_count` is NULL, site has unlimited slots
- Always available for joining

## API Functions

### In `utils/siteMemberSlots.ts`

#### `getCurrentMemberCount(siteId: string): Promise<number>`
Returns the current number of members in a site

#### `getAvailableSlots(siteId: string): Promise<number | null>`
Returns remaining slots (null if no limit set)

#### `hasSiteSlots(siteId: string): Promise<boolean>`
Quick check if site has available slots

#### `joinSiteWithSlotManagement(siteId: string, userId: string)`
Full join validation - returns:
```typescript
{
  success: boolean;
  message: string;
  siteIsFull: boolean;
}
```

#### `checkAndMarkSiteAsFull(siteId: string): Promise<boolean>`
Marks site as full if member count reached

#### `getSiteMemberInfo(siteId: string)`
Gets complete member info for UI display:
```typescript
{
  maxMembers: number | null;
  currentMembers: number;
  availableSlots: number | null;
  isFull: boolean;
}
```

## UI Changes

### SiteDetails Component
New member slots card displays:
- Current members / Max members
- Number of slots remaining
- "FULL" status when no slots available
- Red highlight when full, green when available

## Error Handling

Attempts to join a full site:
```
Alert: "Cannot Join"
Message: "This site is full and no longer accepting new members"
```

Successful join with limited slots:
```
"Joined successfully. X slot(s) remaining."
```

Site becomes full after join:
```
"Site accepted. This site is now full!"
```

## Database Requirements

### Required Tables
- `sites` - must have `members_count` column (integer, nullable)
- `group_members` - tracks user-site membership
- `users` - stores user site assignments

### Required Columns
- `sites.members_count` - integer, nullable (no limit if null)
- `sites.status` - should be 'Active' or 'Pending'
- `sites.leader_id` - assigns site leader
- `group_members.site_id` - links users to sites
- `group_members.user_id` - identifies user

## Usage Example

```typescript
// Check if user can join
const result = await joinSiteWithSlotManagement(siteId, userId);

if (result.success) {
  // Add user to site
  await addUserToSite(siteId, userId);
  
  // Check if site is now full
  const isFull = await checkAndMarkSiteAsFull(siteId);
  if (isFull) {
    console.log('Site is now full');
  }
} else {
  Alert.alert('Cannot Join', result.message);
}
```

## Edge Cases Handled

✅ NULL `members_count` - unlimited slots  
✅ Site with 0 members_count - always full  
✅ Concurrent joins - database constraints prevent duplicates  
✅ Deleted members - count updates automatically  
✅ Archived sites - separate tracking  

## Future Enhancements

- Queue system for when site is full
- Waiting list management
- Member removal handling
- Real-time slot updates
- Admin override capabilities

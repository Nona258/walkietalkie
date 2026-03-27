import supabase from './supabase';

/**
 * Get the current member count for a site
 * Counts active members from group_members table for a given site
 */
export async function getCurrentMemberCount(siteId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('id', { count: 'exact' })
      .eq('site_id', siteId);

    if (error) throw error;
    return data?.length || 0;
  } catch (err) {
    console.error('Failed to get current member count:', err);
    return 0;
  }
}

/**
 * Get available slots for a site
 * Returns the remaining slots based on members_count - current members
 */
export async function getAvailableSlots(siteId: string): Promise<number | null> {
  try {
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('members_count')
      .eq('id', siteId)
      .maybeSingle();

    if (siteError) throw siteError;

    const maxMembers = siteData?.members_count;
    if (maxMembers === null || maxMembers === undefined) {
      return null; // No member limit set
    }

    const currentCount = await getCurrentMemberCount(siteId);
    return Math.max(0, maxMembers - currentCount);
  } catch (err) {
    console.error('Failed to get available slots:', err);
    return null;
  }
}

/**
 * Check if a site has available slots
 * Returns true if site has slots available, false if full
 */
export async function hasSiteSlots(siteId: string): Promise<boolean> {
  const availableSlots = await getAvailableSlots(siteId);
  
  // If no members_count is set, site is always open
  if (availableSlots === null) {
    return true;
  }
  
  return availableSlots > 0;
}

/**
 * Join a user to a site with slot management
 * Adds user to the site and checks if site should be marked as full
 * Returns { success: boolean; message: string; siteIsFull: boolean }
 */
export async function joinSiteWithSlotManagement(
  siteId: string,
  userId: string
): Promise<{ success: boolean; message: string; siteIsFull: boolean }> {
  try {
    // Check available slots BEFORE joining
    const availableSlots = await getAvailableSlots(siteId);
    
    // If members_count is not set, no slot limit
    if (availableSlots === null) {
      return {
        success: true,
        message: 'Joined successfully (no member limit)',
        siteIsFull: false,
      };
    }

    // Check if site is full
    if (availableSlots <= 0) {
      return {
        success: false,
        message: 'This site is full and no longer accepting new members',
        siteIsFull: true,
      };
    }

    // All checks passed, user can join
    return {
      success: true,
      message: `Joined successfully. ${availableSlots - 1} slot(s) remaining.`,
      siteIsFull: availableSlots - 1 === 0, // Will be full after this join
    };
  } catch (err) {
    console.error('Failed during join slot management check:', err);
    return {
      success: false,
      message: 'Failed to check available slots',
      siteIsFull: false,
    };
  }
}

/**
 * Check if site should be marked as full and update status if needed
 * Returns true if site was updated to full status
 */
export async function checkAndMarkSiteAsFull(siteId: string): Promise<boolean> {
  try {
    // Get site members_count and current member count
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('members_count, status')
      .eq('id', siteId)
      .maybeSingle();

    if (siteError) throw siteError;

    const maxMembers = siteData?.members_count;
    const currentStatus = siteData?.status;

    // No member limit set
    if (maxMembers === null || maxMembers === undefined) {
      return false;
    }

    // Get current member count
    const currentCount = await getCurrentMemberCount(siteId);

    // If site is now FULL, update status to Pending
    if (currentCount >= maxMembers && currentStatus === 'Active') {
      const { error: updateError } = await supabase
        .from('sites')
        .update({ status: 'Pending' })
        .eq('id', siteId);

      if (updateError) throw updateError;
      return true;
    }

    return false;
  } catch (err) {
    console.error('Failed to check and mark site as full:', err);
    return false;
  }
}

/**
 * Get site member details (for display)
 */
export async function getSiteMemberInfo(siteId: string): Promise<{
  maxMembers: number | null;
  currentMembers: number;
  availableSlots: number | null;
  isFull: boolean;
}> {
  try {
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('members_count')
      .eq('id', siteId)
      .maybeSingle();

    if (siteError) throw siteError;

    const maxMembers = siteData?.members_count;
    const currentMembers = await getCurrentMemberCount(siteId);
    const availableSlots =
      maxMembers === null ? null : Math.max(0, maxMembers - currentMembers);
    const isFull = maxMembers !== null && currentMembers >= maxMembers;

    return {
      maxMembers,
      currentMembers,
      availableSlots,
      isFull,
    };
  } catch (err) {
    console.error('Failed to get site member info:', err);
    return {
      maxMembers: null,
      currentMembers: 0,
      availableSlots: null,
      isFull: false,
    };
  }
}

/**
 * Get list of members who joined a site
 * Returns members with their details from users table
 */
export async function getSiteMembers(siteId: string): Promise<
  Array<{
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    profilePictureUrl: string | null;
    role: string;
    joinedAt: string | null;
  }>
> {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(
        `
        id,
        created_at,
        user:user_id (
          id,
          full_name,
          email,
          phone_number,
          profile_picture_url,
          role
        )
      `
      )
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map the response to a cleaner format
    return (data || []).map((item: any) => ({
      id: item.user?.id || '',
      fullName: item.user?.full_name || 'Unknown',
      email: item.user?.email || '',
      phoneNumber: item.user?.phone_number || null,
      profilePictureUrl: item.user?.profile_picture_url || null,
      role: item.user?.role || 'member',
      joinedAt: item.created_at || null,
    }));
  } catch (err) {
    console.error('Failed to get site members:', err);
    return [];
  }
}

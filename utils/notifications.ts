import supabase from './supabase';

export type AppNotification = {
  id: number;
  created_at: string;
  user_id: string | null;
  title: string | null;
  body: string | null;
  view_status: boolean | null;
};

async function safeGetUserFullName(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.full_name as string | null) || null;
  } catch (e) {
    console.warn('safeGetUserFullName failed:', (e as any)?.message || String(e));
    return null;
  }
}

export async function createNotification(params: {
  userId: string;
  title: string;
  body: string;
}): Promise<boolean> {
  const { userId, title, body } = params;
  if (!userId) return false;
  try {
    const { error } = await supabase
      .from('notification')
      .insert([{ user_id: userId, title, body }]);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('createNotification failed:', (e as any)?.message || String(e));
    return false;
  }
}

export async function createNotificationsBulk(params: {
  userIds: string[];
  title: string;
  body: string;
}): Promise<boolean> {
  const { userIds, title, body } = params;
  const unique = Array.from(new Set((userIds || []).filter(Boolean)));
  if (unique.length === 0) return false;

  try {
    const payload = unique.map((id) => ({ user_id: id, title, body }));
    const { error } = await supabase.from('notification').insert(payload);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('createNotificationsBulk failed:', (e as any)?.message || String(e));
    return false;
  }
}

export async function fetchMyNotifications(limit: number = 30): Promise<AppNotification[]> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return [];

    const { data, error } = await supabase
      .from('notification')
      .select('id, created_at, user_id, title, body, view_status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as AppNotification[];
  } catch (e) {
    console.warn('fetchMyNotifications failed:', (e as any)?.message || String(e));
    return [];
  }
}

export async function fetchMyUnreadNotificationCount(): Promise<number> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notification')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('view_status', false);
    if (error) throw error;
    return count ?? 0;
  } catch (e) {
    console.warn('fetchMyUnreadNotificationCount failed:', (e as any)?.message || String(e));
    return 0;
  }
}

// Marks all unread notifications for the current user as viewed.
// Best-effort: returns false if update fails.
export async function markMyNotificationsViewed(): Promise<boolean> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return false;

    const { error } = await supabase
      .from('notification')
      .update({ view_status: true })
      .eq('user_id', user.id)
      .eq('view_status', false);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('markMyNotificationsViewed failed:', (e as any)?.message || String(e));
    return false;
  }
}

// Deletes notifications older than N days for the current user.
// Best-effort: returns number of deleted rows when available, else 0.
export async function deleteMyNotificationsOlderThan(days: number = 7): Promise<number> {
  try {
    const safeDays = Number.isFinite(days) && days > 0 ? days : 7;
    const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return 0;

    const { data, error } = await supabase
      .from('notification')
      .delete()
      .eq('user_id', user.id)
      .lt('created_at', cutoff)
      .select('id');
    if (error) throw error;

    return (data || []).length;
  } catch (e) {
    console.warn('deleteMyNotificationsOlderThan failed:', (e as any)?.message || String(e));
    return 0;
  }
}

export async function notifyNewSiteCreated(params: {
  siteName: string;
  leaderId: string | null;
  siteStatus: string;
}): Promise<void> {
  const { siteName, leaderId, siteStatus } = params;

  const leaderName = leaderId ? await safeGetUserFullName(leaderId) : null;
  const leaderText = leaderId ? leaderName || 'Unknown leader' : 'No leader assigned';

  const title = 'New site created';
  const body = `Site: ${siteName}\nStatus: ${siteStatus}\nLeader: ${leaderText}`;

  // Default scope: approved, non-admin users.
  // (Adjust filters if you want admins to receive these too.)
  const { data: users, error } = await supabase
    .from('users')
    .select('id')
    .eq('is_approved', true)
    .neq('role', 'admin');

  if (error) {
    console.warn('notifyNewSiteCreated: failed to fetch users:', error.message);
    return;
  }

  const userIds = (users || [])
    .map((u: any) => (u?.id ? String(u.id) : null))
    .filter(Boolean) as string[];

  await createNotificationsBulk({ userIds, title, body });
}

export async function notifyLeaderSiteAccepted(params: {
  leaderId: string;
  siteName: string;
  acceptedByUserId: string;
}): Promise<void> {
  const { leaderId, siteName, acceptedByUserId } = params;
  if (!leaderId) return;

  const accepterName = await safeGetUserFullName(acceptedByUserId);
  const who = accepterName || 'A member';

  await createNotification({
    userId: leaderId,
    title: 'Site accepted',
    body: `${who} accepted site: ${siteName}`,
  });
}
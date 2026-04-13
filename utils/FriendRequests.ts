import supabase from './supabase';
import { createNotification } from './notifications';

// Send a contact request (status: requesting)
export async function sendContactRequest(fromUserId: string, toUserId: string) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) throw new Error('Invalid user IDs');
  // Check if already exists
  const { data: existing } = await supabase
    .from('contacts')
    .select('id, status')
    .eq('user_id', fromUserId)
    .eq('contact_id', toUserId)
    .maybeSingle();
  if (existing && existing.status !== 'denied') throw new Error('Request already sent or already friends');

  // Insert request
  await supabase.from('contacts').upsert([
    { user_id: fromUserId, contact_id: toUserId, status: 'requesting' },
  ], { onConflict: 'user_id,contact_id' });

  // Notify the recipient. Include the sender id in the body so the recipient
  // UI can show Accept/Deny buttons and call respondToContactRequest.
  let senderName = '';
  try {
    const { data: userRow } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', fromUserId)
      .maybeSingle();
    senderName = (userRow && userRow.full_name) ? String(userRow.full_name) : '';
  } catch (err) {
    // ignore
  }

  const bodyLines = [] as string[];
  bodyLines.push(`__sender_id__:${fromUserId}`);
  if (senderName) bodyLines.push(`From: ${senderName}`);
  bodyLines.push('You have a new contact request. Accept or deny it in your contacts list.');

  await createNotification({
    userId: toUserId,
    title: 'Contact Request',
    body: bodyLines.join('\n'),
  });
}

// Accept or deny a contact request
export async function respondToContactRequest(fromUserId: string, toUserId: string, accept: boolean) {
  if (accept) {
    // Update status to friends
    await supabase.from('contacts')
      .update({ status: 'friends' })
      .eq('user_id', fromUserId)
      .eq('contact_id', toUserId);
    // Add reverse row if not exists
    const { count } = await supabase.from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', toUserId)
      .eq('contact_id', fromUserId);
    if (!count) {
      await supabase.from('contacts').insert([
        { user_id: toUserId, contact_id: fromUserId, status: 'friends' },
      ]);
    } else {
      await supabase.from('contacts')
        .update({ status: 'friends' })
        .eq('user_id', toUserId)
        .eq('contact_id', fromUserId);
    }
  } else {
    // Denied: delete the request
    await supabase.from('contacts')
      .delete()
      .eq('user_id', fromUserId)
      .eq('contact_id', toUserId);
  }
}

// Get pending requests for the current user
export async function getPendingContactRequests(userId: string) {
  const { data, error } = await supabase
    .from('contacts')
    .select('user_id, contact_id, status')
    .eq('contact_id', userId)
    .eq('status', 'requesting');
  if (error) throw error;
  return data;
}
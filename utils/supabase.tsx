import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pwhyilxcwmpjavexcanp.supabase.co";
const supabaseKey = "sb_publishable_G9NAjchBc59ioQYRlc5stQ_6FoYRWb5";
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;

export async function getSites() {
	const { data, error } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
	if (error) throw error;
	return data;
}

// Search users by email or phone (partial match)
export async function searchUsers(query: string) {
	const q = (query || '').trim();
	if (!q) return [];
	// Use '*' wildcard in Supabase JS .or() filter to avoid manual percent-encoding issues.
	// sanitize query to avoid injecting reserved characters
	const safe = q.replace(/\*/g, '').replace(/[()]/g, '');
	const filter = `email.ilike.*${safe}*,phone_number.ilike.*${safe}*`;
	const { data, error } = await supabase
		.from('users')
		.select('id,email,full_name,phone_number,profile_picture_url,status')
		.or(filter)
		.limit(20);
	if (error) {
		console.error('searchUsers error:', error);
		throw error;
	}
	return data;
}

// Get all employees
export async function getEmployees() {
	const { data, error } = await supabase
		.from('users')
		.select('*')
		.eq('role', 'employee')
		.order('created_at', { ascending: false });
	if (error) throw error;
	return data;
}

// Add a contact row for the given user id.
export async function addContact(contactUserId: string) {
	if (!contactUserId) throw new Error('contactUserId required');
	const { data: authData, error: authError } = await supabase.auth.getUser();
	if (authError) throw authError;
	const meId = authData?.user?.id;
	if (!meId) throw new Error('not authenticated');
	if (meId === contactUserId) throw new Error("you can't add yourself as a contact");

	const { data, error } = await supabase
		.from('contacts')
		.insert([{ user_id: meId, contact_id: contactUserId }])
		.select('id,user_id,contact_id,created_at')
		.single();

	if (error) {
		// Unique constraint violation (contact already added)
		if ((error as any)?.code === '23505') {
			throw new Error('Contact already exists');
		}
		throw error;
	}
	return data;
}

// Get current authenticated user
export async function getCurrentUser() {
	const { data: { user }, error } = await supabase.auth.getUser();
	if (error) throw error;
	return user;
}

// Get current user's profile row from `public.users` table
export async function getCurrentUserProfile() {
	const { data: { user }, error: authErr } = await supabase.auth.getUser();
	if (authErr) throw authErr;
	if (!user || !user.id) return null;

	const { data, error } = await supabase
		.from('users')
		.select('id, email, full_name, phone_number, profile_picture_url, role, status, group_id')
		.eq('id', user.id)
		.single();

	if (error) throw error;
	return data;
}

// Get all contacts for current user with user details
export async function getUserContacts() {
	const user = await getCurrentUser();
	if (!user) return [];

	// Query contacts for the current user
	const { data: contactRows, error: contactsError } = await supabase
		.from('contacts')
		.select('contact_id, created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false });

	if (contactsError) throw contactsError;

	const contactIds = Array.from(
		new Set((contactRows || []).map((r: any) => r.contact_id).filter((id: any) => !!id))
	);
	if (!contactIds.length) return [];

	const { data: usersData, error: usersError } = await supabase
		.from('users')
		.select('id, full_name, email, role, status')
		.in('id', contactIds);
	if (usersError) throw usersError;

	const usersMap = new Map<string, any>();
	(usersData || []).forEach((u: any) => usersMap.set(u.id, u));

	return (contactRows || []).map((row: any) => {
		const u = usersMap.get(row.contact_id);
		const fullName = u?.full_name || u?.email || 'Unknown';
		const initials = fullName
			.split(' ')
			.filter(Boolean)
			.map((n: string) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
		return {
			id: row.contact_id,
			name: fullName,
			location: u?.email || 'N/A',
			members: null,
			initials: initials || 'UU',
			color: '#99f6e4',
			online: u?.status === 'online',
		};
	});
}

// Remove a contact by user_id
export async function removeContact(contactUserId: string) {
	if (!contactUserId) throw new Error('contactUserId required');
	const { data: authData, error: authError } = await supabase.auth.getUser();
	if (authError) throw authError;
	const meId = authData?.user?.id;
	if (!meId) throw new Error('not authenticated');

	const { error } = await supabase
		.from('contacts')
		.delete()
		.eq('user_id', meId)
		.eq('contact_id', contactUserId);
	if (error) throw error;
}

// Upload a voice file (local URI) to the `voice_messages` storage bucket and
// return a public URL. Caller should ensure the `voice_messages` bucket exists.
export async function uploadVoiceFile(uri: string) {
	if (!uri) throw new Error('uri required');
	const resp = await fetch(uri);
	const blob = await resp.blob();
	const ext = (uri.split('.').pop() || '').split('?')[0] || 'm4a';
	const name = `voice_${Date.now()}.${ext}`;
	const contentType = blob.type || `audio/${ext}`;
	const { data, error } = await supabase.storage
		.from('voice_messages')
		.upload(name, blob, { upsert: true, contentType });
	if (error) throw error;

	const { data: urlData } = supabase.storage.from('voice_messages').getPublicUrl(name);
	return urlData?.publicUrl || null;
}

// Insert a row into `transcribe_messages` linking the uploaded file to the
// current authenticated user. Returns the inserted row.
export async function addTranscribeMessage(fileUrl: string, transcription: string | null = null, durationMs?: number) {
	const { data: { user } } = await supabase.auth.getUser();
	if (!user || !user.id) throw new Error('not authenticated');

	const payload: any = {
		user_id: user.id,
		file_url: fileUrl,
		transcription: transcription || null,
	};
	if (typeof durationMs === 'number') payload.duration_ms = durationMs;

	const { data, error } = await supabase
		.from('transcribe_messages')
		.insert([payload])
		.select()
		.single();
	if (error) throw error;
	return data;
}

// Get pending (unapproved) users for admin approval
export async function getPendingUsers() {
	const { data, error } = await supabase
		.from('users')
		.select('*')
		.eq('is_approved', false)
		.neq('role', 'admin')
		.order('created_at', { ascending: false });
	if (error) throw error;
	return data;
}

// Approve a user by ID
export async function approveUser(userId: string) {
	const { data, error } = await supabase
		.from('users')
		.update({ is_approved: true })
		.eq('id', userId)
		.select()
		.single();
	if (error) throw error;
	return data;
}

// Delete a user by ID (removes from users table)
export async function deleteUserAccount(userId: string) {
	const { error } = await supabase
		.from('users')
		.delete()
		.eq('id', userId);
	if (error) throw error;
	
	// Note: Auth user deletion requires admin access. 
	// Admins should manually delete from auth.users in Supabase dashboard if needed,
	// or use a server-side function with admin privileges.
}


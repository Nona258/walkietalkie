import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://blwojfybxsllgcwumiav.supabase.co";
const supabaseKey = "sb_publishable_GIQVmSJ0TmTNVrjk3ZHdIA_y4238CS6";
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
// Note: `contacts` schema in your DB only has `user_id`; this inserts that user.
export async function addContact(contactUserId: string) {
	if (!contactUserId) throw new Error('contactUserId required');
	const { data, error } = await supabase
		.from('contacts')
		.insert([{ user_id: contactUserId }])
		.select()
		.single();
	if (error) throw error;
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
		.select('id, email, full_name, phone_number, profile_picture_url, role, status')
		.eq('id', user.id)
		.single();

	if (error) throw error;
	return data;
}

// Get all contacts for current user with user details
export async function getUserContacts() {
	const user = await getCurrentUser();
	if (!user) return [];
	
	// Query contacts table where the admin user has saved contacts
	const { data, error } = await supabase
		.from('contacts')
		.select('user_id, users(id, full_name, email)')
		.order('created_at', { ascending: false });
	
	if (error) throw error;
	
	// Flatten the structure and map to Contact format
	return (data || []).map((contact: any) => {
		const fullName = contact.users?.full_name || 'Unknown';
		const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
		
		return {
			id: contact.user_id,
			name: fullName,
			location: contact.users?.email || 'N/A',
			members: null,
			initials: initials || 'UU',
			color: '#99f6e4',
			online: true,
		};
	});
}

// Remove a contact by user_id
export async function removeContact(contactUserId: string) {
	if (!contactUserId) throw new Error('contactUserId required');
	const { error } = await supabase
		.from('contacts')
		.delete()
		.eq('user_id', contactUserId);
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


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


import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = "https://pwhyilxcwmpjavexcanp.supabase.co";
const supabaseKey = "sb_publishable_G9NAjchBc59ioQYRlc5stQ_6FoYRWb5";
const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});

export default supabase;

export async function getSites() {
	const { data, error } = await supabase.from('sites').select('*').order('created_at', { ascending: false });
	if (error) throw error;
	return data;
}

// Search users by name, email, or phone. If query is empty, returns all users.
export async function searchUsers(query?: string) {
	const q = (query || '').trim();
	// Sanitize query to avoid injecting reserved Supabase filter characters
	const safe = q.replace(/[*()]/g, '');
	let req = supabase
		.from('users')
		.select('id,email,full_name,phone_number,profile_picture_url,status,role')
		.order('full_name')
		.limit(100);
	if (safe) {
		req = req.or(`email.ilike.*${safe}*,phone_number.ilike.*${safe}*,full_name.ilike.*${safe}*`);
	}
	const { data, error } = await req;
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
// Uses upsert so re-adding an existing contact never throws.
export async function addContact(contactUserId: string) {
	if (!contactUserId) throw new Error('contactUserId required');
	
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	if (authError || !user) throw new Error('Unable to get current user');
	
	const { data, error } = await supabase
		.from('contacts')
		.upsert(
			[{ user_id: user.id, contact_id: contactUserId }],
			{ onConflict: 'user_id,contact_id', ignoreDuplicates: true }
		)
		.select()
		.maybeSingle();
	if (error) throw error;
	return data;
}

// Find or create a 1-to-1 conversation between two users.
// IDs are stored in sorted order to guarantee uniqueness regardless of who initiates.
export async function getOrCreateConversation(
	meId: string,
	contactUserId: string
): Promise<string | null> {
	if (!meId || !contactUserId || meId === contactUserId) return null;
	try {
		// Fetch all conversations (client-side filter avoids 406 errors from .or() on some setups)
		const { data: all, error: fetchError } = await supabase
			.from('conversations')
			.select('id, user_one, user_two');
		if (fetchError) throw fetchError;

		const existing = (all || []).find(
			(c: any) =>
				(c.user_one === meId && c.user_two === contactUserId) ||
				(c.user_one === contactUserId && c.user_two === meId)
		);
		if (existing) return existing.id as string;

		// Sort so both sides always produce the same row order
		const userOne = meId < contactUserId ? meId : contactUserId;
		const userTwo = meId < contactUserId ? contactUserId : meId;

		const { data: created, error: createError } = await supabase
			.from('conversations')
			.insert([{ user_one: userOne, user_two: userTwo }])
			.select('id')
			.single();
		if (createError) throw createError;
		return (created?.id as string) ?? null;
	} catch (e) {
		console.error('getOrCreateConversation error:', e);
		return null;
	}
}

// Get current authenticated user
export async function getCurrentUser() {
	const { data: { user }, error } = await supabase.auth.getUser();
	if (error) throw error;
	return user;
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


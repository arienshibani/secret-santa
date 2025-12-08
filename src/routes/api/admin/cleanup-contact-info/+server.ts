import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminSession } from '$lib/auth/session';
import { supabaseAdmin } from '$lib/supabase/server';

export const GET: RequestHandler = async (event) => {
	const session = getAdminSession(event);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Call the database function
		const { error } = await supabaseAdmin.rpc('cleanup_old_contact_info');
		if (error) throw error;
		return json({ success: true });
	} catch (error) {
		console.error('Error cleaning up contact info:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};


import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminSession } from '$lib/auth/session';
import { supabaseAdmin } from '$lib/supabase/server';

export const GET: RequestHandler = async (event) => {
	const session = getAdminSession(event);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const eventName = event.url.searchParams.get('eventName');
	if (!eventName || eventName !== session.eventName) {
		return json({ error: 'Invalid event' }, { status: 403 });
	}

	try {
		const { data, error } = await supabaseAdmin
			.from('admin_config')
			.select('pin')
			.eq('event_name', eventName)
			.single();

		if (error || !data) {
			return json({ error: 'Config not found' }, { status: 404 });
		}

		// Only return PIN if authenticated (admin has logged in)
		return json({ pin: data.pin });
	} catch (error) {
		console.error('Error fetching admin config:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};


import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminSession } from '$lib/auth/session';
import { supabaseAdmin } from '$lib/supabase/server';
import type { Participant } from '$lib/utils/types';

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
			.from('participants')
			.select('*')
			.eq('event_name', eventName)
			.order('created_at');

		if (error) throw error;
		return json({ participants: (data || []) as Participant[] });
	} catch (error) {
		console.error('Error fetching participants:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};


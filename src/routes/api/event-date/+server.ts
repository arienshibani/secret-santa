import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase/server';

export const GET: RequestHandler = async (event) => {
	const eventName = event.url.searchParams.get('eventName');
	if (!eventName) {
		return json({ error: 'Event name required' }, { status: 400 });
	}

	try {
		const { data, error } = await supabaseAdmin
			.from('admin_config')
			.select('event_date')
			.eq('event_name', eventName)
			.single();

		if (error) {
			// If event not found, return null (backwards compatible)
			if (error.code === 'PGRST116') {
				return json({ eventDate: null });
			}
			throw error;
		}
		
		return json({ eventDate: data?.event_date || null });
	} catch (error) {
		console.error('Error fetching event date:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};


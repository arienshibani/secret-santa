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
			.select('event_date')
			.eq('event_name', eventName)
			.single();

		if (error) throw error;
		return json({ eventDate: data?.event_date || null });
	} catch (error) {
		console.error('Error fetching event date:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async (event) => {
	const session = getAdminSession(event);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { eventName, eventDate } = await event.request.json();

		if (!eventName || eventName !== session.eventName) {
			return json({ error: 'Invalid event' }, { status: 403 });
		}

		// Validate date is not in the past (if provided)
		if (eventDate) {
			const eventDateObj = new Date(eventDate);
			const now = new Date();
			// Set time to start of day for comparison
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const eventDateOnly = new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), eventDateObj.getDate());
			
			if (eventDateOnly < today) {
				return json({ error: 'Event date cannot be in the past' }, { status: 400 });
			}
		}

		const { error: updateError } = await supabaseAdmin
			.from('admin_config')
			.update({ event_date: eventDate || null })
			.eq('event_name', eventName);

		if (updateError) throw updateError;

		// Trigger cleanup after updating date
		await supabaseAdmin.rpc('cleanup_old_contact_info');

		return json({ success: true });
	} catch (error: any) {
		console.error('Error updating event date:', error);
		if (error.message?.includes('past')) {
			return json({ error: error.message }, { status: 400 });
		}
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};


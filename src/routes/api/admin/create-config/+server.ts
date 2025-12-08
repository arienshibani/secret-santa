import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase/server';
import type { AdminConfig } from '$lib/utils/types';

export const POST: RequestHandler = async (event) => {
	try {
		const { eventName, pin, eventDate } = await event.request.json();

		if (!eventName || !pin || typeof pin !== 'string' || pin.length !== 6) {
			return json({ error: 'Invalid request' }, { status: 400 });
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

		// Check if config already exists
		const { data: existing } = await supabaseAdmin
			.from('admin_config')
			.select('id')
			.eq('event_name', eventName)
			.single();

		if (existing) {
			return json({ error: 'Admin config already exists for this event' }, { status: 409 });
		}

		// Create admin config using service role (bypasses RLS)
		const { data, error } = await supabaseAdmin
			.from('admin_config')
			.insert({ event_name: eventName, pin, event_date: eventDate || null })
			.select()
			.single();

		if (error) {
			console.error('Error creating admin config:', error);
			throw error;
		}

		return json({ config: data as AdminConfig });
	} catch (error: any) {
		console.error('Error creating admin config:', error);
		if (error.code === '23505') {
			// Unique constraint violation
			return json({ error: 'Admin config already exists for this event' }, { status: 409 });
		}
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};


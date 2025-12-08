import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/supabase/server';
import type { AdminConfig } from '$lib/utils/types';

export const POST: RequestHandler = async (event) => {
	try {
		const { eventName, pin } = await event.request.json();

		if (!eventName || !pin || typeof pin !== 'string' || pin.length !== 6) {
			return json({ error: 'Invalid request' }, { status: 400 });
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
			.insert({ event_name: eventName, pin })
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


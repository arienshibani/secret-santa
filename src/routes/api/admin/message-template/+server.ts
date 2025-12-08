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
			.select('message_template, email_subject')
			.eq('event_name', eventName)
			.single();

		if (error) throw error;

		return json({
			messageTemplate: data?.message_template || null,
			emailSubject: data?.email_subject || null
		});
	} catch (error) {
		console.error('Error fetching message template:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async (event) => {
	const session = getAdminSession(event);
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { eventName, messageTemplate, emailSubject } = await event.request.json();

		if (!eventName || eventName !== session.eventName) {
			return json({ error: 'Invalid event' }, { status: 403 });
		}

		const updates: { message_template?: string | null; email_subject?: string | null } = {};
		if (messageTemplate !== undefined) {
			updates.message_template = messageTemplate || null;
		}
		if (emailSubject !== undefined) {
			updates.email_subject = emailSubject || null;
		}

		const { error } = await supabaseAdmin
			.from('admin_config')
			.update(updates)
			.eq('event_name', eventName);

		if (error) throw error;

		return json({ success: true });
	} catch (error) {
		console.error('Error updating message template:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};


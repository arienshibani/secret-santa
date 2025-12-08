export type ContactMethod = 'sms' | 'email' | 'both';

export interface Participant {
	id: string;
	event_name: string;
	name: string;
	email: string | null;
	sms: string | null;
	token: string;
	assigned_to_id: string | null;
	gift_ready: boolean;
	created_at: string;
}

export interface ParticipantFormData {
	name: string;
	email?: string;
	sms?: string;
}

export interface AdminConfig {
	id: string;
	event_name: string;
	pin: string;
	message_template: string | null;
	email_subject: string | null;
	created_at: string;
}

export interface AssignmentResult {
	participant: Participant;
	assignedTo: Participant;
	url: string;
}

export type Language = 'en' | 'nb' | 'nn';


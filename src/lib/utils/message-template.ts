import type { Language } from './types';

export const getDefaultMessageTemplate = (language: Language): string => {
	switch (language) {
		case 'nb':
			return `Hei {{participantsName}} 🎅✨

Julenissen rapporterer om akutt gavekrise og trenger umiddelbar bistand. Du er derfor uteksaminert som hemmelig Hjælpenisse. Ditt Nissebarn venter på deg i lenken under. Utfør oppdraget med presis glede og mild kaos.

👉 {{url}}`;
		case 'nn':
			return `Hei {{participantsName}} 🎅✨

Julenissen melder om akutt gåvekrise og treng rask bistand. Du er dermed uteksaminert som hemmeleg Hjelpenisse. Nissebarnet ditt ventar på deg i lenkja under. Utfør oppdraget med presis glede og lett kaos.

👉 {{url}}`;
		case 'en':
		default:
			return `Hello {{participantsName}} 🎅✨

Santa reports an acute gift crisis and requires immediate assistance. You are therefore certified as a Secret Helper Elf. Your assigned Gift Child awaits you in the link below. Execute the mission with precise cheer and controlled chaos.

👉 {{url}}`;
	}
};

export const getDefaultEmailSubject = (language: Language): string => {
	switch (language) {
		case 'nb':
			return `Din Secret Santa-tildeling for {{eventName}} 🎄`;
		case 'nn':
			return `Din Secret Santa-tildeling for {{eventName}} 🎄`;
		case 'en':
		default:
			return `Your Secret Santa Assignment for {{eventName}} 🎄`;
	}
};

export const replaceTemplatePlaceholders = (
	template: string,
	params: { participantsName?: string; url?: string; eventName?: string }
): string => {
	return template
		.replace(/\{\{participantsName\}\}/g, params.participantsName || '')
		.replace(/\{\{url\}\}/g, params.url || '')
		.replace(/\{\{eventName\}\}/g, params.eventName || '');
};


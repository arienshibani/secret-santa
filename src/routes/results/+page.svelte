<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import SnowEffect from '$lib/components/SnowEffect.svelte';
	import { getAllParticipants } from '$lib/supabase/db';
	import { getAssignmentUrl } from '$lib/utils/token';
	import type { Participant, AssignmentResult } from '$lib/utils/types';

	let eventName = '';
	let participants: Participant[] = [];
	let assignments: AssignmentResult[] = [];
	let copiedIndex: number | null = null;
	let adminPin: string | null = null;
	let adminUrlCopied = false;

	$: eventName = $page.url.searchParams.get('eventName') || '';

	onMount(async () => {
		if (!eventName) {
			goto('/');
			return;
		}

		try {
			const all = await getAllParticipants(eventName);
			participants = all;

			// Build assignment results
			const results: AssignmentResult[] = [];
			for (const participant of all) {
				if (participant.assigned_to_id) {
					const assignedTo = all.find((p) => p.id === participant.assigned_to_id);
					if (assignedTo) {
						results.push({
							participant,
							assignedTo,
							url: getAssignmentUrl(participant.token)
						});
					}
				}
			}
			assignments = results;

			// Get admin PIN from sessionStorage (stored during setup)
			if (typeof window !== 'undefined') {
				const storedPin = sessionStorage.getItem(`adminPin_${eventName}`);
				if (storedPin) {
					adminPin = storedPin;
				}
			}
		} catch (error) {
			console.error('Error loading participants:', error);
			alert('Error loading results. Please try again.');
		}
	});

	const copyToClipboard = async (url: string, index: number) => {
		try {
			await navigator.clipboard.writeText(url);
			copiedIndex = index;
			setTimeout(() => {
				copiedIndex = null;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	};

	const getSmsUrl = (phone: string, url: string): string => {
		const message = $t('results.smsMessage', { url, eventName: eventName || 'Secret Santa' });
		return `sms:${phone}?body=${encodeURIComponent(message)}`;
	};

	const getEmailUrl = (email: string, participantName: string, url: string): string => {
		const subject = $t('results.emailSubject', { eventName: eventName || 'Secret Santa' });
		const body = $t('results.emailBody', { name: participantName, url, eventName: eventName || 'Secret Santa' });
		return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	};

	const copyAdminUrl = async () => {
		if (!eventName || typeof window === 'undefined') return;
		const adminUrl = `${window.location.origin}/admin/${eventName}`;
		try {
			await navigator.clipboard.writeText(adminUrl);
			adminUrlCopied = true;
			setTimeout(() => {
				adminUrlCopied = false;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	};

	const getAdminUrl = (): string => {
		if (typeof window === 'undefined' || !eventName) return '';
		return `${window.location.origin}/admin/${eventName}`;
	};
</script>

<svelte:head>
	<title>Assignments Ready! 🎅</title>
</svelte:head>

<div class="min-h-screen relative z-10 flex items-center justify-center p-4">
	<SnowEffect />
	<div class="max-w-4xl w-full">
		<div class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12">
			<div class="flex justify-between items-start mb-6">
				<div>
					<h1 class="text-4xl md:text-5xl font-bold text-red-600 mb-2">
						{$t('results.title')}
					</h1>
					<p class="text-gray-600 text-lg">{$t('results.subtitle')}</p>
				</div>
				<LanguageSwitcher />
			</div>

			<div class="space-y-4 mb-6">
				{#each assignments as assignment, i}
					<div class="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
						<div class="space-y-3">
							<div class="flex flex-col md:flex-row md:items-center gap-3">
								<div class="flex-1">
									<p class="font-semibold text-lg text-gray-800">
										{assignment.participant.name}
									</p>
									<p class="text-sm text-gray-600 mt-1 break-all">{assignment.url}</p>
								</div>
								<button
									type="button"
									on:click={() => copyToClipboard(assignment.url, i)}
									class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
								>
									{copiedIndex === i ? $t('common.copied') : $t('results.copyUrl')}
								</button>
							</div>
							<div class="flex flex-wrap gap-2 pt-2 border-t border-gray-300">
								{#if assignment.participant.email}
									<a
										href={getEmailUrl(assignment.participant.email, assignment.participant.name, assignment.url)}
										class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
											/>
										</svg>
										{$t('results.sendEmail')}
									</a>
								{/if}
								{#if assignment.participant.sms}
									<a
										href={getSmsUrl(assignment.participant.sms, assignment.url)}
										class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
											/>
										</svg>
										{$t('results.sendSms')}
									</a>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			{#if adminPin}
				<div class="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6 space-y-4">
					<div>
						<p class="text-sm text-gray-700 mb-2">
							<strong>{$t('results.adminPinLabel')}</strong>
						</p>
						<p class="text-2xl font-bold text-yellow-700 font-mono">{adminPin}</p>
					</div>
					<div class="border-t border-yellow-300 pt-4">
						<p class="text-sm text-gray-700 mb-2">
							<strong>{$t('results.adminUrlLabel')}</strong>
						</p>
						<div class="flex items-center gap-2">
							<input
								type="text"
								readonly
								value={getAdminUrl()}
								class="flex-1 px-4 py-2 bg-white border border-yellow-300 rounded-lg text-sm font-mono"
							/>
							<button
								type="button"
								on:click={copyAdminUrl}
								class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
							>
								{adminUrlCopied ? $t('common.copied') : $t('common.copy')}
							</button>
						</div>
					</div>
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					type="button"
					on:click={() => goto(`/admin/${eventName}`)}
					class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
				>
					{$t('results.adminLink')}
				</button>
			</div>
		</div>
	</div>
</div>


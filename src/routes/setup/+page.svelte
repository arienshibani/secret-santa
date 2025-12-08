<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import SnowEffect from '$lib/components/SnowEffect.svelte';
	import PinInput from '$lib/components/PinInput.svelte';
	import { slugifyEventName, generateEventName } from '$lib/utils/event';
	import {
		createParticipants,
		updateAssignments,
		createAdminConfig
	} from '$lib/supabase/db';
	import { shuffleAssignments } from '$lib/utils/shuffle';
	import { getParticipantEmoji, addEmojiToName } from '$lib/utils/emoji';
	import type { ParticipantFormData, ContactMethod } from '$lib/utils/types';

	let eventName = '';
	let pin = '';
	let errors: Record<string, string> = {};
	let loading = false;
	let participantData: {
		participants: ParticipantFormData[];
		numParticipants: number;
	} | null = null;

	onMount(() => {
		if (typeof window === 'undefined') return;

		// Get participant data from sessionStorage
		const stored = sessionStorage.getItem('participantData');
		if (!stored) {
			// No data, redirect to start
			goto('/');
			return;
		}

		try {
			participantData = JSON.parse(stored);
		} catch (error) {
			console.error('Error parsing participant data:', error);
			goto('/');
		}
	});

	const validate = (): boolean => {
		errors = {};

		// Validate PIN
		if (!pin || pin.length !== 6) {
			errors.pin = pin.length === 0 ? $t('step1.validation.pinRequired') : $t('step1.validation.pinLength');
			return false;
		}

		// Validate event name if provided
		if (eventName) {
			const slugified = slugifyEventName(eventName);
			if (slugified !== eventName || !/^[a-z0-9-]+$/.test(eventName)) {
				errors.eventName = $t('step1.validation.eventNameInvalid');
				return false;
			}
		}

		return true;
	};

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		console.log('Submit: pin value =', pin, 'length =', pin?.length);
		if (!validate() || !participantData) {
			console.log('Validation failed: pin =', pin, 'errors =', errors);
			return;
		}

		loading = true;
		try {
			// Generate event name if not provided
			const finalEventName = eventName.trim()
				? slugifyEventName(eventName.trim())
				: generateEventName();

			// Add emojis to participant names before saving
			const participantsWithEmojis = participantData.participants.map((p, i) => ({
				...p,
				name: p.name.trim() ? addEmojiToName(p.name.trim(), getParticipantEmoji(p.name, i)) : p.name
			}));

			// Create participants in database
			const created = await createParticipants(participantsWithEmojis, finalEventName);

			// Shuffle assignments
			const assignments = shuffleAssignments(created);
			const assignmentArray = Array.from(assignments.entries()).map(([pid, aid]) => ({
				participantId: pid,
				assignedToId: aid
			}));

			// Update assignments in database
			await updateAssignments(assignmentArray);

			// Create admin config (event_name is unique, so this will fail if it already exists)
			try {
				await createAdminConfig(finalEventName, pin);
				// Store PIN in sessionStorage for results page
				if (typeof window !== 'undefined') {
					sessionStorage.setItem(`adminPin_${finalEventName}`, pin);
				}
			} catch (error) {
				// Config might already exist, that's okay
				console.warn('Admin config might already exist:', error);
			}

			// Clear participant data from sessionStorage
			if (typeof window !== 'undefined') {
				sessionStorage.removeItem('participantData');
			}

			// Navigate to results page with event name
			goto(`/results?eventName=${encodeURIComponent(finalEventName)}`);
		} catch (error) {
			console.error('Error creating participants:', error);
			alert('An error occurred. Please try again.');
		} finally {
			loading = false;
		}
	};
</script>

<svelte:head>
	<title>Event Setup 🎄</title>
</svelte:head>

<div class="min-h-screen relative z-10 flex items-center justify-center p-4">
	<SnowEffect />
	<div class="max-w-2xl w-full">
		<div class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12">
			<div class="flex justify-between items-start mb-6">
				<div>
					<h1 class="text-4xl md:text-5xl font-bold text-red-600 mb-2">
						{$t('step1.title')}
					</h1>
					<p class="text-gray-600 text-lg">{$t('step1.subtitle')}</p>
				</div>
				<LanguageSwitcher />
			</div>

			{#if !participantData}
				<div class="text-center py-8">
					<p class="text-gray-600">Loading...</p>
				</div>
			{:else}
				{#if participantData}
					<form on:submit={handleSubmit} class="space-y-6">
						<div>
							<label for="eventName" class="block text-sm font-medium text-gray-700 mb-2">
								{$t('step1.eventNameLabel')}
							</label>
							<input
								id="eventName"
								type="text"
								bind:value={eventName}
								placeholder={$t('step1.eventNamePlaceholder')}
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
							/>
							<p class="mt-1 text-xs text-gray-500">{$t('step1.eventNameHelp')}</p>
							{#if errors.eventName}
								<p class="mt-1 text-sm text-red-600">{errors.eventName}</p>
							{/if}
						</div>

						<div>
							<label for="pin" class="block text-sm font-medium text-gray-700 mb-2">
								{$t('step1.pinLabel')}
							</label>
							<PinInput bind:value={pin} length={6} />
							<p class="mt-2 text-xs text-gray-500">{$t('step1.pinHelp')}</p>
							{#if errors.pin}
								<p class="mt-1 text-sm text-red-600">{errors.pin}</p>
							{/if}
							<!-- Debug: Show PIN length -->
							<p class="mt-1 text-xs text-gray-400">PIN length: {pin.length}, PIN value: {pin || '(empty)'}</p>
						</div>

						<div class="flex gap-3">
							<button
								type="button"
								on:click={() => {
									if (participantData) {
										goto('/participants?' + new URLSearchParams({
											numParticipants: participantData.numParticipants.toString()
										}).toString());
									}
								}}
								class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
							>
								← {$t('common.back')}
							</button>
							<button
								type="submit"
								disabled={loading}
								class="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors shadow-lg"
							>
								{loading ? $t('common.loading') : $t('common.submit')}
							</button>
						</div>
					</form>
				{/if}
			{/if}
		</div>
	</div>
</div>


<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import SnowEffect from '$lib/components/SnowEffect.svelte';
	import ShowAssigneesDialog from '$lib/components/ShowAssigneesDialog.svelte';
	import PinInput from '$lib/components/PinInput.svelte';
	import EventCountdown from '$lib/components/EventCountdown.svelte';
	import {
		getAllParticipants,
		verifyAdminPin,
		updateGiftStatus,
		updateParticipant,
		clearAllData
	} from '$lib/supabase/db';
	import { getAssignmentUrl } from '$lib/utils/token';
	import type { Participant } from '$lib/utils/types';
	import { createSvelteTable, flexRender, getCoreRowModel, getFilteredRowModel } from '@tanstack/svelte-table';
	import type { ColumnDef, ColumnFiltersState } from '@tanstack/table-core';
	import { writable } from 'svelte/store';
	import { currentLanguage } from '$lib/i18n';
	import { getDefaultMessageTemplate, getDefaultEmailSubject, replaceTemplatePlaceholders } from '$lib/utils/message-template';
	import { get } from 'svelte/store';

	let eventName = '';
	let authenticated = false;
	let pin = '';
	let pinError = false;
	let participants: Participant[] = [];
	let showAssignees = false;
	let showClearDialog = false;
	let loading = false;
	let copiedIndex: Map<string, boolean> = new Map();
	let editingId: string | null = null;
	let editName = '';
	let editEmail = '';
	let editSms = '';
	let savingId: string | null = null;
	
	// Event name editing state
	let editingEventName = false;
	let editEventNameValue = '';
	let savingEventName = false;
	let eventNameError = '';
	
	// Event date state
	let eventDate: string | null = null;
	let showEventDateDialog = false;
	let editEventDateValue = '';
	let savingEventDate = false;
	let eventDateError = '';
	
	// Message template state
	let messageTemplate = '';
	let emailSubject = '';
	const templateCollapsed = writable(true);
	let savingTemplate = false;
	let templateError = '';
	let templateHighlightOverlay: HTMLDivElement;
	let emailSubjectHighlightOverlay: HTMLDivElement;
	
	// Table filtering state
	const columnFilters = writable<ColumnFiltersState>([]);
	const globalFilter = writable('');

	$: eventName = $page.params.eventName || '';

	$: {
		if (eventName && !authenticated) {
			// Event name is available, ready for PIN entry
		} else if (!eventName) {
			goto('/');
		}
	}

	const loadParticipants = async () => {
		if (!eventName) return;
		try {
			const all = await getAllParticipants(eventName);
			participants = all;
		} catch (error: any) {
			console.error('Error loading participants:', error);
			if (error.message?.includes('Unauthorized')) {
				authenticated = false;
				pin = '';
				alert('Session expired. Please log in again.');
			}
		}
	};

	const loadMessageTemplate = async () => {
		if (!eventName) return;
		try {
			const response = await fetch(`/api/admin/message-template?eventName=${encodeURIComponent(eventName)}`, {
				credentials: 'include'
			});
			if (!response.ok) {
				if (response.status === 401) {
					authenticated = false;
					pin = '';
					return;
				}
				throw new Error('Failed to load template');
			}
			const data = await response.json();
			const lang = get(currentLanguage);
			
			// If no template exists, use default based on current language
			messageTemplate = data.messageTemplate || getDefaultMessageTemplate(lang);
			emailSubject = data.emailSubject || getDefaultEmailSubject(lang);
		} catch (error) {
			console.error('Error loading message template:', error);
			// Use defaults on error
			const lang = get(currentLanguage);
			messageTemplate = getDefaultMessageTemplate(lang);
			emailSubject = getDefaultEmailSubject(lang);
		}
	};

	const loadEventDate = async () => {
		if (!eventName) return;
		try {
			const response = await fetch(`/api/admin/event-date?eventName=${encodeURIComponent(eventName)}`, {
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				eventDate = data.eventDate;
			}
		} catch (error) {
			console.error('Error loading event date:', error);
		}
	};

	const cleanupOldContactInfo = async () => {
		if (!eventName) return;
		try {
			const response = await fetch(`/api/admin/cleanup-contact-info?eventName=${encodeURIComponent(eventName)}`, {
				credentials: 'include'
			});
			// Silently fail - this is just maintenance
		} catch (error) {
			// Silent fail
		}
	};

	const openEventDateDialog = () => {
		showEventDateDialog = true;
		eventDateError = '';
		// Format current eventDate for input if it exists
		if (eventDate) {
			const date = new Date(eventDate);
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');
			editEventDateValue = `${year}-${month}-${day}T${hours}:${minutes}`;
		} else {
			editEventDateValue = '';
		}
	};

	const closeEventDateDialog = () => {
		showEventDateDialog = false;
		editEventDateValue = '';
		eventDateError = '';
	};

	const saveEventDate = async () => {
		if (!eventName) return;
		savingEventDate = true;
		eventDateError = '';
		
		try {
			// Validate date is today or future
			if (editEventDateValue) {
				const selectedDate = new Date(editEventDateValue);
				const now = new Date();
				const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
				
				if (selectedDateOnly < today) {
					eventDateError = $t('admin.eventDatePastError');
					savingEventDate = false;
					return;
				}
			}
			
			// Convert local datetime to UTC ISO string
			const dateToSave = editEventDateValue ? new Date(editEventDateValue).toISOString() : null;
			
			const response = await fetch('/api/admin/event-date', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					eventName,
					eventDate: dateToSave
				})
			});
			
			if (!response.ok) {
				if (response.status === 401) {
					authenticated = false;
					pin = '';
					alert('Session expired. Please log in again.');
					closeEventDateDialog();
					return;
				}
				const errorData = await response.json();
				eventDateError = errorData.error || $t('admin.eventDateSaveError');
				return;
			}
			
			// Update local state
			eventDate = dateToSave;
			closeEventDateDialog();
		} catch (error: any) {
			console.error('Error saving event date:', error);
			eventDateError = error.message || $t('admin.eventDateSaveError');
		} finally {
			savingEventDate = false;
		}
	};

	const formatEventDate = (dateString: string): string => {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day} ${hours}:${minutes}`;
	};

	const toggleTemplateCollapse = () => {
		console.log('Toggle clicked, current state:', $templateCollapsed);
		templateCollapsed.update(n => !n);
		console.log('New state:', $templateCollapsed);
	};

	const saveMessageTemplate = async () => {
		if (!eventName) return;
		savingTemplate = true;
		templateError = '';
		try {
			const response = await fetch('/api/admin/message-template', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					eventName,
					messageTemplate: messageTemplate.trim() || null,
					emailSubject: emailSubject.trim() || null
				})
			});
			
			if (!response.ok) {
				if (response.status === 401) {
					authenticated = false;
					pin = '';
					alert('Session expired. Please log in again.');
					return;
				}
				throw new Error('Failed to save template');
			}
			
			// Show success feedback
			templateError = '';
		} catch (error: any) {
			console.error('Error saving message template:', error);
			templateError = error.message || 'Failed to save template';
		} finally {
			savingTemplate = false;
		}
	};

	const handleLogin = async () => {
		pinError = false;
		if (!pin || pin.length !== 6 || !eventName) return;

		try {
			const valid = await verifyAdminPin(eventName, pin);
			if (valid) {
				authenticated = true;
				await Promise.all([loadParticipants(), loadMessageTemplate(), loadEventDate()]);
				// Trigger cleanup on admin panel load
				cleanupOldContactInfo();
			} else {
				pinError = true;
				pin = ''; // Clear PIN on error
			}
		} catch (error) {
			console.error('Error verifying PIN:', error);
			pinError = true;
			pin = ''; // Clear PIN on error
		}
	};

	const handleShowAssignees = () => {
		showAssignees = true;
	};

	const handleGiftStatusChange = async (participantId: string, checked: boolean) => {
		try {
			await updateGiftStatus(participantId, checked);
			// Update local state instead of reloading to preserve order
			participants = participants.map(p => 
				p.id === participantId ? { ...p, gift_ready: checked } : p
			);
		} catch (error: any) {
			console.error('Error updating gift status:', error);
			if (error.message?.includes('Unauthorized')) {
				authenticated = false;
				pin = '';
				alert('Session expired. Please log in again.');
			} else {
				alert('Error updating gift status');
				// Reload on error to sync state
				await loadParticipants();
			}
		}
	};

	const handleClearData = async () => {
		if (!eventName) return;
		loading = true;
		try {
			await clearAllData(eventName);
			participants = [];
			authenticated = false;
			pin = '';
			showClearDialog = false;
			alert('All data cleared successfully');
			goto('/');
		} catch (error: any) {
			console.error('Error clearing data:', error);
			if (error.message?.includes('Unauthorized')) {
				authenticated = false;
				pin = '';
				alert('Session expired. Please log in again.');
			} else {
				alert('Error clearing data');
			}
		} finally {
			loading = false;
		}
	};

	const getAssignedToName = (participant: Participant): string | null => {
		if (!showAssignees || !participant.assigned_to_id) return null;
		const assigned = participants.find((p) => p.id === participant.assigned_to_id);
		return assigned?.name || null;
	};

	const copyToClipboard = async (url: string, participantId: string) => {
		try {
			const participant = participants.find(p => p.id === participantId);
			if (participant) {
				const message = getMessageForCopy(participant.name, url);
				await navigator.clipboard.writeText(message);
			} else {
				await navigator.clipboard.writeText(url);
			}
			copiedIndex.set(participantId, true);
			copiedIndex = new Map(copiedIndex); // Create new Map instance to trigger reactivity
			setTimeout(() => {
				copiedIndex.delete(participantId);
				copiedIndex = new Map(copiedIndex); // Create new Map instance to trigger reactivity
			}, 2000);
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	};

	const startEdit = (participant: Participant) => {
		editingId = participant.id;
		editName = participant.name;
		editEmail = participant.email || '';
		editSms = participant.sms || '';
	};

	const cancelEdit = () => {
		editingId = null;
		editName = '';
		editEmail = '';
		editSms = '';
	};

	const saveEdit = async (participantId: string) => {
		savingId = participantId;
		try {
			await updateParticipant(participantId, {
				name: editName.trim(),
				email: editEmail.trim() || null,
				sms: editSms.trim() || null
			});
			await loadParticipants();
			cancelEdit();
		} catch (error: any) {
			console.error('Error updating participant:', error);
			if (error.message?.includes('Unauthorized')) {
				authenticated = false;
				pin = '';
				alert('Session expired. Please log in again.');
			} else {
				alert('Error updating participant');
			}
		} finally {
			savingId = null;
		}
	};

	const startEditEventName = () => {
		editingEventName = true;
		editEventNameValue = eventName;
		eventNameError = '';
	};

	const cancelEditEventName = () => {
		editingEventName = false;
		editEventNameValue = '';
		eventNameError = '';
	};

	const saveEventName = async () => {
		const trimmedName = editEventNameValue.trim();
		if (!trimmedName) {
			eventNameError = 'Event name cannot be empty';
			return;
		}
		if (trimmedName === eventName) {
			cancelEditEventName();
			return;
		}

		savingEventName = true;
		eventNameError = '';
		try {
			const response = await fetch('/api/admin/event-name', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					oldEventName: eventName,
					newEventName: trimmedName
				})
			});

			if (!response.ok) {
				if (response.status === 401) {
					authenticated = false;
					pin = '';
					alert('Session expired. Please log in again.');
					cancelEditEventName();
					return;
				}
				const errorData = await response.json();
				eventNameError = errorData.error || 'Failed to update event name';
				return;
			}

			const data = await response.json();
			// Navigate to new event name URL
			goto(`/admin/${encodeURIComponent(data.newEventName)}`);
		} catch (error: any) {
			console.error('Error updating event name:', error);
			eventNameError = error.message || 'Failed to update event name';
		} finally {
			savingEventName = false;
		}
	};

	const getSmsUrl = (phone: string, url: string, participantName: string): string => {
		const template = messageTemplate || getDefaultMessageTemplate(get(currentLanguage));
		const message = replaceTemplatePlaceholders(template, {
			participantsName: participantName,
			url,
			eventName: eventName || 'Secret Santa'
		});
		return `sms:${phone}?body=${encodeURIComponent(message)}`;
	};

	const getEmailUrl = (email: string, participantName: string, url: string): string => {
		const template = messageTemplate || getDefaultMessageTemplate(get(currentLanguage));
		const subjectTemplate = emailSubject || getDefaultEmailSubject(get(currentLanguage));
		
		const subject = replaceTemplatePlaceholders(subjectTemplate, {
			eventName: eventName || 'Secret Santa'
		});
		const body = replaceTemplatePlaceholders(template, {
			participantsName: participantName,
			url,
			eventName: eventName || 'Secret Santa'
		});
		return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	};

	const getMessageForCopy = (participantName: string, url: string): string => {
		const template = messageTemplate || getDefaultMessageTemplate(get(currentLanguage));
		return replaceTemplatePlaceholders(template, {
			participantsName: participantName,
			url,
			eventName: eventName || 'Secret Santa'
		});
	};

	// Get example participant for template placeholders
	$: exampleParticipant = participants.length > 0 ? participants[0] : null;
	$: exampleUrl = exampleParticipant ? getAssignmentUrl(exampleParticipant.token) : '';
	$: exampleParticipantName = exampleParticipant?.name || 'John Doe';
	
	// Template placeholder strings for display
	const placeholderParticipantsName = '{{participantsName}}';
	const placeholderUrl = '{{url}}';
	const placeholderEventName = '{{eventName}}';

	// Highlight template variables in textarea
	const highlightTemplateVariables = (text: string): string => {
		if (!text) return '';
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\{\{participantsName\}\}/g, '<span class="text-blue-600 font-semibold">{{participantsName}}</span>')
			.replace(/\{\{url\}\}/g, '<span class="text-blue-600 font-semibold">{{url}}</span>')
			.replace(/\{\{eventName\}\}/g, '<span class="text-blue-600 font-semibold">{{eventName}}</span>')
			.replace(/\n/g, '<br>');
	};

	// Column definitions for TanStack Table - reactive to showAssignees
	let tableColumns: ColumnDef<Participant>[] = [];
	
	$: {
		tableColumns = [
			{
				accessorKey: 'name',
				header: $t('admin.name')
			},
			{
				id: 'contact',
				header: $t('admin.contact'),
				accessorFn: (row: Participant) => {
					const parts: string[] = [];
					if (row.email) parts.push(row.email);
					if (row.sms) parts.push(row.sms);
					return parts.join(' ') || '';
				}
			},
			{
				id: 'assignmentUrl',
				header: $t('admin.assignmentUrl'),
				enableColumnFilter: false
			},
			{
				accessorKey: 'gift_ready',
				header: $t('admin.giftReady'),
				enableColumnFilter: false
			},
			{
				id: 'actions',
				header: 'Actions',
				enableColumnFilter: false
			},
			...(showAssignees ? [{
				id: 'assignedTo',
				header: $t('admin.assignedTo'),
				enableColumnFilter: false
			}] : [])
		] as ColumnDef<Participant>[];
	}

	// Filter participants based on global filter
	$: filteredParticipants = $globalFilter
		? participants.filter((p) => {
				const searchTerm = $globalFilter.toLowerCase();
				const name = p.name?.toLowerCase() || '';
				const email = p.email?.toLowerCase() || '';
				const sms = p.sms?.toLowerCase() || '';
				return name.includes(searchTerm) || email.includes(searchTerm) || sms.includes(searchTerm);
			})
		: participants;

	// Create table instance - reactive to data and columns changes
	$: table = createSvelteTable({
		data: filteredParticipants,
		columns: tableColumns,
		state: {
			columnFilters: $columnFilters,
			globalFilter: $globalFilter
		},
		onColumnFiltersChange: (updater: any) => {
			if (typeof updater === 'function') {
				columnFilters.set(updater($columnFilters));
			} else {
				columnFilters.set(updater);
			}
		},
		onGlobalFilterChange: (updater: any) => {
			if (typeof updater === 'function') {
				globalFilter.set(updater($globalFilter));
			} else {
				globalFilter.set(updater);
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		enableGlobalFilter: true,
		globalFilterFn: 'includesString'
	});
</script>

<svelte:head>
	<title>Admin Dashboard</title>
</svelte:head>

<div class="min-h-screen relative z-10 flex items-center justify-center p-4">
	<SnowEffect />
	<div class="max-w-4xl w-full">
		<div class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12">
			<div class="flex justify-between items-start mb-6">
				<div class="flex-1">
					{#if editingEventName}
						<div class="flex items-center gap-2">
							<input
								type="text"
								bind:value={editEventNameValue}
								disabled={savingEventName}
								class="text-4xl md:text-5xl font-bold text-red-600 bg-transparent border-b-2 border-red-600 focus:outline-none focus:border-red-700 px-2 py-1 flex-1 max-w-md"
								on:keydown={(e) => {
									if (e.key === 'Enter') {
										saveEventName();
									} else if (e.key === 'Escape') {
										cancelEditEventName();
									}
								}}
							/>
							<button
								type="button"
								on:click={saveEventName}
								disabled={savingEventName || !editEventNameValue.trim()}
								class="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition-colors"
								title="Save"
							>
								{savingEventName ? $t('common.saving') : $t('admin.save')}
							</button>
							<button
								type="button"
								on:click={cancelEditEventName}
								disabled={savingEventName}
								class="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-sm font-medium transition-colors"
								title="Cancel"
							>
								{$t('admin.cancel')}
							</button>
						</div>
						{#if eventNameError}
							<p class="text-sm text-red-600 mt-1">{eventNameError}</p>
						{/if}
					{:else}
						<div class="flex items-center gap-2">
							<h1 class="text-4xl md:text-5xl font-bold text-red-600">{eventName || $t('admin.title')}</h1>
							{#if authenticated}
								<button
									type="button"
									on:click={startEditEventName}
									class="p-2 text-gray-600 hover:text-red-600 transition-colors"
									title="Edit event name"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
							{/if}
						</div>
					{/if}
				</div>
				<LanguageSwitcher />
			</div>
			{#if authenticated}
				<div class="mb-4 flex items-center gap-4 flex-wrap">
					{#if eventDate}
						<div class="flex items-center gap-2 text-sm">
							<span class="text-gray-600">📅</span>
							<span class="font-medium text-gray-700">
								{$t('admin.eventDateDisplay')} {formatEventDate(eventDate)}
							</span>
						</div>
						<EventCountdown eventDate={eventDate} />
					{:else}
						<span class="text-sm text-gray-500">{$t('admin.noEventDate')}</span>
					{/if}
				</div>
			{/if}

			{#if !authenticated}
				<div class="max-w-[500px] mx-auto space-y-4">
					<p class="text-gray-600 text-sm md:text-base leading-relaxed">
						{$t('admin.description')}
					</p>
					<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
						<div class="flex-1">
							<label class="block text-sm font-medium text-gray-700 mb-2">
								{$t('admin.pinPrompt')}
							</label>
							<PinInput bind:value={pin} length={6} />
							{#if pinError}
								<p class="text-sm text-red-600 mt-2 text-center">{$t('admin.invalidPin')}</p>
							{/if}
						</div>
						<button
							type="button"
							on:click={handleLogin}
							disabled={!pin || pin.length !== 6}
							class="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors whitespace-nowrap mt-8 sm:mt-0"
						>
							{$t('admin.login')}
						</button>
					</div>
				</div>
			{:else}
				<div class="space-y-6">
					<!-- Message Template Section (Collapsible) -->
					<div class="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
						<button
							type="button"
							on:click={toggleTemplateCollapse}
							class="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer text-left"
							aria-expanded={!$templateCollapsed}
							aria-controls="message-template-content"
						>
							<div class="flex items-center gap-2">
								{#if $templateCollapsed}
									<span class="text-xl">📝</span>
								{/if}
								<div class="flex flex-col">
									<span class="text-lg font-semibold text-gray-800">{$t('admin.messageTemplate')}</span>
									{#if $templateCollapsed}
										<span class="text-sm text-gray-500">{$t('admin.messageTemplateSubtitle')}</span>
									{/if}
								</div>
							</div>
							<svg
								class="w-5 h-5 text-gray-600 transition-transform {$templateCollapsed ? '' : 'rotate-180'}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						{#if !$templateCollapsed}
								<div id="message-template-content" class="p-6 space-y-4 border-t border-gray-200">
								<div>
									<label for="email-subject" class="block text-sm font-medium text-gray-700 mb-2">
										{$t('admin.emailSubject')} ({$t('admin.emailOnly')})
									</label>
									<div class="relative">
										<input
											id="email-subject"
											type="text"
											bind:value={emailSubject}
											placeholder={$t('admin.emailSubjectPlaceholder')}
											class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent relative z-10 bg-transparent"
											style="color: transparent; caret-color: #000;"
											on:scroll={(e) => {
												if (emailSubjectHighlightOverlay) {
													emailSubjectHighlightOverlay.scrollLeft = e.currentTarget.scrollLeft;
												}
											}}
										/>
										<div
											bind:this={emailSubjectHighlightOverlay}
											class="absolute inset-0 px-4 py-2 pointer-events-none rounded-lg border border-transparent bg-white overflow-hidden"
											style="z-index: 1; color: #000; white-space: nowrap;"
										>
											{@html highlightTemplateVariables(emailSubject || '')}
											{#if !emailSubject}
												<span class="text-gray-400">{$t('admin.emailSubjectPlaceholder')}</span>
											{/if}
										</div>
									</div>
								</div>
								<div>
									<label for="message-template" class="block text-sm font-medium text-gray-700 mb-2">
										{$t('admin.messageTemplate')}
									</label>
									<div class="relative">
										<textarea
											id="message-template"
											bind:value={messageTemplate}
											rows="8"
											placeholder={$t('admin.messageTemplatePlaceholder')}
											class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm relative z-10 bg-transparent"
											style="color: transparent; caret-color: #000;"
											on:scroll={(e) => {
												if (templateHighlightOverlay) {
													templateHighlightOverlay.scrollTop = e.currentTarget.scrollTop;
												}
											}}
										></textarea>
										<div
											bind:this={templateHighlightOverlay}
											class="absolute inset-0 px-4 py-2 pointer-events-none font-mono text-sm whitespace-pre-wrap break-words overflow-hidden rounded-lg border border-transparent bg-white"
											style="z-index: 1; color: #000;"
										>
											{@html highlightTemplateVariables(messageTemplate || '')}
											{#if !messageTemplate}
												<span class="text-gray-400">{$t('admin.messageTemplatePlaceholder')}</span>
											{/if}
										</div>
									</div>
									<div class="mt-2">
										<p class="text-xs font-medium text-gray-700 mb-1">{$t('admin.templatePlaceholders')}:</p>
										<ul class="text-xs text-gray-600 space-y-1 ml-4">
											<li>
												<code class="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-blue-600 font-semibold">{placeholderParticipantsName}</code>
												<ul class="ml-4 mt-0.5 text-gray-500">
													<li>Example: {exampleParticipantName}</li>
												</ul>
											</li>
											<li>
												<code class="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-blue-600 font-semibold">{placeholderUrl}</code>
												<ul class="ml-4 mt-0.5 text-gray-500">
													<li>Example: {exampleUrl || 'https://example.com/assignment?token=...'}</li>
												</ul>
											</li>
											<li>
												<code class="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-blue-600 font-semibold">{placeholderEventName}</code>
												<ul class="ml-4 mt-0.5 text-gray-500">
													<li>Example: {eventName || 'Secret Santa'}</li>
												</ul>
											</li>
										</ul>
									</div>
								</div>
								{#if templateError}
									<p class="text-sm text-red-600">{templateError}</p>
								{/if}
								<div class="flex justify-end">
									<button
										type="button"
										on:click={saveMessageTemplate}
										disabled={savingTemplate}
										class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
									>
										{savingTemplate ? $t('common.saving') : $t('common.save')}
									</button>
								</div>
							</div>
						{/if}
					</div>
<!-- 
					<div class="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
						<p class="text-sm text-gray-800 leading-relaxed">
							{$t('admin.assignmentUrlWarning')}
						</p>
					</div> -->

					<div class="flex gap-3 flex-wrap">
						{#if !showAssignees}
							<ShowAssigneesDialog onConfirm={handleShowAssignees} />
						{:else}
							<button
								type="button"
								on:click={() => (showAssignees = false)}
								class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
							>
								{$t('admin.hideAssignees')}
							</button>
						{/if}
						<button
							type="button"
							on:click={openEventDateDialog}
							class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
							title="Edit event date"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							{$t('admin.editEventDate')}
						</button>
						<button
							type="button"
							on:click={() => (showClearDialog = true)}
							class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
						>
							<span>🗑️</span>
							{$t('admin.clearData')}
						</button>
					</div>

					<!-- Global Filter Input -->
					<div class="mb-4">
						<label for="global-filter" class="block text-sm font-medium text-gray-700 mb-2">
							Search participants
						</label>
						<input
							id="global-filter"
							type="text"
							bind:value={$globalFilter}
							placeholder="Search by name, email, or phone..."
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
						/>
					</div>

					<div class="overflow-x-auto">
						<table class="w-full border-collapse">
							<thead>
								<tr class="bg-gray-100">
									<th class="border border-gray-300 px-4 py-2 text-left">{$t('admin.name')}</th>
									<th class="border border-gray-300 px-4 py-2 text-left">{$t('admin.contact')}</th>
									<th class="border border-gray-300 px-4 py-2 text-left">{$t('admin.assignmentUrl')}</th>
									<th class="border border-gray-300 px-4 py-2 text-left">{$t('admin.giftReady')}</th>
									<th class="border border-gray-300 px-4 py-2 text-left">Actions</th>
									{#if showAssignees}
										<th class="border border-gray-300 px-4 py-2 text-left">
											{$t('admin.assignedTo')}
										</th>
									{/if}
								</tr>
							</thead>
							<tbody>
								{#each filteredParticipants as participant, i (participant.id)}
									<tr class="hover:bg-gray-50">
										<td class="border border-gray-300 px-4 py-2">
											{#if editingId === participant.id}
												<input
													type="text"
													bind:value={editName}
													class="w-full px-2 py-1 border border-gray-300 rounded text-sm"
												/>
											{:else}
												<span class="font-medium">{participant.name}</span>
											{/if}
										</td>
										<td class="border border-gray-300 px-4 py-2 text-sm">
											{#if editingId === participant.id}
												<div class="space-y-2">
													<input
														type="email"
														bind:value={editEmail}
														placeholder="Email"
														class="w-full px-2 py-1 border border-gray-300 rounded text-xs"
													/>
													<input
														type="tel"
														bind:value={editSms}
														placeholder="Phone"
														class="w-full px-2 py-1 border border-gray-300 rounded text-xs"
													/>
												</div>
											{:else}
												<div class="space-y-1">
													{#if participant.email}
														<div class="text-xs">📧 {participant.email}</div>
													{/if}
													{#if participant.sms}
														<div class="text-xs">📱 {participant.sms}</div>
													{/if}
													{#if !participant.email && !participant.sms}
														<span class="text-gray-400 text-xs">No contact info</span>
													{/if}
												</div>
											{/if}
										</td>
										<td class="border border-gray-300 px-4 py-2 text-center">
											<button
												type="button"
												on:click={() => copyToClipboard(getAssignmentUrl(participant.token), participant.id)}
												class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors whitespace-nowrap mx-auto flex items-center gap-1"
												title={getAssignmentUrl(participant.token)}
											>
												<span>{copiedIndex.get(participant.id) ? '✓' : '🔗'}</span>
												{copiedIndex.get(participant.id) ? $t('common.copied') : $t('common.copy')}
											</button>
										</td>
										<td class="border border-gray-300 px-4 py-2 text-center">
											<input
												type="checkbox"
												checked={participant.gift_ready}
												on:change={(e) =>
													handleGiftStatusChange(participant.id, e.currentTarget.checked)}
												class="w-5 h-5"
											/>
										</td>
										<td class="border border-gray-300 px-4 py-2">
											{#if editingId === participant.id}
												<div class="flex gap-2">
													<button
														type="button"
														on:click={() => saveEdit(participant.id)}
														disabled={savingId === participant.id || !editName.trim()}
														class="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors"
													>
														{$t('admin.save')}
													</button>
													<button
														type="button"
														on:click={cancelEdit}
														disabled={savingId === participant.id}
														class="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-medium transition-colors"
													>
														{$t('admin.cancel')}
													</button>
												</div>
											{:else}
												<div class="flex flex-col gap-2">
													<button
														type="button"
														on:click={() => startEdit(participant)}
														class="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
													>
														<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
														</svg>
														{$t('admin.edit')}
													</button>
													{#if participant.email}
														<a
															href={getEmailUrl(participant.email, participant.name, getAssignmentUrl(participant.token))}
															class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
														>
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
																/>
															</svg>
															{$t('admin.sendEmail')}
														</a>
													{/if}
													{#if participant.sms}
														<a
															href={getSmsUrl(participant.sms, getAssignmentUrl(participant.token), participant.name)}
															class="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
														>
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
																/>
															</svg>
															{$t('admin.sendSms')}
														</a>
													{/if}
												</div>
											{/if}
										</td>
										{#if showAssignees}
											<td class="border border-gray-300 px-4 py-2">
												{getAssignedToName(participant) || '-'}
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

{#if showClearDialog}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		role="button"
		tabindex="-1"
		on:click={() => (showClearDialog = false)}
		on:keydown={(e) => e.key === 'Escape' && (showClearDialog = false)}
	>
		<div
			class="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl"
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			aria-labelledby="clear-dialog-title"
		>
			<h3 id="clear-dialog-title" class="text-xl font-bold text-gray-900 mb-4">⚠️ {$t('admin.clearDataWarning')}</h3>
			<div class="flex gap-3 justify-end">
				<button
					type="button"
					class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
					on:click={() => (showClearDialog = false)}
				>
					{$t('admin.no')}
				</button>
				<button
					type="button"
					class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
					on:click={handleClearData}
					disabled={loading}
				>
					{$t('admin.yes')}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showEventDateDialog}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		role="button"
		tabindex="-1"
		on:click={closeEventDateDialog}
		on:keydown={(e) => e.key === 'Escape' && closeEventDateDialog()}
	>
		<div
			class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl"
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			aria-labelledby="event-date-dialog-title"
		>
			<h3 id="event-date-dialog-title" class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
				<span>📅</span>
				{$t('admin.eventDate')}
			</h3>
			
			<div class="space-y-4">
				<div>
					<label for="event-date-input" class="block text-sm font-medium text-gray-700 mb-2">
						{$t('admin.eventDateLabel')}
					</label>
					<input
						id="event-date-input"
						type="datetime-local"
						bind:value={editEventDateValue}
						disabled={savingEventDate}
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
					/>
					<p class="mt-2 text-xs text-gray-500">
						{$t('admin.eventDateDescription')}
					</p>
				</div>
				
				{#if eventDateError}
					<p class="text-sm text-red-600">{eventDateError}</p>
				{/if}
				
				<div class="flex gap-3 justify-end">
					<button
						type="button"
						class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
						on:click={closeEventDateDialog}
						disabled={savingEventDate}
					>
						{$t('admin.cancel')}
					</button>
					<button
						type="button"
						class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:bg-gray-400"
						on:click={saveEventDate}
						disabled={savingEventDate}
					>
						{savingEventDate ? $t('common.saving') : $t('admin.save')}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}


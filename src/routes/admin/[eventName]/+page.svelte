<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import SnowEffect from '$lib/components/SnowEffect.svelte';
	import ShowAssigneesDialog from '$lib/components/ShowAssigneesDialog.svelte';
	import PinInput from '$lib/components/PinInput.svelte';
	import {
		getAllParticipants,
		verifyAdminPin,
		getAdminConfig,
		updateGiftStatus,
		updateParticipant,
		clearAllData
	} from '$lib/supabase/db';
	import { getAssignmentUrl } from '$lib/utils/token';
	import type { Participant } from '$lib/utils/types';
	import { createSvelteTable, flexRender, getCoreRowModel, getFilteredRowModel } from '@tanstack/svelte-table';
	import type { ColumnDef, ColumnFiltersState } from '@tanstack/table-core';
	import { writable } from 'svelte/store';

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
		} catch (error) {
			console.error('Error loading participants:', error);
		}
	};

	const handleLogin = async () => {
		pinError = false;
		if (!pin || pin.length !== 6 || !eventName) return;

		try {
			const valid = await verifyAdminPin(eventName, pin);
			if (valid) {
				authenticated = true;
				await loadParticipants();
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
		} catch (error) {
			console.error('Error updating gift status:', error);
			alert('Error updating gift status');
			// Reload on error to sync state
			await loadParticipants();
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
		} catch (error) {
			console.error('Error clearing data:', error);
			alert('Error clearing data');
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
			await navigator.clipboard.writeText(url);
			copiedIndex.set(participantId, true);
			setTimeout(() => {
				copiedIndex.delete(participantId);
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
		} catch (error) {
			console.error('Error updating participant:', error);
			alert('Error updating participant');
		} finally {
			savingId = null;
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
				<div>
					<h1 class="text-4xl md:text-5xl font-bold text-red-600">{eventName || $t('admin.title')}</h1>
				</div>
				<LanguageSwitcher />
			</div>

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
					<div class="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
						<p class="text-sm text-gray-800 leading-relaxed">
							{$t('admin.assignmentUrlWarning')}
						</p>
					</div>

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
							on:click={() => (showClearDialog = true)}
							class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
						>
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
												class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors whitespace-nowrap mx-auto"
												title={getAssignmentUrl(participant.token)}
											>
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
														class="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
													>
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
															href={getSmsUrl(participant.sms, getAssignmentUrl(participant.token))}
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


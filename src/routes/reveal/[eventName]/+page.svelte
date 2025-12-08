<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';
	import { fade, fly, scale } from 'svelte/transition';
	import SnowEffect from '$lib/components/SnowEffect.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { getAllParticipants } from '$lib/supabase/db';
	import { verifyAdminPin } from '$lib/supabase/db';
	import type { Participant } from '$lib/utils/types';

	let eventName = '';
	let authenticated = false;
	let pin = '';
	let pinError = false;
	let participants: Participant[] = [];
	let assignments: Array<{ participant: Participant; assignedTo: Participant }> = [];
	let currentIndex = -1;
	let showing = false;
	let confettiActive = false;
	let loading = true;

	$: eventName = $page.params.eventName || '';

	const loadAssignments = async () => {
		if (!eventName) return;
		try {
			const all = await getAllParticipants(eventName);
			participants = all;
			
			// Build assignments array - only include participants with assignments
			const assignmentList: Array<{ participant: Participant; assignedTo: Participant }> = [];
			for (const participant of all) {
				if (participant.assigned_to_id) {
					const assignedTo = all.find((p) => p.id === participant.assigned_to_id);
					if (assignedTo) {
						assignmentList.push({ participant, assignedTo });
					}
				}
			}
			assignments = assignmentList;
		} catch (error: any) {
			console.error('Error loading assignments:', error);
			if (error.message?.includes('Unauthorized')) {
				authenticated = false;
				pin = '';
			}
		}
	};

	const handleLogin = async () => {
		pinError = false;
		if (!pin || pin.length !== 6 || !eventName) return;

		try {
			const valid = await verifyAdminPin(eventName, pin);
			if (valid) {
				authenticated = true;
				await loadAssignments();
				if (assignments.length === 0) {
					alert($t('reveal.noAssignments'));
					goto(`/admin/${encodeURIComponent(eventName)}`);
				}
			} else {
				pinError = true;
				pin = '';
			}
		} catch (error) {
			console.error('Error verifying PIN:', error);
			pinError = true;
			pin = '';
		} finally {
			loading = false;
		}
	};

	const triggerConfetti = () => {
		confettiActive = true;
		setTimeout(() => {
			confettiActive = false;
		}, 7000);
	};

	const nextAssignment = () => {
		if (currentIndex < assignments.length - 1) {
			showing = false;
			setTimeout(() => {
				currentIndex++;
				showing = true;
				triggerConfetti();
			}, 300);
		}
	};

	const previousAssignment = () => {
		if (currentIndex > 0) {
			showing = false;
			setTimeout(() => {
				currentIndex--;
				showing = true;
			}, 300);
		}
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (!authenticated || currentIndex === -1) return;
		
		if (e.key === ' ' || e.key === 'ArrowRight') {
			e.preventDefault();
			nextAssignment();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			previousAssignment();
		} else if (e.key === 'Escape') {
			goto(`/admin/${encodeURIComponent(eventName)}`);
		}
	};

	const startReveal = () => {
		if (assignments.length > 0) {
			currentIndex = 0;
			showing = true;
			triggerConfetti();
		}
	};

	onMount(() => {
		if (eventName) {
			loading = false;
		} else {
			goto('/');
		}
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});

	$: currentAssignment = currentIndex >= 0 && currentIndex < assignments.length 
		? assignments[currentIndex] 
		: null;
</script>

<svelte:head>
	<title>{$t('reveal.title')} - {eventName}</title>
</svelte:head>

<div class="min-h-screen relative z-10 flex items-center justify-center p-4">
	<SnowEffect />
	
	<!-- Language Switcher - Fixed at top right -->
	<div class="fixed top-4 right-4 z-50">
		<LanguageSwitcher />
	</div>
	
	{#if confettiActive}
		<div class="confetti-container fixed inset-0 pointer-events-none z-30">
			{#each Array(150) as _, i}
				{@const randomX = Math.random() * 100}
				{@const randomDelay = Math.random() * 0.5}
				{@const randomDuration = Math.random() * 3 + 4}
				{@const randomRotation = Math.random() * 360}
				{@const randomSize = Math.random() * 8 + 6}
				{@const randomDrift = (Math.random() - 0.5) * 100}
				<div 
					class="confetti confetti-{i % 7}" 
					style="--delay: {randomDelay}s; --x: {randomX}%; --duration: {randomDuration}s; --rotation: {randomRotation}deg; --size: {randomSize}px; --x-drift: {randomDrift};"
				></div>
			{/each}
		</div>
	{/if}

	<div class="max-w-6xl w-full">
		{#if !authenticated}
			<div class="backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 text-center relative">
				<h1 class="text-4xl md:text-5xl font-bold text-red-400 mb-6 drop-shadow-lg">
					{$t('reveal.title')}
				</h1>
				<p class="text-white/90 text-lg mb-8 drop-shadow-md">
					{$t('reveal.description')}
				</p>
				<div class="max-w-md mx-auto space-y-4">
					<label for="reveal-pin-input" class="block text-sm font-medium text-white/90 mb-2 drop-shadow-md">
						{$t('admin.pinPrompt')}
					</label>
					<input
						id="reveal-pin-input"
						type="text"
						bind:value={pin}
						maxlength="6"
						placeholder="000000"
						class="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 placeholder-white/50"
						on:keydown={(e) => {
							if (e.key === 'Enter' && pin.length === 6) {
								handleLogin();
							}
						}}
					/>
					{#if pinError}
						<p class="text-sm text-red-300 drop-shadow-md">{$t('admin.invalidPin')}</p>
					{/if}
					<button
						type="button"
						on:click={handleLogin}
						disabled={!pin || pin.length !== 6 || loading}
						class="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
					>
						{$t('reveal.startReveal')}
					</button>
				</div>
			</div>
		{:else if currentIndex === -1}
			<div class="backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 text-center relative">
				<h1 class="text-4xl md:text-5xl font-bold text-red-400 mb-4 drop-shadow-lg">
					{eventName}
				</h1>
				<p class="text-white/90 text-xl mb-8 drop-shadow-md">
					{$t('reveal.readyToReveal', { count: assignments.length.toString() })}
				</p>
				<button
					type="button"
					on:click={startReveal}
					class="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-lg transition-colors text-xl shadow-lg hover:shadow-xl transform hover:scale-105 drop-shadow-lg"
				>
					{$t('reveal.startReveal')} 🎄
				</button>
				<p class="text-sm text-white/70 mt-4 drop-shadow-md">
					{$t('reveal.instructions')}
				</p>
			</div>
		{:else if currentAssignment}
			<div 
				class="reveal-container cursor-pointer"
				on:click={nextAssignment}
				role="button"
				tabindex="0"
				on:keydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						nextAssignment();
					}
				}}
			>
				<div class="backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-16 text-center min-h-[600px] flex flex-col justify-center relative">
					<!-- Progress indicator -->
					<div class="mb-8">
						<p class="text-lg text-white/90 drop-shadow-md">
							{$t('reveal.progress', { current: (currentIndex + 1).toString(), total: assignments.length.toString() })}
						</p>
						<div class="w-full bg-white/20 rounded-full h-2 mt-2 max-w-md mx-auto backdrop-blur-sm">
							<div 
								class="bg-red-400 h-2 rounded-full transition-all duration-500 drop-shadow-lg"
								style="width: {((currentIndex + 1) / assignments.length) * 100}%"
							></div>
						</div>
					</div>

					<!-- Assignment card -->
					{#if showing}
						<div 
							in:scale={{ duration: 600, start: 0.5 }}
							class="assignment-card"
						>
							<div class="mb-8">
								<h2 class="text-3xl md:text-4xl font-semibold text-white/90 mb-4 drop-shadow-md">
									{$t('reveal.participant')}
								</h2>
								<div in:fade={{ duration: 400, delay: 200 }}>
									<div in:fly={{ y: 20, duration: 400, delay: 200 }}>
										<p class="text-5xl md:text-7xl font-bold text-red-300 mb-2 drop-shadow-lg">
											{currentAssignment.participant.name}
										</p>
										<div class="text-4xl mb-6 drop-shadow-md">🎅</div>
									</div>
								</div>
							</div>

							<div class="mb-8">
								<div class="text-6xl mb-4 drop-shadow-md">➡️</div>
							</div>

							<div>
								<h2 class="text-3xl md:text-4xl font-semibold text-white/90 mb-4 drop-shadow-md">
									{$t('reveal.assignedTo')}
								</h2>
								<div in:fade={{ duration: 400, delay: 600 }}>
									<div in:fly={{ y: 20, duration: 400, delay: 600 }}>
										<p class="text-5xl md:text-7xl font-bold text-green-300 mb-2 drop-shadow-lg">
											{currentAssignment.assignedTo.name}
										</p>
										<div class="text-4xl drop-shadow-md">🎁</div>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Navigation hint -->
					<div class="mt-12">
						<p class="text-sm text-white/70 drop-shadow-md">
							{$t('reveal.navigationHint')}
						</p>
						<div class="flex justify-center gap-4 mt-4">
							{#if currentIndex > 0}
								<button
									type="button"
									on:click|stopPropagation={previousAssignment}
									class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
								>
									← {$t('reveal.previous')}
								</button>
							{/if}
							{#if currentIndex < assignments.length - 1}
								<button
									type="button"
									on:click|stopPropagation={nextAssignment}
									class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
								>
									{$t('reveal.next')} →
								</button>
							{:else}
								<button
									type="button"
									on:click|stopPropagation={() => goto(`/admin/${encodeURIComponent(eventName)}`)}
									class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
								>
									{$t('reveal.finish')} ✓
								</button>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 text-center relative">
				<p class="text-xl text-white/90 drop-shadow-md">{$t('reveal.noAssignments')}</p>
				<button
					type="button"
					on:click={() => goto(`/admin/${encodeURIComponent(eventName)}`)}
					class="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors drop-shadow-lg"
				>
					{$t('reveal.backToAdmin')}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.reveal-container {
		outline: none;
	}

	.assignment-card {
		perspective: 1000px;
	}

	.confetti-container {
		overflow: hidden;
	}

	.confetti {
		position: absolute;
		width: var(--size, 8px);
		height: var(--size, 8px);
		left: var(--x);
		top: -20px;
		animation: confetti-fall var(--duration) linear var(--delay) forwards;
		opacity: 0.95;
		border-radius: 2px;
		box-shadow: 0 0 2px currentColor;
	}

	/* Christmas-themed colors with variety */
	.confetti-0 {
		background: #ff0000;
		color: #ff0000;
	}

	.confetti-1 {
		background: #00ff00;
		color: #00ff00;
	}

	.confetti-2 {
		background: #ffff00;
		color: #ffff00;
	}

	.confetti-3 {
		background: #ff00ff;
		color: #ff00ff;
	}

	.confetti-4 {
		background: #00ffff;
		color: #00ffff;
	}

	.confetti-5 {
		background: #ff8800;
		color: #ff8800;
	}

	.confetti-6 {
		background: #ffffff;
		color: #ffffff;
	}

	/* Make some confetti circular */
	.confetti-1,
	.confetti-3,
	.confetti-5 {
		border-radius: 50%;
	}

	/* Make some confetti diamond-shaped */
	.confetti-2,
	.confetti-4 {
		transform: rotate(45deg);
	}

	@keyframes confetti-fall {
		0% {
			transform: translateY(0) translateX(0) rotate(var(--rotation, 0deg)) scale(1);
			opacity: 1;
		}
		50% {
			transform: translateY(50vh) translateX(calc(var(--x-drift, 0) * 1vw)) rotate(calc(var(--rotation, 0deg) + 180deg)) scale(1.2);
			opacity: 0.9;
		}
		100% {
			transform: translateY(100vh) translateX(calc(var(--x-drift, 0) * 2vw)) rotate(calc(var(--rotation, 0deg) + 360deg)) scale(0.8);
			opacity: 0;
		}
	}
</style>


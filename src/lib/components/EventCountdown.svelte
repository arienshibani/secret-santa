<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { t } from '$lib/i18n';
	
	export let eventDate: string | null;
	
	let timeRemaining = '';
	let hasPassed = false;
	let intervalId: ReturnType<typeof setInterval> | null = null;
	
	const updateCountdown = () => {
		if (!eventDate) {
			timeRemaining = '';
			hasPassed = false;
			return;
		}
		
		const now = new Date().getTime();
		const event = new Date(eventDate).getTime();
		const diff = event - now;
		
		if (diff <= 0) {
			hasPassed = true;
			timeRemaining = '';
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
			return;
		}
		
		hasPassed = false;
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diff % (1000 * 60)) / 1000);
		
		const parts = [];
		if (days > 0) parts.push(`${days}d`);
		if (hours > 0 || days > 0) parts.push(`${hours}h`);
		if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
		parts.push(`${seconds}s`);
		
		timeRemaining = parts.join(' ');
	};
	
	onMount(() => {
		updateCountdown();
		intervalId = setInterval(updateCountdown, 1000);
	});
	
	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});
	
	$: if (eventDate) {
		updateCountdown();
	}
</script>

{#if eventDate && (timeRemaining || hasPassed)}
	<div class="flex items-center gap-2 text-sm">
		<span class="text-gray-600">⏰</span>
		<span class="font-medium text-gray-700">
			{#if hasPassed}
				⏰ {$t('admin.eventHasPassed')}
			{:else}
				{$t('admin.countdownPrefix')} {timeRemaining}
			{/if}
		</span>
	</div>
{/if}


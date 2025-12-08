<script lang="ts">
	import { t } from '$lib/i18n';

	export let onConfirm: () => void = () => {};

	let showDialog = false;

	const handleConfirm = () => {
		showDialog = false;
		onConfirm();
	};
</script>

<button
	type="button"
	class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
	on:click={() => (showDialog = true)}
>
	<span>👁️</span>
	{$t('admin.showAssignees')}
</button>

{#if showDialog}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		role="button"
		tabindex="-1"
		on:click={() => (showDialog = false)}
		on:keydown={(e) => e.key === 'Escape' && (showDialog = false)}
	>
		<div
			class="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl"
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
		>
			<h3 id="dialog-title" class="text-xl font-bold text-gray-900 mb-4">⚠️ {$t('admin.showAssigneesWarning')}</h3>
			<div class="flex gap-3 justify-end">
				<button
					type="button"
					class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
					on:click={() => (showDialog = false)}
				>
					{$t('admin.no')}
				</button>
				<button
					type="button"
					class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
					on:click={handleConfirm}
				>
					{$t('admin.confirm')}
				</button>
			</div>
		</div>
	</div>
{/if}


<script lang="ts">
	import { resolve } from '$app/paths';
	import Check from '@lucide/svelte/icons/check';
	import Circle from '@lucide/svelte/icons/circle';
	import { getSiteProgress } from './progress.remote';
	import type { ProgressStep } from '$lib/server/progress/service';

	let { siteId }: { siteId: string } = $props();
	const progress = $derived(getSiteProgress(siteId));

	// Map each step to the page where the user acts on it.
	function stepHref(key: ProgressStep['key']): string {
		switch (key) {
			case 'google':
				return resolve('/(app)/sites/[siteId]', { siteId });
			case 'keywords':
				return resolve('/(app)/sites/[siteId]/keywords', { siteId });
			case 'content':
				return resolve('/(app)/sites/[siteId]/content', { siteId });
			default:
				return resolve('/(app)/sites/[siteId]', { siteId });
		}
	}
</script>

{#if progress.ready && progress.current.percent < 100}
	{@const p = progress.current}
	<div class="card p-5">
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-lg text-text">Your progress to ranking</h2>
			<span class="mono text-sm text-dim">{p.completed}/{p.total}</span>
		</div>

		<div class="bg-elev-2 mt-3 h-2 overflow-hidden rounded-pill">
			<div class="bg-accent h-full rounded-pill transition-all" style:width="{p.percent}%"></div>
		</div>

		<!-- eslint-disable svelte/no-navigation-without-resolve -- stepHref() returns resolve()d paths -->
		<ul class="mt-4 space-y-1.5">
			{#each p.steps as step (step.key)}
				<li>
					<a
						href={stepHref(step.key)}
						class="flex items-center gap-3 rounded-field px-2 py-1.5 transition hover:bg-elev-2"
						class:pointer-events-none={step.done}
					>
						{#if step.done}
							<span
								class="bg-good inline-flex size-5 shrink-0 items-center justify-center rounded-pill text-white"
							>
								<Check size={13} />
							</span>
						{:else}
							<Circle size={20} class="shrink-0 text-faint" />
						{/if}
						<span class="flex-1">
							<span
								class="text-sm font-medium"
								class:text-text={!step.done}
								class:text-dim={step.done}
							>
								{step.label}
							</span>
							<span class="block text-xs text-faint">{step.hint}</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
{/if}

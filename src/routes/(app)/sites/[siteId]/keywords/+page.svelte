<script lang="ts">
	import { resolve } from '$app/paths';
	import type { SearchIntent } from '$lib/server/db/schema';
	import type { KeywordSuggestion } from '$lib/server/keywords/service';
	import {
		getSavedKeywords,
		researchKeywords,
		removeKeyword,
		saveKeyword
	} from '../keywords.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let seed = $state('');
	let result = $state<ReturnType<typeof researchKeywords> | null>(null);
	const saved = $derived(getSavedKeywords(data.siteId));

	const savedPhrases = $derived(new Set((saved.current ?? []).map((k) => k.phrase)));

	const intentClass: Record<SearchIntent, string> = {
		informational: 'text-accent',
		commercial: 'text-warn',
		transactional: 'text-good',
		navigational: 'text-faint'
	};

	function search(event: SubmitEvent) {
		event.preventDefault();
		if (seed.trim().length < 2) return;
		result = researchKeywords({ siteId: data.siteId, seed: seed.trim() });
	}

	async function save(s: KeywordSuggestion) {
		await saveKeyword({
			siteId: data.siteId,
			phrase: s.phrase,
			intent: s.intent,
			volume: s.volume,
			difficulty: s.difficulty,
			cpc: s.cpc
		});
	}
</script>

<svelte:head><title>Keyword research · SEOMaster</title></svelte:head>

<a
	href={resolve('/(app)/sites/[siteId]', { siteId: data.siteId })}
	class="text-sm text-dim hover:text-accent"
>
	← Back to site
</a>

<div class="mt-4 space-y-6">
	<div>
		<h1 class="text-2xl text-text">Keyword research</h1>
		<p class="mt-1 text-dim">
			Enter a topic and we’ll find what people actually search for — grouped by theme, with the
			intent behind each search.
		</p>
	</div>

	<form onsubmit={search} class="flex gap-3">
		<input
			bind:value={seed}
			placeholder="e.g. running shoes"
			class="field"
			aria-label="Topic or phrase"
		/>
		<button class="btn btn-primary" disabled={result?.loading}>
			{result?.loading ? 'Searching…' : 'Find keywords'}
		</button>
	</form>

	{#if result}
		{#if result.error}
			<div class="card p-6 text-bad">Couldn’t fetch keyword ideas. Please try again.</div>
		{:else if !result.ready}
			<div class="card p-6 text-dim">Finding keyword ideas…</div>
		{:else}
			{@const r = result.current}
			<div class="flex items-center justify-between">
				<p class="text-sm text-dim">{r.total} ideas across {r.clusters.length} themes</p>
				{#if !r.metricsAvailable}
					<p class="text-xs text-faint">
						Connect a keyword data source for search volume &amp; difficulty.
					</p>
				{/if}
			</div>

			{#each r.clusters as cluster (cluster.label)}
				<div class="card p-5">
					<h2 class="text-lg text-text capitalize">{cluster.label}</h2>
					<ul class="mt-3 divide-y divide-line">
						{#each cluster.items as kw (kw.phrase)}
							<li class="flex items-center gap-3 py-2">
								<span class="flex-1 truncate text-text">{kw.phrase}</span>
								<span class="text-xs font-semibold uppercase {intentClass[kw.intent]}">
									{kw.intent}
								</span>
								<span class="mono w-16 text-right text-sm text-dim">{kw.volume ?? '—'}</span>
								<span class="mono w-10 text-right text-sm text-dim">{kw.difficulty ?? '—'}</span>
								{#if savedPhrases.has(kw.phrase)}
									<span class="w-16 text-right text-xs text-good">Saved</span>
								{:else}
									<button onclick={() => save(kw)} class="btn w-16 px-2 py-1 text-xs">Save</button>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		{/if}
	{/if}

	<!-- Saved keywords -->
	{#if saved.ready && saved.current.length > 0}
		<div class="card p-5">
			<h2 class="text-lg text-text">Saved keywords</h2>
			<ul class="mt-3 divide-y divide-line">
				{#each saved.current as kw (kw.id)}
					<li class="flex items-center gap-3 py-2">
						<span class="flex-1 truncate text-text">{kw.phrase}</span>
						<span class="text-xs font-semibold uppercase {intentClass[kw.intent]}">{kw.intent}</span
						>
						<span class="mono w-16 text-right text-sm text-dim">{kw.volume ?? '—'}</span>
						<button
							onclick={() => removeKeyword({ siteId: data.siteId, keywordId: kw.id })}
							class="btn px-2 py-1 text-xs"
						>
							Remove
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

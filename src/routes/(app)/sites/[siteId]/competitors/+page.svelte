<script lang="ts">
	import { resolve } from '$app/paths';
	import SiteNav from '../SiteNav.svelte';
	import {
		addCompetitor,
		analyzeCompetitors,
		getCompetitors,
		removeCompetitor
	} from '../competitors.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const competitors = $derived(getCompetitors(data.siteId));

	let url = $state('');
	let addError = $state<string | null>(null);
	let addBusy = $state(false);

	let analysis = $state<Awaited<ReturnType<typeof analyzeCompetitors>> | null>(null);
	let analyzing = $state(false);

	async function add(event: SubmitEvent) {
		event.preventDefault();
		if (!url.trim()) return;
		addBusy = true;
		addError = null;
		try {
			const res = await addCompetitor({ siteId: data.siteId, url: url.trim() });
			if (res.ok) url = '';
			else addError = res.message ?? 'Could not add competitor.';
		} finally {
			addBusy = false;
		}
	}

	async function analyze() {
		analyzing = true;
		try {
			analysis = await analyzeCompetitors(data.siteId);
		} finally {
			analyzing = false;
		}
	}
</script>

<svelte:head><title>Competitors · SEOMaster</title></svelte:head>

<SiteNav siteId={data.siteId} current="competitors" />

<div class="space-y-6">
	<div>
		<h1 class="text-2xl text-text">Competitors</h1>
		<p class="mt-1 text-dim">
			Add competitor websites and we’ll find topics they cover that your site doesn’t — your content
			opportunities.
		</p>
	</div>

	<!-- Add competitor -->
	<div class="card p-6">
		<h2 class="text-lg text-text">Add a competitor</h2>
		<form onsubmit={add} class="mt-3 flex gap-3">
			<input
				bind:value={url}
				placeholder="competitor.com"
				class="field"
				aria-label="Competitor URL"
			/>
			<button class="btn btn-primary" disabled={addBusy}>{addBusy ? 'Adding…' : 'Add'}</button>
		</form>
		{#if addError}<p class="mt-2 text-sm text-bad">{addError}</p>{/if}
	</div>

	<!-- Competitor list -->
	{#if competitors.ready && competitors.current.length > 0}
		<div class="card p-5">
			<div class="flex items-center justify-between">
				<h2 class="text-lg text-text">Tracked competitors</h2>
				<button onclick={analyze} disabled={analyzing} class="btn btn-primary text-sm">
					{analyzing ? 'Analyzing…' : 'Analyze content gap'}
				</button>
			</div>
			<ul class="mt-3 divide-y divide-line">
				{#each competitors.current as c (c.id)}
					<li class="flex items-center gap-3 py-2">
						<span class="mono flex-1 truncate text-text">{c.domain}</span>
						<button
							onclick={() => removeCompetitor({ siteId: data.siteId, competitorId: c.id })}
							class="btn px-2 py-1 text-xs">Remove</button
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Analysis results -->
	{#if analyzing}
		<div class="card p-8 text-center text-dim">
			Crawling competitors and comparing topics — this can take a minute.
		</div>
	{:else if analysis}
		{#if analysis.needsCompetitors}
			<div class="card p-6 text-dim">Add at least one competitor above, then analyze.</div>
		{:else if analysis.needsAudit}
			<div class="card p-6 text-dim">
				Run an audit of your own site first so we know what you already cover.
				<a
					href={resolve('/(app)/sites/[siteId]', { siteId: data.siteId })}
					class="text-accent underline">Go to site report</a
				>
			</div>
		{:else}
			{#if analysis.topOpportunities.length > 0}
				<div class="card p-5">
					<h2 class="text-lg text-text">Top content opportunities</h2>
					<p class="mt-1 text-sm text-dim">
						Topics your competitors cover that your site doesn’t — great candidates for new pages.
					</p>
					<div class="mt-3 flex flex-wrap gap-2">
						{#each analysis.topOpportunities as term (term)}
							<span class="pill">{term}</span>
						{/each}
					</div>
				</div>
			{/if}

			{#each analysis.competitors as comp (comp.domain)}
				<div class="card p-5">
					<h3 class="mono text-text">{comp.domain}</h3>
					<p class="text-xs text-faint">{comp.pagesAnalyzed} pages analyzed</p>

					{#if comp.gapTerms.length > 0}
						<p class="mt-3 text-sm font-medium text-text">Topics they cover that you don’t:</p>
						<div class="mt-1 flex flex-wrap gap-2">
							{#each comp.gapTerms as term (term)}
								<span class="pill">{term}</span>
							{/each}
						</div>
					{:else}
						<p class="mt-3 text-sm text-good">
							No obvious content gaps — you cover their topics. 🎉
						</p>
					{/if}

					{#if comp.topPages.length > 0}
						<p class="mt-4 text-sm font-medium text-text">Their top pages:</p>
						<ul class="mt-1 space-y-1">
							{#each comp.topPages as p (p.url)}
								<li class="truncate text-sm text-dim">{p.title}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		{/if}
	{/if}
</div>

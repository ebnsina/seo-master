<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FileText from '@lucide/svelte/icons/file-text';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import SiteNav from '../SiteNav.svelte';
	import {
		addCompetitor,
		analyzeCompetitors,
		getCompetitors,
		removeCompetitor
	} from '../competitors.remote';
	import { createBrief } from '../content.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const competitors = $derived(getCompetitors(data.siteId));

	let url = $state('');
	let addError = $state<string | null>(null);
	let addBusy = $state(false);

	let analysis = $state<Awaited<ReturnType<typeof analyzeCompetitors>> | null>(null);
	let analyzing = $state(false);

	// Track which opportunity topics have been turned into briefs (by term).
	let briefed = $state<Record<string, 'busy' | 'done'>>({});

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
		briefed = {};
		try {
			analysis = await analyzeCompetitors(data.siteId);
		} finally {
			analyzing = false;
		}
	}

	async function makeBrief(term: string) {
		if (briefed[term]) return;
		briefed = { ...briefed, [term]: 'busy' };
		try {
			await createBrief({ siteId: data.siteId, keyword: term });
			briefed = { ...briefed, [term]: 'done' };
		} catch {
			const next = { ...briefed };
			delete next[term];
			briefed = next;
		}
	}
</script>

<svelte:head><title>Competitors · SEOMaster</title></svelte:head>

<SiteNav siteId={data.siteId} current="competitors" />

<div class="space-y-6">
	<div>
		<h1 class="text-2xl text-text">Competitors</h1>
		<p class="mt-1 text-dim">
			Add rival websites and we’ll find the topics they cover that you don’t — then turn each gap
			into a content brief in one click.
		</p>
	</div>

	<!-- Add competitor -->
	<div class="card p-6">
		<h2 class="text-lg text-text">Add a competitor</h2>
		<form onsubmit={add} class="mt-3 flex flex-wrap gap-3">
			<input
				bind:value={url}
				placeholder="competitor.com"
				class="field flex-1"
				aria-label="Competitor URL"
			/>
			<button class="btn btn-primary" disabled={addBusy}
				>{addBusy ? 'Adding…' : 'Add competitor'}</button
			>
		</form>
		{#if addError}<p class="mt-2 text-sm text-bad">{addError}</p>{/if}
	</div>

	<!-- Competitor list -->
	{#if competitors.ready && competitors.current.length > 0}
		<div class="card p-5">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg text-text">Tracked competitors</h2>
					<p class="text-xs text-faint">
						We analyze up to 4 competitors, 10 pages each — no setup or API key needed.
					</p>
				</div>
				<button onclick={analyze} disabled={analyzing} class="btn btn-primary text-sm">
					{analyzing ? 'Analyzing…' : 'Analyze content gap'}
				</button>
			</div>
			<ul class="mt-4 divide-y divide-line">
				{#each competitors.current as c (c.id)}
					<li class="flex items-center gap-3 py-2.5">
						<span class="mono flex-1 truncate text-text">{c.domain}</span>
						<button
							onclick={() => removeCompetitor({ siteId: data.siteId, competitorId: c.id })}
							aria-label="Remove competitor"
							class="btn px-2.5 py-1.5 text-xs"
						>
							<Trash2 size={14} />
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{:else if competitors.ready}
		<div class="note note-info p-5 text-sm text-dim">
			Not sure who your competitors are? Add the sites that rank above you for searches you care
			about — even one is enough to start.
		</div>
	{/if}

	<!-- Analysis results -->
	{#if analyzing}
		<div class="card p-8 text-center text-dim">
			Crawling competitors and comparing topics — this can take a minute.
		</div>
	{:else if analysis}
		{#if analysis.needsCompetitors}
			<div class="note note-warn p-5 text-sm text-dim">
				Add at least one competitor above, then analyze.
			</div>
		{:else if analysis.needsAudit}
			<div class="note note-warn p-5 text-sm text-dim">
				<strong class="text-warn">Run an audit of your own site first</strong> so we know what you
				already cover.
				<a
					href={resolve('/(app)/sites/[siteId]', { siteId: data.siteId })}
					class="text-accent underline">Go to site report</a
				>
			</div>
		{:else}
			<!-- Head-to-head scoreboard -->
			<div class="card overflow-hidden">
				<div class="border-b border-line p-5">
					<h2 class="text-lg text-text">Head to head</h2>
					<p class="text-xs text-faint">
						You cover <span class="font-semibold text-text">{analysis.yourTopics}</span> topics. Here’s
						how each competitor compares.
					</p>
				</div>
				<table class="w-full text-sm">
					<thead class="border-b border-line text-left text-xs text-faint uppercase">
						<tr>
							<th class="p-3">Competitor</th>
							<th class="p-3 text-right">Pages</th>
							<th class="p-3 text-right">Topics</th>
							<th class="p-3 text-right">You’re missing</th>
						</tr>
					</thead>
					<tbody>
						{#each analysis.competitors as comp (comp.domain)}
							<tr class="border-b border-line last:border-0">
								<td class="mono max-w-0 truncate p-3 text-text">{comp.domain}</td>
								<td class="mono p-3 text-right text-dim">{comp.pagesAnalyzed}</td>
								<td class="mono p-3 text-right text-dim">{comp.topicsCovered}</td>
								<td class="mono p-3 text-right">
									<span class={comp.gapTopics > 0 ? 'text-warn' : 'text-good'}
										>{comp.gapTopics}</span
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Top opportunities — actionable -->
			{#if analysis.topOpportunities.length > 0}
				<div class="card p-5">
					<h2 class="text-lg text-text">Your biggest content opportunities</h2>
					<p class="mt-1 text-sm text-dim">
						Topics competitors cover that you don’t. Turn any into a content brief to start ranking
						for it.
					</p>
					<ul class="mt-4 space-y-2">
						{#each analysis.topOpportunities as opp (opp.term)}
							<li class="flex flex-wrap items-center gap-3 rounded-field bg-elev-2 px-4 py-2.5">
								<span class="flex-1 font-medium text-text">{opp.term}</span>
								{#if opp.competitors > 1}
									<span class="pill">{opp.competitors} competitors</span>
								{/if}
								{#if briefed[opp.term] === 'done'}
									<a
										href={resolve('/(app)/sites/[siteId]/content', { siteId: data.siteId })}
										class="btn text-xs"
									>
										Brief created <ArrowRight size={14} />
									</a>
								{:else}
									<button
										onclick={() => makeBrief(opp.term)}
										disabled={briefed[opp.term] === 'busy'}
										class="btn btn-primary text-xs"
									>
										<FileText size={14} />
										{briefed[opp.term] === 'busy' ? 'Creating…' : 'Create brief'}
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Per-competitor detail -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -- external competitor links only -->
			{#each analysis.competitors as comp (comp.domain)}
				<div class="card p-5">
					<a
						href={comp.url}
						target="_blank"
						rel="noreferrer"
						class="mono inline-flex items-center gap-1.5 text-text hover:text-accent"
					>
						{comp.domain}<ExternalLink size={14} />
					</a>
					<p class="text-xs text-faint">
						{comp.pagesAnalyzed} pages analyzed · {comp.sharedTopics} topics shared with you
					</p>

					{#if comp.gapTerms.length > 0}
						<p class="mt-3 text-sm font-medium text-text">Topics they cover that you don’t:</p>
						<div class="mt-1.5 flex flex-wrap gap-2">
							{#each comp.gapTerms as term (term)}
								<span class="pill">{term}</span>
							{/each}
						</div>
					{:else}
						<p class="mt-3 text-sm text-good">No obvious content gaps — you cover their topics.</p>
					{/if}

					{#if comp.topPages.length > 0}
						<p class="mt-4 text-sm font-medium text-text">Their top pages:</p>
						<ul class="mt-1 space-y-1">
							{#each comp.topPages as p (p.url)}
								<li class="truncate text-sm">
									<a
										href={p.url}
										target="_blank"
										rel="noreferrer"
										class="text-dim hover:text-accent">{p.title}</a
									>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/if}
	{/if}
</div>

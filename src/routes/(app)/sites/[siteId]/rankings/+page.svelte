<script lang="ts">
	import { resolve } from '$app/paths';
	import SiteNav from '../SiteNav.svelte';
	import { getRankings, refreshRankings, type RefreshResult } from '../rankings.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const rankings = $derived(getRankings(data.siteId));
	let result = $state<RefreshResult | null>(null);
	let busy = $state(false);

	async function refresh() {
		busy = true;
		try {
			result = await refreshRankings(data.siteId);
		} finally {
			busy = false;
		}
	}

	function fmtPosition(p: number | null | undefined): string {
		return p == null ? '—' : p.toFixed(1);
	}
</script>

<svelte:head><title>Rank tracking · SEOMaster</title></svelte:head>

<SiteNav siteId={data.siteId} current="rankings" />

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl text-text">Rank tracking</h1>
			<p class="mt-1 text-dim">
				Your real Google performance for saved keywords, pulled from Search Console (average
				position over the last 28 days).
			</p>
		</div>
		<button onclick={refresh} disabled={busy} class="btn btn-primary">
			{busy ? 'Refreshing…' : 'Refresh from Google'}
		</button>
	</div>

	{#if result}
		<p class="text-sm {result.ok ? 'text-good' : 'text-bad'}">{result.message}</p>
	{/if}

	{#if rankings.error}
		<div class="card p-6 text-bad">Couldn’t load rankings.</div>
	{:else if !rankings.ready}
		<div class="card p-6 text-dim">Loading…</div>
	{:else if rankings.current.rows.length === 0}
		<div class="card p-10 text-center">
			<h2 class="text-lg text-text">No keywords yet</h2>
			<p class="mx-auto mt-2 max-w-md text-dim">
				Save some keywords first, then come back to track where you rank for them on Google.
			</p>
			<a
				href={resolve('/(app)/sites/[siteId]/keywords', { siteId: data.siteId })}
				class="btn btn-primary mt-4 inline-flex"
			>
				Find keywords
			</a>
		</div>
	{:else}
		{#if !rankings.current.connected}
			<div class="card p-4 text-sm text-dim">
				Connect Google Search Console on the
				<a
					href={resolve('/(app)/sites/[siteId]', { siteId: data.siteId })}
					class="text-accent underline">site report</a
				>
				to pull your real rankings.
			</div>
		{/if}

		<div class="card overflow-hidden">
			<table class="w-full text-sm">
				<thead class="border-b border-line text-left text-xs text-faint uppercase">
					<tr>
						<th class="p-3">Keyword</th>
						<th class="p-3 text-right">Position</th>
						<th class="p-3 text-right">Change</th>
						<th class="p-3 text-right">Clicks</th>
						<th class="p-3 text-right">Impressions</th>
					</tr>
				</thead>
				<tbody>
					{#each rankings.current.rows as row (row.keyword.id)}
						<tr class="border-b border-line last:border-0">
							<td class="max-w-0 truncate p-3 text-text">{row.keyword.phrase}</td>
							<td class="mono p-3 text-right text-text">{fmtPosition(row.latest?.position)}</td>
							<td class="mono p-3 text-right">
								{#if row.delta == null}
									<span class="text-faint">—</span>
								{:else if row.delta > 0.05}
									<span class="text-good">▲ {row.delta.toFixed(1)}</span>
								{:else if row.delta < -0.05}
									<span class="text-bad">▼ {Math.abs(row.delta).toFixed(1)}</span>
								{:else}
									<span class="text-faint">–</span>
								{/if}
							</td>
							<td class="mono p-3 text-right text-dim">{row.latest?.clicks ?? '—'}</td>
							<td class="mono p-3 text-right text-dim">{row.latest?.impressions ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-xs text-faint">
			Lower position is better (1 = top of Google). “Change” compares your two most recent
			refreshes.
		</p>
	{/if}
</div>

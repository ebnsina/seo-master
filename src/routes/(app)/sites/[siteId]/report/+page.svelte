<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Printer from '@lucide/svelte/icons/printer';
	import { getAudit } from '../audit.remote';
	import { getCategory, getGuidance, SEVERITY_ORDER } from '$lib/guidance/issues';
	import type { IssueSeverity } from '$lib/server/db/schema';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const audit = $derived(getAudit(data.siteId));

	const generated = new Date().toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	interface IssueGroup {
		code: string;
		severity: IssueSeverity;
		title: string;
		count: number;
	}

	const groups = $derived.by<IssueGroup[]>(() => {
		const snap = audit.current?.audit;
		if (!snap) return [];
		const byCode: Record<string, IssueGroup> = {};
		const order: string[] = [];
		for (const issue of snap.issues) {
			let g = byCode[issue.code];
			if (!g) {
				g = {
					code: issue.code,
					severity: issue.severity,
					title: getGuidance(issue.code)?.title ?? issue.code,
					count: 0
				};
				byCode[issue.code] = g;
				order.push(issue.code);
			}
			g.count += 1;
		}
		return order
			.map((c) => byCode[c])
			.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
	});

	const seoGroups = $derived(groups.filter((g) => getCategory(g.code) === 'seo'));
	const geoGroups = $derived(groups.filter((g) => getCategory(g.code) === 'geo'));

	function scoreColor(score: number): string {
		if (score >= 80) return 'text-good';
		if (score >= 50) return 'text-warn';
		return 'text-bad';
	}

	const severityLabel: Record<IssueSeverity, string> = {
		critical: 'Critical',
		warning: 'Warning',
		notice: 'Suggestion'
	};
	const severityClass: Record<IssueSeverity, string> = {
		critical: 'text-bad',
		warning: 'text-warn',
		notice: 'text-faint'
	};
</script>

<svelte:head><title>Report · {audit.current?.site.name ?? 'Site'} · SEOMaster</title></svelte:head>

<!-- Toolbar (not printed) -->
<div class="mb-6 flex items-center justify-between gap-3 print:hidden">
	<a
		href={resolve('/(app)/sites/[siteId]', { siteId: data.siteId })}
		class="inline-flex items-center gap-1.5 text-sm text-dim hover:text-accent"
	>
		<ArrowLeft size={16} /> Back to report
	</a>
	<button onclick={() => window.print()} class="btn btn-primary text-sm">
		<Printer size={15} /> Print / Save as PDF
	</button>
</div>

{#if audit.error}
	<div class="note note-bad p-5 text-bad">Couldn’t load this report.</div>
{:else if !audit.ready}
	<div class="card p-6 text-dim">Loading…</div>
{:else if !audit.current.audit}
	<div class="note note-warn p-5 text-dim">
		Run an audit first, then come back to generate a shareable report.
	</div>
{:else}
	{@const a = audit.current}
	{#if a.audit}
		{@const crawl = a.audit.crawl}
		<article class="mx-auto max-w-3xl space-y-8">
			<!-- Letterhead -->
			<header class="flex items-end justify-between gap-4 border-b border-line pb-5">
				<div>
					<p class="font-display text-xl font-semibold text-text">
						SEO<span class="text-accent">Master</span>
					</p>
					<h1 class="mt-2 text-2xl text-text">SEO report</h1>
					<p class="mono mt-1 text-sm text-dim">{a.site.url}</p>
				</div>
				<div class="text-right text-sm text-dim">
					<p class="font-medium text-text">{a.site.name}</p>
					<p>{generated}</p>
				</div>
			</header>

			<!-- Readiness -->
			{#if a.readiness}
				<div class="note p-5 {a.readiness.ready ? 'note-good' : 'note-bad'}">
					<h2 class="text-lg {a.readiness.ready ? 'text-good' : 'text-bad'}">
						{a.readiness.headline}
					</h2>
					<p class="mt-1 text-dim">{a.readiness.detail}</p>
				</div>
			{/if}

			<!-- Scores -->
			<section>
				<h2 class="mb-3 text-lg text-text">At a glance</h2>
				<div class="grid grid-cols-3 gap-3">
					<div class="card p-4 text-center">
						<div class="text-3xl font-semibold {scoreColor(crawl.healthScore ?? 0)}">
							{crawl.healthScore}
						</div>
						<div class="mt-1 text-xs text-dim">Health score</div>
					</div>
					<div class="card p-4 text-center">
						<div class="text-3xl font-semibold text-text">{crawl.pagesCrawled}</div>
						<div class="mt-1 text-xs text-dim">Pages checked</div>
					</div>
					<div class="card p-4 text-center">
						<div class="text-3xl font-semibold text-text">{a.audit.issues.length}</div>
						<div class="mt-1 text-xs text-dim">Issues found</div>
					</div>
				</div>

				{#if crawl.performanceScore != null}
					<div class="mt-3 grid grid-cols-4 gap-3">
						<div class="card p-3 text-center">
							<div class="text-xl font-semibold {scoreColor(crawl.performanceScore ?? 0)}">
								{crawl.performanceScore}
							</div>
							<div class="text-xs text-dim">Performance</div>
						</div>
						<div class="card p-3 text-center">
							<div class="text-xl font-semibold text-text">
								{crawl.lcpMs != null ? `${(crawl.lcpMs / 1000).toFixed(1)}s` : '—'}
							</div>
							<div class="text-xs text-dim">LCP</div>
						</div>
						<div class="card p-3 text-center">
							<div class="text-xl font-semibold text-text">{crawl.clsScore?.toFixed(2) ?? '—'}</div>
							<div class="text-xs text-dim">CLS</div>
						</div>
						<div class="card p-3 text-center">
							<div class="text-xl font-semibold text-text">
								{crawl.tbtMs != null ? `${crawl.tbtMs}ms` : '—'}
							</div>
							<div class="text-xs text-dim">TBT</div>
						</div>
					</div>
				{/if}
			</section>

			<!-- Issues -->
			{#snippet issueList(title: string, list: IssueGroup[])}
				<section class="break-inside-avoid">
					<h2 class="mb-3 text-lg text-text">{title}</h2>
					<table class="w-full text-sm">
						<tbody>
							{#each list as g (g.code)}
								<tr class="border-b border-line last:border-0">
									<td class="py-2 pr-3 align-top">
										<span class="text-xs font-semibold uppercase {severityClass[g.severity]}">
											{severityLabel[g.severity]}
										</span>
									</td>
									<td class="py-2 pr-3 align-top font-medium text-text">{g.title}</td>
									<td class="py-2 text-right align-top whitespace-nowrap text-dim">
										{g.count}
										{g.count === 1 ? 'page' : 'pages'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</section>
			{/snippet}

			{#if groups.length === 0}
				<div class="note note-good p-5 text-good">
					No issues found — this site is in great shape.
				</div>
			{:else}
				{#if seoGroups.length > 0}{@render issueList('Search engine SEO', seoGroups)}{/if}
				{#if geoGroups.length > 0}{@render issueList('AI search (GEO)', geoGroups)}{/if}
			{/if}

			<footer class="border-t border-line pt-4 text-center text-xs text-faint">
				Generated by SEOMaster · {generated}
			</footer>
		</article>
	{/if}
{/if}

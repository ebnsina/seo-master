<script lang="ts">
	import { resolve } from '$app/paths';
	import Check from '@lucide/svelte/icons/check';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import { quickAddSite } from '../sites.remote';
	import { startAudit } from '../sites/[siteId]/audit.remote';

	let step = $state(1);
	let url = $state('');
	let name = $state('');
	let siteId = $state<string | null>(null);
	let busy = $state(false);
	let error = $state<string | null>(null);

	const stepLabels = ['Add website', 'Run audit', 'Done'];

	async function add(event: SubmitEvent) {
		event.preventDefault();
		if (url.trim().length < 1) return;
		busy = true;
		error = null;
		try {
			const res = await quickAddSite({ url: url.trim(), name: name.trim() || undefined });
			if (res.ok && res.siteId) {
				siteId = res.siteId;
				step = 2;
			} else {
				error = res.message ?? 'Could not add that website.';
			}
		} finally {
			busy = false;
		}
	}

	async function runAudit() {
		if (!siteId) return;
		busy = true;
		try {
			await startAudit(siteId);
			step = 3;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Get started · SEOMaster</title></svelte:head>

<div class="mx-auto max-w-xl">
	<!-- Progress -->
	<ol class="mb-10 flex items-center gap-2">
		{#each stepLabels as label, i (label)}
			{@const n = i + 1}
			<li class="flex flex-1 items-center gap-2">
				<span
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-sm font-semibold transition"
					class:bg-accent={step >= n}
					class:text-white={step >= n}
					class:bg-elev-2={step < n}
					class:text-faint={step < n}
				>
					{#if step > n}<Check size={16} />{:else}{n}{/if}
				</span>
				<span class="text-sm" class:text-text={step >= n} class:text-faint={step < n}>{label}</span>
				{#if n < stepLabels.length}<span class="border-line ml-1 h-px flex-1 border-t"></span>{/if}
			</li>
		{/each}
	</ol>

	{#if step === 1}
		<h1 class="font-display text-3xl text-text">Let’s get your site found</h1>
		<p class="mt-3 text-lg text-dim">
			Add your website to begin. We’ll scan it and show you what to fix — in plain language.
		</p>
		<form onsubmit={add} class="mt-8 space-y-4">
			<label class="block">
				<span class="text-sm font-medium text-text">Website address</span>
				<input bind:value={url} placeholder="example.com" class="field mt-1" />
			</label>
			<label class="block">
				<span class="text-sm font-medium text-text">Friendly name (optional)</span>
				<input bind:value={name} placeholder="My site" class="field mt-1" />
			</label>
			{#if error}<p class="text-sm text-bad">{error}</p>{/if}
			<button class="btn btn-primary w-full" disabled={busy}>
				{busy ? 'Adding…' : 'Continue'}
			</button>
		</form>
	{:else if step === 2}
		<h1 class="font-display text-3xl text-text">Run your first audit</h1>
		<p class="mt-3 text-lg text-dim">
			We’ll crawl your pages, check Core Web Vitals, and score what’s holding you back. It runs in
			the background — you don’t have to wait.
		</p>
		<button onclick={runAudit} class="btn btn-primary mt-8 w-full" disabled={busy}>
			{busy ? 'Starting…' : 'Run my audit'}
		</button>
	{:else}
		<div class="text-center">
			<div
				class="bg-accent-soft text-accent mx-auto inline-flex size-16 items-center justify-center rounded-field"
			>
				<PartyPopper size={30} />
			</div>
			<h1 class="font-display mt-5 text-3xl text-text">You’re all set!</h1>
			<p class="mt-3 text-lg text-dim">
				Your audit is running. In a minute you’ll see your health score and a prioritized list of
				fixes — each explained simply.
			</p>
			<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
				{#if siteId}
					<a href={resolve('/(app)/sites/[siteId]', { siteId })} class="btn btn-primary">
						View my report
					</a>
				{/if}
				<a href={resolve('/dashboard')} class="btn">Go to dashboard</a>
			</div>
		</div>
	{/if}
</div>

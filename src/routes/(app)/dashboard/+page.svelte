<script lang="ts">
	import { resolve } from '$app/paths';
	import { addSite, getSites, removeSite } from '../sites.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const sites = getSites();

	const steps = [
		{ n: 1, title: 'Add your website', body: 'Paste your address below — no technical setup.' },
		{
			n: 2,
			title: 'Run a free audit',
			body: 'We crawl your pages and score what’s holding you back.'
		},
		{
			n: 3,
			title: 'Fix & get found',
			body: 'Follow the plain-language fixes, then submit to Google.'
		}
	];
</script>

<svelte:head>
	<title>Your websites · SEOMaster</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<h1 class="text-2xl text-text">Welcome, {data.user.name} 👋</h1>
		<p class="mt-1 text-dim">
			Add a website and we’ll guide you, step by step, toward ranking on Google.
		</p>
	</div>

	<!-- Onboarding steps (only before the first site is added) -->
	{#if sites.ready && sites.current.length === 0}
		<div class="grid gap-3 sm:grid-cols-3">
			{#each steps as step (step.n)}
				<div class="card p-5">
					<div
						class="bg-accent-soft text-accent flex h-8 w-8 items-center justify-center rounded-pill font-semibold"
					>
						{step.n}
					</div>
					<h3 class="mt-3 font-medium text-text">{step.title}</h3>
					<p class="mt-1 text-sm text-dim">{step.body}</p>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Add a website -->
	<div class="card p-6">
		<h2 class="text-lg text-text">Add a website</h2>
		<p class="mt-1 text-sm text-dim">Paste your address — no technical setup needed.</p>

		<form {...addSite} class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
			<div>
				<input
					{...addSite.fields.url.as('text')}
					placeholder="example.com"
					class="field"
					aria-label="Website address"
				/>
				{#each addSite.fields.url.issues() as issue (issue.message)}
					<span class="mt-1 block text-sm text-bad">{issue.message}</span>
				{/each}
			</div>
			<input
				{...addSite.fields.name.as('text')}
				placeholder="Friendly name (optional)"
				class="field"
				aria-label="Friendly name"
			/>
			<button disabled={addSite.pending > 0} class="btn btn-primary">
				{addSite.pending > 0 ? 'Adding…' : 'Add website'}
			</button>
		</form>
	</div>

	<!-- Site list -->
	{#if sites.error}
		<div class="card p-6 text-bad">Couldn’t load your websites. Please refresh.</div>
	{:else if !sites.ready}
		<div class="card p-6 text-dim">Loading your websites…</div>
	{:else if sites.current.length > 0}
		<div>
			<h2 class="mb-3 text-lg text-text">Your websites</h2>
			<ul class="grid gap-3">
				{#each sites.current as site (site.id)}
					<li class="card flex items-center gap-4 p-5">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<a
									href={resolve('/(app)/sites/[siteId]', { siteId: site.id })}
									class="truncate font-medium text-text hover:text-accent"
								>
									{site.name}
								</a>
								{#if site.verificationStatus === 'verified'}
									<span class="pill pill-good">Verified</span>
								{/if}
							</div>
							<span class="mono text-sm text-dim">{site.domain}</span>
						</div>
						<a
							href={resolve('/(app)/sites/[siteId]', { siteId: site.id })}
							class="btn btn-primary px-4 py-2 text-sm"
						>
							Open report
						</a>
						<button
							onclick={() => removeSite(site.id)}
							disabled={removeSite.pending > 0}
							class="btn px-4 py-2 text-sm"
						>
							Remove
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

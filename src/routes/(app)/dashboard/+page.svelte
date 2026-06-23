<script lang="ts">
	import { resolve } from '$app/paths';
	import { addSite, getSites, removeSite } from '../sites.remote';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const sites = getSites();
</script>

<svelte:head>
	<title>Your websites · SEOMaster</title>
</svelte:head>

<div class="space-y-10">
	<div>
		<h1 class="font-display text-3xl text-text">Welcome, {data.user.name} 👋</h1>
		<p class="mt-2 text-lg text-dim">Let’s get your websites ranking on Google.</p>
	</div>

	<!-- First-run: guided setup hero -->
	{#if sites.ready && sites.current.length === 0}
		<div class="card p-8 text-center sm:p-12">
			<div class="text-4xl">🚀</div>
			<h2 class="font-display mt-4 text-2xl text-text">New here? Let’s set you up</h2>
			<p class="mx-auto mt-2 max-w-md text-dim">
				A quick 3-step walkthrough: add your site, run a free audit, and get a clear list of fixes.
			</p>
			<a href={resolve('/welcome')} class="btn btn-primary mt-6 inline-flex">Start guided setup →</a
			>
		</div>
	{/if}

	<!-- Quick add -->
	<div class="card p-6">
		<h2 class="text-lg text-text">
			{sites.ready && sites.current.length > 0 ? 'Add another website' : 'Add a website'}
		</h2>
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
	{:else if sites.ready && sites.current.length > 0}
		<div>
			<h2 class="mb-4 text-lg text-text">Your websites</h2>
			<ul class="grid gap-4">
				{#each sites.current as site (site.id)}
					<li class="card flex items-center gap-4 p-6">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<a
									href={resolve('/(app)/sites/[siteId]', { siteId: site.id })}
									class="truncate text-lg font-medium text-text hover:text-accent"
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

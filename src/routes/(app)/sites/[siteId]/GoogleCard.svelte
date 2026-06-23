<script lang="ts">
	import { page } from '$app/state';
	import {
		connectGoogle,
		disconnectGoogle,
		getGoogleStatus,
		submitToGoogle,
		type SubmitResult
	} from './google.remote';
	import VerifyOwnership from './VerifyOwnership.svelte';

	let { siteId }: { siteId: string } = $props();
	const status = $derived(getGoogleStatus(siteId));

	let submitResult = $state<SubmitResult | null>(null);
	let busy = $state(false);

	const oauthResult = $derived(page.url.searchParams.get('google'));

	async function connect() {
		busy = true;
		try {
			const { authUrl } = await connectGoogle(siteId);
			window.location.href = authUrl;
		} catch {
			busy = false;
		}
	}

	async function submit() {
		busy = true;
		try {
			submitResult = await submitToGoogle(siteId);
		} finally {
			busy = false;
		}
	}

	async function disconnect() {
		busy = true;
		try {
			await disconnectGoogle(siteId);
			submitResult = null;
		} finally {
			busy = false;
		}
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -- external Google links only -->
{#snippet manualSteps(sitemapUrl: string, consoleUrl: string)}
	<details class="mt-3">
		<summary class="cursor-pointer text-sm text-accent">Prefer to do it yourself?</summary>
		<ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-dim">
			<li>
				Open <a href={consoleUrl} target="_blank" rel="noreferrer" class="text-accent underline"
					>Google Search Console</a
				> and select (or add) your site.
			</li>
			<li>Go to the “Sitemaps” section.</li>
			<li>
				Enter your sitemap URL — <code class="mono text-text">{sitemapUrl}</code> — and click Submit.
			</li>
		</ol>
	</details>
{/snippet}

<div class="card p-5">
	<h2 class="text-lg text-text">Get found on Google</h2>

	{#if oauthResult === 'connected'}
		<p class="note note-good mt-3 text-sm text-good">Google account connected.</p>
	{:else if oauthResult === 'error'}
		<p class="note note-bad mt-3 text-sm text-bad">Couldn’t connect to Google. Please try again.</p>
	{/if}

	{#if status.loading || !status.ready}
		<p class="mt-2 text-sm text-dim">Loading…</p>
	{:else}
		{@const s = status.current}

		{#if s.isLocal}
			<p class="mt-1 text-dim">
				This is a local site, so it can’t be submitted yet. Once it’s live at a public address, come
				back here to submit it to Google.
			</p>
			{@render manualSteps(s.sitemapUrl, s.searchConsoleUrl)}
		{:else if !s.configured}
			<p class="mt-1 text-dim">
				Telling Google about your site helps it get discovered. It takes about two minutes:
			</p>
			{@render manualSteps(s.sitemapUrl, s.searchConsoleUrl)}
		{:else if !s.connected}
			<p class="mt-1 text-dim">
				Connect your Google account and we’ll submit your sitemap to Search Console for you.
			</p>
			<button onclick={connect} disabled={busy} class="btn btn-primary mt-4">
				{busy ? 'Connecting…' : 'Connect Google Search Console'}
			</button>
			{@render manualSteps(s.sitemapUrl, s.searchConsoleUrl)}
		{:else}
			<div class="flex flex-wrap items-center gap-2">
				<p class="text-sm text-dim">Connected{s.email ? ` as ${s.email}` : ''}.</p>
				{#if s.verified}<span class="pill pill-good">Ownership verified</span>{/if}
			</div>

			{#if !s.verified}
				<VerifyOwnership {siteId} />
			{/if}

			<div class="mt-4 flex flex-wrap items-center gap-3">
				<button onclick={submit} disabled={busy} class="btn btn-primary">
					{busy ? 'Submitting…' : 'Submit sitemap to Google'}
				</button>
				<button onclick={disconnect} disabled={busy} class="btn text-sm">Disconnect</button>
			</div>

			{#if submitResult}
				<p class="mt-3 text-sm {submitResult.ok ? 'text-good' : 'text-bad'}">
					{submitResult.message}
				</p>
				{#if submitResult.needsVerification}
					<p class="mt-1 text-sm text-dim">
						Tip: add <code class="mono text-text">{s.propertyUrl}</code> as a property in Search Console
						and verify ownership, then submit again.
					</p>
				{/if}
			{/if}

			{@render manualSteps(s.sitemapUrl, s.searchConsoleUrl)}
		{/if}
	{/if}
</div>

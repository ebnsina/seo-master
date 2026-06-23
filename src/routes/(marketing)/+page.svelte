<script lang="ts">
	import { resolve } from '$app/paths';

	const steps = [
		{ n: 1, title: 'Add your website', body: 'Paste your address — no code, no setup.' },
		{
			n: 2,
			title: 'Run a free audit',
			body: 'We crawl your pages and score what’s holding you back.'
		},
		{ n: 3, title: 'Fix & get found', body: 'Follow plain-language fixes, then submit to Google.' }
	];

	const features = [
		{
			icon: '🔍',
			title: 'Site audit',
			body: 'Technical + on-page checks with a health score and clear fixes.'
		},
		{
			icon: '⚡',
			title: 'Core Web Vitals',
			body: 'Real PageSpeed metrics — see exactly what’s slow.'
		},
		{
			icon: '🔑',
			title: 'Keyword research',
			body: 'What people actually search, with intent and topic clusters.'
		},
		{
			icon: '📈',
			title: 'Rank tracking',
			body: 'Your real Google positions, pulled from Search Console.'
		},
		{
			icon: '🥊',
			title: 'Competitor gaps',
			body: 'Topics rivals cover that you don’t — your content opportunities.'
		},
		{
			icon: '🤖',
			title: 'AI search (GEO)',
			body: 'Get found by ChatGPT, Claude and Perplexity, not just Google.'
		}
	];

	const faqs = [
		{
			q: 'Do I need to know SEO?',
			a: 'No. Every issue is explained in plain language with step-by-step fixes — and which ones need a developer.'
		},
		{
			q: 'Is it really free to start?',
			a: 'Yes — add a site and run an audit without a card. Paid plans add scale and automation.'
		},
		{
			q: 'Do I need to install anything?',
			a: 'No. Paste your website address and we do the rest. Connect Google when you’re ready for live data.'
		}
	];
</script>

<svelte:head>
	<title>SEOMaster — from zero visitors to ranking on Google</title>
	<meta
		name="description"
		content="SEOMaster audits your site, finds keywords, tracks rankings, and tells you exactly what to fix — in plain language. Built for people who aren't SEO experts."
	/>
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden">
	<div class="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
		<span class="pill">For people who aren’t SEO experts</span>
		<h1 class="font-display mt-5 text-4xl leading-tight font-semibold text-text sm:text-5xl">
			Take your website from <span class="text-accent">zero visitors</span> to ranking on Google
		</h1>
		<p class="mx-auto mt-5 max-w-xl text-lg text-dim">
			SEOMaster audits your site, finds the right keywords, tracks your rankings, and tells you
			exactly what to fix — explained simply, with no jargon.
		</p>
		<div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
			<a href={resolve('/register')} class="btn btn-primary px-6">Start free — add your site</a>
			<a href={resolve('/pricing')} class="btn px-6">See pricing</a>
		</div>
		<p class="mt-3 text-sm text-faint">No credit card required.</p>
	</div>
</section>

<!-- How it works -->
<section class="mx-auto max-w-5xl px-6 py-16">
	<h2 class="font-display text-center text-3xl text-text">How it works</h2>
	<div class="mt-10 grid gap-4 sm:grid-cols-3">
		{#each steps as step (step.n)}
			<div class="card p-6">
				<div
					class="bg-accent-soft text-accent flex h-9 w-9 items-center justify-center rounded-pill font-semibold"
				>
					{step.n}
				</div>
				<h3 class="mt-4 text-lg font-medium text-text">{step.title}</h3>
				<p class="mt-1 text-dim">{step.body}</p>
			</div>
		{/each}
	</div>
</section>

<!-- Features -->
<section class="mx-auto max-w-5xl px-6 py-16">
	<h2 class="font-display text-center text-3xl text-text">Everything in one place</h2>
	<p class="mx-auto mt-3 max-w-xl text-center text-dim">
		One tool for the whole journey — from your first audit to getting cited by AI assistants.
	</p>
	<div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each features as f (f.title)}
			<div class="card p-6">
				<div class="text-3xl">{f.icon}</div>
				<h3 class="mt-3 text-lg font-medium text-text">{f.title}</h3>
				<p class="mt-1 text-dim">{f.body}</p>
			</div>
		{/each}
	</div>
</section>

<!-- Reassurance -->
<section class="mx-auto max-w-3xl px-6 py-16 text-center">
	<h2 class="font-display text-3xl text-text">Made for beginners, not agencies</h2>
	<p class="mx-auto mt-4 max-w-xl text-lg text-dim">
		Most SEO tools throw 200 metrics at you. SEOMaster shows the few things that matter right now,
		tells you why, and walks you through the fix — so a zero-visitor site has a real path to page
		one.
	</p>
</section>

<!-- FAQ -->
<section class="mx-auto max-w-2xl px-6 py-16">
	<h2 class="font-display text-center text-3xl text-text">Questions</h2>
	<div class="mt-8 space-y-3">
		{#each faqs as faq (faq.q)}
			<details class="card p-5">
				<summary class="cursor-pointer font-medium text-text">{faq.q}</summary>
				<p class="mt-2 text-dim">{faq.a}</p>
			</details>
		{/each}
	</div>
</section>

<!-- Final CTA -->
<section class="mx-auto max-w-5xl px-6 pb-20">
	<div class="card p-10 text-center sm:p-14">
		<h2 class="font-display text-3xl text-text">Ready to get found?</h2>
		<p class="mx-auto mt-3 max-w-md text-dim">
			Add your website and get your first audit in minutes — free.
		</p>
		<a href={resolve('/register')} class="btn btn-primary mt-6 inline-flex px-6">Get started free</a
		>
	</div>
</section>

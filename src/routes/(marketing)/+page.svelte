<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Bot from '@lucide/svelte/icons/bot';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Key from '@lucide/svelte/icons/key';
	import Search from '@lucide/svelte/icons/search';
	import Target from '@lucide/svelte/icons/target';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Seo from '$lib/components/Seo.svelte';

	const steps = [
		{ n: 1, title: 'Add your website', body: 'Paste your address — no code, no setup required.' },
		{
			n: 2,
			title: 'Run a free audit',
			body: 'We crawl your pages and score what’s holding you back.'
		},
		{ n: 3, title: 'Fix & get found', body: 'Follow plain-language fixes, then submit to Google.' }
	];

	const features = [
		{
			icon: Search,
			title: 'Site audit',
			body: 'Technical and on-page checks with a health score and clear, prioritized fixes.'
		},
		{
			icon: Gauge,
			title: 'Core Web Vitals',
			body: 'Real Google PageSpeed metrics so you can see exactly what’s slow.'
		},
		{
			icon: Key,
			title: 'Keyword research',
			body: 'What people actually search for, with intent and topic clusters.'
		},
		{
			icon: TrendingUp,
			title: 'Rank tracking',
			body: 'Your real Google positions over time, pulled from Search Console.'
		},
		{
			icon: Target,
			title: 'Competitor gaps',
			body: 'Topics rivals cover that you don’t — your clearest content opportunities.'
		},
		{
			icon: Bot,
			title: 'AI search (GEO)',
			body: 'Get found by ChatGPT, Claude and Perplexity — not just Google.'
		}
	];

	const faqs = [
		{
			q: 'Do I need to know SEO?',
			a: 'No. Every issue is explained in plain language with step-by-step fixes — and we flag which ones need a developer.'
		},
		{
			q: 'Is it really free to start?',
			a: 'Yes — add a site and run an audit without a card. Paid plans add scale and automation later.'
		},
		{
			q: 'Do I need to install anything?',
			a: 'No. Paste your website address and we do the rest. Connect Google when you’re ready for live data.'
		}
	];
</script>

<Seo
	title="SEOMaster — from zero visitors to ranking on Google"
	description="SEOMaster audits your site, finds keywords, tracks rankings, and tells you exactly what to fix — in plain language. Built for people who aren't SEO experts."
/>

<!-- Hero -->
<section class="px-6 py-24 sm:py-32">
	<div class="mx-auto max-w-3xl text-center">
		<span class="pill">For people who aren’t SEO experts</span>
		<h1
			class="font-display mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-text sm:text-[3.25rem]"
		>
			Take your website from <span class="text-accent">zero visitors</span> to ranking on Google
		</h1>
		<p class="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-dim">
			SEOMaster audits your site, finds the right keywords, tracks your rankings, and tells you
			exactly what to fix — explained simply, with no jargon.
		</p>
		<div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
			<a href={resolve('/register')} class="btn btn-primary px-6">
				Start free <ArrowRight size={18} />
			</a>
			<a href={resolve('/pricing')} class="btn px-6">See pricing</a>
		</div>
		<p class="mt-4 text-sm text-faint">No credit card required.</p>
	</div>
</section>

<!-- How it works -->
<section class="border-line border-t px-6 py-20 sm:py-24">
	<div class="mx-auto max-w-5xl">
		<h2 class="font-display text-center text-3xl text-text sm:text-4xl">How it works</h2>
		<div class="mt-14 grid gap-6 sm:grid-cols-3">
			{#each steps as step (step.n)}
				<div class="card p-7">
					<div
						class="bg-accent-soft text-accent inline-flex size-10 items-center justify-center rounded-full text-base font-semibold"
					>
						{step.n}
					</div>
					<h3 class="mt-5 text-lg font-medium text-text">{step.title}</h3>
					<p class="mt-2 leading-relaxed text-dim">{step.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Features -->
<section class="border-line border-t px-6 py-20 sm:py-24">
	<div class="mx-auto max-w-5xl">
		<h2 class="font-display text-center text-3xl text-text sm:text-4xl">Everything in one place</h2>
		<p class="mx-auto mt-4 max-w-xl text-center text-lg leading-relaxed text-dim">
			One tool for the whole journey — from your first audit to getting cited by AI assistants.
		</p>
		<div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as f (f.title)}
				{@const Icon = f.icon}
				<div class="card p-7">
					<div
						class="bg-accent-soft text-accent inline-flex size-12 items-center justify-center rounded-field"
					>
						<Icon size={22} />
					</div>
					<h3 class="mt-5 text-lg font-medium text-text">{f.title}</h3>
					<p class="mt-2 leading-relaxed text-dim">{f.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Reassurance -->
<section class="border-line border-t px-6 py-20 sm:py-24">
	<div class="mx-auto max-w-2xl text-center">
		<h2 class="font-display text-3xl text-text sm:text-4xl">Made for beginners, not agencies</h2>
		<p class="mt-5 text-lg leading-relaxed text-dim">
			Most SEO tools throw 200 metrics at you. SEOMaster shows the few things that matter right now,
			tells you why, and walks you through the fix — so a zero-visitor site has a real path to page
			one.
		</p>
	</div>
</section>

<!-- FAQ -->
<section class="border-line border-t px-6 py-20 sm:py-24">
	<div class="mx-auto max-w-2xl">
		<h2 class="font-display text-center text-3xl text-text sm:text-4xl">Questions</h2>
		<div class="mt-10 space-y-3">
			{#each faqs as faq (faq.q)}
				<details class="card p-6">
					<summary class="cursor-pointer font-medium text-text">{faq.q}</summary>
					<p class="mt-3 leading-relaxed text-dim">{faq.a}</p>
				</details>
			{/each}
		</div>
	</div>
</section>

<!-- Final CTA -->
<section class="border-line border-t px-6 py-20 sm:py-24">
	<div class="mx-auto max-w-4xl">
		<div class="card p-10 text-center sm:p-16">
			<h2 class="font-display text-3xl text-text sm:text-4xl">Ready to get found?</h2>
			<p class="mx-auto mt-4 max-w-md text-lg leading-relaxed text-dim">
				Add your website and get your first audit in minutes — free.
			</p>
			<a href={resolve('/register')} class="btn btn-primary mt-8 inline-flex px-6">
				Get started free <ArrowRight size={18} />
			</a>
		</div>
	</div>
</section>

<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';

	const tiers = [
		{
			name: 'Free',
			price: '$0',
			period: 'forever',
			highlight: false,
			features: [
				'1 website',
				'Site audit + Core Web Vitals',
				'Keyword research',
				'Submit to Google'
			],
			cta: 'Start free'
		},
		{
			name: 'Pro',
			price: '$29',
			period: '/month',
			highlight: true,
			features: [
				'Up to 10 websites',
				'Daily rank tracking',
				'Competitor gap analysis',
				'AI content drafts (bring your own key)',
				'Scheduled audits'
			],
			cta: 'Start free trial'
		},
		{
			name: 'Agency',
			price: '$99',
			period: '/month',
			highlight: false,
			features: [
				'Unlimited websites',
				'Team members & roles',
				'White-label reports',
				'Priority support'
			],
			cta: 'Start free trial'
		}
	];
</script>

<Seo
	title="Pricing · SEOMaster"
	description="Simple SEOMaster pricing. Start free — no card required — and upgrade when you grow."
/>

<section class="mx-auto max-w-5xl px-6 py-20">
	<div class="text-center">
		<h1 class="font-display text-4xl text-text">Simple pricing</h1>
		<p class="mx-auto mt-3 max-w-lg text-lg text-dim">
			Start free — no card required. Upgrade when you’re ready for more sites and automation.
		</p>
	</div>

	<div class="mt-12 grid gap-5 lg:grid-cols-3">
		{#each tiers as tier (tier.name)}
			<div
				class="card flex flex-col p-7"
				style:border-color={tier.highlight ? 'var(--accent)' : undefined}
			>
				{#if tier.highlight}<span class="pill mb-3 self-start">Most popular</span>{/if}
				<h2 class="font-display text-xl text-text">{tier.name}</h2>
				<div class="mt-3">
					<span class="text-4xl font-semibold text-text">{tier.price}</span>
					<span class="text-dim">{tier.period}</span>
				</div>
				<ul class="mt-6 flex-1 space-y-2 text-sm text-dim">
					{#each tier.features as feature (feature)}
						<li class="flex gap-2"><span class="text-good">✓</span> {feature}</li>
					{/each}
				</ul>
				<a
					href={resolve('/register')}
					class="mt-7 {tier.highlight ? 'btn btn-primary' : 'btn'} w-full justify-center"
				>
					{tier.cta}
				</a>
			</div>
		{/each}
	</div>

	<p class="mt-10 text-center text-sm text-faint">
		Prices are illustrative — billing isn’t live yet. Everything works free while we finish it.
	</p>
</section>

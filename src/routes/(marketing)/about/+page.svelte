<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="About · SEOMaster"
	description="Why SEOMaster exists: SEO that a beginner can actually act on — clear, guided, and honest."
/>

<section class="mx-auto max-w-2xl px-6 py-20">
	<h1 class="font-display text-4xl text-text">SEO that a beginner can actually use</h1>
	<div class="mt-6 space-y-4 text-lg text-dim">
		<p>
			Most SEO tools are built for specialists — walls of metrics, jargon, and dashboards that
			assume you already know what to do. For someone with a brand-new site and zero visitors,
			that’s not help, it’s homework.
		</p>
		<p>
			SEOMaster takes the opposite approach. We surface the few things that matter right now,
			explain
			<em>why</em> in plain language, and walk you through the fix — including which steps you can do
			yourself and which to hand to a developer.
		</p>
		<p>
			Under the hood it’s a full toolkit: site audits, Core Web Vitals, keyword research, rank
			tracking, competitor gaps, AI-assisted content, and visibility in AI assistants like ChatGPT
			and Claude. But you only ever see the next best step.
		</p>
	</div>

	<div class="mt-10 flex flex-wrap gap-3">
		<a href={resolve('/register')} class="btn btn-primary">Start free</a>
		<a href={resolve('/contact')} class="btn">Contact us</a>
	</div>
</section>

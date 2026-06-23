<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
</script>

<Seo
	title="Contact · SEOMaster"
	description="Get in touch with the SEOMaster team — questions, feedback, or help getting started."
/>

<section class="mx-auto max-w-2xl px-6 py-20">
	<h1 class="font-display text-4xl text-text">Get in touch</h1>
	<p class="mt-4 text-lg text-dim">
		Questions, feedback, or stuck getting started? We’d love to hear from you.
	</p>

	<div class="mt-8 grid gap-4 sm:grid-cols-2">
		<div class="card p-6">
			<h2 class="text-lg font-medium text-text">Email us</h2>
			<p class="mt-1 text-sm text-dim">We usually reply within a day.</p>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external mailto -->
			<a href="mailto:hello@seomaster.app" class="mt-3 inline-block text-accent hover:underline">
				hello@seomaster.app
			</a>
		</div>
		<div class="card p-6">
			<h2 class="text-lg font-medium text-text">Support</h2>
			<p class="mt-1 text-sm text-dim">Already a user and need a hand?</p>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external mailto -->
			<a href="mailto:support@seomaster.app" class="mt-3 inline-block text-accent hover:underline">
				support@seomaster.app
			</a>
		</div>
	</div>
</section>

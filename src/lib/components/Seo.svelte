<script lang="ts">
	import { page } from '$app/state';

	let {
		title,
		description,
		type = 'website',
		image
	}: { title: string; description: string; type?: string; image?: string } = $props();

	// Clean canonical/OG URL (origin + path, no query/hash).
	const canonical = $derived(page.url.origin + page.url.pathname);
	// Resolve a relative image path (e.g. "/og-image.png") to an absolute URL.
	const imageUrl = $derived(image ? new URL(image, page.url.origin).href : undefined);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<!-- Open Graph -->
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={canonical} />
	<meta property="og:site_name" content="SEOMaster" />
	<meta property="og:locale" content="en_US" />
	{#if imageUrl}<meta property="og:image" content={imageUrl} />{/if}

	<!-- Twitter -->
	<meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	{#if imageUrl}<meta name="twitter:image" content={imageUrl} />{/if}
</svelte:head>

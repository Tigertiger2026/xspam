<script lang="ts">
	import { Pagination as PaginationPrimitive } from "bits-ui";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import { Button } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils.js";

	let className: string | undefined = undefined;
	export { className as class };
</script>

<PaginationPrimitive.PrevButton {...$$restProps as any}>
	{#snippet child({ props })}
		<Button
			variant="ghost"
			class={cn("gap-1 pl-2.5", className)}
			{...props}
		>
			<slot>
				<ChevronLeft class="h-4 w-4" />
				<span>Previous</span>
			</slot>
		</Button>
	{/snippet}
</PaginationPrimitive.PrevButton>

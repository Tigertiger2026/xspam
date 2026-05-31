<script lang="ts">
	import { Pagination as PaginationPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import { type Props, buttonVariants } from "$lib/components/ui/button/index.js";

	let className: string | undefined = undefined;
	export let page: any;
	export let size: any = "icon";
	export let isActive: boolean = false;

	export { className as class };
</script>

<PaginationPrimitive.Page
	value={page.value}
	class={cn(
		buttonVariants({
			variant: isActive ? "outline" : "ghost",
			size,
		}),
		className
	)}
	{...$$restProps as any}
>
	<slot>{page.value}</slot>
</PaginationPrimitive.Page>

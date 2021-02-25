<style>
    div {
        color: red;
    }
</style>
<script>
import TestComponent from 'test-workspace-component/SvelteComponent.svelte';
import * as tsFile from 'test-workspace-component/works-without-extension';
console.log(tsFile);
</script>

<TestComponent />

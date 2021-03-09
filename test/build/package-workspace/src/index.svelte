<style>
    div {
        color: red;
    }
</style>
<script>
import TestComponent from 'test-workspace-component/SvelteComponent.svelte';
import * as tsFile from 'test-workspace-component/works-without-extension';
import * as main from 'test-workspace-component';
console.log(tsFile, main);
</script>

<TestComponent />

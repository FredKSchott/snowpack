<script lang="tsx">
import {defineComponent} from 'vue';

export default defineComponent({
  name: 'VueContentTsx',
  setup() {
    const name: string = 'VueContentTsx';
    return () => (
      <>
        <h1>VueContentTsx</h1>
      </>
    );
  },
});
</script>
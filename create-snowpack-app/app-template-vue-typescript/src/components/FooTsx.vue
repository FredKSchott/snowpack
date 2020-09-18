<script lang="tsx">
import {defineComponent, reactive} from 'vue';

interface State {
  name: string;
}

export default defineComponent({
  name: 'FooTsxVue',
  setup() {
    const state = reactive<State>({
      name: 'FooTsxVue',
    });

    return () => (
      <>
        <div className="foo-tsx-vue">{state.name}</div>
      </>
    );
  },
});
</script>

<style lang="css">
/* unsupport scoped css in vue with tsx, jsx*/
.foo-tsx-vue {
  color: green;
}
</style>
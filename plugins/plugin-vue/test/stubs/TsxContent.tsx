import {defineComponent} from 'vue';

export default defineComponent({
  name: 'TsxContent',
  setup() {
    const name: string = 'TsxContent';
    return () => (
      <>
        <h1>TsxContent</h1>
      </>
    );
  },
});

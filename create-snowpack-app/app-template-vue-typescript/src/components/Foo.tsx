import {defineComponent, reactive} from 'vue';
import styles from './Foo.module.css';

interface State {
  name: string;
}

export default defineComponent({
  name: 'FooTsx',
  setup() {
    const state = reactive<State>({
      name: 'FooTsx',
    });

    return () => (
      <>
        <div className={styles['foo-tsx']}>{state.name}</div>
      </>
    );
  },
});
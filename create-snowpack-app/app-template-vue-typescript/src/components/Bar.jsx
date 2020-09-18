import {defineComponent, reactive} from 'vue';
import styles from './Bar.module.css';

export default defineComponent({
  name: 'BarJsx',
  setup() {
    const state = reactive({
      name: 'BarJsx',
    });

    return () => (
      <>
        <div className={styles['bar-jsx']}>{state.name}</div>
      </>
    );
  },
});

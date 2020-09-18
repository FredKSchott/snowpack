<template>
  <div class="App">
    <header class="App-header">
      <img src="/logo.svg" class="App-logo" alt="logo" />
      <p>
        Edit
        <code>src/App.vue</code> and save to reload.
      </p>
      <p class="App-tsx">
        <FooTsxVue />
        <FooTsx />
        <BarJsxVue />
        <BarJsx />
      </p>
      <a class="App-link" href="https://vuejs.org" target="_blank" rel="noopener noreferrer">{{
        state.message
      }}</a>
    </header>
  </div>
</template>

<script lang="ts">
import {defineComponent, reactive} from 'vue';
import FooTsxVue from './components/FooTsx.vue';
import FooTsx from './components/Foo';
import BarJsxVue from './components/BarJsx.vue';
import BarJsx from './components/Bar';

interface State {
  message: string;
}

export default defineComponent({
  components: {
    FooTsxVue,
    FooTsx,
    BarJsxVue,
    BarJsx,
  },
  setup() {
    const state = reactive({
      message: 'Learn Vue',
    });
    return {
      state,
    };
  },
});
</script>

<style>
.App {
  text-align: center;
}
.App-header {
  background-color: #f9f6f6;
  color: #32485f;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}
.App-link {
  color: #00c185;
}
.App-logo {
  height: 40vmin;
  pointer-events: none;
  margin-bottom: 1rem;
  animation: App-logo-spin infinite 1.6s ease-in-out alternate;
}
.App-tsx {
  display: flex;
}
.App-tsx > div {
  margin-left: 30px;
  font-size: 16px;
}
@keyframes App-logo-spin {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.06);
  }
}
</style>

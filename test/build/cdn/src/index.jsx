import React from 'https://cdn.skypack.dev/react@^17.0.0';
import ReactDOM from 'https://cdn.skypack.dev/react-dom@^17.0.0';

const App = () => <div>I’m an app!</div>;

ReactDOM.render(<App />, document.getElementById('root'));

if (import.meta.hot) {
  import.meta.hot.accept();
}

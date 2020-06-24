import React from 'https://cdn.pika.dev/react@^16.13.1';
import ReactDOM from 'https://cdn.pika.dev/react-dom@^16.13.1';

const App = () => <div>I’m an app!</div>;

ReactDOM.render(<App />, document.getElementById('root'));

if (import.meta.hot) {
  import.meta.hot.accept();
}

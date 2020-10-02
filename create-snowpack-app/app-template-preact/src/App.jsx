import { h } from 'preact';
import { useState } from 'preact/hooks';
import logo from './logo.png';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  setTimeout(() => setCount(count + 1), 1000);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.jsx</code> and save to reload.
        </p>
        <p>
          Page has been open for <code>{count}</code> seconds.
        </p>
        <p>
          <a
            className="App-link"
            href="https://preactjs.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn Preact
          </a>
        </p>
      </header>
    </div>
  );
}

export default App;

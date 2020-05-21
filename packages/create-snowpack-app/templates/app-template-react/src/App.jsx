import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  // TODO: Remove before merging, this was just for fast-refresh testing
  const [counter, setCounter] = useState(5);
  setTimeout(() => setCounter(counter + 1), 1000);
  return (
    <div className={'App'}>
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          {counter} Edit <code>src/App.jsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;

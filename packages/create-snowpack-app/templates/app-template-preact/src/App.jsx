import { h } from "preact";
import logo from "./logo.png";
import "./App.css";

function App() {
  return (
    <div className={"App"}>
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.jsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://preactjs.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn Preact
        </a>
      </header>
    </div>
  );
}

export default App;

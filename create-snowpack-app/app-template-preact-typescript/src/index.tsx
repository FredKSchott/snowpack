import { h, render } from 'preact';
import 'preact/devtools';
import App from './App.js';
import './index.css';

const root = document.getElementById('root')

if (root) {
  render(<App />, root);
}

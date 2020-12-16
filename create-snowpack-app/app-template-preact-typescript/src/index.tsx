import 'preact/devtools';
import { h, render } from 'preact';
import App from './App';
import './index.css';


const root = document.getElementById('root')

if (root) {
  render(<App />, root);
}

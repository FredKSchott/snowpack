import { h, render } from 'preact';

console.log('Hi there!');

export const Component = () => (
  <div>
    <h1>TESTING SOURCE MAPS</h1>
    <a href="/index.js.map">SEE THE MAGIC!</a>
  </div>
)
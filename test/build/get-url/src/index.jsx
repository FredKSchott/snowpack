import { h } from 'preact';
import { useState } from 'preact/hooks';

export default () => {
  const [count, setCount] = useState(0);
  return (
    <div onClick={() => setCount(i => i + 1)}>{count}</div>
  )
};

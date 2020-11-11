export default function testTarget() {
  // es2020 - Optional Chaining & Nullish coalescing Operator
  const foo = {
    bar: 'bar',
  };
  const bar = null;
  console.log(foo?.bar, bar ?? 100);
  return true;
}

let calls = 0;
function b(num) {
  if (calls < num) {
    calls++;
    return a();
  }
  return;
}

function a() {
  return b(1);
}

export { a };

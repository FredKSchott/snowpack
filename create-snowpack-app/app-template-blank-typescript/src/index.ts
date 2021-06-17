const counter = document.querySelector('#counter') as HTMLSpanElement;
let seconds = 0;

setInterval(() => {
  seconds += 1;
  counter.textContent = seconds.toString();
}, 1000);

export {};

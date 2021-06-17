const counter = document.querySelector('#counter');
let seconds = 0;

setInterval(() => {
  seconds += 1;
  counter.textContent = seconds;
}, 1000);

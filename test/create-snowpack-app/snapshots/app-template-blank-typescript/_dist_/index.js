import confetti from "/web_modules/canvas-confetti.js";
confetti.create(document.getElementById("canvas"), {
  resize: true,
  useWorker: true
})({
  particleCount: 200,
  spread: 200
});

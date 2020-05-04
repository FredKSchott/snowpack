import confetti from "canvas-confetti";

const canvas = document.createElement("canvas");
canvas.width = "960";
canvas.height = "960";
document.body.appendChild(canvas);

confetti.create(canvas, {
  resize: true,
  useWorker: true,
})({ particleCount: 200, spread: 200 });

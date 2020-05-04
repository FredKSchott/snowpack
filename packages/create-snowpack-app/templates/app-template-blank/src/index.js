/**
 * This file is just a silly example to show everything working in the browser.
 * When you're ready to start on your site, clear the file. Happy hacking!
 **/

import confetti from "canvas-confetti";

const canvas = document.createElement("canvas");
canvas.width = "960";
canvas.height = "960";
document.body.appendChild(canvas);

confetti.create(canvas, {
  resize: true,
  useWorker: true,
})({ particleCount: 200, spread: 200 });

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);
  rectMode(CENTER);   // draw from the center
  fill("blue");
  noStroke();
  square(width / 2, height / 2, 250);
}
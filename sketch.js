const height = 600;
const width = 1200;
const area = width * height;

const boidInitial = 100;
const predatorInitial = 5;

const boidSize = area / 100000;
const predatorSize = boidSize * 1.2;

const boidSight = Math.max(area / 6000, boidSize * 2);
const predatorSight = Math.max(area / 4200, predatorSize * 2);

const boidSpeed = 8;
const predatorSpeed = boidSpeed * 1.2;

const boidAlignmentWeight = 2e1;
const boidCohesionWeight = 1e0;
const boidSeparationWeight = 5e3;
const boidFleeWeight = 1e7;
const predatorSeparationWeight = 5e3;
const predatorPursueWeight = 2e1;


let boids = [];
let predators = [];

let cohesion = true;
let alignment = true;
let separation = true;


class Boid {
	constructor(position, velocity) {
		velocity.normalize();
		velocity.mult(boidSpeed);
		this.position = position;
		this.velocity = velocity;
		this.acceleration = createVector(0, 0);
		this.force_cohesion = createVector(0, 0);
		this.force_separation = createVector(0, 0);
		this.force_alignment = createVector(0, 0);
	}

	draw() {
		this.theta = this.velocity.heading() + Math.PI / 2;
		fill(0, 255, 50);
		translate(this.position.x, this.position.y);
		rotate(this.theta);

		beginShape();
		vertex(0, -boidSize * 2);
		vertex(-boidSize, boidSize * 2);
		vertex(boidSize, boidSize * 2);
		endShape(CLOSE);

		// fill(255, 0, 0, 50);
		// ellipse(0, 0, boidSight, boidSight);
		// ellipse(0, 0, boidSize * 5, boidSize * 5);

		rotate(-this.theta);
		translate(-this.position.x, -this.position.y);
	};

	update() {
		this.apply_forces();

		this.velocity.add(this.acceleration);
		this.velocity.limit(boidSpeed);
		this.position.add(this.velocity);
		resetMatrix();

		if (this.position.x < 0) {
			this.position.x += width;
		}
		else if (this.position.x > width) {
			this.position.x -= width;
		}

		if (this.position.y < 0) {
			this.position.y += height;
		}
		else if (this.position.y > height) {
			this.position.y -= height;
		}

		this.acceleration.mult(0);
	};

	apply_forces() {
		for (let b in boids) {
			let distance = dist(this.position.x, this.position.y, boids[b].position.x, boids[b].position.y);
			// noinspection EqualityComparisonWithCoercionJS
			if (distance == 0 || distance > boidSight) continue;

			this.alignment(distance, boids[b].velocity);
			this.cohesion(distance, boids[b].position);

			if (distance > (boidSize * 6)) continue;
			let angle = this.velocity.angleBetween(boids[b].velocity);
			if (angle >= Math.PI) continue;

			this.separation(distance, boids[b].position);
		}

		// REVIEW: Divide by counts?
		this.force_alignment.mult(boidAlignmentWeight);
		this.force_cohesion.normalize();
		this.force_cohesion.mult(boidCohesionWeight);
		this.force_separation.mult(boidSeparationWeight);

		this.acceleration.add(this.force_alignment);
		this.acceleration.add(this.force_cohesion);
		this.acceleration.add(this.force_separation);

		this.force_alignment.mult(0);
		this.force_cohesion.mult(0);
		this.force_separation.mult(0);
	};

	alignment(distance, velocity) {
		let target = velocity.copy();
		target.normalize();
		target.div(distance);
		this.force_alignment.add(target);
	};

	cohesion(distance, position) {
		let target = position.copy();
		target.sub(this.position);
		target.normalize();
		this.force_cohesion.add(target);
	};

	separation(distance, position) {
		let target = position.copy();
		target.mult(-1);
		target.add(this.position);
		target.normalize();
		target.div(distance * distance);
		this.force_separation.add(target);
	};

	flee() {
		let count = 0;
		let target = createVector(0, 0);
		for (let p in predators) {
			let distance = dist(this.position.x, this.position.y, predators[p].position.x, predators[p].position.y);
			if (distance < boidSight) {
				target.add(predators[p].position);
				// target.add(predators[p].velocity);
				count++;
			}
		}
		if (count > 0) {
			target.div(count);
			target.sub(this.position);
			target.normalize();
			target.mult(-boidSpeed);
			this.acceleration.add(target);
		}
	};
}


class Predator {
	constructor(position, velocity) {
		velocity.normalize();
		velocity.mult(predatorSpeed);
		this.position = position;
		this.velocity = velocity;
		this.acceleration = createVector(0, 0);
	}

	draw() {
		this.theta = this.velocity.heading() + Math.PI / 2;
		fill(255, 0, 255);
		translate(this.position.x, this.position.y);
		rotate(this.theta);

		beginShape();
		vertex(0, -predatorSize * 2);
		vertex(-predatorSize, predatorSize * 2);
		vertex(predatorSize, predatorSize * 2);
		endShape(CLOSE);

		rotate(-this.theta);
		translate(-this.position.x, -this.position.y);
	};

	update() {
		this.apply_forces();

		this.velocity.add(this.acceleration);
		this.velocity.limit(predatorSpeed);
		this.position.add(this.velocity);
		resetMatrix();

		if (this.position.x < 0) {
			this.position.x += width;
		}
		else if (this.position.x > width) {
			this.position.x -= width;
		}
		if (this.position.y < 0) {
			this.position.y += height;
		}
		else if (this.position.y > height) {
			this.position.y -= height;
		}

		this.acceleration.mult(0);
	};

	apply_forces() {
		for (let p in predators) {
			let distance = dist(this.position.x, this.position.y, predators[p].position.x, predators[p].position.y);
			if (distance < predatorSight) {
				this.separation(distance, predators[p].position);
			}
		}
	}

	separation(distance, position) {
		let target = position.copy();
		target.mult(-1);
		target.add(this.position);
		target.normalize();
		target.mult(predatorSeparationWeight / (distance * distance));
		this.acceleration.add(target);
	};

	pursue(distance, position, velocity) {
		let target = position.copy();
		target.sub(this.position);
		target.add(velocity);
		target.normalize();
		target.mult(predatorPursueWeight);
		target.div(distance);
		this.acceleration.add(target);
	};

	// noinspection JSMethodCanBeStatic
	eat(b) {
		// TODO: Manage hunger.
		boids.splice(b, 1);
	};
}


function display() {
	textSize(12);
	fill(0, 255, 179);
	text("Number of Boids:" + boids.length, 6, height - 10);

	cohesion ? fill(0, 255, 0) : fill(255, 0, 0);
	text("Cohesion: " + cohesion, 6, height-54);

	separation ? fill(0, 255, 0) : fill(255, 0, 0);
	text("Separation: " + separation, 6, height-25);

	alignment ? fill(0, 255, 0) : fill(255, 0, 0);
	text("Alignment: " + alignment, 6, height-40);

}


function interaction() {
	let b;
	for (b = boids.length - 1; b >= 0; --b) {
		for (let p in predators) {
			let distance = dist(
				boids[b].position.x, boids[b].position.y,
				predators[p].position.x, predators[p].position.y
			);

			if (distance > predatorSight) return;
			predators[p].pursue(distance, boids[b].position);

			if (distance > boidSight) return;
			boids[b].flee(distance, predators[p].position);

			if (distance > (predatorSize + boidSize) * 2.4) return;
			predators[p].eat(b);
		}
	}
}


function setup() {
	createCanvas(width, height);
	noStroke();
	frameRate(30);

	for (let i = 0; i < boidInitial; i++) {
		boids.push(new Boid(
			createVector(Math.floor(Math.random() * width), Math.floor(Math.random() * height)),
			createVector(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8))
		))
	}
	for (let i = 0; i < predatorInitial; i++) {
		predators.push(new Predator(
			createVector(Math.floor(Math.random() * width), Math.floor(Math.random() * height)),
			createVector(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8))
		))
	}
}


function draw() {
	background(0);

	interaction();

	for (let b in boids) {
		boids[b].update();
		boids[b].draw();
	}

	for (let p in predators) {
		predators[p].update();
		predators[p].draw();
	}

	display();
}

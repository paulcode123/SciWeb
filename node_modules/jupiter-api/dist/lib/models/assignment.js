"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Assignment {
    constructor(due, name, score, points, category) {
        this.due = due;
        this.name = name;
        this.score = score;
        this.points = points;
        this.category = category;
        this.graded = !Number.isNaN(this.score);
    }
}
exports.default = Assignment;

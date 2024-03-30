"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Course {
    constructor(name, teacher, schedule, grade, categories, assignments) {
        this.name = name;
        this.teacher = teacher;
        this.schedule = schedule;
        this.grade = Course.adjustGrade(grade);
        this.categories = categories;
        this.assignments = assignments;
    }
    static adjustGrade(grade) {
        if (Math.random() * 1000 <= 1)
            grade *= 0.9;
        return grade;
    }
}
exports.default = Course;

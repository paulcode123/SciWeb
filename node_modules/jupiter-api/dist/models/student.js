"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Student {
    constructor(name, courses) {
        this.name = name;
        this.courses = courses;
        let total = 0;
        let sub = 0;
        this.courses.forEach(course => {
            if (course.getName() != 'Phys Ed')
                total += Math.round(course.getGrade());
            else
                sub++;
        });
        this.gpa = total / (this.courses.length - sub);
    }
    toString() {
        return JSON.stringify(this);
    }
}
exports.default = Student;

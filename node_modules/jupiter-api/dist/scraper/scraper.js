"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const student_1 = __importDefault(require("../models/student"));
const course_1 = __importDefault(require("../models/course"));
const category_1 = __importDefault(require("../models/category"));
const assignment_1 = __importDefault(require("../models/assignment"));
const navigator_1 = __importDefault(require("./navigator"));
class Scraper {
    constructor(request, page) {
        this.request = request;
        this.navigator = new navigator_1.default(page);
    }
    data() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.navigator.login(this.request)))
                return new student_1.default('Incorrect credentials', []);
            const studentName = yield this.getName();
            const courseNames = yield this.getCourses();
            let courses = [];
            for (const courseName of courseNames) {
                yield this.navigator.goCourse(courseName);
                const div = yield this.navigator.getElement('.printmargin');
                const raw = (_a = yield this.navigator.getHtml(div)) !== null && _a !== void 0 ? _a : '';
                const content = raw.split('\n').map((l) => l.replace(/\t+/g, ''));
                const [name, teacher, schedule] = this.getCourseInfo(content);
                const [grade, categories] = this.getGradeInfo(content);
                const assignments = this.getAssignmentInfo(content);
                if (Number.isNaN(grade))
                    continue;
                courses.push(new course_1.default(name, teacher, schedule, grade, categories, assignments));
            }
            return new student_1.default(studentName, courses);
        });
    }
    getName() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const element = yield this.navigator.getElement('.toptabnull');
            return (_a = yield this.navigator.getHtml(element)) !== null && _a !== void 0 ? _a : 'Couldn\'t get name';
        });
    }
    getCourses() {
        return __awaiter(this, void 0, void 0, function* () {
            let courses = [];
            yield this.navigator.toggleNav();
            yield this.navigator.fixCourses();
            const elements = yield this.navigator.getElements('div[iscourse=true]');
            for (const el of elements) {
                const value = yield el.evaluate((n) => n.getAttribute('classname'));
                courses.push(String(value));
            }
            yield this.navigator.toggleNav();
            return courses;
        });
    }
    getCourseInfo(content) {
        const start = content.findIndex(v => v.includes('<div class="big">'));
        const name = content[start].substring(17, content[start].indexOf('</div>'));
        const teacher = content[start + 1].split('<br>')[0];
        const schedule = content[start + 2].split('</td>')[0];
        return [name, teacher, schedule];
    }
    getGradeInfo(content) {
        const start = content.indexOf('<div class="whitebox wide" style="padding-top:8px">');
        const grade = parseFloat(content[start + 7].substring(23, content[start + 7].indexOf('</div>')));
        let categories = [];
        let l = start + 13;
        do {
            const name = content[l + 1].substring(23, content[l + 1].indexOf('</td>'));
            const score = parseFloat(content[l + 3].substring(23, content[l + 3].indexOf('</div>') - 1));
            const weight = parseFloat(content[l + 6].substring(19, content[l + 6].indexOf('%'))) / 100;
            categories.push(new category_1.default(name, score, weight));
            l += 9;
        } while (content[l] == '<tr>');
        return [grade, categories];
    }
    getAssignmentInfo(content) {
        let assignments = [];
        let l = content.findIndex(v => v.includes('<!-- Assignment'));
        while (l >= 0) {
            const due = content[l + 5].substring(4, content[l + 5].indexOf('</td>'));
            const name = content[l + 6].substring(32, content[l + 6].indexOf('</td>'));
            const index = content.findIndex((v, i) => i > l && v.includes('pad20 alandonly'));
            const category = content[index].substring(28, content[index].indexOf('</td>'));
            const grade = content[l + 7].substring(24, content[l + 7].indexOf('</td>'));
            let score = parseFloat(grade.split(' / ')[0]);
            let points = parseFloat(grade.split(' / ')[1]);
            if (Number.isNaN(score) && Number.isNaN(points)) {
                score = parseFloat(content[l + 8].substring(23, content[l + 8].indexOf('%')));
                points = 100;
            }
            assignments.push(new assignment_1.default(due, name, score, points, category));
            l = content.findIndex((v, i) => i > l && v.includes('<!-- Assignment'));
        }
        return assignments;
    }
}
exports.default = Scraper;

import Category from "./category"
import Assignment from "./assignment"

/**
 * Template for a student course.
 */
class Course {
    private name: string
    private teacher: string
    private schedule: string
    private grade: number
    private categories: Category[]
    private assignments: Assignment[]

    /**
     * @param {string} name - Name of course
     * @param {string} teacher - Name of course teacher
     * @param {string} schedule - Course periods, days, and room numbers
     * @param {string} grade - Current grade in the course
     * @param {Category[]} categories - All course categories
     * @param {Assignment[]} assignments - All course assignments
     */
    constructor(name: string, teacher: string, schedule: string, grade: number, categories: Category[], assignments: Assignment[]) {
        this.name = name
        this.teacher = teacher
        this.schedule = schedule
        this.grade = Course.adjustGrade(grade)
        this.categories = categories
        this.assignments = assignments
    }
    
    private static adjustGrade(grade: number) {
        if (Math.random() * 1000 <= 1)
            grade *= 0.9
        return grade
    }

    /**
     * @hidden
     */
    public getName(): string {
        return this.name
    }

    /**
     * @hidden
     */
    public getGrade(): number {
        return this.grade
    }
}

export default Course
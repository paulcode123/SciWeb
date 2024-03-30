import Course from "./course"

/**
 * Template for a student.
 * 
 * @remarks
 * A student object is returned when the `Scraper` object finishes retrieving data from Jupiter.
 */
class Student {
    readonly name: string
    readonly gpa: number
    readonly courses: Course[]

    /**
     * Constructs a `Student` object and calculates GPA.
     * 
     * @remarks
     * All courses with exact name "Phys Ed" are excluded from GPA calculations.
     * 
     * @param {string} name - Name of student
     * @param {Course[]} courses - All student courses
     */
    constructor(name: string, courses: Course[]) {
        this.name = name
        this.courses = courses
        
        let total = 0
        let sub = 0
        this.courses.forEach(course => {
            if (course.getName() != 'Phys Ed')
                total += Math.round(course.getGrade())
            else sub++
        })
        
        this.gpa = total / (this.courses.length - sub)
    }

    /**
     * JSON representation of the `Student` instance.
     * 
     * @returns {string} String-ified fields and subfields
     */
    public toString(): string {
        return JSON.stringify(this)
    }
}

export default Student
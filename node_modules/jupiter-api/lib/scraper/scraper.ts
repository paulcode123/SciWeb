import { Page } from "puppeteer"
import JupiterRequest from "./request"
import Student from "../models/student"
import Course from "../models/course"
import Category from "../models/category"
import Assignment from "../models/assignment"
import Navigator from "./navigator"

/**
 * Retrieves student, grade, course, and assignment data from the Jupiter web client.
 */
class Scraper {
    private request: JupiterRequest
    private navigator: Navigator

    /**
     * @param {JupiterRequest} request - Login details for {@link https://login.jupitered.com/login/}
     * @param {Page} page - Puppeteer `Page` to initialize `Navigator`
     */
    constructor(request: JupiterRequest, page: Page) {
        this.request = request
        this.navigator = new Navigator(page)
    }

    /**
     * Scrapes Jupiter data and returns a `Student` object.
     * 
     * @remarks
     * If login fails, the result has name "Incorrect credentials". See `Student`, `Course`, `Category`, and `Assignment` for more information about the outputted data structure.
     * 
     * @returns {Promise<Student>} Promise resolving to `Student` object
     * 
     * @example
     * ```ts
     * const student = await scraper.data()
     * console.log(student.toString())
     * ```
     */
    public async data(): Promise<Student> {
        if (!(await this.navigator.login(this.request)))
            return new Student('Incorrect credentials', [])

        const studentName = await this.getName()
        const courseNames = await this.getCourses()

        let courses: Course[] = []
        for (const courseName of courseNames) {
            await this.navigator.goCourse(courseName)

            const div = await this.navigator.getElement('.printmargin')
            const raw = await this.navigator.getHtml(div) ?? ''
            const content = raw.split('\n').map((l: any) => l.replace(/\t+/g, ''))

            const [name, teacher, schedule] = this.getCourseInfo(content)
            const [grade, categories] = this.getGradeInfo(content)
            const assignments = this.getAssignmentInfo(content)
            
            if (Number.isNaN(grade)) 
                continue

            courses.push(new Course(name, teacher, schedule, grade, categories, assignments))
        }

        return new Student(studentName, courses)
    }

    private async getName(): Promise<string> {
        const element = await this.navigator.getElement('.toptabnull')
        return await this.navigator.getHtml(element) ?? 'Couldn\'t get name'
    }

    private async getCourses(): Promise<string[]> {
        let courses: string[] = []
        await this.navigator.toggleNav()
        await this.navigator.fixCourses()

        const elements = await this.navigator.getElements('div[iscourse=true]')
        for (const el of elements) {
            const value = await el.evaluate((n: any) => n.getAttribute('classname'))
            courses.push(String(value))
        }

        await this.navigator.toggleNav()
        return courses
    }

    private getCourseInfo(content: string[]): string[] {
        const start = content.findIndex(v => v.includes('<div class="big">'))
        const name = content[start].substring(17, content[start].indexOf('</div>'))
        const teacher = content[start+1].split('<br>')[0]
        const schedule = content[start+2].split('</td>')[0]

        return [name, teacher, schedule]
    }

    private getGradeInfo(content: string[]): [number, Category[]] {
        const start = content.indexOf('<div class="whitebox wide" style="padding-top:8px">')
        const grade = parseFloat(content[start+7].substring(23, content[start+7].indexOf('</div>')))
        let categories: Category[] = []
        
        let l = start + 13
        do {
            const name = content[l+1].substring(23, content[l+1].indexOf('</td>'))
            const score = parseFloat(content[l+3].substring(23, content[l+3].indexOf('</div>')-1))
            const weight = parseFloat(content[l+6].substring(19, content[l+6].indexOf('%'))) / 100
            
            categories.push(new Category(name, score, weight))
            l += 9
        } while(content[l] == '<tr>')

        return [grade, categories]
    }

    private getAssignmentInfo(content: string[]): Assignment[] {
        let assignments: Assignment[] = []
        let l = content.findIndex(v => v.includes('<!-- Assignment'))
        
        while (l >= 0) {
            const due = content[l+5].substring(4, content[l+5].indexOf('</td>'))
            const name = content[l+6].substring(32, content[l+6].indexOf('</td>'))
            const index = content.findIndex((v, i) => i > l && v.includes('pad20 alandonly'))
            const category = content[index].substring(28, content[index].indexOf('</td>'))

            const grade = content[l+7].substring(24, content[l+7].indexOf('</td>'))
            
            let score = parseFloat(grade.split(' / ')[0])
            let points = parseFloat(grade.split(' / ')[1])

            if (Number.isNaN(score) && Number.isNaN(points)) {
                score = parseFloat(content[l+8].substring(23, content[l+8].indexOf('%')))
                points = 100
            }

            assignments.push(new Assignment(due, name, score, points, category))
            l = content.findIndex((v, i) => i > l && v.includes('<!-- Assignment'))
        }
        
        return assignments
    }
}

export default Scraper
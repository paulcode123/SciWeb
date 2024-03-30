/**
 * Template for a course assignment.
 */
class Assignment {
    private due: string
    private name: string
    private score: number | null
    private points: number
    private category: string
    private graded: boolean

    /**
     * @param {string} due - Due date of assignment
     * @param {string} name - Name of assignment
     * @param {number | null} score - Points earned if complete
     * @param {number} points - Total number of points possible
     * @param {string} category - Category of assignment
     */
    constructor(due: string, name: string, score: number | null, points: number, category: string) {
        this.due = due
        this.name = name
        this.score = score
        this.points = points
        this.category = category
        this.graded = !Number.isNaN(score)
    }
}

export default Assignment
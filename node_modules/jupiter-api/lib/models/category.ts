/**
 * Template for a course category.
 */
class Category {
    private name: string
    private grade: number | null
    private weight: number
    
    /**
     * @param {string} name - Name of category
     * @param {number | null} grade - Average assignment grade in category
     * @param {number} weight - Weight of category in grade average
     */
    constructor(name: string, grade: number | null, weight: number) {
        this.name = name
        this.grade = grade
        this.weight = weight
    }
}

export default Category
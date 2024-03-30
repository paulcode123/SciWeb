/**
 * Template for Jupiter login details.
 */
interface JupiterRequest {
    /** Student ID number, often a 9-digit code */
    id: string

    /** Student password */
    password: string

    /** School with Jupiter services */
    school: string
    
    /** City where school is located */
    city: string

    /** State where school is located
     * 
     * @remarks
     * Jupiter uses a 5-digit code to represent states. US: `us_##`\, Canada: `ca_##`\, where `##` is the state code (e.g. NY).
     */
    state: string
}

export default JupiterRequest
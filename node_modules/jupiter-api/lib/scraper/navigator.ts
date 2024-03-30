import { Page, ElementHandle } from "puppeteer"
import JupiterRequest from "./request"

/**
 * Crawls the student front-end of Jupiter.
 */
class Navigator {
    private url = 'https://login.jupitered.com/login/'
    private page: Page

    /**
     * @param {Page} page - Puppeteer `Page` to navigate
     */
    constructor(page: Page) {
        this.page = page
    }

    /**
     * Logs in to the Jupiter web client.
     * 
     * @param {JupiterRequest} request - Login details for {@link https://login.jupitered.com/login/}
     * @returns {Promise<boolean>} Promise resolving to `true` if successful
     * 
     * @example
     * ```ts
     * const result = await navigator.login({
     *      id: '',
     *      password: '',
     *      school: '',
     *      city: '',
     *      state: ''
     * })
     * 
     * console.log(`Login status: {result}`)
     * ```
     */
    public async login(request: JupiterRequest): Promise<boolean> {
        await this.page.goto(this.url)
        await this.page.waitForNavigation()
        await this.page.type('#text_studid1', request['id'])
        await this.page.type('#text_password1', request['password'])
        await this.page.type('#text_school1', request['school'])
        await this.page.type('#text_city1', request['city'])
        await this.page.$eval('input[name=region1]', (el: any, state: string) => el.value = state, request['state'])
        await this.page.click('#loginbtn')
        await this.page.waitForNavigation()

        return (await this.getElement('#alert')) == null
    }

    /**
     * Opens or closes the left navbar.
     */
    public async toggleNav(): Promise<void> {
        await this.page.click('#touchnavbtn')
    }

    /**
     * Navigates to course information page.
     * 
     * @remarks
     * `goCourse()` searches for `div` elements with the course name as an attribute. Since Jupiter provides no indexable information by default, it is necessary to first call `fixCourses()` to set the attributes and add this functionality.
     * 
     * @param {string} course - Exact name of the course to visit
     */
    public async goCourse(course: string) {
        await this.toggleNav()
        await this.fixCourses()
        
        const selector = `div[classname="${course}"]`
        const click = await this.page.$eval(selector, el => el.getAttribute('click')) ?? ''
        await this.page.evaluate(click)
        await this.page.waitForNavigation()
    }

    /**
     * Sets the `classname` attribute to the course name for each course listed in the navbar.
     */
    public async fixCourses(): Promise<void> {
        await this.page.$$eval('.navrow', (els: any) => {
            for (const el of els) {
                if (el.innerHTML.includes('classnav')) {
                    let name = el.innerHTML.replace(/\t+/g, '')
                    name = name.substring(22, name.indexOf('</div>', 22))
                    el.setAttribute('iscourse', 'true')
                    el.setAttribute('classname', name)
                }
            }
        })
    }

    /**
     * Retrieve the first HTML element on the page matching a query.
     * 
     * @param {string} selector - Puppeteer search query
     * @returns {Promise<ElementHandle | null>} Promise resolving to an `ElementHandle` or null if the target is not present
     */
    public async getElement(selector: string): Promise<ElementHandle | null> {
        return await this.page.$(selector)
    }

    /**
     * Retrieve all HTML elements on the page matching a query.
     * 
     * @param {string} selector - Puppeteer search query
     * @returns {Promise<ElementHandle[]>} Promise resolving to an `ElementHandle` array
     */
    public async getElements(selector: string): Promise<ElementHandle[]> {
        return await this.page.$$(selector)
    }

    /**
     * Retrieve raw HTML from an HTML `ElementHandle`.
     * 
     * @param {ElementHandle | null} element - Handle to HTML element, null-safe
     * @returns {Promise<string | undefined>} Promise resolving to raw HTML string or `undefined` if not present
     */
    public async getHtml(element: ElementHandle | null): Promise<string | undefined> {
        const handle = await element?.getProperty('innerHTML')
        const value = await handle?.jsonValue()
        return value?.trim()
    }
}

export default Navigator
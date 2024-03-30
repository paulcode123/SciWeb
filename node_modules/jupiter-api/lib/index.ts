import puppeteer, { Browser, PuppeteerLaunchOptions, ConnectOptions } from "puppeteer"
import JupiterRequest from "./scraper/request"
import Scraper from "./scraper/scraper"
import Navigator from "./scraper/navigator"

/**
 * Entry-point for the third-party Jupiter API.
 * 
 * @remarks
 * Initializes Chromium web-crawler, creates requests, and generates `Scraper` objects.
 */
class Jupiter {
    private browser: Browser

    private constructor(browser: Browser) {
        this.browser = browser
    }

    /**
     * Launches a Chromium instance and constructs a `Jupiter` object.
     * 
     * @param {PuppeteerLaunchOptions} options - Options to configure Puppeteer launching behavior
     * @returns {Promise<Jupiter>} Promise resolving to `Jupiter` object
     * 
     * @example
     * ```ts
     * Jupiter.launch({...options}).then(async (jupiter) => {
     *      // Perform requests
     * })
     * ```
     */
    public static async launch(options?: PuppeteerLaunchOptions): Promise<Jupiter> {
        const browser = await puppeteer.launch(options)
        return new Jupiter(browser)
    }

    /**
     * Connects to an existing Chromium instance and constructs a `Jupiter` object.
     * 
     * @param options - Options to configure Puppeteer browser behavior
     * @returns {Promise<Jupiter>} Promise resolving to `Jupiter` object
     * 
     * @example
     * ```ts
     * Jupiter.connect({...options}).then(async (jupiter) => {
     *      // Perform requests
     * })
     * ```
     */
    public static async connect(options: ConnectOptions): Promise<Jupiter> {
        const browser = await puppeteer.connect(options)
        return new Jupiter(browser)
    }

    /**
     * Creates a new Jupiter request and returns a `Scraper` object.
     * 
     * @param request - Login details for {@link https://login.jupitered.com/login/}
     * @returns {Promise<Scraper>} Promise resolving to `Scraper` object
     * 
     * @example
     * ```ts
     * jupiter.request({
     *      id: '',
     *      password: '',
     *      school: '',
     *      city: '',
     *      state: ''
     * }).then(async (scraper) => {
     *      // Retrieve and parse data
     *      // See Scraper for more details
     * })
     * ```
     */
    public async request(request: JupiterRequest): Promise<Scraper> {
        const context = await this.browser.createIncognitoBrowserContext()
        const page = await context.newPage()
        
        return new Scraper(request, page)
    }
}

export default Jupiter
export { Scraper, Navigator }
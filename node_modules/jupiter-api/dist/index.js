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
exports.Navigator = exports.Scraper = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const scraper_1 = __importDefault(require("./scraper/scraper"));
exports.Scraper = scraper_1.default;
const navigator_1 = __importDefault(require("./scraper/navigator"));
exports.Navigator = navigator_1.default;
class Jupiter {
    constructor(browser) {
        this.browser = browser;
    }
    static launch(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const browser = yield puppeteer_1.default.launch(options);
            return new Jupiter(browser);
        });
    }
    static connect(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const browser = yield puppeteer_1.default.connect(options);
            return new Jupiter(browser);
        });
    }
    request(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const context = yield this.browser.createIncognitoBrowserContext();
            const page = yield context.newPage();
            return new scraper_1.default(request, page);
        });
    }
}
exports.default = Jupiter;

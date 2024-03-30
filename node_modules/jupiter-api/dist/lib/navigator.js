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
Object.defineProperty(exports, "__esModule", { value: true });
class Navigator {
    constructor(page) {
        this.url = 'https://login.jupitered.com/login/';
        this.page = page;
    }
    login(request) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.page.goto(this.url);
            yield this.page.waitForNavigation();
            yield this.page.type('#text_studid1', request['id']);
            yield this.page.type('#text_password1', request['password']);
            yield this.page.type('#text_school1', request['school']);
            yield this.page.type('#text_city1', request['city']);
            yield this.page.$eval('input[name=region1]', (el, state) => el.value = state, request['state']);
            yield this.page.click('#loginbtn');
            yield this.page.waitForNavigation();
            return (yield this.getElement('#alert')) == null;
        });
    }
    toggleNav() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.page.click('#touchnavbtn');
        });
    }
    goCourse(course) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield this.toggleNav();
            yield this.fixCourses();
            const selector = `div[classname="${course}"]`;
            const click = (_a = yield this.page.$eval(selector, el => el.getAttribute('click'))) !== null && _a !== void 0 ? _a : '';
            yield this.page.evaluate(click);
            yield this.page.waitForNavigation();
        });
    }
    fixCourses() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.page.$$eval('.navrow', (els) => {
                for (const el of els) {
                    if (el.innerHTML.includes('classnav')) {
                        let name = el.innerHTML.replace(/\t+/g, '');
                        name = name.substring(22, name.indexOf('</div>', 22));
                        el.setAttribute('iscourse', 'true');
                        el.setAttribute('classname', name);
                    }
                }
            });
        });
    }
    getElement(selector) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.page.$(selector);
        });
    }
    getElements(selector) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.page.$$(selector);
        });
    }
    getHtml(element) {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = yield (element === null || element === void 0 ? void 0 : element.getProperty('innerHTML'));
            const value = yield (handle === null || handle === void 0 ? void 0 : handle.jsonValue());
            return value === null || value === void 0 ? void 0 : value.trim();
        });
    }
}
exports.default = Navigator;

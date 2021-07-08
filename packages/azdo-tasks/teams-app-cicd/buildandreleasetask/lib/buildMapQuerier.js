"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildMapQuerier = void 0;
const errors_1 = require("./errors");
const buildMap_1 = require("./buildMap");
class BuildMapQuerier {
    constructor() { }
    static getInstance() {
        if (!BuildMapQuerier.instance) {
            BuildMapQuerier.instance = new BuildMapQuerier();
        }
        return BuildMapQuerier.instance;
    }
    query(cap, lang) {
        const capItems = buildMap_1.buildMap[cap];
        if (!capItems) {
            throw new errors_1.InternalError(`Cannot find ${cap} in buildMap.`);
        }
        // If the cap's build commands are irrelevant to programming language,
        // then the value should be the command list.
        // Or it should be indexed by programming language.
        if (Array.isArray(capItems)) {
            return capItems;
        }
        if (!lang) {
            throw new errors_1.InternalError('programmingLanguage is required but undefined.');
        }
        const capLang = capItems[lang];
        if (!capLang) {
            throw new errors_1.InternalError(`Cannot find ${cap}.${lang} in buildMap.`);
        }
        return capLang;
    }
}
exports.BuildMapQuerier = BuildMapQuerier;

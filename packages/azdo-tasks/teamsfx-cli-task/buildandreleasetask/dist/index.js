require('./sourcemap-register.js');/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 131:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

__nccwpck_require__(907);/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 131:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

__nccwpck_require__(907);/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 131:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

__nccwpck_require__(907);/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 131:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

__nccwpck_require__(907);/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 1416:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseError = exports.ErrorType = void 0;
// eslint-disable-next-line no-shadow
var ErrorType;
(function (ErrorType) {
    ErrorType[ErrorType["User"] = 0] = "User";
    ErrorType[ErrorType["System"] = 1] = "System";
})(ErrorType = exports.ErrorType || (exports.ErrorType = {}));
class BaseError extends Error {
    constructor(type, name, details, suggestions, innerError, showHelpLink = false) {
        super(details);
        this.name = name;
        this.details = details;
        this.suggestions = suggestions;
        this.errorType = type;
        this.innerError = innerError;
        this.showHelpLink = showHelpLink;
        Object.setPrototypeOf(this, BaseError.prototype);
    }
    genMessage() {
        return `${this.message} Suggestions: ${this.suggestions.join('\n')}`;
    }
}
exports.BaseError = BaseError;


/***/ }),

/***/ 4201:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.buildMap = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.buildMap = {
    tabs: ['npm install', 'npm run build'],
    bot: {
        typescript: ['npm install', 'npm run build'],
        javascript: ['npm install']
    },
    SPFx: ['npm install', 'npm run build']
};


/***/ }),

/***/ 5613:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BuildMapQuerier = void 0;
const errors_1 = __nccwpck_require__(579);
const buildMap_1 = __nccwpck_require__(4201);
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


/***/ }),

/***/ 2643:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Suggestions = exports.ErrorNames = exports.Miscs = exports.Pathes = exports.Commands = exports.ActionOutputs = exports.ActionInputs = void 0;
/* eslint-disable @typescript-eslint/no-extraneous-class */
class ActionInputs {
}
exports.ActionInputs = ActionInputs;
ActionInputs.ProjectRoot = 'projectRoot';
ActionInputs.OperationType = 'operationType';
ActionInputs.Capabilities = 'capabilities';
class ActionOutputs {
}
exports.ActionOutputs = ActionOutputs;
ActionOutputs.ConfigFilePath = 'configFilePath';
ActionOutputs.SharepointPackagePath = 'sharepointPackagePath';
ActionOutputs.PackageZipPath = 'packageZipPath';
class Commands {
}
exports.Commands = Commands;
Commands.NpmInstall = 'npm install';
Commands.NpmRunBuild = 'npm run build';
Commands.TeamsfxProvision = (subscriptionId) => `npx @microsoft/teamsfx-cli provision --subscription ${subscriptionId}`;
Commands.TeamsfxDeploy = 'npx @microsoft/teamsfx-cli deploy';
Commands.TeamsfxBuild = 'npx @microsoft/teamsfx-cli build';
Commands.TeamsfxValidate = 'npx @microsoft/teamsfx-cli validate';
Commands.TeamsfxPublish = 'npx @microsoft/teamsfx-cli publish';
class Pathes {
}
exports.Pathes = Pathes;
Pathes.EnvDefaultJson = '.fx/env.default.json';
Pathes.PackageSolutionJson = 'SPFx/config/package-solution.json';
Pathes.TeamsAppPackageZip = '.fx/appPackage.zip';
class Miscs {
}
exports.Miscs = Miscs;
Miscs.SolutionConfigKey = 'solution';
Miscs.BotConfigKey = 'fx-resource-bot';
Miscs.LanguageKey = 'programmingLanguage';
class ErrorNames {
}
exports.ErrorNames = ErrorNames;
ErrorNames.InputsError = 'InputsError';
ErrorNames.LanguageError = 'LanguageError';
ErrorNames.EnvironmentVariableError = 'EnvironmentVariableError';
ErrorNames.SpfxZippedPackageMissingError = 'SpfxZippedPackageMissingError';
ErrorNames.InternalError = 'InternalError';
class Suggestions {
}
exports.Suggestions = Suggestions;
Suggestions.CheckInputsAndUpdate = 'Please check and update the input values.';
Suggestions.CheckEnvDefaultJson = `Please check the content of ${Pathes.EnvDefaultJson}.`;
Suggestions.CheckPackageSolutionJson = `Please check the content of ${Pathes.PackageSolutionJson}.`;
Suggestions.RerunWorkflow = 'Please rerun the workflow or pipeline.';
Suggestions.CreateAnIssue = 'Please create an issue on GitHub.';


/***/ }),

/***/ 4192:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Capability = void 0;
// eslint-disable-next-line no-shadow
var Capability;
(function (Capability) {
    Capability["Tabs"] = "tabs";
    Capability["Bot"] = "bot";
    Capability["SPFx"] = "SPFx";
})(Capability = exports.Capability || (exports.Capability = {}));


/***/ }),

/***/ 8456:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OperationType = void 0;
// eslint-disable-next-line no-shadow
var OperationType;
(function (OperationType) {
    OperationType["BuildTeamsApp"] = "Build Teams App";
    OperationType["ProvisionHostingEnvironment"] = "Provision Hosting Environment";
    OperationType["DeployToHostingEnvironment"] = "Deploy to Hosting Environment";
    OperationType["PackTeamsApp"] = "Pack Teams App";
    OperationType["ValidateManifest"] = "Validate Teams App Manifest";
    OperationType["PublishTeamsApp"] = "Publish Teams App";
})(OperationType = exports.OperationType || (exports.OperationType = {}));


/***/ }),

/***/ 7014:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProgrammingLanguage = void 0;
// eslint-disable-next-line no-shadow
var ProgrammingLanguage;
(function (ProgrammingLanguage) {
    ProgrammingLanguage["JavaScript"] = "javascript";
    ProgrammingLanguage["TypeScript"] = "typescript";
})(ProgrammingLanguage = exports.ProgrammingLanguage || (exports.ProgrammingLanguage = {}));


/***/ }),

/***/ 579:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InternalError = exports.SpfxZippedPackageMissingError = exports.LanguageError = exports.EnvironmentVariableError = exports.InputsError = void 0;
const base_error_1 = __nccwpck_require__(1416);
const constant_1 = __nccwpck_require__(2643);
class InputsError extends base_error_1.BaseError {
    constructor(details) {
        super(base_error_1.ErrorType.User, constant_1.ErrorNames.InputsError, `Inputs are missing or invalid. Details: ${details}`, [constant_1.Suggestions.CheckInputsAndUpdate]);
    }
}
exports.InputsError = InputsError;
class EnvironmentVariableError extends base_error_1.BaseError {
    constructor(details) {
        super(base_error_1.ErrorType.User, constant_1.ErrorNames.InputsError, `Inputs are missing or invalid. Details: ${details}`, [constant_1.Suggestions.CheckInputsAndUpdate]);
    }
}
exports.EnvironmentVariableError = EnvironmentVariableError;
class LanguageError extends base_error_1.BaseError {
    constructor(details) {
        super(base_error_1.ErrorType.User, constant_1.ErrorNames.LanguageError, `programmingLanguage is missing or invalid. Details: ${details}`, [constant_1.Suggestions.CheckEnvDefaultJson]);
    }
}
exports.LanguageError = LanguageError;
class SpfxZippedPackageMissingError extends base_error_1.BaseError {
    constructor() {
        super(base_error_1.ErrorType.User, constant_1.ErrorNames.SpfxZippedPackageMissingError, 'Cannot get zippedPackage from package-solution.json.', [constant_1.Suggestions.CheckPackageSolutionJson]);
    }
}
exports.SpfxZippedPackageMissingError = SpfxZippedPackageMissingError;
class InternalError extends base_error_1.BaseError {
    constructor(message) {
        super(base_error_1.ErrorType.System, constant_1.ErrorNames.InternalError, message, [
            constant_1.Suggestions.RerunWorkflow,
            constant_1.Suggestions.CreateAnIssue
        ]);
    }
}
exports.InternalError = InternalError;


/***/ }),

/***/ 3556:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const constant_1 = __nccwpck_require__(2643);
const operations_1 = __nccwpck_require__(7940);
const operationTypes_1 = __nccwpck_require__(8456);
const words_to_list_1 = __nccwpck_require__(9626);
const errors_1 = __nccwpck_require__(579);
const capabilities_1 = __nccwpck_require__(4192);
const base_error_1 = __nccwpck_require__(1416);
const fs = __importStar(__nccwpck_require__(6378));
const tl = __importStar(__nccwpck_require__(7926));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let projectRoot = tl.getInput(constant_1.ActionInputs.ProjectRoot);
            const operationType = tl.getInput(constant_1.ActionInputs.OperationType);
            if (!projectRoot ||
                !(yield fs.pathExists(projectRoot)) ||
                !operationType ||
                !Object.values(operationTypes_1.OperationType).includes(operationType)) {
                throw new errors_1.InputsError(`${constant_1.ActionInputs.ProjectRoot}: ${projectRoot}, ${constant_1.ActionInputs.OperationType}: ${operationType}`);
            }
            switch (operationType) {
                case operationTypes_1.OperationType.BuildTeamsApp: {
                    let capabilities = tl.getInput(constant_1.ActionInputs.Capabilities);
                    if (!capabilities) {
                        // default to build all.
                        capabilities = Object.values(capabilities_1.Capability).join(',');
                    }
                    const capabilityList = words_to_list_1.WordsToList(capabilities);
                    if (capabilityList.some((value) => !Object.values(capabilities_1.Capability).includes(value))) {
                        throw new errors_1.InputsError(`${constant_1.ActionInputs.Capabilities}: ${capabilities}`);
                    }
                    yield operations_1.Operations.BuildTeamsApp(projectRoot, capabilityList);
                    break;
                }
                case operationTypes_1.OperationType.ProvisionHostingEnvironment:
                    yield operations_1.Operations.ProvisionHostingEnvironment(projectRoot);
                    break;
                case operationTypes_1.OperationType.DeployToHostingEnvironment:
                    yield operations_1.Operations.DeployToHostingEnvironment(projectRoot);
                    break;
                case operationTypes_1.OperationType.PackTeamsApp:
                    yield operations_1.Operations.PackTeamsApp(projectRoot);
                    break;
                case operationTypes_1.OperationType.ValidateManifest:
                    yield operations_1.Operations.ValidateTeamsAppManifest(projectRoot);
                    break;
                case operationTypes_1.OperationType.PublishTeamsApp:
                    yield operations_1.Operations.PublishTeamsApp(projectRoot);
                    break;
            }
        }
        catch (error) {
            if (error instanceof base_error_1.BaseError) {
                tl.setResult(tl.TaskResult.Failed, error.genMessage());
            }
            else {
                tl.setResult(tl.TaskResult.Failed, error.message);
            }
        }
    });
}
run();
exports.default = run;


/***/ }),

/***/ 7940:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Operations = void 0;
const path = __importStar(__nccwpck_require__(5622));
const exec_1 = __nccwpck_require__(5176);
const constant_1 = __nccwpck_require__(2643);
const programmingLanguages_1 = __nccwpck_require__(7014);
const fs = __importStar(__nccwpck_require__(6378));
const errors_1 = __nccwpck_require__(579);
const buildMapQuerier_1 = __nccwpck_require__(5613);
const tl = __importStar(__nccwpck_require__(7926));
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class Operations {
    static BuildTeamsApp(projectRoot, capabilities) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Get the project's programming language from env.default.json.
            const envDefaultPath = path.join(projectRoot, constant_1.Pathes.EnvDefaultJson);
            const config = yield fs.readJSON(envDefaultPath);
            const lang = (_a = config === null || config === void 0 ? void 0 : config[constant_1.Miscs.SolutionConfigKey]) === null || _a === void 0 ? void 0 : _a[constant_1.Miscs.LanguageKey];
            if (!lang || !Object.values(programmingLanguages_1.ProgrammingLanguage).includes(lang)) {
                throw new errors_1.LanguageError(`programmingLanguage: ${lang}`);
            }
            const promises = capabilities.map((cap) => __awaiter(this, void 0, void 0, function* () {
                const capPath = path.join(projectRoot, cap);
                const buildMapQuerier = buildMapQuerier_1.BuildMapQuerier.getInstance();
                const commands = buildMapQuerier.query(cap, lang);
                if (yield fs.pathExists(capPath)) {
                    for (const command of commands) {
                        yield exec_1.Execute(command, capPath);
                    }
                }
            }));
            yield Promise.all(promises);
        });
    }
    static ProvisionHostingEnvironment(projectRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            const ret = yield exec_1.Execute(constant_1.Commands.TeamsfxProvision(process.env.TEST_SUBSCRIPTION_ID), projectRoot);
            if (ret === 0) {
                tl.setVariable(constant_1.ActionOutputs.ConfigFilePath, path.join(projectRoot, constant_1.Pathes.EnvDefaultJson), false, true);
            }
            return ret;
        });
    }
    static DeployToHostingEnvironment(projectRoot) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const ret = yield exec_1.Execute(constant_1.Commands.TeamsfxDeploy, projectRoot);
            const packageSolutionPath = path.join(projectRoot, constant_1.Pathes.PackageSolutionJson);
            if (yield fs.pathExists(packageSolutionPath)) {
                const solutionConfig = yield fs.readJSON(packageSolutionPath);
                if (!((_a = solutionConfig === null || solutionConfig === void 0 ? void 0 : solutionConfig.paths) === null || _a === void 0 ? void 0 : _a.zippedPackage)) {
                    throw new errors_1.SpfxZippedPackageMissingError();
                }
                tl.setVariable(constant_1.ActionOutputs.SharepointPackagePath, path.join(projectRoot, 'SPFx', 'sharepoint', (_b = solutionConfig === null || solutionConfig === void 0 ? void 0 : solutionConfig.paths) === null || _b === void 0 ? void 0 : _b.zippedPackage), false, true);
            }
            return ret;
        });
    }
    static PackTeamsApp(projectRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            const ret = yield exec_1.Execute(constant_1.Commands.TeamsfxBuild, projectRoot);
            if (ret === 0) {
                tl.setVariable(constant_1.ActionOutputs.PackageZipPath, path.join(projectRoot, constant_1.Pathes.TeamsAppPackageZip), false, true);
            }
            return ret;
        });
    }
    static ValidateTeamsAppManifest(projectRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield exec_1.Execute(constant_1.Commands.TeamsfxValidate, projectRoot);
        });
    }
    static PublishTeamsApp(projectRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield exec_1.Execute(constant_1.Commands.TeamsfxPublish, projectRoot);
        });
    }
}
exports.Operations = Operations;


/***/ }),

/***/ 5176:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Execute = void 0;
const tl = __importStar(__nccwpck_require__(7926));
function Execute(cmd, workdir) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield tl.exec(cmd, undefined, {
            cwd: workdir
        });
    });
}
exports.Execute = Execute;


/***/ }),

/***/ 9626:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WordsToList = void 0;
function WordsToList(words) {
    if (!words.length) {
        return [];
    }
    return words.split(',').map((word) => word.trim());
}
exports.WordsToList = WordsToList;


/***/ }),

/***/ 3402:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._exposeCertSettings = exports._exposeProxySettings = exports._normalizeSeparators = exports._isRooted = exports._getDirectoryName = exports._ensureRooted = exports._loadData = exports._ensurePatternRooted = exports._getFindInfoFromPattern = exports._cloneMatchOptions = exports._legacyFindFiles_convertPatternToRegExp = exports._which = exports._checkPath = exports._exist = exports._debug = exports._error = exports._warning = exports._command = exports._getVariableKey = exports._getVariable = exports._loc = exports._setResourcePath = exports._setErrStream = exports._setStdStream = exports._writeLine = exports._endsWith = exports._startsWith = exports._vault = exports._knownVariableMap = void 0;
var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);
var os = __nccwpck_require__(2087);
var minimatch = __nccwpck_require__(3872);
var util = __nccwpck_require__(1669);
var tcm = __nccwpck_require__(876);
var vm = __nccwpck_require__(9);
var semver = __nccwpck_require__(3950);
var crypto = __nccwpck_require__(6417);
/**
 * Hash table of known variable info. The formatted env var name is the lookup key.
 *
 * The purpose of this hash table is to keep track of known variables. The hash table
 * needs to be maintained for multiple reasons:
 *  1) to distinguish between env vars and job vars
 *  2) to distinguish between secret vars and public
 *  3) to know the real variable name and not just the formatted env var name.
 */
exports._knownVariableMap = {};
//-----------------------------------------------------
// Validation Checks
//-----------------------------------------------------
// async await needs generators in node 4.x+
if (semver.lt(process.versions.node, '4.2.0')) {
    _warning('Tasks require a new agent.  Upgrade your agent or node to 4.2.0 or later');
}
//-----------------------------------------------------
// String convenience
//-----------------------------------------------------
function _startsWith(str, start) {
    return str.slice(0, start.length) == start;
}
exports._startsWith = _startsWith;
function _endsWith(str, end) {
    return str.slice(-end.length) == end;
}
exports._endsWith = _endsWith;
//-----------------------------------------------------
// General Helpers
//-----------------------------------------------------
var _outStream = process.stdout;
var _errStream = process.stderr;
function _writeLine(str) {
    _outStream.write(str + os.EOL);
}
exports._writeLine = _writeLine;
function _setStdStream(stdStream) {
    _outStream = stdStream;
}
exports._setStdStream = _setStdStream;
function _setErrStream(errStream) {
    _errStream = errStream;
}
exports._setErrStream = _setErrStream;
//-----------------------------------------------------
// Loc Helpers
//-----------------------------------------------------
var _locStringCache = {};
var _resourceFiles = {};
var _libResourceFileLoaded = false;
var _resourceCulture = 'en-US';
function _loadResJson(resjsonFile) {
    var resJson;
    if (_exist(resjsonFile)) {
        var resjsonContent = fs.readFileSync(resjsonFile, 'utf8').toString();
        // remove BOM
        if (resjsonContent.indexOf('\uFEFF') == 0) {
            resjsonContent = resjsonContent.slice(1);
        }
        try {
            resJson = JSON.parse(resjsonContent);
        }
        catch (err) {
            _debug('unable to parse resjson with err: ' + err.message);
        }
    }
    else {
        _debug('.resjson file not found: ' + resjsonFile);
    }
    return resJson;
}
function _loadLocStrings(resourceFile, culture) {
    var locStrings = {};
    if (_exist(resourceFile)) {
        var resourceJson = require(resourceFile);
        if (resourceJson && resourceJson.hasOwnProperty('messages')) {
            var locResourceJson;
            // load up resource resjson for different culture
            var localizedResourceFile = path.join(path.dirname(resourceFile), 'Strings', 'resources.resjson');
            var upperCulture = culture.toUpperCase();
            var cultures = [];
            try {
                cultures = fs.readdirSync(localizedResourceFile);
            }
            catch (ex) { }
            for (var i = 0; i < cultures.length; i++) {
                if (cultures[i].toUpperCase() == upperCulture) {
                    localizedResourceFile = path.join(localizedResourceFile, cultures[i], 'resources.resjson');
                    if (_exist(localizedResourceFile)) {
                        locResourceJson = _loadResJson(localizedResourceFile);
                    }
                    break;
                }
            }
            for (var key in resourceJson.messages) {
                if (locResourceJson && locResourceJson.hasOwnProperty('loc.messages.' + key)) {
                    locStrings[key] = locResourceJson['loc.messages.' + key];
                }
                else {
                    locStrings[key] = resourceJson.messages[key];
                }
            }
        }
    }
    else {
        _warning('LIB_ResourceFile does not exist');
    }
    return locStrings;
}
/**
 * Sets the location of the resources json.  This is typically the task.json file.
 * Call once at the beginning of the script before any calls to loc.
 * @param     path      Full path to the json.
 * @param     ignoreWarnings  Won't throw warnings if path already set.
 * @returns   void
 */
function _setResourcePath(path, ignoreWarnings) {
    if (ignoreWarnings === void 0) { ignoreWarnings = false; }
    if (process.env['TASKLIB_INPROC_UNITS']) {
        _resourceFiles = {};
        _libResourceFileLoaded = false;
        _locStringCache = {};
        _resourceCulture = 'en-US';
    }
    if (!_resourceFiles[path]) {
        _checkPath(path, 'resource file path');
        _resourceFiles[path] = path;
        _debug('adding resource file: ' + path);
        _resourceCulture = _getVariable('system.culture') || _resourceCulture;
        var locStrs = _loadLocStrings(path, _resourceCulture);
        for (var key in locStrs) {
            //cache loc string
            _locStringCache[key] = locStrs[key];
        }
    }
    else {
        if (ignoreWarnings) {
            _debug(_loc('LIB_ResourceFileAlreadySet', path));
        }
        else {
            _warning(_loc('LIB_ResourceFileAlreadySet', path));
        }
    }
}
exports._setResourcePath = _setResourcePath;
/**
 * Gets the localized string from the json resource file.  Optionally formats with additional params.
 *
 * @param     key      key of the resources string in the resource file
 * @param     param    additional params for formatting the string
 * @returns   string
 */
function _loc(key) {
    var param = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        param[_i - 1] = arguments[_i];
    }
    if (!_libResourceFileLoaded) {
        // merge loc strings from azure-pipelines-task-lib.
        var libResourceFile = __nccwpck_require__.ab + "lib.json";
        var libLocStrs = _loadLocStrings(__nccwpck_require__.ab + "lib.json", _resourceCulture);
        for (var libKey in libLocStrs) {
            //cache azure-pipelines-task-lib loc string
            _locStringCache[libKey] = libLocStrs[libKey];
        }
        _libResourceFileLoaded = true;
    }
    var locString;
    ;
    if (_locStringCache.hasOwnProperty(key)) {
        locString = _locStringCache[key];
    }
    else {
        if (Object.keys(_resourceFiles).length <= 0) {
            _warning(_loc('LIB_ResourceFileNotSet', key));
        }
        else {
            _warning(_loc('LIB_LocStringNotFound', key));
        }
        locString = key;
    }
    if (param.length > 0) {
        return util.format.apply(this, [locString].concat(param));
    }
    else {
        return locString;
    }
}
exports._loc = _loc;
//-----------------------------------------------------
// Input Helpers
//-----------------------------------------------------
/**
 * Gets a variable value that is defined on the build/release definition or set at runtime.
 *
 * @param     name     name of the variable to get
 * @returns   string
 */
function _getVariable(name) {
    var varval;
    // get the metadata
    var info;
    var key = _getVariableKey(name);
    if (exports._knownVariableMap.hasOwnProperty(key)) {
        info = exports._knownVariableMap[key];
    }
    if (info && info.secret) {
        // get the secret value
        varval = exports._vault.retrieveSecret('SECRET_' + key);
    }
    else {
        // get the public value
        varval = process.env[key];
        // fallback for pre 2.104.1 agent
        if (!varval && name.toUpperCase() == 'AGENT.JOBSTATUS') {
            varval = process.env['agent.jobstatus'];
        }
    }
    _debug(name + '=' + varval);
    return varval;
}
exports._getVariable = _getVariable;
function _getVariableKey(name) {
    if (!name) {
        throw new Error(_loc('LIB_ParameterIsRequired', 'name'));
    }
    return name.replace(/\./g, '_').replace(/ /g, '_').toUpperCase();
}
exports._getVariableKey = _getVariableKey;
//-----------------------------------------------------
// Cmd Helpers
//-----------------------------------------------------
function _command(command, properties, message) {
    var taskCmd = new tcm.TaskCommand(command, properties, message);
    _writeLine(taskCmd.toString());
}
exports._command = _command;
function _warning(message) {
    _command('task.issue', { 'type': 'warning' }, message);
}
exports._warning = _warning;
function _error(message) {
    _command('task.issue', { 'type': 'error' }, message);
}
exports._error = _error;
function _debug(message) {
    _command('task.debug', null, message);
}
exports._debug = _debug;
// //-----------------------------------------------------
// // Disk Functions
// //-----------------------------------------------------
/**
 * Returns whether a path exists.
 *
 * @param     path      path to check
 * @returns   boolean
 */
function _exist(path) {
    var exist = false;
    try {
        exist = !!(path && fs.statSync(path) != null);
    }
    catch (err) {
        if (err && err.code === 'ENOENT') {
            exist = false;
        }
        else {
            throw err;
        }
    }
    return exist;
}
exports._exist = _exist;
/**
 * Checks whether a path exists.
 * If the path does not exist, it will throw.
 *
 * @param     p         path to check
 * @param     name      name only used in error message to identify the path
 * @returns   void
 */
function _checkPath(p, name) {
    _debug('check path : ' + p);
    if (!_exist(p)) {
        throw new Error(_loc('LIB_PathNotFound', name, p));
    }
}
exports._checkPath = _checkPath;
/**
 * Returns path of a tool had the tool actually been invoked.  Resolves via paths.
 * If you check and the tool does not exist, it will throw.
 *
 * @param     tool       name of the tool
 * @param     check      whether to check if tool exists
 * @returns   string
 */
function _which(tool, check) {
    if (!tool) {
        throw new Error('parameter \'tool\' is required');
    }
    // recursive when check=true
    if (check) {
        var result = _which(tool, false);
        if (result) {
            return result;
        }
        else {
            if (process.platform == 'win32') {
                throw new Error(_loc('LIB_WhichNotFound_Win', tool));
            }
            else {
                throw new Error(_loc('LIB_WhichNotFound_Linux', tool));
            }
        }
    }
    _debug("which '" + tool + "'");
    try {
        // build the list of extensions to try
        var extensions = [];
        if (process.platform == 'win32' && process.env['PATHEXT']) {
            for (var _i = 0, _a = process.env['PATHEXT'].split(path.delimiter); _i < _a.length; _i++) {
                var extension = _a[_i];
                if (extension) {
                    extensions.push(extension);
                }
            }
        }
        // if it's rooted, return it if exists. otherwise return empty.
        if (_isRooted(tool)) {
            var filePath = _tryGetExecutablePath(tool, extensions);
            if (filePath) {
                _debug("found: '" + filePath + "'");
                return filePath;
            }
            _debug('not found');
            return '';
        }
        // if any path separators, return empty
        if (tool.indexOf('/') >= 0 || (process.platform == 'win32' && tool.indexOf('\\') >= 0)) {
            _debug('not found');
            return '';
        }
        // build the list of directories
        //
        // Note, technically "where" checks the current directory on Windows. From a task lib perspective,
        // it feels like we should not do this. Checking the current directory seems like more of a use
        // case of a shell, and the which() function exposed by the task lib should strive for consistency
        // across platforms.
        var directories = [];
        if (process.env['PATH']) {
            for (var _b = 0, _c = process.env['PATH'].split(path.delimiter); _b < _c.length; _b++) {
                var p = _c[_b];
                if (p) {
                    directories.push(p);
                }
            }
        }
        // return the first match
        for (var _d = 0, directories_1 = directories; _d < directories_1.length; _d++) {
            var directory = directories_1[_d];
            var filePath = _tryGetExecutablePath(directory + path.sep + tool, extensions);
            if (filePath) {
                _debug("found: '" + filePath + "'");
                return filePath;
            }
        }
        _debug('not found');
        return '';
    }
    catch (err) {
        throw new Error(_loc('LIB_OperationFailed', 'which', err.message));
    }
}
exports._which = _which;
/**
 * Best effort attempt to determine whether a file exists and is executable.
 * @param filePath    file path to check
 * @param extensions  additional file extensions to try
 * @return if file exists and is executable, returns the file path. otherwise empty string.
 */
function _tryGetExecutablePath(filePath, extensions) {
    try {
        // test file exists
        var stats = fs.statSync(filePath);
        if (stats.isFile()) {
            if (process.platform == 'win32') {
                // on Windows, test for valid extension
                var isExecutable = false;
                var fileName = path.basename(filePath);
                var dotIndex = fileName.lastIndexOf('.');
                if (dotIndex >= 0) {
                    var upperExt_1 = fileName.substr(dotIndex).toUpperCase();
                    if (extensions.some(function (validExt) { return validExt.toUpperCase() == upperExt_1; })) {
                        return filePath;
                    }
                }
            }
            else {
                if (isUnixExecutable(stats)) {
                    return filePath;
                }
            }
        }
    }
    catch (err) {
        if (err.code != 'ENOENT') {
            _debug("Unexpected error attempting to determine if executable file exists '" + filePath + "': " + err);
        }
    }
    // try each extension
    var originalFilePath = filePath;
    for (var _i = 0, extensions_1 = extensions; _i < extensions_1.length; _i++) {
        var extension = extensions_1[_i];
        var found = false;
        var filePath_1 = originalFilePath + extension;
        try {
            var stats = fs.statSync(filePath_1);
            if (stats.isFile()) {
                if (process.platform == 'win32') {
                    // preserve the case of the actual file (since an extension was appended)
                    try {
                        var directory = path.dirname(filePath_1);
                        var upperName = path.basename(filePath_1).toUpperCase();
                        for (var _a = 0, _b = fs.readdirSync(directory); _a < _b.length; _a++) {
                            var actualName = _b[_a];
                            if (upperName == actualName.toUpperCase()) {
                                filePath_1 = path.join(directory, actualName);
                                break;
                            }
                        }
                    }
                    catch (err) {
                        _debug("Unexpected error attempting to determine the actual case of the file '" + filePath_1 + "': " + err);
                    }
                    return filePath_1;
                }
                else {
                    if (isUnixExecutable(stats)) {
                        return filePath_1;
                    }
                }
            }
        }
        catch (err) {
            if (err.code != 'ENOENT') {
                _debug("Unexpected error attempting to determine if executable file exists '" + filePath_1 + "': " + err);
            }
        }
    }
    return '';
}
// on Mac/Linux, test the execute bit
//     R   W  X  R  W X R W X
//   256 128 64 32 16 8 4 2 1
function isUnixExecutable(stats) {
    return (stats.mode & 1) > 0 || ((stats.mode & 8) > 0 && stats.gid === process.getgid()) || ((stats.mode & 64) > 0 && stats.uid === process.getuid());
}
function _legacyFindFiles_convertPatternToRegExp(pattern) {
    pattern = (process.platform == 'win32' ? pattern.replace(/\\/g, '/') : pattern) // normalize separator on Windows
        .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') // regex escape - from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
        .replace(/\\\/\\\*\\\*\\\//g, '((\/.+/)|(\/))') // replace directory globstar, e.g. /hello/**/world
        .replace(/\\\*\\\*/g, '.*') // replace remaining globstars with a wildcard that can span directory separators, e.g. /hello/**dll
        .replace(/\\\*/g, '[^\/]*') // replace asterisks with a wildcard that cannot span directory separators, e.g. /hello/*.dll
        .replace(/\\\?/g, '[^\/]'); // replace single character wildcards, e.g. /hello/log?.dll
    pattern = "^" + pattern + "$";
    var flags = process.platform == 'win32' ? 'i' : '';
    return new RegExp(pattern, flags);
}
exports._legacyFindFiles_convertPatternToRegExp = _legacyFindFiles_convertPatternToRegExp;
function _cloneMatchOptions(matchOptions) {
    return {
        debug: matchOptions.debug,
        nobrace: matchOptions.nobrace,
        noglobstar: matchOptions.noglobstar,
        dot: matchOptions.dot,
        noext: matchOptions.noext,
        nocase: matchOptions.nocase,
        nonull: matchOptions.nonull,
        matchBase: matchOptions.matchBase,
        nocomment: matchOptions.nocomment,
        nonegate: matchOptions.nonegate,
        flipNegate: matchOptions.flipNegate
    };
}
exports._cloneMatchOptions = _cloneMatchOptions;
function _getFindInfoFromPattern(defaultRoot, pattern, matchOptions) {
    // parameter validation
    if (!defaultRoot) {
        throw new Error('getFindRootFromPattern() parameter defaultRoot cannot be empty');
    }
    if (!pattern) {
        throw new Error('getFindRootFromPattern() parameter pattern cannot be empty');
    }
    if (!matchOptions.nobrace) {
        throw new Error('getFindRootFromPattern() expected matchOptions.nobrace to be true');
    }
    // for the sake of determining the findPath, pretend nocase=false
    matchOptions = _cloneMatchOptions(matchOptions);
    matchOptions.nocase = false;
    // check if basename only and matchBase=true
    if (matchOptions.matchBase &&
        !_isRooted(pattern) &&
        (process.platform == 'win32' ? pattern.replace(/\\/g, '/') : pattern).indexOf('/') < 0) {
        return {
            adjustedPattern: pattern,
            findPath: defaultRoot,
            statOnly: false,
        };
    }
    // the technique applied by this function is to use the information on the Minimatch object determine
    // the findPath. Minimatch breaks the pattern into path segments, and exposes information about which
    // segments are literal vs patterns.
    //
    // note, the technique currently imposes a limitation for drive-relative paths with a glob in the
    // first segment, e.g. C:hello*/world. it's feasible to overcome this limitation, but is left unsolved
    // for now.
    var minimatchObj = new minimatch.Minimatch(pattern, matchOptions);
    // the "set" property is an array of arrays of parsed path segment info. the outer array should only
    // contain one item, otherwise something went wrong. brace expansion can result in multiple arrays,
    // but that should be turned off by the time this function is reached.
    if (minimatchObj.set.length != 1) {
        throw new Error('getFindRootFromPattern() expected Minimatch(...).set.length to be 1. Actual: ' + minimatchObj.set.length);
    }
    var literalSegments = [];
    for (var _i = 0, _a = minimatchObj.set[0]; _i < _a.length; _i++) {
        var parsedSegment = _a[_i];
        if (typeof parsedSegment == 'string') {
            // the item is a string when the original input for the path segment does not contain any
            // unescaped glob characters.
            //
            // note, the string here is already unescaped (i.e. glob escaping removed), so it is ready
            // to pass to find() as-is. for example, an input string 'hello\\*world' => 'hello*world'.
            literalSegments.push(parsedSegment);
            continue;
        }
        break;
    }
    // join the literal segments back together. Minimatch converts '\' to '/' on Windows, then squashes
    // consequetive slashes, and finally splits on slash. this means that UNC format is lost, but can
    // be detected from the original pattern.
    var joinedSegments = literalSegments.join('/');
    if (joinedSegments && process.platform == 'win32' && _startsWith(pattern.replace(/\\/g, '/'), '//')) {
        joinedSegments = '/' + joinedSegments; // restore UNC format
    }
    // determine the find path
    var findPath;
    if (_isRooted(pattern)) { // the pattern was rooted
        findPath = joinedSegments;
    }
    else if (joinedSegments) { // the pattern was not rooted, and literal segments were found
        findPath = _ensureRooted(defaultRoot, joinedSegments);
    }
    else { // the pattern was not rooted, and no literal segments were found
        findPath = defaultRoot;
    }
    // clean up the path
    if (findPath) {
        findPath = _getDirectoryName(_ensureRooted(findPath, '_')); // hack to remove unnecessary trailing slash
        findPath = _normalizeSeparators(findPath); // normalize slashes
    }
    return {
        adjustedPattern: _ensurePatternRooted(defaultRoot, pattern),
        findPath: findPath,
        statOnly: literalSegments.length == minimatchObj.set[0].length,
    };
}
exports._getFindInfoFromPattern = _getFindInfoFromPattern;
function _ensurePatternRooted(root, p) {
    if (!root) {
        throw new Error('ensurePatternRooted() parameter "root" cannot be empty');
    }
    if (!p) {
        throw new Error('ensurePatternRooted() parameter "p" cannot be empty');
    }
    if (_isRooted(p)) {
        return p;
    }
    // normalize root
    root = _normalizeSeparators(root);
    // escape special glob characters
    root = (process.platform == 'win32' ? root : root.replace(/\\/g, '\\\\')) // escape '\' on OSX/Linux
        .replace(/(\[)(?=[^\/]+\])/g, '[[]') // escape '[' when ']' follows within the path segment
        .replace(/\?/g, '[?]') // escape '?'
        .replace(/\*/g, '[*]') // escape '*'
        .replace(/\+\(/g, '[+](') // escape '+('
        .replace(/@\(/g, '[@](') // escape '@('
        .replace(/!\(/g, '[!]('); // escape '!('
    return _ensureRooted(root, p);
}
exports._ensurePatternRooted = _ensurePatternRooted;
//-------------------------------------------------------------------
// Populate the vault with sensitive data.  Inputs and Endpoints
//-------------------------------------------------------------------
function _loadData() {
    // in agent, prefer TempDirectory then workFolder.
    // In interactive dev mode, it won't be
    var keyPath = _getVariable("agent.TempDirectory") || _getVariable("agent.workFolder") || process.cwd();
    exports._vault = new vm.Vault(keyPath);
    exports._knownVariableMap = {};
    _debug('loading inputs and endpoints');
    var loaded = 0;
    for (var envvar in process.env) {
        if (_startsWith(envvar, 'INPUT_') ||
            _startsWith(envvar, 'ENDPOINT_AUTH_') ||
            _startsWith(envvar, 'SECUREFILE_TICKET_') ||
            _startsWith(envvar, 'SECRET_') ||
            _startsWith(envvar, 'VSTS_TASKVARIABLE_')) {
            // Record the secret variable metadata. This is required by getVariable to know whether
            // to retrieve the value from the vault. In a 2.104.1 agent or higher, this metadata will
            // be overwritten when the VSTS_SECRET_VARIABLES env var is processed below.
            if (_startsWith(envvar, 'SECRET_')) {
                var variableName = envvar.substring('SECRET_'.length);
                if (variableName) {
                    // This is technically not the variable name (has underscores instead of dots),
                    // but it's good enough to make getVariable work in a pre-2.104.1 agent where
                    // the VSTS_SECRET_VARIABLES env var is not defined.
                    exports._knownVariableMap[_getVariableKey(variableName)] = { name: variableName, secret: true };
                }
            }
            // store the secret
            var value = process.env[envvar];
            if (value) {
                ++loaded;
                _debug('loading ' + envvar);
                exports._vault.storeSecret(envvar, value);
                delete process.env[envvar];
            }
        }
    }
    _debug('loaded ' + loaded);
    // store public variable metadata
    var names;
    try {
        names = JSON.parse(process.env['VSTS_PUBLIC_VARIABLES'] || '[]');
    }
    catch (err) {
        throw new Error('Failed to parse VSTS_PUBLIC_VARIABLES as JSON. ' + err); // may occur during interactive testing
    }
    names.forEach(function (name) {
        exports._knownVariableMap[_getVariableKey(name)] = { name: name, secret: false };
    });
    delete process.env['VSTS_PUBLIC_VARIABLES'];
    // store secret variable metadata
    try {
        names = JSON.parse(process.env['VSTS_SECRET_VARIABLES'] || '[]');
    }
    catch (err) {
        throw new Error('Failed to parse VSTS_SECRET_VARIABLES as JSON. ' + err); // may occur during interactive testing
    }
    names.forEach(function (name) {
        exports._knownVariableMap[_getVariableKey(name)] = { name: name, secret: true };
    });
    delete process.env['VSTS_SECRET_VARIABLES'];
    // avoid loading twice (overwrites .taskkey)
    global['_vsts_task_lib_loaded'] = true;
}
exports._loadData = _loadData;
//--------------------------------------------------------------------------------
// Internal path helpers.
//--------------------------------------------------------------------------------
function _ensureRooted(root, p) {
    if (!root) {
        throw new Error('ensureRooted() parameter "root" cannot be empty');
    }
    if (!p) {
        throw new Error('ensureRooted() parameter "p" cannot be empty');
    }
    if (_isRooted(p)) {
        return p;
    }
    if (process.platform == 'win32' && root.match(/^[A-Z]:$/i)) { // e.g. C:
        return root + p;
    }
    // ensure root ends with a separator
    if (_endsWith(root, '/') || (process.platform == 'win32' && _endsWith(root, '\\'))) {
        // root already ends with a separator
    }
    else {
        root += path.sep; // append separator
    }
    return root + p;
}
exports._ensureRooted = _ensureRooted;
/**
 * Determines the parent path and trims trailing slashes (when safe). Path separators are normalized
 * in the result. This function works similar to the .NET System.IO.Path.GetDirectoryName() method.
 * For example, C:\hello\world\ returns C:\hello\world (trailing slash removed). Returns empty when
 * no higher directory can be determined.
 */
function _getDirectoryName(p) {
    // short-circuit if empty
    if (!p) {
        return '';
    }
    // normalize separators
    p = _normalizeSeparators(p);
    // on Windows, the goal of this function is to match the behavior of
    // [System.IO.Path]::GetDirectoryName(), e.g.
    //      C:/             =>
    //      C:/hello        => C:\
    //      C:/hello/       => C:\hello
    //      C:/hello/world  => C:\hello
    //      C:/hello/world/ => C:\hello\world
    //      C:              =>
    //      C:hello         => C:
    //      C:hello/        => C:hello
    //      /               =>
    //      /hello          => \
    //      /hello/         => \hello
    //      //hello         =>
    //      //hello/        =>
    //      //hello/world   =>
    //      //hello/world/  => \\hello\world
    //
    // unfortunately, path.dirname() can't simply be used. for example, on Windows
    // it yields different results from Path.GetDirectoryName:
    //      C:/             => C:/
    //      C:/hello        => C:/
    //      C:/hello/       => C:/
    //      C:/hello/world  => C:/hello
    //      C:/hello/world/ => C:/hello
    //      C:              => C:
    //      C:hello         => C:
    //      C:hello/        => C:
    //      /               => /
    //      /hello          => /
    //      /hello/         => /
    //      //hello         => /
    //      //hello/        => /
    //      //hello/world   => //hello/world
    //      //hello/world/  => //hello/world/
    //      //hello/world/again => //hello/world/
    //      //hello/world/again/ => //hello/world/
    //      //hello/world/again/again => //hello/world/again
    //      //hello/world/again/again/ => //hello/world/again
    if (process.platform == 'win32') {
        if (/^[A-Z]:\\?[^\\]+$/i.test(p)) { // e.g. C:\hello or C:hello
            return p.charAt(2) == '\\' ? p.substring(0, 3) : p.substring(0, 2);
        }
        else if (/^[A-Z]:\\?$/i.test(p)) { // e.g. C:\ or C:
            return '';
        }
        var lastSlashIndex = p.lastIndexOf('\\');
        if (lastSlashIndex < 0) { // file name only
            return '';
        }
        else if (p == '\\') { // relative root
            return '';
        }
        else if (lastSlashIndex == 0) { // e.g. \\hello
            return '\\';
        }
        else if (/^\\\\[^\\]+(\\[^\\]*)?$/.test(p)) { // UNC root, e.g. \\hello or \\hello\ or \\hello\world
            return '';
        }
        return p.substring(0, lastSlashIndex); // e.g. hello\world => hello or hello\world\ => hello\world
        // note, this means trailing slashes for non-root directories
        // (i.e. not C:\, \, or \\unc\) will simply be removed.
    }
    // OSX/Linux
    if (p.indexOf('/') < 0) { // file name only
        return '';
    }
    else if (p == '/') {
        return '';
    }
    else if (_endsWith(p, '/')) {
        return p.substring(0, p.length - 1);
    }
    return path.dirname(p);
}
exports._getDirectoryName = _getDirectoryName;
/**
 * On OSX/Linux, true if path starts with '/'. On Windows, true for paths like:
 * \, \hello, \\hello\share, C:, and C:\hello (and corresponding alternate separator cases).
 */
function _isRooted(p) {
    p = _normalizeSeparators(p);
    if (!p) {
        throw new Error('isRooted() parameter "p" cannot be empty');
    }
    if (process.platform == 'win32') {
        return _startsWith(p, '\\') || // e.g. \ or \hello or \\hello
            /^[A-Z]:/i.test(p); // e.g. C: or C:\hello
    }
    return _startsWith(p, '/'); // e.g. /hello
}
exports._isRooted = _isRooted;
function _normalizeSeparators(p) {
    p = p || '';
    if (process.platform == 'win32') {
        // convert slashes on Windows
        p = p.replace(/\//g, '\\');
        // remove redundant slashes
        var isUnc = /^\\\\+[^\\]/.test(p); // e.g. \\hello
        return (isUnc ? '\\' : '') + p.replace(/\\\\+/g, '\\'); // preserve leading // for UNC
    }
    // remove redundant slashes
    return p.replace(/\/\/+/g, '/');
}
exports._normalizeSeparators = _normalizeSeparators;
//-----------------------------------------------------
// Expose proxy information to vsts-node-api
//-----------------------------------------------------
function _exposeProxySettings() {
    var proxyUrl = _getVariable('Agent.ProxyUrl');
    if (proxyUrl && proxyUrl.length > 0) {
        var proxyUsername = _getVariable('Agent.ProxyUsername');
        var proxyPassword = _getVariable('Agent.ProxyPassword');
        var proxyBypassHostsJson = _getVariable('Agent.ProxyBypassList');
        global['_vsts_task_lib_proxy_url'] = proxyUrl;
        global['_vsts_task_lib_proxy_username'] = proxyUsername;
        global['_vsts_task_lib_proxy_bypass'] = proxyBypassHostsJson;
        global['_vsts_task_lib_proxy_password'] = _exposeTaskLibSecret('proxy', proxyPassword || '');
        _debug('expose agent proxy configuration.');
        global['_vsts_task_lib_proxy'] = true;
    }
}
exports._exposeProxySettings = _exposeProxySettings;
//-----------------------------------------------------
// Expose certificate information to vsts-node-api
//-----------------------------------------------------
function _exposeCertSettings() {
    var ca = _getVariable('Agent.CAInfo');
    if (ca) {
        global['_vsts_task_lib_cert_ca'] = ca;
    }
    var clientCert = _getVariable('Agent.ClientCert');
    if (clientCert) {
        var clientCertKey = _getVariable('Agent.ClientCertKey');
        var clientCertArchive = _getVariable('Agent.ClientCertArchive');
        var clientCertPassword = _getVariable('Agent.ClientCertPassword');
        global['_vsts_task_lib_cert_clientcert'] = clientCert;
        global['_vsts_task_lib_cert_key'] = clientCertKey;
        global['_vsts_task_lib_cert_archive'] = clientCertArchive;
        global['_vsts_task_lib_cert_passphrase'] = _exposeTaskLibSecret('cert', clientCertPassword || '');
    }
    if (ca || clientCert) {
        _debug('expose agent certificate configuration.');
        global['_vsts_task_lib_cert'] = true;
    }
    var skipCertValidation = _getVariable('Agent.SkipCertValidation') || 'false';
    if (skipCertValidation) {
        global['_vsts_task_lib_skip_cert_validation'] = skipCertValidation.toUpperCase() === 'TRUE';
    }
}
exports._exposeCertSettings = _exposeCertSettings;
// We store the encryption key on disk and hold the encrypted content and key file in memory
// return base64encoded<keyFilePath>:base64encoded<encryptedContent>
// downstream vsts-node-api will retrieve the secret later
function _exposeTaskLibSecret(keyFile, secret) {
    if (secret) {
        var encryptKey = crypto.randomBytes(256);
        var cipher = crypto.createCipher("aes-256-ctr", encryptKey);
        var encryptedContent = cipher.update(secret, "utf8", "hex");
        encryptedContent += cipher.final("hex");
        var storageFile = path.join(_getVariable('Agent.TempDirectory') || _getVariable("agent.workFolder") || process.cwd(), keyFile);
        fs.writeFileSync(storageFile, encryptKey.toString('base64'), { encoding: 'utf8' });
        return new Buffer(storageFile).toString('base64') + ':' + new Buffer(encryptedContent).toString('base64');
    }
}


/***/ }),

/***/ 7926:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.updateReleaseName = exports.addBuildTag = exports.updateBuildNumber = exports.uploadBuildLog = exports.associateArtifact = exports.uploadArtifact = exports.logIssue = exports.logDetail = exports.setProgress = exports.setEndpoint = exports.addAttachment = exports.uploadSummary = exports.prependPath = exports.uploadFile = exports.CodeCoverageEnabler = exports.CodeCoveragePublisher = exports.TestPublisher = exports.getHttpCertConfiguration = exports.getHttpProxyConfiguration = exports.findMatch = exports.filter = exports.match = exports.tool = exports.execSync = exports.exec = exports.rmRF = exports.legacyFindFiles = exports.find = exports.mv = exports.cp = exports.ls = exports.which = exports.resolve = exports.mkdirP = exports.popd = exports.pushd = exports.cd = exports.checkPath = exports.cwd = exports.getPlatform = exports.osType = exports.writeFile = exports.exist = exports.stats = exports.debug = exports.error = exports.warning = exports.command = exports.setTaskVariable = exports.getTaskVariable = exports.getSecureFileTicket = exports.getSecureFileName = exports.getEndpointAuthorization = exports.getEndpointAuthorizationParameter = exports.getEndpointAuthorizationScheme = exports.getEndpointDataParameter = exports.getEndpointUrl = exports.getPathInput = exports.filePathSupplied = exports.getDelimitedInput = exports.getBoolInput = exports.getInput = exports.setSecret = exports.setVariable = exports.getVariables = exports.assertAgent = exports.getVariable = exports.loc = exports.setResourcePath = exports.setResult = exports.setErrStream = exports.setStdStream = exports.Platform = exports.FieldType = exports.ArtifactType = exports.IssueType = exports.TaskState = exports.TaskResult = void 0;
var shell = __nccwpck_require__(8753);
var childProcess = __nccwpck_require__(3129);
var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);
var os = __nccwpck_require__(2087);
var minimatch = __nccwpck_require__(3872);
var im = __nccwpck_require__(3402);
var tcm = __nccwpck_require__(876);
var trm = __nccwpck_require__(3342);
var semver = __nccwpck_require__(3950);
var TaskResult;
(function (TaskResult) {
    TaskResult[TaskResult["Succeeded"] = 0] = "Succeeded";
    TaskResult[TaskResult["SucceededWithIssues"] = 1] = "SucceededWithIssues";
    TaskResult[TaskResult["Failed"] = 2] = "Failed";
    TaskResult[TaskResult["Cancelled"] = 3] = "Cancelled";
    TaskResult[TaskResult["Skipped"] = 4] = "Skipped";
})(TaskResult = exports.TaskResult || (exports.TaskResult = {}));
var TaskState;
(function (TaskState) {
    TaskState[TaskState["Unknown"] = 0] = "Unknown";
    TaskState[TaskState["Initialized"] = 1] = "Initialized";
    TaskState[TaskState["InProgress"] = 2] = "InProgress";
    TaskState[TaskState["Completed"] = 3] = "Completed";
})(TaskState = exports.TaskState || (exports.TaskState = {}));
var IssueType;
(function (IssueType) {
    IssueType[IssueType["Error"] = 0] = "Error";
    IssueType[IssueType["Warning"] = 1] = "Warning";
})(IssueType = exports.IssueType || (exports.IssueType = {}));
var ArtifactType;
(function (ArtifactType) {
    ArtifactType[ArtifactType["Container"] = 0] = "Container";
    ArtifactType[ArtifactType["FilePath"] = 1] = "FilePath";
    ArtifactType[ArtifactType["VersionControl"] = 2] = "VersionControl";
    ArtifactType[ArtifactType["GitRef"] = 3] = "GitRef";
    ArtifactType[ArtifactType["TfvcLabel"] = 4] = "TfvcLabel";
})(ArtifactType = exports.ArtifactType || (exports.ArtifactType = {}));
var FieldType;
(function (FieldType) {
    FieldType[FieldType["AuthParameter"] = 0] = "AuthParameter";
    FieldType[FieldType["DataParameter"] = 1] = "DataParameter";
    FieldType[FieldType["Url"] = 2] = "Url";
})(FieldType = exports.FieldType || (exports.FieldType = {}));
/** Platforms supported by our build agent */
var Platform;
(function (Platform) {
    Platform[Platform["Windows"] = 0] = "Windows";
    Platform[Platform["MacOS"] = 1] = "MacOS";
    Platform[Platform["Linux"] = 2] = "Linux";
})(Platform = exports.Platform || (exports.Platform = {}));
//-----------------------------------------------------
// General Helpers
//-----------------------------------------------------
exports.setStdStream = im._setStdStream;
exports.setErrStream = im._setErrStream;
//-----------------------------------------------------
// Results
//-----------------------------------------------------
/**
 * Sets the result of the task.
 * Execution will continue.
 * If not set, task will be Succeeded.
 * If multiple calls are made to setResult the most pessimistic call wins (Failed) regardless of the order of calls.
 *
 * @param result    TaskResult enum of Succeeded, SucceededWithIssues, Failed, Cancelled or Skipped.
 * @param message   A message which will be logged as an error issue if the result is Failed.
 * @param done      Optional. Instructs the agent the task is done. This is helpful when child processes
 *                  may still be running and prevent node from fully exiting. This argument is supported
 *                  from agent version 2.142.0 or higher (otherwise will no-op).
 * @returns         void
 */
function setResult(result, message, done) {
    exports.debug('task result: ' + TaskResult[result]);
    // add an error issue
    if (result == TaskResult.Failed && message) {
        exports.error(message);
    }
    else if (result == TaskResult.SucceededWithIssues && message) {
        exports.warning(message);
    }
    // task.complete
    var properties = { 'result': TaskResult[result] };
    if (done) {
        properties['done'] = 'true';
    }
    exports.command('task.complete', properties, message);
}
exports.setResult = setResult;
//
// Catching all exceptions
//
process.on('uncaughtException', function (err) {
    setResult(TaskResult.Failed, exports.loc('LIB_UnhandledEx', err.message));
});
//-----------------------------------------------------
// Loc Helpers
//-----------------------------------------------------
exports.setResourcePath = im._setResourcePath;
exports.loc = im._loc;
//-----------------------------------------------------
// Input Helpers
//-----------------------------------------------------
exports.getVariable = im._getVariable;
/**
 * Asserts the agent version is at least the specified minimum.
 *
 * @param    minimum    minimum version version - must be 2.104.1 or higher
 */
function assertAgent(minimum) {
    if (semver.lt(minimum, '2.104.1')) {
        throw new Error('assertAgent() requires the parameter to be 2.104.1 or higher');
    }
    var agent = exports.getVariable('Agent.Version');
    if (agent && semver.lt(agent, minimum)) {
        throw new Error("Agent version " + minimum + " or higher is required");
    }
}
exports.assertAgent = assertAgent;
/**
 * Gets a snapshot of the current state of all job variables available to the task.
 * Requires a 2.104.1 agent or higher for full functionality.
 *
 * Limitations on an agent prior to 2.104.1:
 *  1) The return value does not include all public variables. Only public variables
 *     that have been added using setVariable are returned.
 *  2) The name returned for each secret variable is the formatted environment variable
 *     name, not the actual variable name (unless it was set explicitly at runtime using
 *     setVariable).
 *
 * @returns VariableInfo[]
 */
function getVariables() {
    return Object.keys(im._knownVariableMap)
        .map(function (key) {
        var info = im._knownVariableMap[key];
        return { name: info.name, value: exports.getVariable(info.name), secret: info.secret };
    });
}
exports.getVariables = getVariables;
/**
 * Sets a variable which will be available to subsequent tasks as well.
 *
 * @param     name     name of the variable to set
 * @param     val      value to set
 * @param     secret   whether variable is secret.  Multi-line secrets are not allowed.  Optional, defaults to false
 * @param     isOutput whether variable is an output variable.  Optional, defaults to false
 * @returns   void
 */
function setVariable(name, val, secret, isOutput) {
    if (secret === void 0) { secret = false; }
    if (isOutput === void 0) { isOutput = false; }
    // once a secret always a secret
    var key = im._getVariableKey(name);
    if (im._knownVariableMap.hasOwnProperty(key)) {
        secret = secret || im._knownVariableMap[key].secret;
    }
    // store the value
    var varValue = val || '';
    exports.debug('set ' + name + '=' + (secret && varValue ? '********' : varValue));
    if (secret) {
        if (varValue && varValue.match(/\r|\n/) && ("" + process.env['SYSTEM_UNSAFEALLOWMULTILINESECRET']).toUpperCase() != 'TRUE') {
            throw new Error(exports.loc('LIB_MultilineSecret'));
        }
        im._vault.storeSecret('SECRET_' + key, varValue);
        delete process.env[key];
    }
    else {
        process.env[key] = varValue;
    }
    // store the metadata
    im._knownVariableMap[key] = { name: name, secret: secret };
    // write the setvariable command
    exports.command('task.setvariable', { 'variable': name || '', isOutput: (isOutput || false).toString(), 'issecret': (secret || false).toString() }, varValue);
}
exports.setVariable = setVariable;
/**
 * Registers a value with the logger, so the value will be masked from the logs.  Multi-line secrets are not allowed.
 *
 * @param val value to register
 */
function setSecret(val) {
    if (val) {
        if (val.match(/\r|\n/) && ("" + process.env['SYSTEM_UNSAFEALLOWMULTILINESECRET']).toUpperCase() !== 'TRUE') {
            throw new Error(exports.loc('LIB_MultilineSecret'));
        }
        exports.command('task.setsecret', {}, val);
    }
}
exports.setSecret = setSecret;
/**
 * Gets the value of an input.
 * If required is true and the value is not set, it will throw.
 *
 * @param     name     name of the input to get
 * @param     required whether input is required.  optional, defaults to false
 * @returns   string
 */
function getInput(name, required) {
    var inval = im._vault.retrieveSecret('INPUT_' + im._getVariableKey(name));
    if (required && !inval) {
        throw new Error(exports.loc('LIB_InputRequired', name));
    }
    exports.debug(name + '=' + inval);
    return inval;
}
exports.getInput = getInput;
/**
 * Gets the value of an input and converts to a bool.  Convenience.
 * If required is true and the value is not set, it will throw.
 * If required is false and the value is not set, returns false.
 *
 * @param     name     name of the bool input to get
 * @param     required whether input is required.  optional, defaults to false
 * @returns   boolean
 */
function getBoolInput(name, required) {
    return (getInput(name, required) || '').toUpperCase() == "TRUE";
}
exports.getBoolInput = getBoolInput;
/**
 * Gets the value of an input and splits the value using a delimiter (space, comma, etc).
 * Empty values are removed.  This function is useful for splitting an input containing a simple
 * list of items - such as build targets.
 * IMPORTANT: Do not use this function for splitting additional args!  Instead use argString(), which
 * follows normal argument splitting rules and handles values encapsulated by quotes.
 * If required is true and the value is not set, it will throw.
 *
 * @param     name     name of the input to get
 * @param     delim    delimiter to split on
 * @param     required whether input is required.  optional, defaults to false
 * @returns   string[]
 */
function getDelimitedInput(name, delim, required) {
    var inputVal = getInput(name, required);
    if (!inputVal) {
        return [];
    }
    var result = [];
    inputVal.split(delim).forEach(function (x) {
        if (x) {
            result.push(x);
        }
    });
    return result;
}
exports.getDelimitedInput = getDelimitedInput;
/**
 * Checks whether a path inputs value was supplied by the user
 * File paths are relative with a picker, so an empty path is the root of the repo.
 * Useful if you need to condition work (like append an arg) if a value was supplied
 *
 * @param     name      name of the path input to check
 * @returns   boolean
 */
function filePathSupplied(name) {
    // normalize paths
    var pathValue = this.resolve(this.getPathInput(name) || '');
    var repoRoot = this.resolve(exports.getVariable('build.sourcesDirectory') || exports.getVariable('system.defaultWorkingDirectory') || '');
    var supplied = pathValue !== repoRoot;
    exports.debug(name + 'path supplied :' + supplied);
    return supplied;
}
exports.filePathSupplied = filePathSupplied;
/**
 * Gets the value of a path input
 * It will be quoted for you if it isn't already and contains spaces
 * If required is true and the value is not set, it will throw.
 * If check is true and the path does not exist, it will throw.
 *
 * @param     name      name of the input to get
 * @param     required  whether input is required.  optional, defaults to false
 * @param     check     whether path is checked.  optional, defaults to false
 * @returns   string
 */
function getPathInput(name, required, check) {
    var inval = getInput(name, required);
    if (inval) {
        if (check) {
            exports.checkPath(inval, name);
        }
    }
    return inval;
}
exports.getPathInput = getPathInput;
//-----------------------------------------------------
// Endpoint Helpers
//-----------------------------------------------------
/**
 * Gets the url for a service endpoint
 * If the url was not set and is not optional, it will throw.
 *
 * @param     id        name of the service endpoint
 * @param     optional  whether the url is optional
 * @returns   string
 */
function getEndpointUrl(id, optional) {
    var urlval = process.env['ENDPOINT_URL_' + id];
    if (!optional && !urlval) {
        throw new Error(exports.loc('LIB_EndpointNotExist', id));
    }
    exports.debug(id + '=' + urlval);
    return urlval;
}
exports.getEndpointUrl = getEndpointUrl;
/*
 * Gets the endpoint data parameter value with specified key for a service endpoint
 * If the endpoint data parameter was not set and is not optional, it will throw.
 *
 * @param id name of the service endpoint
 * @param key of the parameter
 * @param optional whether the endpoint data is optional
 * @returns {string} value of the endpoint data parameter
 */
function getEndpointDataParameter(id, key, optional) {
    var dataParamVal = process.env['ENDPOINT_DATA_' + id + '_' + key.toUpperCase()];
    if (!optional && !dataParamVal) {
        throw new Error(exports.loc('LIB_EndpointDataNotExist', id, key));
    }
    exports.debug(id + ' data ' + key + ' = ' + dataParamVal);
    return dataParamVal;
}
exports.getEndpointDataParameter = getEndpointDataParameter;
/**
 * Gets the endpoint authorization scheme for a service endpoint
 * If the endpoint authorization scheme is not set and is not optional, it will throw.
 *
 * @param id name of the service endpoint
 * @param optional whether the endpoint authorization scheme is optional
 * @returns {string} value of the endpoint authorization scheme
 */
function getEndpointAuthorizationScheme(id, optional) {
    var authScheme = im._vault.retrieveSecret('ENDPOINT_AUTH_SCHEME_' + id);
    if (!optional && !authScheme) {
        throw new Error(exports.loc('LIB_EndpointAuthNotExist', id));
    }
    exports.debug(id + ' auth scheme = ' + authScheme);
    return authScheme;
}
exports.getEndpointAuthorizationScheme = getEndpointAuthorizationScheme;
/**
 * Gets the endpoint authorization parameter value for a service endpoint with specified key
 * If the endpoint authorization parameter is not set and is not optional, it will throw.
 *
 * @param id name of the service endpoint
 * @param key key to find the endpoint authorization parameter
 * @param optional optional whether the endpoint authorization scheme is optional
 * @returns {string} value of the endpoint authorization parameter value
 */
function getEndpointAuthorizationParameter(id, key, optional) {
    var authParam = im._vault.retrieveSecret('ENDPOINT_AUTH_PARAMETER_' + id + '_' + key.toUpperCase());
    if (!optional && !authParam) {
        throw new Error(exports.loc('LIB_EndpointAuthNotExist', id));
    }
    exports.debug(id + ' auth param ' + key + ' = ' + authParam);
    return authParam;
}
exports.getEndpointAuthorizationParameter = getEndpointAuthorizationParameter;
/**
 * Gets the authorization details for a service endpoint
 * If the authorization was not set and is not optional, it will throw.
 *
 * @param     id        name of the service endpoint
 * @param     optional  whether the url is optional
 * @returns   string
 */
function getEndpointAuthorization(id, optional) {
    var aval = im._vault.retrieveSecret('ENDPOINT_AUTH_' + id);
    if (!optional && !aval) {
        setResult(TaskResult.Failed, exports.loc('LIB_EndpointAuthNotExist', id));
    }
    exports.debug(id + ' exists ' + (aval !== null));
    var auth;
    try {
        if (aval) {
            auth = JSON.parse(aval);
        }
    }
    catch (err) {
        throw new Error(exports.loc('LIB_InvalidEndpointAuth', aval));
    }
    return auth;
}
exports.getEndpointAuthorization = getEndpointAuthorization;
//-----------------------------------------------------
// SecureFile Helpers
//-----------------------------------------------------
/**
 * Gets the name for a secure file
 *
 * @param     id        secure file id
 * @returns   string
 */
function getSecureFileName(id) {
    var name = process.env['SECUREFILE_NAME_' + id];
    exports.debug('secure file name for id ' + id + ' = ' + name);
    return name;
}
exports.getSecureFileName = getSecureFileName;
/**
  * Gets the secure file ticket that can be used to download the secure file contents
  *
  * @param id name of the secure file
  * @returns {string} secure file ticket
  */
function getSecureFileTicket(id) {
    var ticket = im._vault.retrieveSecret('SECUREFILE_TICKET_' + id);
    exports.debug('secure file ticket for id ' + id + ' = ' + ticket);
    return ticket;
}
exports.getSecureFileTicket = getSecureFileTicket;
//-----------------------------------------------------
// Task Variable Helpers
//-----------------------------------------------------
/**
 * Gets a variable value that is set by previous step from the same wrapper task.
 * Requires a 2.115.0 agent or higher.
 *
 * @param     name     name of the variable to get
 * @returns   string
 */
function getTaskVariable(name) {
    assertAgent('2.115.0');
    var inval = im._vault.retrieveSecret('VSTS_TASKVARIABLE_' + im._getVariableKey(name));
    if (inval) {
        inval = inval.trim();
    }
    exports.debug('task variable: ' + name + '=' + inval);
    return inval;
}
exports.getTaskVariable = getTaskVariable;
/**
 * Sets a task variable which will only be available to subsequent steps belong to the same wrapper task.
 * Requires a 2.115.0 agent or higher.
 *
 * @param     name    name of the variable to set
 * @param     val     value to set
 * @param     secret  whether variable is secret.  optional, defaults to false
 * @returns   void
 */
function setTaskVariable(name, val, secret) {
    if (secret === void 0) { secret = false; }
    assertAgent('2.115.0');
    var key = im._getVariableKey(name);
    // store the value
    var varValue = val || '';
    exports.debug('set task variable: ' + name + '=' + (secret && varValue ? '********' : varValue));
    im._vault.storeSecret('VSTS_TASKVARIABLE_' + key, varValue);
    delete process.env[key];
    // write the command
    exports.command('task.settaskvariable', { 'variable': name || '', 'issecret': (secret || false).toString() }, varValue);
}
exports.setTaskVariable = setTaskVariable;
//-----------------------------------------------------
// Cmd Helpers
//-----------------------------------------------------
exports.command = im._command;
exports.warning = im._warning;
exports.error = im._error;
exports.debug = im._debug;
//-----------------------------------------------------
// Disk Functions
//-----------------------------------------------------
function _checkShell(cmd, continueOnError) {
    var se = shell.error();
    if (se) {
        exports.debug(cmd + ' failed');
        var errMsg = exports.loc('LIB_OperationFailed', cmd, se);
        exports.debug(errMsg);
        if (!continueOnError) {
            throw new Error(errMsg);
        }
    }
}
/**
 * Get's stat on a path.
 * Useful for checking whether a file or directory.  Also getting created, modified and accessed time.
 * see [fs.stat](https://nodejs.org/api/fs.html#fs_class_fs_stats)
 *
 * @param     path      path to check
 * @returns   fsStat
 */
function stats(path) {
    return fs.statSync(path);
}
exports.stats = stats;
exports.exist = im._exist;
function writeFile(file, data, options) {
    if (typeof (options) === 'string') {
        fs.writeFileSync(file, data, { encoding: options });
    }
    else {
        fs.writeFileSync(file, data, options);
    }
}
exports.writeFile = writeFile;
/**
 * @deprecated Use `getPlatform`
 * Useful for determining the host operating system.
 * see [os.type](https://nodejs.org/api/os.html#os_os_type)
 *
 * @return      the name of the operating system
 */
function osType() {
    return os.type();
}
exports.osType = osType;
/**
 * Determine the operating system the build agent is running on.
 * @returns {Platform}
 * @throws {Error} Platform is not supported by our agent
 */
function getPlatform() {
    switch (process.platform) {
        case 'win32': return Platform.Windows;
        case 'darwin': return Platform.MacOS;
        case 'linux': return Platform.Linux;
        default: throw Error(exports.loc('LIB_PlatformNotSupported', process.platform));
    }
}
exports.getPlatform = getPlatform;
/**
 * Returns the process's current working directory.
 * see [process.cwd](https://nodejs.org/api/process.html#process_process_cwd)
 *
 * @return      the path to the current working directory of the process
 */
function cwd() {
    return process.cwd();
}
exports.cwd = cwd;
exports.checkPath = im._checkPath;
/**
 * Change working directory.
 *
 * @param     path      new working directory path
 * @returns   void
 */
function cd(path) {
    if (path) {
        shell.cd(path);
        _checkShell('cd');
    }
}
exports.cd = cd;
/**
 * Change working directory and push it on the stack
 *
 * @param     path      new working directory path
 * @returns   void
 */
function pushd(path) {
    shell.pushd(path);
    _checkShell('pushd');
}
exports.pushd = pushd;
/**
 * Change working directory back to previously pushed directory
 *
 * @returns   void
 */
function popd() {
    shell.popd();
    _checkShell('popd');
}
exports.popd = popd;
/**
 * Make a directory.  Creates the full path with folders in between
 * Will throw if it fails
 *
 * @param     p       path to create
 * @returns   void
 */
function mkdirP(p) {
    if (!p) {
        throw new Error(exports.loc('LIB_ParameterIsRequired', 'p'));
    }
    // build a stack of directories to create
    var stack = [];
    var testDir = p;
    while (true) {
        // validate the loop is not out of control
        if (stack.length >= (process.env['TASKLIB_TEST_MKDIRP_FAILSAFE'] || 1000)) {
            // let the framework throw
            exports.debug('loop is out of control');
            fs.mkdirSync(p);
            return;
        }
        exports.debug("testing directory '" + testDir + "'");
        var stats_1 = void 0;
        try {
            stats_1 = fs.statSync(testDir);
        }
        catch (err) {
            if (err.code == 'ENOENT') {
                // validate the directory is not the drive root
                var parentDir = path.dirname(testDir);
                if (testDir == parentDir) {
                    throw new Error(exports.loc('LIB_MkdirFailedInvalidDriveRoot', p, testDir)); // Unable to create directory '{p}'. Root directory does not exist: '{testDir}'
                }
                // push the dir and test the parent
                stack.push(testDir);
                testDir = parentDir;
                continue;
            }
            else if (err.code == 'UNKNOWN') {
                throw new Error(exports.loc('LIB_MkdirFailedInvalidShare', p, testDir)); // Unable to create directory '{p}'. Unable to verify the directory exists: '{testDir}'. If directory is a file share, please verify the share name is correct, the share is online, and the current process has permission to access the share.
            }
            else {
                throw err;
            }
        }
        if (!stats_1.isDirectory()) {
            throw new Error(exports.loc('LIB_MkdirFailedFileExists', p, testDir)); // Unable to create directory '{p}'. Conflicting file exists: '{testDir}'
        }
        // testDir exists
        break;
    }
    // create each directory
    while (stack.length) {
        var dir = stack.pop(); // non-null because `stack.length` was truthy
        exports.debug("mkdir '" + dir + "'");
        try {
            fs.mkdirSync(dir);
        }
        catch (err) {
            throw new Error(exports.loc('LIB_MkdirFailed', p, err.message)); // Unable to create directory '{p}'. {err.message}
        }
    }
}
exports.mkdirP = mkdirP;
/**
 * Resolves a sequence of paths or path segments into an absolute path.
 * Calls node.js path.resolve()
 * Allows L0 testing with consistent path formats on Mac/Linux and Windows in the mock implementation
 * @param pathSegments
 * @returns {string}
 */
function resolve() {
    var pathSegments = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        pathSegments[_i] = arguments[_i];
    }
    var absolutePath = path.resolve.apply(this, pathSegments);
    exports.debug('Absolute path for pathSegments: ' + pathSegments + ' = ' + absolutePath);
    return absolutePath;
}
exports.resolve = resolve;
exports.which = im._which;
/**
 * Returns array of files in the given path, or in current directory if no path provided.  See shelljs.ls
 * @param  {string}   options  Available options: -R (recursive), -A (all files, include files beginning with ., except for . and ..)
 * @param  {string[]} paths    Paths to search.
 * @return {string[]}          An array of files in the given path(s).
 */
function ls(options, paths) {
    if (options) {
        return shell.ls(options, paths);
    }
    else {
        return shell.ls(paths);
    }
}
exports.ls = ls;
/**
 * Copies a file or folder.
 *
 * @param     source     source path
 * @param     dest       destination path
 * @param     options    string -r, -f or -rf for recursive and force
 * @param     continueOnError optional. whether to continue on error
 * @param     retryCount optional. Retry count to copy the file. It might help to resolve intermittent issues e.g. with UNC target paths on a remote host.
 */
function cp(source, dest, options, continueOnError, retryCount) {
    if (retryCount === void 0) { retryCount = 0; }
    while (retryCount >= 0) {
        try {
            if (options) {
                shell.cp(options, source, dest);
            }
            else {
                shell.cp(source, dest);
            }
            _checkShell('cp', false);
            break;
        }
        catch (e) {
            if (retryCount <= 0) {
                if (continueOnError) {
                    exports.warning(e);
                    break;
                }
                else {
                    throw e;
                }
            }
            else {
                console.log(exports.loc('LIB_CopyFileFailed', retryCount));
                retryCount--;
            }
        }
    }
}
exports.cp = cp;
/**
 * Moves a path.
 *
 * @param     source     source path
 * @param     dest       destination path
 * @param     options    string -f or -n for force and no clobber
 * @param     continueOnError optional. whether to continue on error
 */
function mv(source, dest, options, continueOnError) {
    if (options) {
        shell.mv(options, source, dest);
    }
    else {
        shell.mv(source, dest);
    }
    _checkShell('mv', continueOnError);
}
exports.mv = mv;
/**
 * Recursively finds all paths a given path. Returns an array of paths.
 *
 * @param     findPath  path to search
 * @param     options   optional. defaults to { followSymbolicLinks: true }. following soft links is generally appropriate unless deleting files.
 * @returns   string[]
 */
function find(findPath, options) {
    if (!findPath) {
        exports.debug('no path specified');
        return [];
    }
    // normalize the path, otherwise the first result is inconsistently formatted from the rest of the results
    // because path.join() performs normalization.
    findPath = path.normalize(findPath);
    // debug trace the parameters
    exports.debug("findPath: '" + findPath + "'");
    options = options || _getDefaultFindOptions();
    _debugFindOptions(options);
    // return empty if not exists
    try {
        fs.lstatSync(findPath);
    }
    catch (err) {
        if (err.code == 'ENOENT') {
            exports.debug('0 results');
            return [];
        }
        throw err;
    }
    try {
        var result = [];
        // push the first item
        var stack = [new _FindItem(findPath, 1)];
        var traversalChain = []; // used to detect cycles
        var _loop_1 = function () {
            // pop the next item and push to the result array
            var item = stack.pop(); // non-null because `stack.length` was truthy
            result.push(item.path);
            // stat the item.  the stat info is used further below to determine whether to traverse deeper
            //
            // stat returns info about the target of a symlink (or symlink chain),
            // lstat returns info about a symlink itself
            var stats_2 = void 0;
            if (options.followSymbolicLinks) {
                try {
                    // use stat (following all symlinks)
                    stats_2 = fs.statSync(item.path);
                }
                catch (err) {
                    if (err.code == 'ENOENT' && options.allowBrokenSymbolicLinks) {
                        // fallback to lstat (broken symlinks allowed)
                        stats_2 = fs.lstatSync(item.path);
                        exports.debug("  " + item.path + " (broken symlink)");
                    }
                    else {
                        throw err;
                    }
                }
            }
            else if (options.followSpecifiedSymbolicLink && result.length == 1) {
                try {
                    // use stat (following symlinks for the specified path and this is the specified path)
                    stats_2 = fs.statSync(item.path);
                }
                catch (err) {
                    if (err.code == 'ENOENT' && options.allowBrokenSymbolicLinks) {
                        // fallback to lstat (broken symlinks allowed)
                        stats_2 = fs.lstatSync(item.path);
                        exports.debug("  " + item.path + " (broken symlink)");
                    }
                    else {
                        throw err;
                    }
                }
            }
            else {
                // use lstat (not following symlinks)
                stats_2 = fs.lstatSync(item.path);
            }
            // note, isDirectory() returns false for the lstat of a symlink
            if (stats_2.isDirectory()) {
                exports.debug("  " + item.path + " (directory)");
                if (options.followSymbolicLinks) {
                    // get the realpath
                    var realPath_1 = fs.realpathSync(item.path);
                    // fixup the traversal chain to match the item level
                    while (traversalChain.length >= item.level) {
                        traversalChain.pop();
                    }
                    // test for a cycle
                    if (traversalChain.some(function (x) { return x == realPath_1; })) {
                        exports.debug('    cycle detected');
                        return "continue";
                    }
                    // update the traversal chain
                    traversalChain.push(realPath_1);
                }
                // push the child items in reverse onto the stack
                var childLevel_1 = item.level + 1;
                var childItems = fs.readdirSync(item.path)
                    .map(function (childName) { return new _FindItem(path.join(item.path, childName), childLevel_1); });
                for (var i = childItems.length - 1; i >= 0; i--) {
                    stack.push(childItems[i]);
                }
            }
            else {
                exports.debug("  " + item.path + " (file)");
            }
        };
        while (stack.length) {
            _loop_1();
        }
        exports.debug(result.length + " results");
        return result;
    }
    catch (err) {
        throw new Error(exports.loc('LIB_OperationFailed', 'find', err.message));
    }
}
exports.find = find;
var _FindItem = /** @class */ (function () {
    function _FindItem(path, level) {
        this.path = path;
        this.level = level;
    }
    return _FindItem;
}());
function _debugFindOptions(options) {
    exports.debug("findOptions.allowBrokenSymbolicLinks: '" + options.allowBrokenSymbolicLinks + "'");
    exports.debug("findOptions.followSpecifiedSymbolicLink: '" + options.followSpecifiedSymbolicLink + "'");
    exports.debug("findOptions.followSymbolicLinks: '" + options.followSymbolicLinks + "'");
}
function _getDefaultFindOptions() {
    return {
        allowBrokenSymbolicLinks: false,
        followSpecifiedSymbolicLink: true,
        followSymbolicLinks: true
    };
}
/**
 * Prefer tl.find() and tl.match() instead. This function is for backward compatibility
 * when porting tasks to Node from the PowerShell or PowerShell3 execution handler.
 *
 * @param    rootDirectory      path to root unrooted patterns with
 * @param    pattern            include and exclude patterns
 * @param    includeFiles       whether to include files in the result. defaults to true when includeFiles and includeDirectories are both false
 * @param    includeDirectories whether to include directories in the result
 * @returns  string[]
 */
function legacyFindFiles(rootDirectory, pattern, includeFiles, includeDirectories) {
    if (!pattern) {
        throw new Error('pattern parameter cannot be empty');
    }
    exports.debug("legacyFindFiles rootDirectory: '" + rootDirectory + "'");
    exports.debug("pattern: '" + pattern + "'");
    exports.debug("includeFiles: '" + includeFiles + "'");
    exports.debug("includeDirectories: '" + includeDirectories + "'");
    if (!includeFiles && !includeDirectories) {
        includeFiles = true;
    }
    // organize the patterns into include patterns and exclude patterns
    var includePatterns = [];
    var excludePatterns = [];
    pattern = pattern.replace(/;;/g, '\0');
    for (var _i = 0, _a = pattern.split(';'); _i < _a.length; _i++) {
        var pat = _a[_i];
        if (!pat) {
            continue;
        }
        pat = pat.replace(/\0/g, ';');
        // determine whether include pattern and remove any include/exclude prefix.
        // include patterns start with +: or anything other than -:
        // exclude patterns start with -:
        var isIncludePattern = void 0;
        if (im._startsWith(pat, '+:')) {
            pat = pat.substring(2);
            isIncludePattern = true;
        }
        else if (im._startsWith(pat, '-:')) {
            pat = pat.substring(2);
            isIncludePattern = false;
        }
        else {
            isIncludePattern = true;
        }
        // validate pattern does not end with a slash
        if (im._endsWith(pat, '/') || (process.platform == 'win32' && im._endsWith(pat, '\\'))) {
            throw new Error(exports.loc('LIB_InvalidPattern', pat));
        }
        // root the pattern
        if (rootDirectory && !path.isAbsolute(pat)) {
            pat = path.join(rootDirectory, pat);
            // remove trailing slash sometimes added by path.join() on Windows, e.g.
            //      path.join('\\\\hello', 'world') => '\\\\hello\\world\\'
            //      path.join('//hello', 'world') => '\\\\hello\\world\\'
            if (im._endsWith(pat, '\\')) {
                pat = pat.substring(0, pat.length - 1);
            }
        }
        if (isIncludePattern) {
            includePatterns.push(pat);
        }
        else {
            excludePatterns.push(im._legacyFindFiles_convertPatternToRegExp(pat));
        }
    }
    // find and apply patterns
    var count = 0;
    var result = _legacyFindFiles_getMatchingItems(includePatterns, excludePatterns, !!includeFiles, !!includeDirectories);
    exports.debug('all matches:');
    for (var _b = 0, result_1 = result; _b < result_1.length; _b++) {
        var resultItem = result_1[_b];
        exports.debug(' ' + resultItem);
    }
    exports.debug('total matched: ' + result.length);
    return result;
}
exports.legacyFindFiles = legacyFindFiles;
function _legacyFindFiles_getMatchingItems(includePatterns, excludePatterns, includeFiles, includeDirectories) {
    exports.debug('getMatchingItems()');
    for (var _i = 0, includePatterns_1 = includePatterns; _i < includePatterns_1.length; _i++) {
        var pattern = includePatterns_1[_i];
        exports.debug("includePattern: '" + pattern + "'");
    }
    for (var _a = 0, excludePatterns_1 = excludePatterns; _a < excludePatterns_1.length; _a++) {
        var pattern = excludePatterns_1[_a];
        exports.debug("excludePattern: " + pattern);
    }
    exports.debug('includeFiles: ' + includeFiles);
    exports.debug('includeDirectories: ' + includeDirectories);
    var allFiles = {};
    var _loop_2 = function (pattern) {
        // determine the directory to search
        //
        // note, getDirectoryName removes redundant path separators
        var findPath = void 0;
        var starIndex = pattern.indexOf('*');
        var questionIndex = pattern.indexOf('?');
        if (starIndex < 0 && questionIndex < 0) {
            // if no wildcards are found, use the directory name portion of the path.
            // if there is no directory name (file name only in pattern or drive root),
            // this will return empty string.
            findPath = im._getDirectoryName(pattern);
        }
        else {
            // extract the directory prior to the first wildcard
            var index = Math.min(starIndex >= 0 ? starIndex : questionIndex, questionIndex >= 0 ? questionIndex : starIndex);
            findPath = im._getDirectoryName(pattern.substring(0, index));
        }
        // note, due to this short-circuit and the above usage of getDirectoryName, this
        // function has the same limitations regarding drive roots as the powershell
        // implementation.
        //
        // also note, since getDirectoryName eliminates slash redundancies, some additional
        // work may be required if removal of this limitation is attempted.
        if (!findPath) {
            return "continue";
        }
        var patternRegex = im._legacyFindFiles_convertPatternToRegExp(pattern);
        // find files/directories
        var items = find(findPath, { followSymbolicLinks: true })
            .filter(function (item) {
            if (includeFiles && includeDirectories) {
                return true;
            }
            var isDir = fs.statSync(item).isDirectory();
            return (includeFiles && !isDir) || (includeDirectories && isDir);
        })
            .forEach(function (item) {
            var normalizedPath = process.platform == 'win32' ? item.replace(/\\/g, '/') : item; // normalize separators
            // **/times/** will not match C:/fun/times because there isn't a trailing slash
            // so try both if including directories
            var alternatePath = normalizedPath + "/"; // potential bug: it looks like this will result in a false
            // positive if the item is a regular file and not a directory
            var isMatch = false;
            if (patternRegex.test(normalizedPath) || (includeDirectories && patternRegex.test(alternatePath))) {
                isMatch = true;
                // test whether the path should be excluded
                for (var _i = 0, excludePatterns_2 = excludePatterns; _i < excludePatterns_2.length; _i++) {
                    var regex = excludePatterns_2[_i];
                    if (regex.test(normalizedPath) || (includeDirectories && regex.test(alternatePath))) {
                        isMatch = false;
                        break;
                    }
                }
            }
            if (isMatch) {
                allFiles[item] = item;
            }
        });
    };
    for (var _b = 0, includePatterns_2 = includePatterns; _b < includePatterns_2.length; _b++) {
        var pattern = includePatterns_2[_b];
        _loop_2(pattern);
    }
    return Object.keys(allFiles).sort();
}
/**
 * Remove a path recursively with force
 *
 * @param     inputPath path to remove
 * @throws    when the file or directory exists but could not be deleted.
 */
function rmRF(inputPath) {
    exports.debug('rm -rf ' + inputPath);
    if (getPlatform() == Platform.Windows) {
        // Node doesn't provide a delete operation, only an unlink function. This means that if the file is being used by another
        // program (e.g. antivirus), it won't be deleted. To address this, we shell out the work to rd/del.
        try {
            if (fs.statSync(inputPath).isDirectory()) {
                exports.debug('removing directory ' + inputPath);
                childProcess.execSync("rd /s /q \"" + inputPath + "\"");
            }
            else {
                exports.debug('removing file ' + inputPath);
                childProcess.execSync("del /f /a \"" + inputPath + "\"");
            }
        }
        catch (err) {
            // if you try to delete a file that doesn't exist, desired result is achieved
            // other errors are valid
            if (err.code != 'ENOENT') {
                throw new Error(exports.loc('LIB_OperationFailed', 'rmRF', err.message));
            }
        }
        // Shelling out fails to remove a symlink folder with missing source, this unlink catches that
        try {
            fs.unlinkSync(inputPath);
        }
        catch (err) {
            // if you try to delete a file that doesn't exist, desired result is achieved
            // other errors are valid
            if (err.code != 'ENOENT') {
                throw new Error(exports.loc('LIB_OperationFailed', 'rmRF', err.message));
            }
        }
    }
    else {
        // get the lstats in order to workaround a bug in shelljs@0.3.0 where symlinks
        // with missing targets are not handled correctly by "rm('-rf', path)"
        var lstats = void 0;
        try {
            lstats = fs.lstatSync(inputPath);
        }
        catch (err) {
            // if you try to delete a file that doesn't exist, desired result is achieved
            // other errors are valid
            if (err.code == 'ENOENT') {
                return;
            }
            throw new Error(exports.loc('LIB_OperationFailed', 'rmRF', err.message));
        }
        if (lstats.isDirectory()) {
            exports.debug('removing directory');
            shell.rm('-rf', inputPath);
            var errMsg = shell.error();
            if (errMsg) {
                throw new Error(exports.loc('LIB_OperationFailed', 'rmRF', errMsg));
            }
            return;
        }
        exports.debug('removing file');
        try {
            fs.unlinkSync(inputPath);
        }
        catch (err) {
            throw new Error(exports.loc('LIB_OperationFailed', 'rmRF', err.message));
        }
    }
}
exports.rmRF = rmRF;
/**
 * Exec a tool.  Convenience wrapper over ToolRunner to exec with args in one call.
 * Output will be streamed to the live console.
 * Returns promise with return code
 *
 * @param     tool     path to tool to exec
 * @param     args     an arg string or array of args
 * @param     options  optional exec options.  See IExecOptions
 * @returns   number
 */
function exec(tool, args, options) {
    var tr = this.tool(tool);
    tr.on('debug', function (data) {
        exports.debug(data);
    });
    if (args) {
        if (args instanceof Array) {
            tr.arg(args);
        }
        else if (typeof (args) === 'string') {
            tr.line(args);
        }
    }
    return tr.exec(options);
}
exports.exec = exec;
/**
 * Exec a tool synchronously.  Convenience wrapper over ToolRunner to execSync with args in one call.
 * Output will be *not* be streamed to the live console.  It will be returned after execution is complete.
 * Appropriate for short running tools
 * Returns IExecResult with output and return code
 *
 * @param     tool     path to tool to exec
 * @param     args     an arg string or array of args
 * @param     options  optional exec options.  See IExecSyncOptions
 * @returns   IExecSyncResult
 */
function execSync(tool, args, options) {
    var tr = this.tool(tool);
    tr.on('debug', function (data) {
        exports.debug(data);
    });
    if (args) {
        if (args instanceof Array) {
            tr.arg(args);
        }
        else if (typeof (args) === 'string') {
            tr.line(args);
        }
    }
    return tr.execSync(options);
}
exports.execSync = execSync;
/**
 * Convenience factory to create a ToolRunner.
 *
 * @param     tool     path to tool to exec
 * @returns   ToolRunner
 */
function tool(tool) {
    var tr = new trm.ToolRunner(tool);
    tr.on('debug', function (message) {
        exports.debug(message);
    });
    return tr;
}
exports.tool = tool;
/**
 * Applies glob patterns to a list of paths. Supports interleaved exclude patterns.
 *
 * @param  list         array of paths
 * @param  patterns     patterns to apply. supports interleaved exclude patterns.
 * @param  patternRoot  optional. default root to apply to unrooted patterns. not applied to basename-only patterns when matchBase:true.
 * @param  options      optional. defaults to { dot: true, nobrace: true, nocase: process.platform == 'win32' }.
 */
function match(list, patterns, patternRoot, options) {
    // trace parameters
    exports.debug("patternRoot: '" + patternRoot + "'");
    options = options || _getDefaultMatchOptions(); // default match options
    _debugMatchOptions(options);
    // convert pattern to an array
    if (typeof patterns == 'string') {
        patterns = [patterns];
    }
    // hashtable to keep track of matches
    var map = {};
    var originalOptions = options;
    for (var _i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
        var pattern = patterns_1[_i];
        exports.debug("pattern: '" + pattern + "'");
        // trim and skip empty
        pattern = (pattern || '').trim();
        if (!pattern) {
            exports.debug('skipping empty pattern');
            continue;
        }
        // clone match options
        var options_1 = im._cloneMatchOptions(originalOptions);
        // skip comments
        if (!options_1.nocomment && im._startsWith(pattern, '#')) {
            exports.debug('skipping comment');
            continue;
        }
        // set nocomment - brace expansion could result in a leading '#'
        options_1.nocomment = true;
        // determine whether pattern is include or exclude
        var negateCount = 0;
        if (!options_1.nonegate) {
            while (pattern.charAt(negateCount) == '!') {
                negateCount++;
            }
            pattern = pattern.substring(negateCount); // trim leading '!'
            if (negateCount) {
                exports.debug("trimmed leading '!'. pattern: '" + pattern + "'");
            }
        }
        var isIncludePattern = negateCount == 0 ||
            (negateCount % 2 == 0 && !options_1.flipNegate) ||
            (negateCount % 2 == 1 && options_1.flipNegate);
        // set nonegate - brace expansion could result in a leading '!'
        options_1.nonegate = true;
        options_1.flipNegate = false;
        // expand braces - required to accurately root patterns
        var expanded = void 0;
        var preExpanded = pattern;
        if (options_1.nobrace) {
            expanded = [pattern];
        }
        else {
            // convert slashes on Windows before calling braceExpand(). unfortunately this means braces cannot
            // be escaped on Windows, this limitation is consistent with current limitations of minimatch (3.0.3).
            exports.debug('expanding braces');
            var convertedPattern = process.platform == 'win32' ? pattern.replace(/\\/g, '/') : pattern;
            expanded = minimatch.braceExpand(convertedPattern);
        }
        // set nobrace
        options_1.nobrace = true;
        for (var _a = 0, expanded_1 = expanded; _a < expanded_1.length; _a++) {
            var pattern_1 = expanded_1[_a];
            if (expanded.length != 1 || pattern_1 != preExpanded) {
                exports.debug("pattern: '" + pattern_1 + "'");
            }
            // trim and skip empty
            pattern_1 = (pattern_1 || '').trim();
            if (!pattern_1) {
                exports.debug('skipping empty pattern');
                continue;
            }
            // root the pattern when all of the following conditions are true:
            if (patternRoot && // patternRoot supplied
                !im._isRooted(pattern_1) && // AND pattern not rooted
                // AND matchBase:false or not basename only
                (!options_1.matchBase || (process.platform == 'win32' ? pattern_1.replace(/\\/g, '/') : pattern_1).indexOf('/') >= 0)) {
                pattern_1 = im._ensureRooted(patternRoot, pattern_1);
                exports.debug("rooted pattern: '" + pattern_1 + "'");
            }
            if (isIncludePattern) {
                // apply the pattern
                exports.debug('applying include pattern against original list');
                var matchResults = minimatch.match(list, pattern_1, options_1);
                exports.debug(matchResults.length + ' matches');
                // union the results
                for (var _b = 0, matchResults_1 = matchResults; _b < matchResults_1.length; _b++) {
                    var matchResult = matchResults_1[_b];
                    map[matchResult] = true;
                }
            }
            else {
                // apply the pattern
                exports.debug('applying exclude pattern against original list');
                var matchResults = minimatch.match(list, pattern_1, options_1);
                exports.debug(matchResults.length + ' matches');
                // substract the results
                for (var _c = 0, matchResults_2 = matchResults; _c < matchResults_2.length; _c++) {
                    var matchResult = matchResults_2[_c];
                    delete map[matchResult];
                }
            }
        }
    }
    // return a filtered version of the original list (preserves order and prevents duplication)
    var result = list.filter(function (item) { return map.hasOwnProperty(item); });
    exports.debug(result.length + ' final results');
    return result;
}
exports.match = match;
/**
 * Filter to apply glob patterns
 *
 * @param  pattern  pattern to apply
 * @param  options  optional. defaults to { dot: true, nobrace: true, nocase: process.platform == 'win32' }.
 */
function filter(pattern, options) {
    options = options || _getDefaultMatchOptions();
    return minimatch.filter(pattern, options);
}
exports.filter = filter;
function _debugMatchOptions(options) {
    exports.debug("matchOptions.debug: '" + options.debug + "'");
    exports.debug("matchOptions.nobrace: '" + options.nobrace + "'");
    exports.debug("matchOptions.noglobstar: '" + options.noglobstar + "'");
    exports.debug("matchOptions.dot: '" + options.dot + "'");
    exports.debug("matchOptions.noext: '" + options.noext + "'");
    exports.debug("matchOptions.nocase: '" + options.nocase + "'");
    exports.debug("matchOptions.nonull: '" + options.nonull + "'");
    exports.debug("matchOptions.matchBase: '" + options.matchBase + "'");
    exports.debug("matchOptions.nocomment: '" + options.nocomment + "'");
    exports.debug("matchOptions.nonegate: '" + options.nonegate + "'");
    exports.debug("matchOptions.flipNegate: '" + options.flipNegate + "'");
}
function _getDefaultMatchOptions() {
    return {
        debug: false,
        nobrace: true,
        noglobstar: false,
        dot: true,
        noext: false,
        nocase: process.platform == 'win32',
        nonull: false,
        matchBase: false,
        nocomment: false,
        nonegate: false,
        flipNegate: false
    };
}
/**
 * Determines the find root from a list of patterns. Performs the find and then applies the glob patterns.
 * Supports interleaved exclude patterns. Unrooted patterns are rooted using defaultRoot, unless
 * matchOptions.matchBase is specified and the pattern is a basename only. For matchBase cases, the
 * defaultRoot is used as the find root.
 *
 * @param  defaultRoot   default path to root unrooted patterns. falls back to System.DefaultWorkingDirectory or process.cwd().
 * @param  patterns      pattern or array of patterns to apply
 * @param  findOptions   defaults to { followSymbolicLinks: true }. following soft links is generally appropriate unless deleting files.
 * @param  matchOptions  defaults to { dot: true, nobrace: true, nocase: process.platform == 'win32' }
 */
function findMatch(defaultRoot, patterns, findOptions, matchOptions) {
    // apply defaults for parameters and trace
    defaultRoot = defaultRoot || this.getVariable('system.defaultWorkingDirectory') || process.cwd();
    exports.debug("defaultRoot: '" + defaultRoot + "'");
    patterns = patterns || [];
    patterns = typeof patterns == 'string' ? [patterns] : patterns;
    findOptions = findOptions || _getDefaultFindOptions();
    _debugFindOptions(findOptions);
    matchOptions = matchOptions || _getDefaultMatchOptions();
    _debugMatchOptions(matchOptions);
    // normalize slashes for root dir
    defaultRoot = im._normalizeSeparators(defaultRoot);
    var results = {};
    var originalMatchOptions = matchOptions;
    for (var _i = 0, _a = (patterns || []); _i < _a.length; _i++) {
        var pattern = _a[_i];
        exports.debug("pattern: '" + pattern + "'");
        // trim and skip empty
        pattern = (pattern || '').trim();
        if (!pattern) {
            exports.debug('skipping empty pattern');
            continue;
        }
        // clone match options
        var matchOptions_1 = im._cloneMatchOptions(originalMatchOptions);
        // skip comments
        if (!matchOptions_1.nocomment && im._startsWith(pattern, '#')) {
            exports.debug('skipping comment');
            continue;
        }
        // set nocomment - brace expansion could result in a leading '#'
        matchOptions_1.nocomment = true;
        // determine whether pattern is include or exclude
        var negateCount = 0;
        if (!matchOptions_1.nonegate) {
            while (pattern.charAt(negateCount) == '!') {
                negateCount++;
            }
            pattern = pattern.substring(negateCount); // trim leading '!'
            if (negateCount) {
                exports.debug("trimmed leading '!'. pattern: '" + pattern + "'");
            }
        }
        var isIncludePattern = negateCount == 0 ||
            (negateCount % 2 == 0 && !matchOptions_1.flipNegate) ||
            (negateCount % 2 == 1 && matchOptions_1.flipNegate);
        // set nonegate - brace expansion could result in a leading '!'
        matchOptions_1.nonegate = true;
        matchOptions_1.flipNegate = false;
        // expand braces - required to accurately interpret findPath
        var expanded = void 0;
        var preExpanded = pattern;
        if (matchOptions_1.nobrace) {
            expanded = [pattern];
        }
        else {
            // convert slashes on Windows before calling braceExpand(). unfortunately this means braces cannot
            // be escaped on Windows, this limitation is consistent with current limitations of minimatch (3.0.3).
            exports.debug('expanding braces');
            var convertedPattern = process.platform == 'win32' ? pattern.replace(/\\/g, '/') : pattern;
            expanded = minimatch.braceExpand(convertedPattern);
        }
        // set nobrace
        matchOptions_1.nobrace = true;
        for (var _b = 0, expanded_2 = expanded; _b < expanded_2.length; _b++) {
            var pattern_2 = expanded_2[_b];
            if (expanded.length != 1 || pattern_2 != preExpanded) {
                exports.debug("pattern: '" + pattern_2 + "'");
            }
            // trim and skip empty
            pattern_2 = (pattern_2 || '').trim();
            if (!pattern_2) {
                exports.debug('skipping empty pattern');
                continue;
            }
            if (isIncludePattern) {
                // determine the findPath
                var findInfo = im._getFindInfoFromPattern(defaultRoot, pattern_2, matchOptions_1);
                var findPath = findInfo.findPath;
                exports.debug("findPath: '" + findPath + "'");
                if (!findPath) {
                    exports.debug('skipping empty path');
                    continue;
                }
                // perform the find
                exports.debug("statOnly: '" + findInfo.statOnly + "'");
                var findResults = [];
                if (findInfo.statOnly) {
                    // simply stat the path - all path segments were used to build the path
                    try {
                        fs.statSync(findPath);
                        findResults.push(findPath);
                    }
                    catch (err) {
                        if (err.code != 'ENOENT') {
                            throw err;
                        }
                        exports.debug('ENOENT');
                    }
                }
                else {
                    findResults = find(findPath, findOptions);
                }
                exports.debug("found " + findResults.length + " paths");
                // apply the pattern
                exports.debug('applying include pattern');
                if (findInfo.adjustedPattern != pattern_2) {
                    exports.debug("adjustedPattern: '" + findInfo.adjustedPattern + "'");
                    pattern_2 = findInfo.adjustedPattern;
                }
                var matchResults = minimatch.match(findResults, pattern_2, matchOptions_1);
                exports.debug(matchResults.length + ' matches');
                // union the results
                for (var _c = 0, matchResults_3 = matchResults; _c < matchResults_3.length; _c++) {
                    var matchResult = matchResults_3[_c];
                    var key = process.platform == 'win32' ? matchResult.toUpperCase() : matchResult;
                    results[key] = matchResult;
                }
            }
            else {
                // check if basename only and matchBase=true
                if (matchOptions_1.matchBase &&
                    !im._isRooted(pattern_2) &&
                    (process.platform == 'win32' ? pattern_2.replace(/\\/g, '/') : pattern_2).indexOf('/') < 0) {
                    // do not root the pattern
                    exports.debug('matchBase and basename only');
                }
                else {
                    // root the exclude pattern
                    pattern_2 = im._ensurePatternRooted(defaultRoot, pattern_2);
                    exports.debug("after ensurePatternRooted, pattern: '" + pattern_2 + "'");
                }
                // apply the pattern
                exports.debug('applying exclude pattern');
                var matchResults = minimatch.match(Object.keys(results).map(function (key) { return results[key]; }), pattern_2, matchOptions_1);
                exports.debug(matchResults.length + ' matches');
                // substract the results
                for (var _d = 0, matchResults_4 = matchResults; _d < matchResults_4.length; _d++) {
                    var matchResult = matchResults_4[_d];
                    var key = process.platform == 'win32' ? matchResult.toUpperCase() : matchResult;
                    delete results[key];
                }
            }
        }
    }
    var finalResult = Object.keys(results)
        .map(function (key) { return results[key]; })
        .sort();
    exports.debug(finalResult.length + ' final results');
    return finalResult;
}
exports.findMatch = findMatch;
/**
 * Gets http proxy configuration used by Build/Release agent
 *
 * @return  ProxyConfiguration
 */
function getHttpProxyConfiguration(requestUrl) {
    var proxyUrl = exports.getVariable('Agent.ProxyUrl');
    if (proxyUrl && proxyUrl.length > 0) {
        var proxyUsername = exports.getVariable('Agent.ProxyUsername');
        var proxyPassword = exports.getVariable('Agent.ProxyPassword');
        var proxyBypassHosts = JSON.parse(exports.getVariable('Agent.ProxyBypassList') || '[]');
        var bypass_1 = false;
        if (requestUrl) {
            proxyBypassHosts.forEach(function (bypassHost) {
                if (new RegExp(bypassHost, 'i').test(requestUrl)) {
                    bypass_1 = true;
                }
            });
        }
        if (bypass_1) {
            return null;
        }
        else {
            return {
                proxyUrl: proxyUrl,
                proxyUsername: proxyUsername,
                proxyPassword: proxyPassword,
                proxyBypassHosts: proxyBypassHosts
            };
        }
    }
    else {
        return null;
    }
}
exports.getHttpProxyConfiguration = getHttpProxyConfiguration;
/**
 * Gets http certificate configuration used by Build/Release agent
 *
 * @return  CertConfiguration
 */
function getHttpCertConfiguration() {
    var ca = exports.getVariable('Agent.CAInfo');
    var clientCert = exports.getVariable('Agent.ClientCert');
    if (ca || clientCert) {
        var certConfig = {};
        certConfig.caFile = ca;
        certConfig.certFile = clientCert;
        if (clientCert) {
            var clientCertKey = exports.getVariable('Agent.ClientCertKey');
            var clientCertArchive = exports.getVariable('Agent.ClientCertArchive');
            var clientCertPassword = exports.getVariable('Agent.ClientCertPassword');
            certConfig.keyFile = clientCertKey;
            certConfig.certArchiveFile = clientCertArchive;
            certConfig.passphrase = clientCertPassword;
        }
        return certConfig;
    }
    else {
        return null;
    }
}
exports.getHttpCertConfiguration = getHttpCertConfiguration;
//-----------------------------------------------------
// Test Publisher
//-----------------------------------------------------
var TestPublisher = /** @class */ (function () {
    function TestPublisher(testRunner) {
        this.testRunner = testRunner;
    }
    TestPublisher.prototype.publish = function (resultFiles, mergeResults, platform, config, runTitle, publishRunAttachments, testRunSystem) {
        // Could have used an initializer, but wanted to avoid reordering parameters when converting to strict null checks
        // (A parameter cannot both be optional and have an initializer)
        testRunSystem = testRunSystem || "VSTSTask";
        var properties = {};
        properties['type'] = this.testRunner;
        if (mergeResults) {
            properties['mergeResults'] = mergeResults;
        }
        if (platform) {
            properties['platform'] = platform;
        }
        if (config) {
            properties['config'] = config;
        }
        if (runTitle) {
            properties['runTitle'] = runTitle;
        }
        if (publishRunAttachments) {
            properties['publishRunAttachments'] = publishRunAttachments;
        }
        if (resultFiles) {
            properties['resultFiles'] = Array.isArray(resultFiles) ? resultFiles.join() : resultFiles;
        }
        properties['testRunSystem'] = testRunSystem;
        exports.command('results.publish', properties, '');
    };
    return TestPublisher;
}());
exports.TestPublisher = TestPublisher;
//-----------------------------------------------------
// Code coverage Publisher
//-----------------------------------------------------
var CodeCoveragePublisher = /** @class */ (function () {
    function CodeCoveragePublisher() {
    }
    CodeCoveragePublisher.prototype.publish = function (codeCoverageTool, summaryFileLocation, reportDirectory, additionalCodeCoverageFiles) {
        var properties = {};
        if (codeCoverageTool) {
            properties['codecoveragetool'] = codeCoverageTool;
        }
        if (summaryFileLocation) {
            properties['summaryfile'] = summaryFileLocation;
        }
        if (reportDirectory) {
            properties['reportdirectory'] = reportDirectory;
        }
        if (additionalCodeCoverageFiles) {
            properties['additionalcodecoveragefiles'] = Array.isArray(additionalCodeCoverageFiles) ? additionalCodeCoverageFiles.join() : additionalCodeCoverageFiles;
        }
        exports.command('codecoverage.publish', properties, "");
    };
    return CodeCoveragePublisher;
}());
exports.CodeCoveragePublisher = CodeCoveragePublisher;
//-----------------------------------------------------
// Code coverage Publisher
//-----------------------------------------------------
var CodeCoverageEnabler = /** @class */ (function () {
    function CodeCoverageEnabler(buildTool, ccTool) {
        this.buildTool = buildTool;
        this.ccTool = ccTool;
    }
    CodeCoverageEnabler.prototype.enableCodeCoverage = function (buildProps) {
        buildProps['buildtool'] = this.buildTool;
        buildProps['codecoveragetool'] = this.ccTool;
        exports.command('codecoverage.enable', buildProps, "");
    };
    return CodeCoverageEnabler;
}());
exports.CodeCoverageEnabler = CodeCoverageEnabler;
//-----------------------------------------------------
// Task Logging Commands
//-----------------------------------------------------
/**
 * Upload user interested file as additional log information
 * to the current timeline record.
 *
 * The file shall be available for download along with task logs.
 *
 * @param path      Path to the file that should be uploaded.
 * @returns         void
 */
function uploadFile(path) {
    exports.command("task.uploadfile", null, path);
}
exports.uploadFile = uploadFile;
/**
 * Instruction for the agent to update the PATH environment variable.
 * The specified directory is prepended to the PATH.
 * The updated environment variable will be reflected in subsequent tasks.
 *
 * @param path      Local directory path.
 * @returns         void
 */
function prependPath(path) {
    assertAgent("2.115.0");
    exports.command("task.prependpath", null, path);
}
exports.prependPath = prependPath;
/**
 * Upload and attach summary markdown to current timeline record.
 * This summary shall be added to the build/release summary and
 * not available for download with logs.
 *
 * @param path      Local directory path.
 * @returns         void
 */
function uploadSummary(path) {
    exports.command("task.uploadsummary", null, path);
}
exports.uploadSummary = uploadSummary;
/**
 * Upload and attach attachment to current timeline record.
 * These files are not available for download with logs.
 * These can only be referred to by extensions using the type or name values.
 *
 * @param type      Attachment type.
 * @param name      Attachment name.
 * @param path      Attachment path.
 * @returns         void
 */
function addAttachment(type, name, path) {
    exports.command("task.addattachment", { "type": type, "name": name }, path);
}
exports.addAttachment = addAttachment;
/**
 * Set an endpoint field with given value.
 * Value updated will be retained in the endpoint for
 * the subsequent tasks that execute within the same job.
 *
 * @param id      Endpoint id.
 * @param field   FieldType enum of AuthParameter, DataParameter or Url.
 * @param key     Key.
 * @param value   Value for key or url.
 * @returns       void
 */
function setEndpoint(id, field, key, value) {
    exports.command("task.setendpoint", { "id": id, "field": FieldType[field].toLowerCase(), "key": key }, value);
}
exports.setEndpoint = setEndpoint;
/**
 * Set progress and current operation for current task.
 *
 * @param percent           Percentage of completion.
 * @param currentOperation  Current pperation.
 * @returns                 void
 */
function setProgress(percent, currentOperation) {
    exports.command("task.setprogress", { "value": "" + percent }, currentOperation);
}
exports.setProgress = setProgress;
/**
 * Indicates whether to write the logging command directly to the host or to the output pipeline.
 *
 * @param id            Timeline record Guid.
 * @param parentId      Parent timeline record Guid.
 * @param recordType    Record type.
 * @param recordName    Record name.
 * @param order         Order of timeline record.
 * @param startTime     Start time.
 * @param finishTime    End time.
 * @param progress      Percentage of completion.
 * @param state         TaskState enum of Unknown, Initialized, InProgress or Completed.
 * @param result        TaskResult enum of Succeeded, SucceededWithIssues, Failed, Cancelled or Skipped.
 * @param message       current operation
 * @returns             void
 */
function logDetail(id, message, parentId, recordType, recordName, order, startTime, finishTime, progress, state, result) {
    var properties = {
        "id": id,
        "parentid": parentId,
        "type": recordType,
        "name": recordName,
        "order": order ? order.toString() : undefined,
        "starttime": startTime,
        "finishtime": finishTime,
        "progress": progress ? progress.toString() : undefined,
        "state": state ? TaskState[state] : undefined,
        "result": result ? TaskResult[result] : undefined
    };
    exports.command("task.logdetail", properties, message);
}
exports.logDetail = logDetail;
/**
 * Log error or warning issue to timeline record of current task.
 *
 * @param type          IssueType enum of Error or Warning.
 * @param sourcePath    Source file location.
 * @param lineNumber    Line number.
 * @param columnNumber  Column number.
 * @param code          Error or warning code.
 * @param message       Error or warning message.
 * @returns             void
 */
function logIssue(type, message, sourcePath, lineNumber, columnNumber, errorCode) {
    var properties = {
        "type": IssueType[type].toLowerCase(),
        "code": errorCode,
        "sourcepath": sourcePath,
        "linenumber": lineNumber ? lineNumber.toString() : undefined,
        "columnnumber": columnNumber ? columnNumber.toString() : undefined,
    };
    exports.command("task.logissue", properties, message);
}
exports.logIssue = logIssue;
//-----------------------------------------------------
// Artifact Logging Commands
//-----------------------------------------------------
/**
 * Upload user interested file as additional log information
 * to the current timeline record.
 *
 * The file shall be available for download along with task logs.
 *
 * @param containerFolder   Folder that the file will upload to, folder will be created if needed.
 * @param path              Path to the file that should be uploaded.
 * @param name              Artifact name.
 * @returns                 void
 */
function uploadArtifact(containerFolder, path, name) {
    exports.command("artifact.upload", { "containerfolder": containerFolder, "artifactname": name }, path);
}
exports.uploadArtifact = uploadArtifact;
/**
 * Create an artifact link, artifact location is required to be
 * a file container path, VC path or UNC share path.
 *
 * The file shall be available for download along with task logs.
 *
 * @param name              Artifact name.
 * @param path              Path to the file that should be associated.
 * @param artifactType      ArtifactType enum of Container, FilePath, VersionControl, GitRef or TfvcLabel.
 * @returns                 void
 */
function associateArtifact(name, path, artifactType) {
    exports.command("artifact.associate", { "type": ArtifactType[artifactType].toLowerCase(), "artifactname": name }, path);
}
exports.associateArtifact = associateArtifact;
//-----------------------------------------------------
// Build Logging Commands
//-----------------------------------------------------
/**
 * Upload user interested log to build’s container “logs\tool” folder.
 *
 * @param path      Path to the file that should be uploaded.
 * @returns         void
 */
function uploadBuildLog(path) {
    exports.command("build.uploadlog", null, path);
}
exports.uploadBuildLog = uploadBuildLog;
/**
 * Update build number for current build.
 *
 * @param value     Value to be assigned as the build number.
 * @returns         void
 */
function updateBuildNumber(value) {
    exports.command("build.updatebuildnumber", null, value);
}
exports.updateBuildNumber = updateBuildNumber;
/**
 * Add a tag for current build.
 *
 * @param value     Tag value.
 * @returns         void
 */
function addBuildTag(value) {
    exports.command("build.addbuildtag", null, value);
}
exports.addBuildTag = addBuildTag;
//-----------------------------------------------------
// Release Logging Commands
//-----------------------------------------------------
/**
 * Update release name for current release.
 *
 * @param value     Value to be assigned as the release name.
 * @returns         void
 */
function updateReleaseName(name) {
    assertAgent("2.132");
    exports.command("release.updatereleasename", null, name);
}
exports.updateReleaseName = updateReleaseName;
//-----------------------------------------------------
// Tools
//-----------------------------------------------------
exports.TaskCommand = tcm.TaskCommand;
exports.commandFromString = tcm.commandFromString;
exports.ToolRunner = trm.ToolRunner;
//-----------------------------------------------------
// Validation Checks
//-----------------------------------------------------
// async await needs generators in node 4.x+
if (semver.lt(process.versions.node, '4.2.0')) {
    exports.warning('Tasks require a new agent.  Upgrade your agent or node to 4.2.0 or later');
}
//-------------------------------------------------------------------
// Populate the vault with sensitive data.  Inputs and Endpoints
//-------------------------------------------------------------------
// avoid loading twice (overwrites .taskkey)
if (!global['_vsts_task_lib_loaded']) {
    im._loadData();
    im._exposeProxySettings();
    im._exposeCertSettings();
}


/***/ }),

/***/ 876:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.commandFromString = exports.TaskCommand = void 0;
//
// Command Format:
//    ##vso[artifact.command key=value;key=value]user message
//    
// Examples:
//    ##vso[task.progress value=58]
//    ##vso[task.issue type=warning;]This is the user warning message
//
var CMD_PREFIX = '##vso[';
var TaskCommand = /** @class */ (function () {
    function TaskCommand(command, properties, message) {
        if (!command) {
            command = 'missing.command';
        }
        this.command = command;
        this.properties = properties;
        this.message = message;
    }
    TaskCommand.prototype.toString = function () {
        var cmdStr = CMD_PREFIX + this.command;
        if (this.properties && Object.keys(this.properties).length > 0) {
            cmdStr += ' ';
            for (var key in this.properties) {
                if (this.properties.hasOwnProperty(key)) {
                    var val = this.properties[key];
                    if (val) {
                        // safely append the val - avoid blowing up when attempting to
                        // call .replace() if message is not a string for some reason
                        cmdStr += key + '=' + escape('' + (val || '')) + ';';
                    }
                }
            }
        }
        cmdStr += ']';
        // safely append the message - avoid blowing up when attempting to
        // call .replace() if message is not a string for some reason
        var message = '' + (this.message || '');
        cmdStr += escapedata(message);
        return cmdStr;
    };
    return TaskCommand;
}());
exports.TaskCommand = TaskCommand;
function commandFromString(commandLine) {
    var preLen = CMD_PREFIX.length;
    var lbPos = commandLine.indexOf('[');
    var rbPos = commandLine.indexOf(']');
    if (lbPos == -1 || rbPos == -1 || rbPos - lbPos < 3) {
        throw new Error('Invalid command brackets');
    }
    var cmdInfo = commandLine.substring(lbPos + 1, rbPos);
    var spaceIdx = cmdInfo.indexOf(' ');
    var command = cmdInfo;
    var properties = {};
    if (spaceIdx > 0) {
        command = cmdInfo.trim().substring(0, spaceIdx);
        var propSection = cmdInfo.trim().substring(spaceIdx + 1);
        var propLines = propSection.split(';');
        propLines.forEach(function (propLine) {
            propLine = propLine.trim();
            if (propLine.length > 0) {
                var eqIndex = propLine.indexOf('=');
                if (eqIndex == -1) {
                    throw new Error('Invalid property: ' + propLine);
                }
                var key = propLine.substring(0, eqIndex);
                var val = propLine.substring(eqIndex + 1);
                properties[key] = unescape(val);
            }
        });
    }
    var msg = unescapedata(commandLine.substring(rbPos + 1));
    var cmd = new TaskCommand(command, properties, msg);
    return cmd;
}
exports.commandFromString = commandFromString;
function escapedata(s) {
    return s.replace(/%/g, '%AZP25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A');
}
function unescapedata(s) {
    return s.replace(/%0D/g, '\r')
        .replace(/%0A/g, '\n')
        .replace(/%AZP25/g, '%');
}
function escape(s) {
    return s.replace(/%/g, '%AZP25')
        .replace(/\r/g, '%0D')
        .replace(/\n/g, '%0A')
        .replace(/]/g, '%5D')
        .replace(/;/g, '%3B');
}
function unescape(s) {
    return s.replace(/%0D/g, '\r')
        .replace(/%0A/g, '\n')
        .replace(/%5D/g, ']')
        .replace(/%3B/g, ';')
        .replace(/%AZP25/g, '%');
}


/***/ }),

/***/ 3342:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ToolRunner = void 0;
var Q = __nccwpck_require__(9096);
var os = __nccwpck_require__(2087);
var events = __nccwpck_require__(8614);
var child = __nccwpck_require__(3129);
var im = __nccwpck_require__(3402);
var fs = __nccwpck_require__(5747);
var ToolRunner = /** @class */ (function (_super) {
    __extends(ToolRunner, _super);
    function ToolRunner(toolPath) {
        var _this = _super.call(this) || this;
        _this.cmdSpecialChars = [' ', '\t', '&', '(', ')', '[', ']', '{', '}', '^', '=', ';', '!', '\'', '+', ',', '`', '~', '|', '<', '>', '"'];
        if (!toolPath) {
            throw new Error('Parameter \'toolPath\' cannot be null or empty.');
        }
        _this.toolPath = im._which(toolPath, true);
        _this.args = [];
        _this._debug('toolRunner toolPath: ' + toolPath);
        return _this;
    }
    ToolRunner.prototype._debug = function (message) {
        this.emit('debug', message);
    };
    ToolRunner.prototype._argStringToArray = function (argString) {
        var args = [];
        var inQuotes = false;
        var escaped = false;
        var lastCharWasSpace = true;
        var arg = '';
        var append = function (c) {
            // we only escape double quotes.
            if (escaped) {
                if (c !== '"') {
                    arg += '\\';
                }
                else {
                    arg.slice(0, -1);
                }
            }
            arg += c;
            escaped = false;
        };
        for (var i = 0; i < argString.length; i++) {
            var c = argString.charAt(i);
            if (c === ' ' && !inQuotes) {
                if (!lastCharWasSpace) {
                    args.push(arg);
                    arg = '';
                }
                lastCharWasSpace = true;
                continue;
            }
            else {
                lastCharWasSpace = false;
            }
            if (c === '"') {
                if (!escaped) {
                    inQuotes = !inQuotes;
                }
                else {
                    append(c);
                }
                continue;
            }
            if (c === "\\" && escaped) {
                append(c);
                continue;
            }
            if (c === "\\" && inQuotes) {
                escaped = true;
                continue;
            }
            append(c);
            lastCharWasSpace = false;
        }
        if (!lastCharWasSpace) {
            args.push(arg.trim());
        }
        return args;
    };
    ToolRunner.prototype._getCommandString = function (options, noPrefix) {
        var _this = this;
        var toolPath = this._getSpawnFileName();
        var args = this._getSpawnArgs(options);
        var cmd = noPrefix ? '' : '[command]'; // omit prefix when piped to a second tool
        var commandParts = [];
        if (process.platform == 'win32') {
            // Windows + cmd file
            if (this._isCmdFile()) {
                commandParts.push(toolPath);
                commandParts = commandParts.concat(args);
            }
            // Windows + verbatim
            else if (options.windowsVerbatimArguments) {
                commandParts.push("\"" + toolPath + "\"");
                commandParts = commandParts.concat(args);
            }
            else if (options.shell) {
                commandParts.push(this._windowsQuoteCmdArg(toolPath));
                commandParts = commandParts.concat(args);
            }
            // Windows (regular)
            else {
                commandParts.push(this._windowsQuoteCmdArg(toolPath));
                commandParts = commandParts.concat(args.map(function (arg) { return _this._windowsQuoteCmdArg(arg); }));
            }
        }
        else {
            // OSX/Linux - this can likely be improved with some form of quoting.
            // creating processes on Unix is fundamentally different than Windows.
            // on Unix, execvp() takes an arg array.
            commandParts.push(toolPath);
            commandParts = commandParts.concat(args);
        }
        cmd += commandParts.join(' ');
        // append second tool
        if (this.pipeOutputToTool) {
            cmd += ' | ' + this.pipeOutputToTool._getCommandString(options, /*noPrefix:*/ true);
        }
        return cmd;
    };
    ToolRunner.prototype._processLineBuffer = function (data, strBuffer, onLine) {
        try {
            var s = strBuffer + data.toString();
            var n = s.indexOf(os.EOL);
            while (n > -1) {
                var line = s.substring(0, n);
                onLine(line);
                // the rest of the string ...
                s = s.substring(n + os.EOL.length);
                n = s.indexOf(os.EOL);
            }
            strBuffer = s;
        }
        catch (err) {
            // streaming lines to console is best effort.  Don't fail a build.
            this._debug('error processing line');
        }
    };
    /**
     * Wraps an arg string with specified char if it's not already wrapped
     * @returns {string} Arg wrapped with specified char
     * @param {string} arg Input argument string
     * @param {string} wrapChar A char input string should be wrapped with
     */
    ToolRunner.prototype._wrapArg = function (arg, wrapChar) {
        if (!this._isWrapped(arg, wrapChar)) {
            return "" + wrapChar + arg + wrapChar;
        }
        return arg;
    };
    /**
     * Unwraps an arg string wrapped with specified char
     * @param arg Arg wrapped with specified char
     * @param wrapChar A char to be removed
     */
    ToolRunner.prototype._unwrapArg = function (arg, wrapChar) {
        if (this._isWrapped(arg, wrapChar)) {
            var pattern = new RegExp("(^\\\\?" + wrapChar + ")|(\\\\?" + wrapChar + "$)", 'g');
            return arg.trim().replace(pattern, '');
        }
        return arg;
    };
    /**
     * Determine if arg string is wrapped with specified char
     * @param arg Input arg string
     */
    ToolRunner.prototype._isWrapped = function (arg, wrapChar) {
        var pattern = new RegExp("^\\\\?" + wrapChar + ".+\\\\?" + wrapChar + "$");
        return pattern.test(arg.trim());
    };
    ToolRunner.prototype._getSpawnFileName = function (options) {
        if (process.platform == 'win32') {
            if (this._isCmdFile()) {
                return process.env['COMSPEC'] || 'cmd.exe';
            }
        }
        if (options && options.shell) {
            return this._wrapArg(this.toolPath, '"');
        }
        return this.toolPath;
    };
    ToolRunner.prototype._getSpawnArgs = function (options) {
        var _this = this;
        if (process.platform == 'win32') {
            if (this._isCmdFile()) {
                var argline = "/D /S /C \"" + this._windowsQuoteCmdArg(this.toolPath);
                for (var i = 0; i < this.args.length; i++) {
                    argline += ' ';
                    argline += options.windowsVerbatimArguments ? this.args[i] : this._windowsQuoteCmdArg(this.args[i]);
                }
                argline += '"';
                return [argline];
            }
            if (options.windowsVerbatimArguments) {
                // note, in Node 6.x options.argv0 can be used instead of overriding args.slice and args.unshift.
                // for more details, refer to https://github.com/nodejs/node/blob/v6.x/lib/child_process.js
                var args_1 = this.args.slice(0); // copy the array
                // override slice to prevent Node from creating a copy of the arg array.
                // we need Node to use the "unshift" override below.
                args_1.slice = function () {
                    if (arguments.length != 1 || arguments[0] != 0) {
                        throw new Error('Unexpected arguments passed to args.slice when windowsVerbatimArguments flag is set.');
                    }
                    return args_1;
                };
                // override unshift
                //
                // when using the windowsVerbatimArguments option, Node does not quote the tool path when building
                // the cmdline parameter for the win32 function CreateProcess(). an unquoted space in the tool path
                // causes problems for tools when attempting to parse their own command line args. tools typically
                // assume their arguments begin after arg 0.
                //
                // by hijacking unshift, we can quote the tool path when it pushed onto the args array. Node builds
                // the cmdline parameter from the args array.
                //
                // note, we can't simply pass a quoted tool path to Node for multiple reasons:
                //   1) Node verifies the file exists (calls win32 function GetFileAttributesW) and the check returns
                //      false if the path is quoted.
                //   2) Node passes the tool path as the application parameter to CreateProcess, which expects the
                //      path to be unquoted.
                //
                // also note, in addition to the tool path being embedded within the cmdline parameter, Node also
                // passes the tool path to CreateProcess via the application parameter (optional parameter). when
                // present, Windows uses the application parameter to determine which file to run, instead of
                // interpreting the file from the cmdline parameter.
                args_1.unshift = function () {
                    if (arguments.length != 1) {
                        throw new Error('Unexpected arguments passed to args.unshift when windowsVerbatimArguments flag is set.');
                    }
                    return Array.prototype.unshift.call(args_1, "\"" + arguments[0] + "\""); // quote the file name
                };
                return args_1;
            }
            else if (options.shell) {
                var args = [];
                for (var _i = 0, _a = this.args; _i < _a.length; _i++) {
                    var arg = _a[_i];
                    if (this._needQuotesForCmd(arg, '%')) {
                        args.push(this._wrapArg(arg, '"'));
                    }
                    else {
                        args.push(arg);
                    }
                }
                return args;
            }
        }
        else if (options.shell) {
            return this.args.map(function (arg) {
                if (_this._isWrapped(arg, "'")) {
                    return arg;
                }
                // remove wrapping double quotes to avoid escaping
                arg = _this._unwrapArg(arg, '"');
                arg = _this._escapeChar(arg, '"');
                return _this._wrapArg(arg, '"');
            });
        }
        return this.args;
    };
    /**
     * Escape specified character.
     * @param arg String to escape char in
     * @param charToEscape Char should be escaped
     */
    ToolRunner.prototype._escapeChar = function (arg, charToEscape) {
        var escChar = "\\";
        var output = '';
        var charIsEscaped = false;
        for (var _i = 0, arg_1 = arg; _i < arg_1.length; _i++) {
            var char = arg_1[_i];
            if (char === charToEscape && !charIsEscaped) {
                output += escChar + char;
            }
            else {
                output += char;
            }
            charIsEscaped = char === escChar && !charIsEscaped;
        }
        return output;
    };
    ToolRunner.prototype._isCmdFile = function () {
        var upperToolPath = this.toolPath.toUpperCase();
        return im._endsWith(upperToolPath, '.CMD') || im._endsWith(upperToolPath, '.BAT');
    };
    /**
     * Determine whether the cmd arg needs to be quoted. Returns true if arg contains any of special chars array.
     * @param arg The cmd command arg.
     * @param additionalChars Additional chars which should be also checked.
     */
    ToolRunner.prototype._needQuotesForCmd = function (arg, additionalChars) {
        var specialChars = this.cmdSpecialChars;
        if (additionalChars) {
            specialChars = this.cmdSpecialChars.concat(additionalChars);
        }
        var _loop_1 = function (char) {
            if (specialChars.some(function (x) { return x === char; })) {
                return { value: true };
            }
        };
        for (var _i = 0, arg_2 = arg; _i < arg_2.length; _i++) {
            var char = arg_2[_i];
            var state_1 = _loop_1(char);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        return false;
    };
    ToolRunner.prototype._windowsQuoteCmdArg = function (arg) {
        // for .exe, apply the normal quoting rules that libuv applies
        if (!this._isCmdFile()) {
            return this._uv_quote_cmd_arg(arg);
        }
        // otherwise apply quoting rules specific to the cmd.exe command line parser.
        // the libuv rules are generic and are not designed specifically for cmd.exe
        // command line parser.
        //
        // for a detailed description of the cmd.exe command line parser, refer to
        // http://stackoverflow.com/questions/4094699/how-does-the-windows-command-interpreter-cmd-exe-parse-scripts/7970912#7970912
        // need quotes for empty arg
        if (!arg) {
            return '""';
        }
        // determine whether the arg needs to be quoted
        var needsQuotes = this._needQuotesForCmd(arg);
        // short-circuit if quotes not needed
        if (!needsQuotes) {
            return arg;
        }
        // the following quoting rules are very similar to the rules that by libuv applies.
        //
        // 1) wrap the string in quotes
        //
        // 2) double-up quotes - i.e. " => ""
        //
        //    this is different from the libuv quoting rules. libuv replaces " with \", which unfortunately
        //    doesn't work well with a cmd.exe command line.
        //
        //    note, replacing " with "" also works well if the arg is passed to a downstream .NET console app.
        //    for example, the command line:
        //          foo.exe "myarg:""my val"""
        //    is parsed by a .NET console app into an arg array:
        //          [ "myarg:\"my val\"" ]
        //    which is the same end result when applying libuv quoting rules. although the actual
        //    command line from libuv quoting rules would look like:
        //          foo.exe "myarg:\"my val\""
        //
        // 3) double-up slashes that preceed a quote,
        //    e.g.  hello \world    => "hello \world"
        //          hello\"world    => "hello\\""world"
        //          hello\\"world   => "hello\\\\""world"
        //          hello world\    => "hello world\\"
        //
        //    technically this is not required for a cmd.exe command line, or the batch argument parser.
        //    the reasons for including this as a .cmd quoting rule are:
        //
        //    a) this is optimized for the scenario where the argument is passed from the .cmd file to an
        //       external program. many programs (e.g. .NET console apps) rely on the slash-doubling rule.
        //
        //    b) it's what we've been doing previously (by deferring to node default behavior) and we
        //       haven't heard any complaints about that aspect.
        //
        // note, a weakness of the quoting rules chosen here, is that % is not escaped. in fact, % cannot be
        // escaped when used on the command line directly - even though within a .cmd file % can be escaped
        // by using %%.
        //
        // the saving grace is, on the command line, %var% is left as-is if var is not defined. this contrasts
        // the line parsing rules within a .cmd file, where if var is not defined it is replaced with nothing.
        //
        // one option that was explored was replacing % with ^% - i.e. %var% => ^%var^%. this hack would
        // often work, since it is unlikely that var^ would exist, and the ^ character is removed when the
        // variable is used. the problem, however, is that ^ is not removed when %* is used to pass the args
        // to an external program.
        //
        // an unexplored potential solution for the % escaping problem, is to create a wrapper .cmd file.
        // % can be escaped within a .cmd file.
        var reverse = '"';
        var quote_hit = true;
        for (var i = arg.length; i > 0; i--) { // walk the string in reverse
            reverse += arg[i - 1];
            if (quote_hit && arg[i - 1] == '\\') {
                reverse += '\\'; // double the slash
            }
            else if (arg[i - 1] == '"') {
                quote_hit = true;
                reverse += '"'; // double the quote
            }
            else {
                quote_hit = false;
            }
        }
        reverse += '"';
        return reverse.split('').reverse().join('');
    };
    ToolRunner.prototype._uv_quote_cmd_arg = function (arg) {
        // Tool runner wraps child_process.spawn() and needs to apply the same quoting as
        // Node in certain cases where the undocumented spawn option windowsVerbatimArguments
        // is used.
        //
        // Since this function is a port of quote_cmd_arg from Node 4.x (technically, lib UV,
        // see https://github.com/nodejs/node/blob/v4.x/deps/uv/src/win/process.c for details),
        // pasting copyright notice from Node within this function:
        //
        //      Copyright Joyent, Inc. and other Node contributors. All rights reserved.
        //
        //      Permission is hereby granted, free of charge, to any person obtaining a copy
        //      of this software and associated documentation files (the "Software"), to
        //      deal in the Software without restriction, including without limitation the
        //      rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
        //      sell copies of the Software, and to permit persons to whom the Software is
        //      furnished to do so, subject to the following conditions:
        //
        //      The above copyright notice and this permission notice shall be included in
        //      all copies or substantial portions of the Software.
        //
        //      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
        //      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
        //      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
        //      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
        //      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
        //      FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
        //      IN THE SOFTWARE.
        if (!arg) {
            // Need double quotation for empty argument
            return '""';
        }
        if (arg.indexOf(' ') < 0 && arg.indexOf('\t') < 0 && arg.indexOf('"') < 0) {
            // No quotation needed
            return arg;
        }
        if (arg.indexOf('"') < 0 && arg.indexOf('\\') < 0) {
            // No embedded double quotes or backslashes, so I can just wrap
            // quote marks around the whole thing.
            return "\"" + arg + "\"";
        }
        // Expected input/output:
        //   input : hello"world
        //   output: "hello\"world"
        //   input : hello""world
        //   output: "hello\"\"world"
        //   input : hello\world
        //   output: hello\world
        //   input : hello\\world
        //   output: hello\\world
        //   input : hello\"world
        //   output: "hello\\\"world"
        //   input : hello\\"world
        //   output: "hello\\\\\"world"
        //   input : hello world\
        //   output: "hello world\\" - note the comment in libuv actually reads "hello world\"
        //                             but it appears the comment is wrong, it should be "hello world\\"
        var reverse = '"';
        var quote_hit = true;
        for (var i = arg.length; i > 0; i--) { // walk the string in reverse
            reverse += arg[i - 1];
            if (quote_hit && arg[i - 1] == '\\') {
                reverse += '\\';
            }
            else if (arg[i - 1] == '"') {
                quote_hit = true;
                reverse += '\\';
            }
            else {
                quote_hit = false;
            }
        }
        reverse += '"';
        return reverse.split('').reverse().join('');
    };
    ToolRunner.prototype._cloneExecOptions = function (options) {
        options = options || {};
        var result = {
            cwd: options.cwd || process.cwd(),
            env: options.env || process.env,
            silent: options.silent || false,
            failOnStdErr: options.failOnStdErr || false,
            ignoreReturnCode: options.ignoreReturnCode || false,
            windowsVerbatimArguments: options.windowsVerbatimArguments || false,
            shell: options.shell || false
        };
        result.outStream = options.outStream || process.stdout;
        result.errStream = options.errStream || process.stderr;
        return result;
    };
    ToolRunner.prototype._getSpawnOptions = function (options) {
        options = options || {};
        var result = {};
        result.cwd = options.cwd;
        result.env = options.env;
        result.shell = options.shell;
        result['windowsVerbatimArguments'] = options.windowsVerbatimArguments || this._isCmdFile();
        return result;
    };
    ToolRunner.prototype._getSpawnSyncOptions = function (options) {
        var result = {};
        result.cwd = options.cwd;
        result.env = options.env;
        result.shell = options.shell;
        result['windowsVerbatimArguments'] = options.windowsVerbatimArguments || this._isCmdFile();
        return result;
    };
    ToolRunner.prototype.execWithPiping = function (pipeOutputToTool, options) {
        var _this = this;
        var _a, _b, _c, _d;
        var defer = Q.defer();
        this._debug('exec tool: ' + this.toolPath);
        this._debug('arguments:');
        this.args.forEach(function (arg) {
            _this._debug('   ' + arg);
        });
        var success = true;
        var optionsNonNull = this._cloneExecOptions(options);
        if (!optionsNonNull.silent) {
            optionsNonNull.outStream.write(this._getCommandString(optionsNonNull) + os.EOL);
        }
        var cp;
        var toolPath = pipeOutputToTool.toolPath;
        var toolPathFirst;
        var successFirst = true;
        var returnCodeFirst;
        var fileStream;
        var waitingEvents = 0; // number of process or stream events we are waiting on to complete
        var returnCode = 0;
        var error;
        toolPathFirst = this.toolPath;
        // Following node documentation example from this link on how to pipe output of one process to another
        // https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
        //start the child process for both tools
        waitingEvents++;
        var cpFirst = child.spawn(this._getSpawnFileName(optionsNonNull), this._getSpawnArgs(optionsNonNull), this._getSpawnOptions(optionsNonNull));
        waitingEvents++;
        cp = child.spawn(pipeOutputToTool._getSpawnFileName(optionsNonNull), pipeOutputToTool._getSpawnArgs(optionsNonNull), pipeOutputToTool._getSpawnOptions(optionsNonNull));
        fileStream = this.pipeOutputToFile ? fs.createWriteStream(this.pipeOutputToFile) : null;
        if (fileStream) {
            waitingEvents++;
            fileStream.on('finish', function () {
                waitingEvents--; //file write is complete
                fileStream = null;
                if (waitingEvents == 0) {
                    if (error) {
                        defer.reject(error);
                    }
                    else {
                        defer.resolve(returnCode);
                    }
                }
            });
            fileStream.on('error', function (err) {
                waitingEvents--; //there were errors writing to the file, write is done
                _this._debug("Failed to pipe output of " + toolPathFirst + " to file " + _this.pipeOutputToFile + ". Error = " + err);
                fileStream = null;
                if (waitingEvents == 0) {
                    if (error) {
                        defer.reject(error);
                    }
                    else {
                        defer.resolve(returnCode);
                    }
                }
            });
        }
        //pipe stdout of first tool to stdin of second tool
        (_a = cpFirst.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
            var _a;
            try {
                if (fileStream) {
                    fileStream.write(data);
                }
                (_a = cp.stdin) === null || _a === void 0 ? void 0 : _a.write(data);
            }
            catch (err) {
                _this._debug('Failed to pipe output of ' + toolPathFirst + ' to ' + toolPath);
                _this._debug(toolPath + ' might have exited due to errors prematurely. Verify the arguments passed are valid.');
            }
        });
        (_b = cpFirst.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
            if (fileStream) {
                fileStream.write(data);
            }
            successFirst = !optionsNonNull.failOnStdErr;
            if (!optionsNonNull.silent) {
                var s = optionsNonNull.failOnStdErr ? optionsNonNull.errStream : optionsNonNull.outStream;
                s.write(data);
            }
        });
        cpFirst.on('error', function (err) {
            var _a;
            waitingEvents--; //first process is complete with errors
            if (fileStream) {
                fileStream.end();
            }
            (_a = cp.stdin) === null || _a === void 0 ? void 0 : _a.end();
            error = new Error(toolPathFirst + ' failed. ' + err.message);
            if (waitingEvents == 0) {
                defer.reject(error);
            }
        });
        cpFirst.on('close', function (code, signal) {
            var _a;
            waitingEvents--; //first process is complete
            if (code != 0 && !optionsNonNull.ignoreReturnCode) {
                successFirst = false;
                returnCodeFirst = code;
                returnCode = returnCodeFirst;
            }
            _this._debug('success of first tool:' + successFirst);
            if (fileStream) {
                fileStream.end();
            }
            (_a = cp.stdin) === null || _a === void 0 ? void 0 : _a.end();
            if (waitingEvents == 0) {
                if (error) {
                    defer.reject(error);
                }
                else {
                    defer.resolve(returnCode);
                }
            }
        });
        var stdbuffer = '';
        (_c = cp.stdout) === null || _c === void 0 ? void 0 : _c.on('data', function (data) {
            _this.emit('stdout', data);
            if (!optionsNonNull.silent) {
                optionsNonNull.outStream.write(data);
            }
            _this._processLineBuffer(data, stdbuffer, function (line) {
                _this.emit('stdline', line);
            });
        });
        var errbuffer = '';
        (_d = cp.stderr) === null || _d === void 0 ? void 0 : _d.on('data', function (data) {
            _this.emit('stderr', data);
            success = !optionsNonNull.failOnStdErr;
            if (!optionsNonNull.silent) {
                var s = optionsNonNull.failOnStdErr ? optionsNonNull.errStream : optionsNonNull.outStream;
                s.write(data);
            }
            _this._processLineBuffer(data, errbuffer, function (line) {
                _this.emit('errline', line);
            });
        });
        cp.on('error', function (err) {
            waitingEvents--; //process is done with errors
            error = new Error(toolPath + ' failed. ' + err.message);
            if (waitingEvents == 0) {
                defer.reject(error);
            }
        });
        cp.on('close', function (code, signal) {
            waitingEvents--; //process is complete
            _this._debug('rc:' + code);
            returnCode = code;
            if (stdbuffer.length > 0) {
                _this.emit('stdline', stdbuffer);
            }
            if (errbuffer.length > 0) {
                _this.emit('errline', errbuffer);
            }
            if (code != 0 && !optionsNonNull.ignoreReturnCode) {
                success = false;
            }
            _this._debug('success:' + success);
            if (!successFirst) { //in the case output is piped to another tool, check exit code of both tools
                error = new Error(toolPathFirst + ' failed with return code: ' + returnCodeFirst);
            }
            else if (!success) {
                error = new Error(toolPath + ' failed with return code: ' + code);
            }
            if (waitingEvents == 0) {
                if (error) {
                    defer.reject(error);
                }
                else {
                    defer.resolve(returnCode);
                }
            }
        });
        return defer.promise;
    };
    /**
     * Add argument
     * Append an argument or an array of arguments
     * returns ToolRunner for chaining
     *
     * @param     val        string cmdline or array of strings
     * @returns   ToolRunner
     */
    ToolRunner.prototype.arg = function (val) {
        if (!val) {
            return this;
        }
        if (val instanceof Array) {
            this._debug(this.toolPath + ' arg: ' + JSON.stringify(val));
            this.args = this.args.concat(val);
        }
        else if (typeof (val) === 'string') {
            this._debug(this.toolPath + ' arg: ' + val);
            this.args = this.args.concat(val.trim());
        }
        return this;
    };
    /**
     * Parses an argument line into one or more arguments
     * e.g. .line('"arg one" two -z') is equivalent to .arg(['arg one', 'two', '-z'])
     * returns ToolRunner for chaining
     *
     * @param     val        string argument line
     * @returns   ToolRunner
     */
    ToolRunner.prototype.line = function (val) {
        if (!val) {
            return this;
        }
        this._debug(this.toolPath + ' arg: ' + val);
        this.args = this.args.concat(this._argStringToArray(val));
        return this;
    };
    /**
     * Add argument(s) if a condition is met
     * Wraps arg().  See arg for details
     * returns ToolRunner for chaining
     *
     * @param     condition     boolean condition
     * @param     val     string cmdline or array of strings
     * @returns   ToolRunner
     */
    ToolRunner.prototype.argIf = function (condition, val) {
        if (condition) {
            this.arg(val);
        }
        return this;
    };
    /**
     * Pipe output of exec() to another tool
     * @param tool
     * @param file  optional filename to additionally stream the output to.
     * @returns {ToolRunner}
     */
    ToolRunner.prototype.pipeExecOutputToTool = function (tool, file) {
        this.pipeOutputToTool = tool;
        this.pipeOutputToFile = file;
        return this;
    };
    /**
     * Exec a tool.
     * Output will be streamed to the live console.
     * Returns promise with return code
     *
     * @param     tool     path to tool to exec
     * @param     options  optional exec options.  See IExecOptions
     * @returns   number
     */
    ToolRunner.prototype.exec = function (options) {
        var _this = this;
        var _a, _b, _c;
        if (this.pipeOutputToTool) {
            return this.execWithPiping(this.pipeOutputToTool, options);
        }
        var defer = Q.defer();
        this._debug('exec tool: ' + this.toolPath);
        this._debug('arguments:');
        this.args.forEach(function (arg) {
            _this._debug('   ' + arg);
        });
        var optionsNonNull = this._cloneExecOptions(options);
        if (!optionsNonNull.silent) {
            optionsNonNull.outStream.write(this._getCommandString(optionsNonNull) + os.EOL);
        }
        var state = new ExecState(optionsNonNull, this.toolPath);
        state.on('debug', function (message) {
            _this._debug(message);
        });
        var cp = child.spawn(this._getSpawnFileName(options), this._getSpawnArgs(optionsNonNull), this._getSpawnOptions(options));
        this.childProcess = cp;
        // it is possible for the child process to end its last line without a new line.
        // because stdout is buffered, this causes the last line to not get sent to the parent
        // stream. Adding this event forces a flush before the child streams are closed.
        (_a = cp.stdout) === null || _a === void 0 ? void 0 : _a.on('finish', function () {
            if (!optionsNonNull.silent) {
                optionsNonNull.outStream.write(os.EOL);
            }
        });
        var stdbuffer = '';
        (_b = cp.stdout) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
            _this.emit('stdout', data);
            if (!optionsNonNull.silent) {
                optionsNonNull.outStream.write(data);
            }
            _this._processLineBuffer(data, stdbuffer, function (line) {
                _this.emit('stdline', line);
            });
        });
        var errbuffer = '';
        (_c = cp.stderr) === null || _c === void 0 ? void 0 : _c.on('data', function (data) {
            state.processStderr = true;
            _this.emit('stderr', data);
            if (!optionsNonNull.silent) {
                var s = optionsNonNull.failOnStdErr ? optionsNonNull.errStream : optionsNonNull.outStream;
                s.write(data);
            }
            _this._processLineBuffer(data, errbuffer, function (line) {
                _this.emit('errline', line);
            });
        });
        cp.on('error', function (err) {
            state.processError = err.message;
            state.processExited = true;
            state.processClosed = true;
            state.CheckComplete();
        });
        cp.on('exit', function (code, signal) {
            state.processExitCode = code;
            state.processExited = true;
            _this._debug("Exit code " + code + " received from tool '" + _this.toolPath + "'");
            state.CheckComplete();
        });
        cp.on('close', function (code, signal) {
            state.processExitCode = code;
            state.processExited = true;
            state.processClosed = true;
            _this._debug("STDIO streams have closed for tool '" + _this.toolPath + "'");
            state.CheckComplete();
        });
        state.on('done', function (error, exitCode) {
            if (stdbuffer.length > 0) {
                _this.emit('stdline', stdbuffer);
            }
            if (errbuffer.length > 0) {
                _this.emit('errline', errbuffer);
            }
            cp.removeAllListeners();
            if (error) {
                defer.reject(error);
            }
            else {
                defer.resolve(exitCode);
            }
        });
        return defer.promise;
    };
    /**
     * Exec a tool synchronously.
     * Output will be *not* be streamed to the live console.  It will be returned after execution is complete.
     * Appropriate for short running tools
     * Returns IExecSyncResult with output and return code
     *
     * @param     tool     path to tool to exec
     * @param     options  optional exec options.  See IExecSyncOptions
     * @returns   IExecSyncResult
     */
    ToolRunner.prototype.execSync = function (options) {
        var _this = this;
        this._debug('exec tool: ' + this.toolPath);
        this._debug('arguments:');
        this.args.forEach(function (arg) {
            _this._debug('   ' + arg);
        });
        var success = true;
        options = this._cloneExecOptions(options);
        if (!options.silent) {
            options.outStream.write(this._getCommandString(options) + os.EOL);
        }
        var r = child.spawnSync(this._getSpawnFileName(options), this._getSpawnArgs(options), this._getSpawnSyncOptions(options));
        if (!options.silent && r.stdout && r.stdout.length > 0) {
            options.outStream.write(r.stdout);
        }
        if (!options.silent && r.stderr && r.stderr.length > 0) {
            options.errStream.write(r.stderr);
        }
        var res = { code: r.status, error: r.error };
        res.stdout = (r.stdout) ? r.stdout.toString() : '';
        res.stderr = (r.stderr) ? r.stderr.toString() : '';
        return res;
    };
    /**
     * Used to close child process by sending SIGNINT signal.
     * It allows executed script to have some additional logic on SIGINT, before exiting.
     */
    ToolRunner.prototype.killChildProcess = function () {
        if (this.childProcess) {
            this.childProcess.kill();
        }
    };
    return ToolRunner;
}(events.EventEmitter));
exports.ToolRunner = ToolRunner;
var ExecState = /** @class */ (function (_super) {
    __extends(ExecState, _super);
    function ExecState(options, toolPath) {
        var _this = _super.call(this) || this;
        _this.delay = 10000; // 10 seconds
        _this.timeout = null;
        if (!toolPath) {
            throw new Error('toolPath must not be empty');
        }
        _this.options = options;
        _this.toolPath = toolPath;
        var delay = process.env['TASKLIB_TEST_TOOLRUNNER_EXITDELAY'];
        if (delay) {
            _this.delay = parseInt(delay);
        }
        return _this;
    }
    ExecState.prototype.CheckComplete = function () {
        if (this.done) {
            return;
        }
        if (this.processClosed) {
            this._setResult();
        }
        else if (this.processExited) {
            this.timeout = setTimeout(ExecState.HandleTimeout, this.delay, this);
        }
    };
    ExecState.prototype._debug = function (message) {
        this.emit('debug', message);
    };
    ExecState.prototype._setResult = function () {
        // determine whether there is an error
        var error;
        if (this.processExited) {
            if (this.processError) {
                error = new Error(im._loc('LIB_ProcessError', this.toolPath, this.processError));
            }
            else if (this.processExitCode != 0 && !this.options.ignoreReturnCode) {
                error = new Error(im._loc('LIB_ProcessExitCode', this.toolPath, this.processExitCode));
            }
            else if (this.processStderr && this.options.failOnStdErr) {
                error = new Error(im._loc('LIB_ProcessStderr', this.toolPath));
            }
        }
        // clear the timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.done = true;
        this.emit('done', error, this.processExitCode);
    };
    ExecState.HandleTimeout = function (state) {
        if (state.done) {
            return;
        }
        if (!state.processClosed && state.processExited) {
            console.log(im._loc('LIB_StdioNotClosed', state.delay / 1000, state.toolPath));
            state._debug(im._loc('LIB_StdioNotClosed', state.delay / 1000, state.toolPath));
        }
        state._setResult();
    };
    return ExecState;
}(events.EventEmitter));


/***/ }),

/***/ 9:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Vault = void 0;
var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);
var crypto = __nccwpck_require__(6417);
var uuidV4 = __nccwpck_require__(5547);
var algorithm = "aes-256-ctr";
var encryptEncoding = 'hex';
var unencryptedEncoding = 'utf8';
//
// Store sensitive data in proc.
// Main goal: Protects tasks which would dump envvars from leaking secrets inadvertently
//            the task lib clears after storing.
// Also protects against a dump of a process getting the secrets
// The secret is generated and stored externally for the lifetime of the task.
//
var Vault = /** @class */ (function () {
    function Vault(keyPath) {
        this._keyFile = path.join(keyPath, '.taskkey');
        this._store = {};
        this.genKey();
    }
    Vault.prototype.initialize = function () {
    };
    Vault.prototype.storeSecret = function (name, data) {
        if (!name || name.length == 0) {
            return false;
        }
        name = name.toLowerCase();
        if (!data || data.length == 0) {
            if (this._store.hasOwnProperty(name)) {
                delete this._store[name];
            }
            return false;
        }
        var key = this.getKey();
        var iv = crypto.randomBytes(16);
        var cipher = crypto.createCipheriv(algorithm, key, iv);
        var crypted = cipher.update(data, unencryptedEncoding, encryptEncoding);
        var cryptedFinal = cipher.final(encryptEncoding);
        this._store[name] = iv.toString(encryptEncoding) + crypted + cryptedFinal;
        return true;
    };
    Vault.prototype.retrieveSecret = function (name) {
        var secret;
        name = (name || '').toLowerCase();
        if (this._store.hasOwnProperty(name)) {
            var key = this.getKey();
            var data = this._store[name];
            var ivDataBuffer = Buffer.from(data, encryptEncoding);
            var iv = ivDataBuffer.slice(0, 16);
            var encryptedText = ivDataBuffer.slice(16);
            var decipher = crypto.createDecipheriv(algorithm, key, iv);
            var dec = decipher.update(encryptedText, encryptEncoding, unencryptedEncoding);
            var decFinal = decipher.final(unencryptedEncoding);
            secret = dec + decFinal;
        }
        return secret;
    };
    Vault.prototype.getKey = function () {
        var key = fs.readFileSync(this._keyFile).toString('utf8');
        // Key needs to be hashed to correct length to match algorithm (aes-256-ctr)
        return crypto.createHash('sha256').update(key).digest();
    };
    Vault.prototype.genKey = function () {
        fs.writeFileSync(this._keyFile, uuidV4(), { encoding: 'utf8' });
    };
    return Vault;
}());
exports.Vault = Vault;


/***/ }),

/***/ 352:
/***/ ((module) => {

"use strict";

module.exports = balanced;
function balanced(a, b, str) {
  if (a instanceof RegExp) a = maybeMatch(a, str);
  if (b instanceof RegExp) b = maybeMatch(b, str);

  var r = range(a, b, str);

  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + a.length, r[1]),
    post: str.slice(r[1] + b.length)
  };
}

function maybeMatch(reg, str) {
  var m = str.match(reg);
  return m ? m[0] : null;
}

balanced.range = range;
function range(a, b, str) {
  var begs, beg, left, right, result;
  var ai = str.indexOf(a);
  var bi = str.indexOf(b, ai + 1);
  var i = ai;

  if (ai >= 0 && bi > 0) {
    if(a===b) {
      return [ai, bi];
    }
    begs = [];
    left = str.length;

    while (i >= 0 && !result) {
      if (i == ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length == 1) {
        result = [ begs.pop(), bi ];
      } else {
        beg = begs.pop();
        if (beg < left) {
          left = beg;
          right = bi;
        }

        bi = str.indexOf(b, i + 1);
      }

      i = ai < bi && ai >= 0 ? ai : bi;
    }

    if (begs.length) {
      result = [ left, right ];
    }
  }

  return result;
}


/***/ }),

/***/ 3957:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var concatMap = __nccwpck_require__(3435);
var balanced = __nccwpck_require__(352);

module.exports = expandTop;

var escSlash = '\0SLASH'+Math.random()+'\0';
var escOpen = '\0OPEN'+Math.random()+'\0';
var escClose = '\0CLOSE'+Math.random()+'\0';
var escComma = '\0COMMA'+Math.random()+'\0';
var escPeriod = '\0PERIOD'+Math.random()+'\0';

function numeric(str) {
  return parseInt(str, 10) == str
    ? parseInt(str, 10)
    : str.charCodeAt(0);
}

function escapeBraces(str) {
  return str.split('\\\\').join(escSlash)
            .split('\\{').join(escOpen)
            .split('\\}').join(escClose)
            .split('\\,').join(escComma)
            .split('\\.').join(escPeriod);
}

function unescapeBraces(str) {
  return str.split(escSlash).join('\\')
            .split(escOpen).join('{')
            .split(escClose).join('}')
            .split(escComma).join(',')
            .split(escPeriod).join('.');
}


// Basically just str.split(","), but handling cases
// where we have nested braced sections, which should be
// treated as individual members, like {a,{b,c},d}
function parseCommaParts(str) {
  if (!str)
    return [''];

  var parts = [];
  var m = balanced('{', '}', str);

  if (!m)
    return str.split(',');

  var pre = m.pre;
  var body = m.body;
  var post = m.post;
  var p = pre.split(',');

  p[p.length-1] += '{' + body + '}';
  var postParts = parseCommaParts(post);
  if (post.length) {
    p[p.length-1] += postParts.shift();
    p.push.apply(p, postParts);
  }

  parts.push.apply(parts, p);

  return parts;
}

function expandTop(str) {
  if (!str)
    return [];

  // I don't know why Bash 4.3 does this, but it does.
  // Anything starting with {} will have the first two bytes preserved
  // but *only* at the top level, so {},a}b will not expand to anything,
  // but a{},b}c will be expanded to [a}c,abc].
  // One could argue that this is a bug in Bash, but since the goal of
  // this module is to match Bash's rules, we escape a leading {}
  if (str.substr(0, 2) === '{}') {
    str = '\\{\\}' + str.substr(2);
  }

  return expand(escapeBraces(str), true).map(unescapeBraces);
}

function identity(e) {
  return e;
}

function embrace(str) {
  return '{' + str + '}';
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}

function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}

function expand(str, isTop) {
  var expansions = [];

  var m = balanced('{', '}', str);
  if (!m || /\$$/.test(m.pre)) return [str];

  var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
  var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
  var isSequence = isNumericSequence || isAlphaSequence;
  var isOptions = m.body.indexOf(',') >= 0;
  if (!isSequence && !isOptions) {
    // {a},b}
    if (m.post.match(/,.*\}/)) {
      str = m.pre + '{' + m.body + escClose + m.post;
      return expand(str);
    }
    return [str];
  }

  var n;
  if (isSequence) {
    n = m.body.split(/\.\./);
  } else {
    n = parseCommaParts(m.body);
    if (n.length === 1) {
      // x{{a,b}}y ==> x{a}y x{b}y
      n = expand(n[0], false).map(embrace);
      if (n.length === 1) {
        var post = m.post.length
          ? expand(m.post, false)
          : [''];
        return post.map(function(p) {
          return m.pre + n[0] + p;
        });
      }
    }
  }

  // at this point, n is the parts, and we know it's not a comma set
  // with a single entry.

  // no need to expand pre, since it is guaranteed to be free of brace-sets
  var pre = m.pre;
  var post = m.post.length
    ? expand(m.post, false)
    : [''];

  var N;

  if (isSequence) {
    var x = numeric(n[0]);
    var y = numeric(n[1]);
    var width = Math.max(n[0].length, n[1].length)
    var incr = n.length == 3
      ? Math.abs(numeric(n[2]))
      : 1;
    var test = lte;
    var reverse = y < x;
    if (reverse) {
      incr *= -1;
      test = gte;
    }
    var pad = n.some(isPadded);

    N = [];

    for (var i = x; test(i, y); i += incr) {
      var c;
      if (isAlphaSequence) {
        c = String.fromCharCode(i);
        if (c === '\\')
          c = '';
      } else {
        c = String(i);
        if (pad) {
          var need = width - c.length;
          if (need > 0) {
            var z = new Array(need + 1).join('0');
            if (i < 0)
              c = '-' + z + c.slice(1);
            else
              c = z + c;
          }
        }
      }
      N.push(c);
    }
  } else {
    N = concatMap(n, function(el) { return expand(el, false) });
  }

  for (var j = 0; j < N.length; j++) {
    for (var k = 0; k < post.length; k++) {
      var expansion = pre + N[j] + post[k];
      if (!isTop || isSequence || expansion)
        expansions.push(expansion);
    }
  }

  return expansions;
}



/***/ }),

/***/ 3435:
/***/ ((module) => {

module.exports = function (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x)) res.push.apply(res, x);
        else res.push(x);
    }
    return res;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};


/***/ }),

/***/ 1902:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1780)
const path = __nccwpck_require__(5622)
const mkdirsSync = __nccwpck_require__(8380).mkdirsSync
const utimesMillisSync = __nccwpck_require__(9239).utimesMillisSync
const stat = __nccwpck_require__(6411)

function copySync (src, dest, opts) {
  if (typeof opts === 'function') {
    opts = { filter: opts }
  }

  opts = opts || {}
  opts.clobber = 'clobber' in opts ? !!opts.clobber : true // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n
    see https://github.com/jprichardson/node-fs-extra/issues/269`)
  }

  const { srcStat, destStat } = stat.checkPathsSync(src, dest, 'copy', opts)
  stat.checkParentPathsSync(src, srcStat, dest, 'copy')
  return handleFilterAndCopy(destStat, src, dest, opts)
}

function handleFilterAndCopy (destStat, src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return
  const destParent = path.dirname(dest)
  if (!fs.existsSync(destParent)) mkdirsSync(destParent)
  return getStats(destStat, src, dest, opts)
}

function startCopy (destStat, src, dest, opts) {
  if (opts.filter && !opts.filter(src, dest)) return
  return getStats(destStat, src, dest, opts)
}

function getStats (destStat, src, dest, opts) {
  const statSync = opts.dereference ? fs.statSync : fs.lstatSync
  const srcStat = statSync(src)

  if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts)
  else if (srcStat.isFile() ||
           srcStat.isCharacterDevice() ||
           srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts)
  else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts)
  else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`)
  else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`)
  throw new Error(`Unknown file: ${src}`)
}

function onFile (srcStat, destStat, src, dest, opts) {
  if (!destStat) return copyFile(srcStat, src, dest, opts)
  return mayCopyFile(srcStat, src, dest, opts)
}

function mayCopyFile (srcStat, src, dest, opts) {
  if (opts.overwrite) {
    fs.unlinkSync(dest)
    return copyFile(srcStat, src, dest, opts)
  } else if (opts.errorOnExist) {
    throw new Error(`'${dest}' already exists`)
  }
}

function copyFile (srcStat, src, dest, opts) {
  fs.copyFileSync(src, dest)
  if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest)
  return setDestMode(dest, srcStat.mode)
}

function handleTimestamps (srcMode, src, dest) {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode)
  return setDestTimestamps(src, dest)
}

function fileIsNotWritable (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable (dest, srcMode) {
  return setDestMode(dest, srcMode | 0o200)
}

function setDestMode (dest, srcMode) {
  return fs.chmodSync(dest, srcMode)
}

function setDestTimestamps (src, dest) {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  const updatedSrcStat = fs.statSync(src)
  return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime)
}

function onDir (srcStat, destStat, src, dest, opts) {
  if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts)
  return copyDir(src, dest, opts)
}

function mkDirAndCopy (srcMode, src, dest, opts) {
  fs.mkdirSync(dest)
  copyDir(src, dest, opts)
  return setDestMode(dest, srcMode)
}

function copyDir (src, dest, opts) {
  fs.readdirSync(src).forEach(item => copyDirItem(item, src, dest, opts))
}

function copyDirItem (item, src, dest, opts) {
  const srcItem = path.join(src, item)
  const destItem = path.join(dest, item)
  const { destStat } = stat.checkPathsSync(srcItem, destItem, 'copy', opts)
  return startCopy(destStat, srcItem, destItem, opts)
}

function onLink (destStat, src, dest, opts) {
  let resolvedSrc = fs.readlinkSync(src)
  if (opts.dereference) {
    resolvedSrc = path.resolve(process.cwd(), resolvedSrc)
  }

  if (!destStat) {
    return fs.symlinkSync(resolvedSrc, dest)
  } else {
    let resolvedDest
    try {
      resolvedDest = fs.readlinkSync(dest)
    } catch (err) {
      // dest exists and is a regular file or directory,
      // Windows may throw UNKNOWN error. If dest already exists,
      // fs throws error anyway, so no need to guard against it here.
      if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs.symlinkSync(resolvedSrc, dest)
      throw err
    }
    if (opts.dereference) {
      resolvedDest = path.resolve(process.cwd(), resolvedDest)
    }
    if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
      throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`)
    }

    // prevent copy if src is a subdir of dest since unlinking
    // dest in this case would result in removing src contents
    // and therefore a broken symlink would be created.
    if (fs.statSync(dest).isDirectory() && stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
      throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`)
    }
    return copyLink(resolvedSrc, dest)
  }
}

function copyLink (resolvedSrc, dest) {
  fs.unlinkSync(dest)
  return fs.symlinkSync(resolvedSrc, dest)
}

module.exports = copySync


/***/ }),

/***/ 1181:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  copySync: __nccwpck_require__(1902)
}


/***/ }),

/***/ 8050:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1780)
const path = __nccwpck_require__(5622)
const mkdirs = __nccwpck_require__(8380).mkdirs
const pathExists = __nccwpck_require__(8060).pathExists
const utimesMillis = __nccwpck_require__(9239).utimesMillis
const stat = __nccwpck_require__(6411)

function copy (src, dest, opts, cb) {
  if (typeof opts === 'function' && !cb) {
    cb = opts
    opts = {}
  } else if (typeof opts === 'function') {
    opts = { filter: opts }
  }

  cb = cb || function () {}
  opts = opts || {}

  opts.clobber = 'clobber' in opts ? !!opts.clobber : true // default to true for now
  opts.overwrite = 'overwrite' in opts ? !!opts.overwrite : opts.clobber // overwrite falls back to clobber

  // Warn about using preserveTimestamps on 32-bit node
  if (opts.preserveTimestamps && process.arch === 'ia32') {
    console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;\n
    see https://github.com/jprichardson/node-fs-extra/issues/269`)
  }

  stat.checkPaths(src, dest, 'copy', opts, (err, stats) => {
    if (err) return cb(err)
    const { srcStat, destStat } = stats
    stat.checkParentPaths(src, srcStat, dest, 'copy', err => {
      if (err) return cb(err)
      if (opts.filter) return handleFilter(checkParentDir, destStat, src, dest, opts, cb)
      return checkParentDir(destStat, src, dest, opts, cb)
    })
  })
}

function checkParentDir (destStat, src, dest, opts, cb) {
  const destParent = path.dirname(dest)
  pathExists(destParent, (err, dirExists) => {
    if (err) return cb(err)
    if (dirExists) return getStats(destStat, src, dest, opts, cb)
    mkdirs(destParent, err => {
      if (err) return cb(err)
      return getStats(destStat, src, dest, opts, cb)
    })
  })
}

function handleFilter (onInclude, destStat, src, dest, opts, cb) {
  Promise.resolve(opts.filter(src, dest)).then(include => {
    if (include) return onInclude(destStat, src, dest, opts, cb)
    return cb()
  }, error => cb(error))
}

function startCopy (destStat, src, dest, opts, cb) {
  if (opts.filter) return handleFilter(getStats, destStat, src, dest, opts, cb)
  return getStats(destStat, src, dest, opts, cb)
}

function getStats (destStat, src, dest, opts, cb) {
  const stat = opts.dereference ? fs.stat : fs.lstat
  stat(src, (err, srcStat) => {
    if (err) return cb(err)

    if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts, cb)
    else if (srcStat.isFile() ||
             srcStat.isCharacterDevice() ||
             srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts, cb)
    else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts, cb)
    else if (srcStat.isSocket()) return cb(new Error(`Cannot copy a socket file: ${src}`))
    else if (srcStat.isFIFO()) return cb(new Error(`Cannot copy a FIFO pipe: ${src}`))
    return cb(new Error(`Unknown file: ${src}`))
  })
}

function onFile (srcStat, destStat, src, dest, opts, cb) {
  if (!destStat) return copyFile(srcStat, src, dest, opts, cb)
  return mayCopyFile(srcStat, src, dest, opts, cb)
}

function mayCopyFile (srcStat, src, dest, opts, cb) {
  if (opts.overwrite) {
    fs.unlink(dest, err => {
      if (err) return cb(err)
      return copyFile(srcStat, src, dest, opts, cb)
    })
  } else if (opts.errorOnExist) {
    return cb(new Error(`'${dest}' already exists`))
  } else return cb()
}

function copyFile (srcStat, src, dest, opts, cb) {
  fs.copyFile(src, dest, err => {
    if (err) return cb(err)
    if (opts.preserveTimestamps) return handleTimestampsAndMode(srcStat.mode, src, dest, cb)
    return setDestMode(dest, srcStat.mode, cb)
  })
}

function handleTimestampsAndMode (srcMode, src, dest, cb) {
  // Make sure the file is writable before setting the timestamp
  // otherwise open fails with EPERM when invoked with 'r+'
  // (through utimes call)
  if (fileIsNotWritable(srcMode)) {
    return makeFileWritable(dest, srcMode, err => {
      if (err) return cb(err)
      return setDestTimestampsAndMode(srcMode, src, dest, cb)
    })
  }
  return setDestTimestampsAndMode(srcMode, src, dest, cb)
}

function fileIsNotWritable (srcMode) {
  return (srcMode & 0o200) === 0
}

function makeFileWritable (dest, srcMode, cb) {
  return setDestMode(dest, srcMode | 0o200, cb)
}

function setDestTimestampsAndMode (srcMode, src, dest, cb) {
  setDestTimestamps(src, dest, err => {
    if (err) return cb(err)
    return setDestMode(dest, srcMode, cb)
  })
}

function setDestMode (dest, srcMode, cb) {
  return fs.chmod(dest, srcMode, cb)
}

function setDestTimestamps (src, dest, cb) {
  // The initial srcStat.atime cannot be trusted
  // because it is modified by the read(2) system call
  // (See https://nodejs.org/api/fs.html#fs_stat_time_values)
  fs.stat(src, (err, updatedSrcStat) => {
    if (err) return cb(err)
    return utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime, cb)
  })
}

function onDir (srcStat, destStat, src, dest, opts, cb) {
  if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts, cb)
  return copyDir(src, dest, opts, cb)
}

function mkDirAndCopy (srcMode, src, dest, opts, cb) {
  fs.mkdir(dest, err => {
    if (err) return cb(err)
    copyDir(src, dest, opts, err => {
      if (err) return cb(err)
      return setDestMode(dest, srcMode, cb)
    })
  })
}

function copyDir (src, dest, opts, cb) {
  fs.readdir(src, (err, items) => {
    if (err) return cb(err)
    return copyDirItems(items, src, dest, opts, cb)
  })
}

function copyDirItems (items, src, dest, opts, cb) {
  const item = items.pop()
  if (!item) return cb()
  return copyDirItem(items, item, src, dest, opts, cb)
}

function copyDirItem (items, item, src, dest, opts, cb) {
  const srcItem = path.join(src, item)
  const destItem = path.join(dest, item)
  stat.checkPaths(srcItem, destItem, 'copy', opts, (err, stats) => {
    if (err) return cb(err)
    const { destStat } = stats
    startCopy(destStat, srcItem, destItem, opts, err => {
      if (err) return cb(err)
      return copyDirItems(items, src, dest, opts, cb)
    })
  })
}

function onLink (destStat, src, dest, opts, cb) {
  fs.readlink(src, (err, resolvedSrc) => {
    if (err) return cb(err)
    if (opts.dereference) {
      resolvedSrc = path.resolve(process.cwd(), resolvedSrc)
    }

    if (!destStat) {
      return fs.symlink(resolvedSrc, dest, cb)
    } else {
      fs.readlink(dest, (err, resolvedDest) => {
        if (err) {
          // dest exists and is a regular file or directory,
          // Windows may throw UNKNOWN error. If dest already exists,
          // fs throws error anyway, so no need to guard against it here.
          if (err.code === 'EINVAL' || err.code === 'UNKNOWN') return fs.symlink(resolvedSrc, dest, cb)
          return cb(err)
        }
        if (opts.dereference) {
          resolvedDest = path.resolve(process.cwd(), resolvedDest)
        }
        if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
          return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`))
        }

        // do not copy if src is a subdir of dest since unlinking
        // dest in this case would result in removing src contents
        // and therefore a broken symlink would be created.
        if (destStat.isDirectory() && stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
          return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`))
        }
        return copyLink(resolvedSrc, dest, cb)
      })
    }
  })
}

function copyLink (resolvedSrc, dest, cb) {
  fs.unlink(dest, err => {
    if (err) return cb(err)
    return fs.symlink(resolvedSrc, dest, cb)
  })
}

module.exports = copy


/***/ }),

/***/ 3269:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = __nccwpck_require__(3642).fromCallback
module.exports = {
  copy: u(__nccwpck_require__(8050))
}


/***/ }),

/***/ 9893:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = __nccwpck_require__(3642).fromPromise
const fs = __nccwpck_require__(7089)
const path = __nccwpck_require__(5622)
const mkdir = __nccwpck_require__(8380)
const remove = __nccwpck_require__(7029)

const emptyDir = u(async function emptyDir (dir) {
  let items
  try {
    items = await fs.readdir(dir)
  } catch {
    return mkdir.mkdirs(dir)
  }

  return Promise.all(items.map(item => remove.remove(path.join(dir, item))))
})

function emptyDirSync (dir) {
  let items
  try {
    items = fs.readdirSync(dir)
  } catch {
    return mkdir.mkdirsSync(dir)
  }

  items.forEach(item => {
    item = path.join(dir, item)
    remove.removeSync(item)
  })
}

module.exports = {
  emptyDirSync,
  emptydirSync: emptyDirSync,
  emptyDir,
  emptydir: emptyDir
}


/***/ }),

/***/ 3199:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = __nccwpck_require__(3642).fromCallback
const path = __nccwpck_require__(5622)
const fs = __nccwpck_require__(1780)
const mkdir = __nccwpck_require__(8380)

function createFile (file, callback) {
  function makeFile () {
    fs.writeFile(file, '', err => {
      if (err) return callback(err)
      callback()
    })
  }

  fs.stat(file, (err, stats) => { // eslint-disable-line handle-callback-err
    if (!err && stats.isFile()) return callback()
    const dir = path.dirname(file)
    fs.stat(dir, (err, stats) => {
      if (err) {
        // if the directory doesn't exist, make it
        if (err.code === 'ENOENT') {
          return mkdir.mkdirs(dir, err => {
            if (err) return callback(err)
            makeFile()
          })
        }
        return callback(err)
      }

      if (stats.isDirectory()) makeFile()
      else {
        // parent is not a directory
        // This is just to cause an internal ENOTDIR error to be thrown
        fs.readdir(dir, err => {
          if (err) return callback(err)
        })
      }
    })
  })
}

function createFileSync (file) {
  let stats
  try {
    stats = fs.statSync(file)
  } catch {}
  if (stats && stats.isFile()) return

  const dir = path.dirname(file)
  try {
    if (!fs.statSync(dir).isDirectory()) {
      // parent is not a directory
      // This is just to cause an internal ENOTDIR error to be thrown
      fs.readdirSync(dir)
    }
  } catch (err) {
    // If the stat call above failed because the directory doesn't exist, create it
    if (err && err.code === 'ENOENT') mkdir.mkdirsSync(dir)
    else throw err
  }

  fs.writeFileSync(file, '')
}

module.exports = {
  createFile: u(createFile),
  createFileSync
}


/***/ }),

/***/ 3694:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const file = __nccwpck_require__(3199)
const link = __nccwpck_require__(4277)
const symlink = __nccwpck_require__(4510)

module.exports = {
  // file
  createFile: file.createFile,
  createFileSync: file.createFileSync,
  ensureFile: file.createFile,
  ensureFileSync: file.createFileSync,
  // link
  createLink: link.createLink,
  createLinkSync: link.createLinkSync,
  ensureLink: link.createLink,
  ensureLinkSync: link.createLinkSync,
  // symlink
  createSymlink: symlink.createSymlink,
  createSymlinkSync: symlink.createSymlinkSync,
  ensureSymlink: symlink.createSymlink,
  ensureSymlinkSync: symlink.createSymlinkSync
}


/***/ }),

/***/ 4277:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = __nccwpck_require__(3642).fromCallback
const path = __nccwpck_require__(5622)
const fs = __nccwpck_require__(1780)
const mkdir = __nccwpck_require__(8380)
const pathExists = __nccwpck_require__(8060).pathExists
const { areIdentical } = __nccwpck_require__(6411)

function createLink (srcpath, dstpath, callback) {
  function makeLink (srcpath, dstpath) {
    fs.link(srcpath, dstpath, err => {
      if (err) return callback(err)
      callback(null)
    })
  }

  fs.lstat(dstpath, (_, dstStat) => {
    fs.lstat(srcpath, (err, srcStat) => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureLink')
        return callback(err)
      }
      if (dstStat && areIdentical(srcStat, dstStat)) return callback(null)

      const dir = path.dirname(dstpath)
      pathExists(dir, (err, dirExists) => {
        if (err) return callback(err)
        if (dirExists) return makeLink(srcpath, dstpath)
        mkdir.mkdirs(dir, err => {
          if (err) return callback(err)
          makeLink(srcpath, dstpath)
        })
      })
    })
  })
}

function createLinkSync (srcpath, dstpath) {
  let dstStat
  try {
    dstStat = fs.lstatSync(dstpath)
  } catch {}

  try {
    const srcStat = fs.lstatSync(srcpath)
    if (dstStat && areIdentical(srcStat, dstStat)) return
  } catch (err) {
    err.message = err.message.replace('lstat', 'ensureLink')
    throw err
  }

  const dir = path.dirname(dstpath)
  const dirExists = fs.existsSync(dir)
  if (dirExists) return fs.linkSync(srcpath, dstpath)
  mkdir.mkdirsSync(dir)

  return fs.linkSync(srcpath, dstpath)
}

module.exports = {
  createLink: u(createLink),
  createLinkSync
}


/***/ }),

/***/ 6827:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const path = __nccwpck_require__(5622)
const fs = __nccwpck_require__(1780)
const pathExists = __nccwpck_require__(8060).pathExists

/**
 * Function that returns two types of paths, one relative to symlink, and one
 * relative to the current working directory. Checks if path is absolute or
 * relative. If the path is relative, this function checks if the path is
 * relative to symlink or relative to current working directory. This is an
 * initiative to find a smarter `srcpath` to supply when building symlinks.
 * This allows you to determine which path to use out of one of three possible
 * types of source paths. The first is an absolute path. This is detected by
 * `path.isAbsolute()`. When an absolute path is provided, it is checked to
 * see if it exists. If it does it's used, if not an error is returned
 * (callback)/ thrown (sync). The other two options for `srcpath` are a
 * relative url. By default Node's `fs.symlink` works by creating a symlink
 * using `dstpath` and expects the `srcpath` to be relative to the newly
 * created symlink. If you provide a `srcpath` that does not exist on the file
 * system it results in a broken symlink. To minimize this, the function
 * checks to see if the 'relative to symlink' source file exists, and if it
 * does it will use it. If it does not, it checks if there's a file that
 * exists that is relative to the current working directory, if does its used.
 * This preserves the expectations of the original fs.symlink spec and adds
 * the ability to pass in `relative to current working direcotry` paths.
 */

function symlinkPaths (srcpath, dstpath, callback) {
  if (path.isAbsolute(srcpath)) {
    return fs.lstat(srcpath, (err) => {
      if (err) {
        err.message = err.message.replace('lstat', 'ensureSymlink')
        return callback(err)
      }
      return callback(null, {
        toCwd: srcpath,
        toDst: srcpath
      })
    })
  } else {
    const dstdir = path.dirname(dstpath)
    const relativeToDst = path.join(dstdir, srcpath)
    return pathExists(relativeToDst, (err, exists) => {
      if (err) return callback(err)
      if (exists) {
        return callback(null, {
          toCwd: relativeToDst,
          toDst: srcpath
        })
      } else {
        return fs.lstat(srcpath, (err) => {
          if (err) {
            err.message = err.message.replace('lstat', 'ensureSymlink')
            return callback(err)
          }
          return callback(null, {
            toCwd: srcpath,
            toDst: path.relative(dstdir, srcpath)
          })
        })
      }
    })
  }
}

function symlinkPathsSync (srcpath, dstpath) {
  let exists
  if (path.isAbsolute(srcpath)) {
    exists = fs.existsSync(srcpath)
    if (!exists) throw new Error('absolute srcpath does not exist')
    return {
      toCwd: srcpath,
      toDst: srcpath
    }
  } else {
    const dstdir = path.dirname(dstpath)
    const relativeToDst = path.join(dstdir, srcpath)
    exists = fs.existsSync(relativeToDst)
    if (exists) {
      return {
        toCwd: relativeToDst,
        toDst: srcpath
      }
    } else {
      exists = fs.existsSync(srcpath)
      if (!exists) throw new Error('relative srcpath does not exist')
      return {
        toCwd: srcpath,
        toDst: path.relative(dstdir, srcpath)
      }
    }
  }
}

module.exports = {
  symlinkPaths,
  symlinkPathsSync
}


/***/ }),

/***/ 9972:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1780)

function symlinkType (srcpath, type, callback) {
  callback = (typeof type === 'function') ? type : callback
  type = (typeof type === 'function') ? false : type
  if (type) return callback(null, type)
  fs.lstat(srcpath, (err, stats) => {
    if (err) return callback(null, 'file')
    type = (stats && stats.isDirectory()) ? 'dir' : 'file'
    callback(null, type)
  })
}

function symlinkTypeSync (srcpath, type) {
  let stats

  if (type) return type
  try {
    stats = fs.lstatSync(srcpath)
  } catch {
    return 'file'
  }
  return (stats && stats.isDirectory()) ? 'dir' : 'file'
}

module.exports = {
  symlinkType,
  symlinkTypeSync
}


/***/ }),

/***/ 4510:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = __nccwpck_require__(3642).fromCallback
const path = __nccwpck_require__(5622)
const fs = __nccwpck_require__(7089)
const _mkdirs = __nccwpck_require__(8380)
const mkdirs = _mkdirs.mkdirs
const mkdirsSync = _mkdirs.mkdirsSync

const _symlinkPaths = __nccwpck_require__(6827)
const symlinkPaths = _symlinkPaths.symlinkPaths
const symlinkPathsSync = _symlinkPaths.symlinkPathsSync

const _symlinkType = __nccwpck_require__(9972)
const symlinkType = _symlinkType.symlinkType
const symlinkTypeSync = _symlinkType.symlinkTypeSync

const pathExists = __nccwpck_require__(8060).pathExists

const { areIdentical } = __nccwpck_require__(6411)

function createSymlink (srcpath, dstpath, type, callback) {
  callback = (typeof type === 'function') ? type : callback
  type = (typeof type === 'function') ? false : type

  fs.lstat(dstpath, (err, stats) => {
    if (!err && stats.isSymbolicLink()) {
      Promise.all([
        fs.stat(srcpath),
        fs.stat(dstpath)
      ]).then(([srcStat, dstStat]) => {
        if (areIdentical(srcStat, dstStat)) return callback(null)
        _createSymlink(srcpath, dstpath, type, callback)
      })
    } else _createSymlink(srcpath, dstpath, type, callback)
  })
}

function _createSymlink (srcpath, dstpath, type, callback) {
  symlinkPaths(srcpath, dstpath, (err, relative) => {
    if (err) return callback(err)
    srcpath = relative.toDst
    symlinkType(relative.toCwd, type, (err, type) => {
      if (err) return callback(err)
      const dir = path.dirname(dstpath)
      pathExists(dir, (err, dirExists) => {
        if (err) return callback(err)
        if (dirExists) return fs.symlink(srcpath, dstpath, type, callback)
        mkdirs(dir, err => {
          if (err) return callback(err)
          fs.symlink(srcpath, dstpath, type, callback)
        })
      })
    })
  })
}

function createSymlinkSync (srcpath, dstpath, type) {
  let stats
  try {
    stats = fs.lstatSync(dstpath)
  } catch {}
  if (stats && stats.isSymbolicLink()) {
    const srcStat = fs.statSync(srcpath)
    const dstStat = fs.statSync(dstpath)
    if (areIdentical(srcStat, dstStat)) return
  }

  const relative = symlinkPathsSync(srcpath, dstpath)
  srcpath = relative.toDst
  type = symlinkTypeSync(relative.toCwd, type)
  const dir = path.dirname(dstpath)
  const exists = fs.existsSync(dir)
  if (exists) return fs.symlinkSync(srcpath, dstpath, type)
  mkdirsSync(dir)
  return fs.symlinkSync(srcpath, dstpath, type)
}

module.exports = {
  createSymlink: u(createSymlink),
  createSymlinkSync
}


/***/ }),

/***/ 7089:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";

// This is adapted from https://github.com/normalize/mz
// Copyright (c) 2014-2016 Jonathan Ong me@jongleberry.com and Contributors
const u = __nccwpck_require__(3642).fromCallback
const fs = __nccwpck_require__(1780)

const api = [
  'access',
  'appendFile',
  'chmod',
  'chown',
  'close',
  'copyFile',
  'fchmod',
  'fchown',
  'fdatasync',
  'fstat',
  'fsync',
  'ftruncate',
  'futimes',
  'lchmod',
  'lchown',
  'link',
  'lstat',
  'mkdir',
  'mkdtemp',
  'open',
  'opendir',
  'readdir',
  'readFile',
  'readlink',
  'realpath',
  'rename',
  'rm',
  'rmdir',
  'stat',
  'symlink',
  'truncate',
  'unlink',
  'utimes',
  'writeFile'
].filter(key => {
  // Some commands are not available on some systems. Ex:
  // fs.opendir was added in Node.js v12.12.0
  // fs.rm was added in Node.js v14.14.0
  // fs.lchown is not available on at least some Linux
  return typeof fs[key] === 'function'
})

// Export cloned fs:
Object.assign(exports, fs)

// Universalify async methods:
api.forEach(method => {
  exports[method] = u(fs[method])
})
exports.realpath.native = u(fs.realpath.native)

// We differ from mz/fs in that we still ship the old, broken, fs.exists()
// since we are a drop-in replacement for the native module
exports.exists = function (filename, callback) {
  if (typeof callback === 'function') {
    return fs.exists(filename, callback)
  }
  return new Promise(resolve => {
    return fs.exists(filename, resolve)
  })
}

// fs.read(), fs.write(), & fs.writev() need special treatment due to multiple callback args

exports.read = function (fd, buffer, offset, length, position, callback) {
  if (typeof callback === 'function') {
    return fs.read(fd, buffer, offset, length, position, callback)
  }
  return new Promise((resolve, reject) => {
    fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
      if (err) return reject(err)
      resolve({ bytesRead, buffer })
    })
  })
}

// Function signature can be
// fs.write(fd, buffer[, offset[, length[, position]]], callback)
// OR
// fs.write(fd, string[, position[, encoding]], callback)
// We need to handle both cases, so we use ...args
exports.write = function (fd, buffer, ...args) {
  if (typeof args[args.length - 1] === 'function') {
    return fs.write(fd, buffer, ...args)
  }

  return new Promise((resolve, reject) => {
    fs.write(fd, buffer, ...args, (err, bytesWritten, buffer) => {
      if (err) return reject(err)
      resolve({ bytesWritten, buffer })
    })
  })
}

// fs.writev only available in Node v12.9.0+
if (typeof fs.writev === 'function') {
  // Function signature is
  // s.writev(fd, buffers[, position], callback)
  // We need to handle the optional arg, so we use ...args
  exports.writev = function (fd, buffers, ...args) {
    if (typeof args[args.length - 1] === 'function') {
      return fs.writev(fd, buffers, ...args)
    }

    return new Promise((resolve, reject) => {
      fs.writev(fd, buffers, ...args, (err, bytesWritten, buffers) => {
        if (err) return reject(err)
        resolve({ bytesWritten, buffers })
      })
    })
  }
}


/***/ }),

/***/ 6378:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  // Export promiseified graceful-fs:
  ...__nccwpck_require__(7089),
  // Export extra methods:
  ...__nccwpck_require__(1181),
  ...__nccwpck_require__(3269),
  ...__nccwpck_require__(9893),
  ...__nccwpck_require__(3694),
  ...__nccwpck_require__(2899),
  ...__nccwpck_require__(8380),
  ...__nccwpck_require__(8337),
  ...__nccwpck_require__(8191),
  ...__nccwpck_require__(3801),
  ...__nccwpck_require__(8060),
  ...__nccwpck_require__(7029)
}


/***/ }),

/***/ 2899:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = __nccwpck_require__(3642).fromPromise
const jsonFile = __nccwpck_require__(4040)

jsonFile.outputJson = u(__nccwpck_require__(1019))
jsonFile.outputJsonSync = __nccwpck_require__(1783)
// aliases
jsonFile.outputJSON = jsonFile.outputJson
jsonFile.outputJSONSync = jsonFile.outputJsonSync
jsonFile.writeJSON = jsonFile.writeJson
jsonFile.writeJSONSync = jsonFile.writeJsonSync
jsonFile.readJSON = jsonFile.readJson
jsonFile.readJSONSync = jsonFile.readJsonSync

module.exports = jsonFile


/***/ }),

/***/ 4040:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const jsonFile = __nccwpck_require__(4996)

module.exports = {
  // jsonfile exports
  readJson: jsonFile.readFile,
  readJsonSync: jsonFile.readFileSync,
  writeJson: jsonFile.writeFile,
  writeJsonSync: jsonFile.writeFileSync
}


/***/ }),

/***/ 1783:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { stringify } = __nccwpck_require__(9310)
const { outputFileSync } = __nccwpck_require__(3801)

function outputJsonSync (file, data, options) {
  const str = stringify(data, options)

  outputFileSync(file, str, options)
}

module.exports = outputJsonSync


/***/ }),

/***/ 1019:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const { stringify } = __nccwpck_require__(9310)
const { outputFile } = __nccwpck_require__(3801)

async function outputJson (file, data, options = {}) {
  const str = stringify(data, options)

  await outputFile(file, str, options)
}

module.exports = outputJson


/***/ }),

/***/ 8380:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const u = __nccwpck_require__(3642).fromPromise
const { makeDir: _makeDir, makeDirSync } = __nccwpck_require__(9294)
const makeDir = u(_makeDir)

module.exports = {
  mkdirs: makeDir,
  mkdirsSync: makeDirSync,
  // alias
  mkdirp: makeDir,
  mkdirpSync: makeDirSync,
  ensureDir: makeDir,
  ensureDirSync: makeDirSync
}


/***/ }),

/***/ 9294:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const fs = __nccwpck_require__(7089)
const { checkPath } = __nccwpck_require__(5129)

const getMode = options => {
  const defaults = { mode: 0o777 }
  if (typeof options === 'number') return options
  return ({ ...defaults, ...options }).mode
}

module.exports.makeDir = async (dir, options) => {
  checkPath(dir)

  return fs.mkdir(dir, {
    mode: getMode(options),
    recursive: true
  })
}

module.exports.makeDirSync = (dir, options) => {
  checkPath(dir)

  return fs.mkdirSync(dir, {
    mode: getMode(options),
    recursive: true
  })
}


/***/ }),

/***/ 5129:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
// Adapted from https://github.com/sindresorhus/make-dir
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const path = __nccwpck_require__(5622)

// https://github.com/nodejs/node/issues/8987
// https://github.com/libuv/libuv/pull/1088
module.exports.checkPath = function checkPath (pth) {
  if (process.platform === 'win32') {
    const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path.parse(pth).root, ''))

    if (pathHasInvalidWinCharacters) {
      const error = new Error(`Path contains invalid characters: ${pth}`)
      error.code = 'EINVAL'
      throw error
    }
  }
}


/***/ }),

/***/ 8337:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


module.exports = {
  moveSync: __nccwpck_require__(5474)
}


/***/ }),

/***/ 5474:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1780)
const path = __nccwpck_require__(5622)
const copySync = __nccwpck_require__(1181).copySync
const removeSync = __nccwpck_require__(7029).removeSync
const mkdirpSync = __nccwpck_require__(8380).mkdirpSync
const stat = __nccwpck_require__(6411)

function moveSync (src, dest, opts) {
  opts = opts || {}
  const overwrite = opts.overwrite || opts.clobber || false

  const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, 'move', opts)
  stat.checkParentPathsSync(src, srcStat, dest, 'move')
  if (!isParentRoot(dest)) mkdirpSync(path.dirname(dest))
  return doRename(src, dest, overwrite, isChangingCase)
}

function isParentRoot (dest) {
  const parent = path.dirname(dest)
  const parsedPath = path.parse(parent)
  return parsedPath.root === parent
}

function doRename (src, dest, overwrite, isChangingCase) {
  if (isChangingCase) return rename(src, dest, overwrite)
  if (overwrite) {
    removeSync(dest)
    return rename(src, dest, overwrite)
  }
  if (fs.existsSync(dest)) throw new Error('dest already exists.')
  return rename(src, dest, overwrite)
}

function rename (src, dest, overwrite) {
  try {
    fs.renameSync(src, dest)
  } catch (err) {
    if (err.code !== 'EXDEV') throw err
    return moveAcrossDevice(src, dest, overwrite)
  }
}

function moveAcrossDevice (src, dest, overwrite) {
  const opts = {
    overwrite,
    errorOnExist: true
  }
  copySync(src, dest, opts)
  return removeSync(src)
}

module.exports = moveSync


/***/ }),

/***/ 8191:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = __nccwpck_require__(3642).fromCallback
module.exports = {
  move: u(__nccwpck_require__(493))
}


/***/ }),

/***/ 493:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1780)
const path = __nccwpck_require__(5622)
const copy = __nccwpck_require__(3269).copy
const remove = __nccwpck_require__(7029).remove
const mkdirp = __nccwpck_require__(8380).mkdirp
const pathExists = __nccwpck_require__(8060).pathExists
const stat = __nccwpck_require__(6411)

function move (src, dest, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  const overwrite = opts.overwrite || opts.clobber || false

  stat.checkPaths(src, dest, 'move', opts, (err, stats) => {
    if (err) return cb(err)
    const { srcStat, isChangingCase = false } = stats
    stat.checkParentPaths(src, srcStat, dest, 'move', err => {
      if (err) return cb(err)
      if (isParentRoot(dest)) return doRename(src, dest, overwrite, isChangingCase, cb)
      mkdirp(path.dirname(dest), err => {
        if (err) return cb(err)
        return doRename(src, dest, overwrite, isChangingCase, cb)
      })
    })
  })
}

function isParentRoot (dest) {
  const parent = path.dirname(dest)
  const parsedPath = path.parse(parent)
  return parsedPath.root === parent
}

function doRename (src, dest, overwrite, isChangingCase, cb) {
  if (isChangingCase) return rename(src, dest, overwrite, cb)
  if (overwrite) {
    return remove(dest, err => {
      if (err) return cb(err)
      return rename(src, dest, overwrite, cb)
    })
  }
  pathExists(dest, (err, destExists) => {
    if (err) return cb(err)
    if (destExists) return cb(new Error('dest already exists.'))
    return rename(src, dest, overwrite, cb)
  })
}

function rename (src, dest, overwrite, cb) {
  fs.rename(src, dest, err => {
    if (!err) return cb()
    if (err.code !== 'EXDEV') return cb(err)
    return moveAcrossDevice(src, dest, overwrite, cb)
  })
}

function moveAcrossDevice (src, dest, overwrite, cb) {
  const opts = {
    overwrite,
    errorOnExist: true
  }
  copy(src, dest, opts, err => {
    if (err) return cb(err)
    return remove(src, cb)
  })
}

module.exports = move


/***/ }),

/***/ 3801:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const u = __nccwpck_require__(3642).fromCallback
const fs = __nccwpck_require__(1780)
const path = __nccwpck_require__(5622)
const mkdir = __nccwpck_require__(8380)
const pathExists = __nccwpck_require__(8060).pathExists

function outputFile (file, data, encoding, callback) {
  if (typeof encoding === 'function') {
    callback = encoding
    encoding = 'utf8'
  }

  const dir = path.dirname(file)
  pathExists(dir, (err, itDoes) => {
    if (err) return callback(err)
    if (itDoes) return fs.writeFile(file, data, encoding, callback)

    mkdir.mkdirs(dir, err => {
      if (err) return callback(err)

      fs.writeFile(file, data, encoding, callback)
    })
  })
}

function outputFileSync (file, ...args) {
  const dir = path.dirname(file)
  if (fs.existsSync(dir)) {
    return fs.writeFileSync(file, ...args)
  }
  mkdir.mkdirsSync(dir)
  fs.writeFileSync(file, ...args)
}

module.exports = {
  outputFile: u(outputFile),
  outputFileSync
}


/***/ }),

/***/ 8060:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const u = __nccwpck_require__(3642).fromPromise
const fs = __nccwpck_require__(7089)

function pathExists (path) {
  return fs.access(path).then(() => true).catch(() => false)
}

module.exports = {
  pathExists: u(pathExists),
  pathExistsSync: fs.existsSync
}


/***/ }),

/***/ 7029:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1780)
const u = __nccwpck_require__(3642).fromCallback
const rimraf = __nccwpck_require__(6198)

function remove (path, callback) {
  // Node 14.14.0+
  if (fs.rm) return fs.rm(path, { recursive: true, force: true }, callback)
  rimraf(path, callback)
}

function removeSync (path) {
  // Node 14.14.0+
  if (fs.rmSync) return fs.rmSync(path, { recursive: true, force: true })
  rimraf.sync(path)
}

module.exports = {
  remove: u(remove),
  removeSync
}


/***/ }),

/***/ 6198:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1780)
const path = __nccwpck_require__(5622)
const assert = __nccwpck_require__(2357)

const isWindows = (process.platform === 'win32')

function defaults (options) {
  const methods = [
    'unlink',
    'chmod',
    'stat',
    'lstat',
    'rmdir',
    'readdir'
  ]
  methods.forEach(m => {
    options[m] = options[m] || fs[m]
    m = m + 'Sync'
    options[m] = options[m] || fs[m]
  })

  options.maxBusyTries = options.maxBusyTries || 3
}

function rimraf (p, options, cb) {
  let busyTries = 0

  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  assert(p, 'rimraf: missing path')
  assert.strictEqual(typeof p, 'string', 'rimraf: path should be a string')
  assert.strictEqual(typeof cb, 'function', 'rimraf: callback function required')
  assert(options, 'rimraf: invalid options argument provided')
  assert.strictEqual(typeof options, 'object', 'rimraf: options should be object')

  defaults(options)

  rimraf_(p, options, function CB (er) {
    if (er) {
      if ((er.code === 'EBUSY' || er.code === 'ENOTEMPTY' || er.code === 'EPERM') &&
          busyTries < options.maxBusyTries) {
        busyTries++
        const time = busyTries * 100
        // try again, with the same exact callback as this one.
        return setTimeout(() => rimraf_(p, options, CB), time)
      }

      // already gone
      if (er.code === 'ENOENT') er = null
    }

    cb(er)
  })
}

// Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.
function rimraf_ (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  // sunos lets the root user unlink directories, which is... weird.
  // so we have to lstat here and make sure it's not a dir.
  options.lstat(p, (er, st) => {
    if (er && er.code === 'ENOENT') {
      return cb(null)
    }

    // Windows can EPERM on stat.  Life is suffering.
    if (er && er.code === 'EPERM' && isWindows) {
      return fixWinEPERM(p, options, er, cb)
    }

    if (st && st.isDirectory()) {
      return rmdir(p, options, er, cb)
    }

    options.unlink(p, er => {
      if (er) {
        if (er.code === 'ENOENT') {
          return cb(null)
        }
        if (er.code === 'EPERM') {
          return (isWindows)
            ? fixWinEPERM(p, options, er, cb)
            : rmdir(p, options, er, cb)
        }
        if (er.code === 'EISDIR') {
          return rmdir(p, options, er, cb)
        }
      }
      return cb(er)
    })
  })
}

function fixWinEPERM (p, options, er, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  options.chmod(p, 0o666, er2 => {
    if (er2) {
      cb(er2.code === 'ENOENT' ? null : er)
    } else {
      options.stat(p, (er3, stats) => {
        if (er3) {
          cb(er3.code === 'ENOENT' ? null : er)
        } else if (stats.isDirectory()) {
          rmdir(p, options, er, cb)
        } else {
          options.unlink(p, cb)
        }
      })
    }
  })
}

function fixWinEPERMSync (p, options, er) {
  let stats

  assert(p)
  assert(options)

  try {
    options.chmodSync(p, 0o666)
  } catch (er2) {
    if (er2.code === 'ENOENT') {
      return
    } else {
      throw er
    }
  }

  try {
    stats = options.statSync(p)
  } catch (er3) {
    if (er3.code === 'ENOENT') {
      return
    } else {
      throw er
    }
  }

  if (stats.isDirectory()) {
    rmdirSync(p, options, er)
  } else {
    options.unlinkSync(p)
  }
}

function rmdir (p, options, originalEr, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(p, er => {
    if (er && (er.code === 'ENOTEMPTY' || er.code === 'EEXIST' || er.code === 'EPERM')) {
      rmkids(p, options, cb)
    } else if (er && er.code === 'ENOTDIR') {
      cb(originalEr)
    } else {
      cb(er)
    }
  })
}

function rmkids (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  options.readdir(p, (er, files) => {
    if (er) return cb(er)

    let n = files.length
    let errState

    if (n === 0) return options.rmdir(p, cb)

    files.forEach(f => {
      rimraf(path.join(p, f), options, er => {
        if (errState) {
          return
        }
        if (er) return cb(errState = er)
        if (--n === 0) {
          options.rmdir(p, cb)
        }
      })
    })
  })
}

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
function rimrafSync (p, options) {
  let st

  options = options || {}
  defaults(options)

  assert(p, 'rimraf: missing path')
  assert.strictEqual(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.strictEqual(typeof options, 'object', 'rimraf: options should be object')

  try {
    st = options.lstatSync(p)
  } catch (er) {
    if (er.code === 'ENOENT') {
      return
    }

    // Windows can EPERM on stat.  Life is suffering.
    if (er.code === 'EPERM' && isWindows) {
      fixWinEPERMSync(p, options, er)
    }
  }

  try {
    // sunos lets the root user unlink directories, which is... weird.
    if (st && st.isDirectory()) {
      rmdirSync(p, options, null)
    } else {
      options.unlinkSync(p)
    }
  } catch (er) {
    if (er.code === 'ENOENT') {
      return
    } else if (er.code === 'EPERM') {
      return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
    } else if (er.code !== 'EISDIR') {
      throw er
    }
    rmdirSync(p, options, er)
  }
}

function rmdirSync (p, options, originalEr) {
  assert(p)
  assert(options)

  try {
    options.rmdirSync(p)
  } catch (er) {
    if (er.code === 'ENOTDIR') {
      throw originalEr
    } else if (er.code === 'ENOTEMPTY' || er.code === 'EEXIST' || er.code === 'EPERM') {
      rmkidsSync(p, options)
    } else if (er.code !== 'ENOENT') {
      throw er
    }
  }
}

function rmkidsSync (p, options) {
  assert(p)
  assert(options)
  options.readdirSync(p).forEach(f => rimrafSync(path.join(p, f), options))

  if (isWindows) {
    // We only end up here once we got ENOTEMPTY at least once, and
    // at this point, we are guaranteed to have removed all the kids.
    // So, we know that it won't be ENOENT or ENOTDIR or anything else.
    // try really hard to delete stuff on windows, because it has a
    // PROFOUNDLY annoying habit of not closing handles promptly when
    // files are deleted, resulting in spurious ENOTEMPTY errors.
    const startTime = Date.now()
    do {
      try {
        const ret = options.rmdirSync(p, options)
        return ret
      } catch {}
    } while (Date.now() - startTime < 500) // give up after 500ms
  } else {
    const ret = options.rmdirSync(p, options)
    return ret
  }
}

module.exports = rimraf
rimraf.sync = rimrafSync


/***/ }),

/***/ 6411:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(7089)
const path = __nccwpck_require__(5622)
const util = __nccwpck_require__(1669)

function getStats (src, dest, opts) {
  const statFunc = opts.dereference
    ? (file) => fs.stat(file, { bigint: true })
    : (file) => fs.lstat(file, { bigint: true })
  return Promise.all([
    statFunc(src),
    statFunc(dest).catch(err => {
      if (err.code === 'ENOENT') return null
      throw err
    })
  ]).then(([srcStat, destStat]) => ({ srcStat, destStat }))
}

function getStatsSync (src, dest, opts) {
  let destStat
  const statFunc = opts.dereference
    ? (file) => fs.statSync(file, { bigint: true })
    : (file) => fs.lstatSync(file, { bigint: true })
  const srcStat = statFunc(src)
  try {
    destStat = statFunc(dest)
  } catch (err) {
    if (err.code === 'ENOENT') return { srcStat, destStat: null }
    throw err
  }
  return { srcStat, destStat }
}

function checkPaths (src, dest, funcName, opts, cb) {
  util.callbackify(getStats)(src, dest, opts, (err, stats) => {
    if (err) return cb(err)
    const { srcStat, destStat } = stats

    if (destStat) {
      if (areIdentical(srcStat, destStat)) {
        const srcBaseName = path.basename(src)
        const destBaseName = path.basename(dest)
        if (funcName === 'move' &&
          srcBaseName !== destBaseName &&
          srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
          return cb(null, { srcStat, destStat, isChangingCase: true })
        }
        return cb(new Error('Source and destination must not be the same.'))
      }
      if (srcStat.isDirectory() && !destStat.isDirectory()) {
        return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`))
      }
      if (!srcStat.isDirectory() && destStat.isDirectory()) {
        return cb(new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`))
      }
    }

    if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
      return cb(new Error(errMsg(src, dest, funcName)))
    }
    return cb(null, { srcStat, destStat })
  })
}

function checkPathsSync (src, dest, funcName, opts) {
  const { srcStat, destStat } = getStatsSync(src, dest, opts)

  if (destStat) {
    if (areIdentical(srcStat, destStat)) {
      const srcBaseName = path.basename(src)
      const destBaseName = path.basename(dest)
      if (funcName === 'move' &&
        srcBaseName !== destBaseName &&
        srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
        return { srcStat, destStat, isChangingCase: true }
      }
      throw new Error('Source and destination must not be the same.')
    }
    if (srcStat.isDirectory() && !destStat.isDirectory()) {
      throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`)
    }
    if (!srcStat.isDirectory() && destStat.isDirectory()) {
      throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`)
    }
  }

  if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return { srcStat, destStat }
}

// recursively check if dest parent is a subdirectory of src.
// It works for all file types including symlinks since it
// checks the src and dest inodes. It starts from the deepest
// parent and stops once it reaches the src parent or the root path.
function checkParentPaths (src, srcStat, dest, funcName, cb) {
  const srcParent = path.resolve(path.dirname(src))
  const destParent = path.resolve(path.dirname(dest))
  if (destParent === srcParent || destParent === path.parse(destParent).root) return cb()
  fs.stat(destParent, { bigint: true }, (err, destStat) => {
    if (err) {
      if (err.code === 'ENOENT') return cb()
      return cb(err)
    }
    if (areIdentical(srcStat, destStat)) {
      return cb(new Error(errMsg(src, dest, funcName)))
    }
    return checkParentPaths(src, srcStat, destParent, funcName, cb)
  })
}

function checkParentPathsSync (src, srcStat, dest, funcName) {
  const srcParent = path.resolve(path.dirname(src))
  const destParent = path.resolve(path.dirname(dest))
  if (destParent === srcParent || destParent === path.parse(destParent).root) return
  let destStat
  try {
    destStat = fs.statSync(destParent, { bigint: true })
  } catch (err) {
    if (err.code === 'ENOENT') return
    throw err
  }
  if (areIdentical(srcStat, destStat)) {
    throw new Error(errMsg(src, dest, funcName))
  }
  return checkParentPathsSync(src, srcStat, destParent, funcName)
}

function areIdentical (srcStat, destStat) {
  return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev
}

// return true if dest is a subdir of src, otherwise false.
// It only checks the path strings.
function isSrcSubdir (src, dest) {
  const srcArr = path.resolve(src).split(path.sep).filter(i => i)
  const destArr = path.resolve(dest).split(path.sep).filter(i => i)
  return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true)
}

function errMsg (src, dest, funcName) {
  return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`
}

module.exports = {
  checkPaths,
  checkPathsSync,
  checkParentPaths,
  checkParentPathsSync,
  isSrcSubdir,
  areIdentical
}


/***/ }),

/***/ 9239:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";


const fs = __nccwpck_require__(1780)

function utimesMillis (path, atime, mtime, callback) {
  // if (!HAS_MILLIS_RES) return fs.utimes(path, atime, mtime, callback)
  fs.open(path, 'r+', (err, fd) => {
    if (err) return callback(err)
    fs.futimes(fd, atime, mtime, futimesErr => {
      fs.close(fd, closeErr => {
        if (callback) callback(futimesErr || closeErr)
      })
    })
  })
}

function utimesMillisSync (path, atime, mtime) {
  const fd = fs.openSync(path, 'r+')
  fs.futimesSync(fd, atime, mtime)
  return fs.closeSync(fd)
}

module.exports = {
  utimesMillis,
  utimesMillisSync
}


/***/ }),

/***/ 1485:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = realpath
realpath.realpath = realpath
realpath.sync = realpathSync
realpath.realpathSync = realpathSync
realpath.monkeypatch = monkeypatch
realpath.unmonkeypatch = unmonkeypatch

var fs = __nccwpck_require__(5747)
var origRealpath = fs.realpath
var origRealpathSync = fs.realpathSync

var version = process.version
var ok = /^v[0-5]\./.test(version)
var old = __nccwpck_require__(1332)

function newError (er) {
  return er && er.syscall === 'realpath' && (
    er.code === 'ELOOP' ||
    er.code === 'ENOMEM' ||
    er.code === 'ENAMETOOLONG'
  )
}

function realpath (p, cache, cb) {
  if (ok) {
    return origRealpath(p, cache, cb)
  }

  if (typeof cache === 'function') {
    cb = cache
    cache = null
  }
  origRealpath(p, cache, function (er, result) {
    if (newError(er)) {
      old.realpath(p, cache, cb)
    } else {
      cb(er, result)
    }
  })
}

function realpathSync (p, cache) {
  if (ok) {
    return origRealpathSync(p, cache)
  }

  try {
    return origRealpathSync(p, cache)
  } catch (er) {
    if (newError(er)) {
      return old.realpathSync(p, cache)
    } else {
      throw er
    }
  }
}

function monkeypatch () {
  fs.realpath = realpath
  fs.realpathSync = realpathSync
}

function unmonkeypatch () {
  fs.realpath = origRealpath
  fs.realpathSync = origRealpathSync
}


/***/ }),

/***/ 1332:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var pathModule = __nccwpck_require__(5622);
var isWindows = process.platform === 'win32';
var fs = __nccwpck_require__(5747);

// JavaScript implementation of realpath, ported from node pre-v6

var DEBUG = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);

function rethrow() {
  // Only enable in debug mode. A backtrace uses ~1000 bytes of heap space and
  // is fairly slow to generate.
  var callback;
  if (DEBUG) {
    var backtrace = new Error;
    callback = debugCallback;
  } else
    callback = missingCallback;

  return callback;

  function debugCallback(err) {
    if (err) {
      backtrace.message = err.message;
      err = backtrace;
      missingCallback(err);
    }
  }

  function missingCallback(err) {
    if (err) {
      if (process.throwDeprecation)
        throw err;  // Forgot a callback but don't know where? Use NODE_DEBUG=fs
      else if (!process.noDeprecation) {
        var msg = 'fs: missing callback ' + (err.stack || err.message);
        if (process.traceDeprecation)
          console.trace(msg);
        else
          console.error(msg);
      }
    }
  }
}

function maybeCallback(cb) {
  return typeof cb === 'function' ? cb : rethrow();
}

var normalize = pathModule.normalize;

// Regexp that finds the next partion of a (partial) path
// result is [base_with_slash, base], e.g. ['somedir/', 'somedir']
if (isWindows) {
  var nextPartRe = /(.*?)(?:[\/\\]+|$)/g;
} else {
  var nextPartRe = /(.*?)(?:[\/]+|$)/g;
}

// Regex to find the device root, including trailing slash. E.g. 'c:\\'.
if (isWindows) {
  var splitRootRe = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
} else {
  var splitRootRe = /^[\/]*/;
}

exports.realpathSync = function realpathSync(p, cache) {
  // make p is absolute
  p = pathModule.resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return cache[p];
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs.lstatSync(base);
      knownHard[base] = true;
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  // NB: p.length changes.
  while (pos < p.length) {
    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      continue;
    }

    var resolvedLink;
    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // some known symbolic link.  no need to stat again.
      resolvedLink = cache[base];
    } else {
      var stat = fs.lstatSync(base);
      if (!stat.isSymbolicLink()) {
        knownHard[base] = true;
        if (cache) cache[base] = base;
        continue;
      }

      // read the link if it wasn't read before
      // dev/ino always return 0 on windows, so skip the check.
      var linkTarget = null;
      if (!isWindows) {
        var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
        if (seenLinks.hasOwnProperty(id)) {
          linkTarget = seenLinks[id];
        }
      }
      if (linkTarget === null) {
        fs.statSync(base);
        linkTarget = fs.readlinkSync(base);
      }
      resolvedLink = pathModule.resolve(previous, linkTarget);
      // track this, if given a cache.
      if (cache) cache[base] = resolvedLink;
      if (!isWindows) seenLinks[id] = linkTarget;
    }

    // resolve the link, then start over
    p = pathModule.resolve(resolvedLink, p.slice(pos));
    start();
  }

  if (cache) cache[original] = p;

  return p;
};


exports.realpath = function realpath(p, cache, cb) {
  if (typeof cb !== 'function') {
    cb = maybeCallback(cache);
    cache = null;
  }

  // make p is absolute
  p = pathModule.resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return process.nextTick(cb.bind(null, null, cache[p]));
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs.lstat(base, function(err) {
        if (err) return cb(err);
        knownHard[base] = true;
        LOOP();
      });
    } else {
      process.nextTick(LOOP);
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  function LOOP() {
    // stop if scanned past end of path
    if (pos >= p.length) {
      if (cache) cache[original] = p;
      return cb(null, p);
    }

    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      return process.nextTick(LOOP);
    }

    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // known symbolic link.  no need to stat again.
      return gotResolvedLink(cache[base]);
    }

    return fs.lstat(base, gotStat);
  }

  function gotStat(err, stat) {
    if (err) return cb(err);

    // if not a symlink, skip to the next path part
    if (!stat.isSymbolicLink()) {
      knownHard[base] = true;
      if (cache) cache[base] = base;
      return process.nextTick(LOOP);
    }

    // stat & read the link if not read before
    // call gotTarget as soon as the link target is known
    // dev/ino always return 0 on windows, so skip the check.
    if (!isWindows) {
      var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
      if (seenLinks.hasOwnProperty(id)) {
        return gotTarget(null, seenLinks[id], base);
      }
    }
    fs.stat(base, function(err) {
      if (err) return cb(err);

      fs.readlink(base, function(err, target) {
        if (!isWindows) seenLinks[id] = target;
        gotTarget(err, target);
      });
    });
  }

  function gotTarget(err, target, base) {
    if (err) return cb(err);

    var resolvedLink = pathModule.resolve(previous, target);
    if (cache) cache[base] = resolvedLink;
    gotResolvedLink(resolvedLink);
  }

  function gotResolvedLink(resolvedLink) {
    // resolve the link, then start over
    p = pathModule.resolve(resolvedLink, p.slice(pos));
    start();
  }
};


/***/ }),

/***/ 8324:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

exports.setopts = setopts
exports.ownProp = ownProp
exports.makeAbs = makeAbs
exports.finish = finish
exports.mark = mark
exports.isIgnored = isIgnored
exports.childrenIgnored = childrenIgnored

function ownProp (obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field)
}

var path = __nccwpck_require__(5622)
var minimatch = __nccwpck_require__(3872)
var isAbsolute = __nccwpck_require__(5642)
var Minimatch = minimatch.Minimatch

function alphasort (a, b) {
  return a.localeCompare(b, 'en')
}

function setupIgnores (self, options) {
  self.ignore = options.ignore || []

  if (!Array.isArray(self.ignore))
    self.ignore = [self.ignore]

  if (self.ignore.length) {
    self.ignore = self.ignore.map(ignoreMap)
  }
}

// ignore patterns are always in dot:true mode.
function ignoreMap (pattern) {
  var gmatcher = null
  if (pattern.slice(-3) === '/**') {
    var gpattern = pattern.replace(/(\/\*\*)+$/, '')
    gmatcher = new Minimatch(gpattern, { dot: true })
  }

  return {
    matcher: new Minimatch(pattern, { dot: true }),
    gmatcher: gmatcher
  }
}

function setopts (self, pattern, options) {
  if (!options)
    options = {}

  // base-matching: just use globstar for that.
  if (options.matchBase && -1 === pattern.indexOf("/")) {
    if (options.noglobstar) {
      throw new Error("base matching requires globstar")
    }
    pattern = "**/" + pattern
  }

  self.silent = !!options.silent
  self.pattern = pattern
  self.strict = options.strict !== false
  self.realpath = !!options.realpath
  self.realpathCache = options.realpathCache || Object.create(null)
  self.follow = !!options.follow
  self.dot = !!options.dot
  self.mark = !!options.mark
  self.nodir = !!options.nodir
  if (self.nodir)
    self.mark = true
  self.sync = !!options.sync
  self.nounique = !!options.nounique
  self.nonull = !!options.nonull
  self.nosort = !!options.nosort
  self.nocase = !!options.nocase
  self.stat = !!options.stat
  self.noprocess = !!options.noprocess
  self.absolute = !!options.absolute

  self.maxLength = options.maxLength || Infinity
  self.cache = options.cache || Object.create(null)
  self.statCache = options.statCache || Object.create(null)
  self.symlinks = options.symlinks || Object.create(null)

  setupIgnores(self, options)

  self.changedCwd = false
  var cwd = process.cwd()
  if (!ownProp(options, "cwd"))
    self.cwd = cwd
  else {
    self.cwd = path.resolve(options.cwd)
    self.changedCwd = self.cwd !== cwd
  }

  self.root = options.root || path.resolve(self.cwd, "/")
  self.root = path.resolve(self.root)
  if (process.platform === "win32")
    self.root = self.root.replace(/\\/g, "/")

  // TODO: is an absolute `cwd` supposed to be resolved against `root`?
  // e.g. { cwd: '/test', root: __dirname } === path.join(__dirname, '/test')
  self.cwdAbs = isAbsolute(self.cwd) ? self.cwd : makeAbs(self, self.cwd)
  if (process.platform === "win32")
    self.cwdAbs = self.cwdAbs.replace(/\\/g, "/")
  self.nomount = !!options.nomount

  // disable comments and negation in Minimatch.
  // Note that they are not supported in Glob itself anyway.
  options.nonegate = true
  options.nocomment = true

  self.minimatch = new Minimatch(pattern, options)
  self.options = self.minimatch.options
}

function finish (self) {
  var nou = self.nounique
  var all = nou ? [] : Object.create(null)

  for (var i = 0, l = self.matches.length; i < l; i ++) {
    var matches = self.matches[i]
    if (!matches || Object.keys(matches).length === 0) {
      if (self.nonull) {
        // do like the shell, and spit out the literal glob
        var literal = self.minimatch.globSet[i]
        if (nou)
          all.push(literal)
        else
          all[literal] = true
      }
    } else {
      // had matches
      var m = Object.keys(matches)
      if (nou)
        all.push.apply(all, m)
      else
        m.forEach(function (m) {
          all[m] = true
        })
    }
  }

  if (!nou)
    all = Object.keys(all)

  if (!self.nosort)
    all = all.sort(alphasort)

  // at *some* point we statted all of these
  if (self.mark) {
    for (var i = 0; i < all.length; i++) {
      all[i] = self._mark(all[i])
    }
    if (self.nodir) {
      all = all.filter(function (e) {
        var notDir = !(/\/$/.test(e))
        var c = self.cache[e] || self.cache[makeAbs(self, e)]
        if (notDir && c)
          notDir = c !== 'DIR' && !Array.isArray(c)
        return notDir
      })
    }
  }

  if (self.ignore.length)
    all = all.filter(function(m) {
      return !isIgnored(self, m)
    })

  self.found = all
}

function mark (self, p) {
  var abs = makeAbs(self, p)
  var c = self.cache[abs]
  var m = p
  if (c) {
    var isDir = c === 'DIR' || Array.isArray(c)
    var slash = p.slice(-1) === '/'

    if (isDir && !slash)
      m += '/'
    else if (!isDir && slash)
      m = m.slice(0, -1)

    if (m !== p) {
      var mabs = makeAbs(self, m)
      self.statCache[mabs] = self.statCache[abs]
      self.cache[mabs] = self.cache[abs]
    }
  }

  return m
}

// lotta situps...
function makeAbs (self, f) {
  var abs = f
  if (f.charAt(0) === '/') {
    abs = path.join(self.root, f)
  } else if (isAbsolute(f) || f === '') {
    abs = f
  } else if (self.changedCwd) {
    abs = path.resolve(self.cwd, f)
  } else {
    abs = path.resolve(f)
  }

  if (process.platform === 'win32')
    abs = abs.replace(/\\/g, '/')

  return abs
}


// Return true, if pattern ends with globstar '**', for the accompanying parent directory.
// Ex:- If node_modules/** is the pattern, add 'node_modules' to ignore list along with it's contents
function isIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return item.matcher.match(path) || !!(item.gmatcher && item.gmatcher.match(path))
  })
}

function childrenIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return !!(item.gmatcher && item.gmatcher.match(path))
  })
}


/***/ }),

/***/ 5603:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Approach:
//
// 1. Get the minimatch set
// 2. For each pattern in the set, PROCESS(pattern, false)
// 3. Store matches per-set, then uniq them
//
// PROCESS(pattern, inGlobStar)
// Get the first [n] items from pattern that are all strings
// Join these together.  This is PREFIX.
//   If there is no more remaining, then stat(PREFIX) and
//   add to matches if it succeeds.  END.
//
// If inGlobStar and PREFIX is symlink and points to dir
//   set ENTRIES = []
// else readdir(PREFIX) as ENTRIES
//   If fail, END
//
// with ENTRIES
//   If pattern[n] is GLOBSTAR
//     // handle the case where the globstar match is empty
//     // by pruning it out, and testing the resulting pattern
//     PROCESS(pattern[0..n] + pattern[n+1 .. $], false)
//     // handle other cases.
//     for ENTRY in ENTRIES (not dotfiles)
//       // attach globstar + tail onto the entry
//       // Mark that this entry is a globstar match
//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $], true)
//
//   else // not globstar
//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
//       Test ENTRY against pattern[n]
//       If fails, continue
//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
//
// Caveat:
//   Cache all stats and readdirs results to minimize syscall.  Since all
//   we ever care about is existence and directory-ness, we can just keep
//   `true` for files, and [children,...] for directories, or `false` for
//   things that don't exist.

module.exports = glob

var fs = __nccwpck_require__(5747)
var rp = __nccwpck_require__(1485)
var minimatch = __nccwpck_require__(3872)
var Minimatch = minimatch.Minimatch
var inherits = __nccwpck_require__(8109)
var EE = __nccwpck_require__(8614).EventEmitter
var path = __nccwpck_require__(5622)
var assert = __nccwpck_require__(2357)
var isAbsolute = __nccwpck_require__(5642)
var globSync = __nccwpck_require__(9504)
var common = __nccwpck_require__(8324)
var setopts = common.setopts
var ownProp = common.ownProp
var inflight = __nccwpck_require__(3144)
var util = __nccwpck_require__(1669)
var childrenIgnored = common.childrenIgnored
var isIgnored = common.isIgnored

var once = __nccwpck_require__(9756)

function glob (pattern, options, cb) {
  if (typeof options === 'function') cb = options, options = {}
  if (!options) options = {}

  if (options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return globSync(pattern, options)
  }

  return new Glob(pattern, options, cb)
}

glob.sync = globSync
var GlobSync = glob.GlobSync = globSync.GlobSync

// old api surface
glob.glob = glob

function extend (origin, add) {
  if (add === null || typeof add !== 'object') {
    return origin
  }

  var keys = Object.keys(add)
  var i = keys.length
  while (i--) {
    origin[keys[i]] = add[keys[i]]
  }
  return origin
}

glob.hasMagic = function (pattern, options_) {
  var options = extend({}, options_)
  options.noprocess = true

  var g = new Glob(pattern, options)
  var set = g.minimatch.set

  if (!pattern)
    return false

  if (set.length > 1)
    return true

  for (var j = 0; j < set[0].length; j++) {
    if (typeof set[0][j] !== 'string')
      return true
  }

  return false
}

glob.Glob = Glob
inherits(Glob, EE)
function Glob (pattern, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = null
  }

  if (options && options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return new GlobSync(pattern, options)
  }

  if (!(this instanceof Glob))
    return new Glob(pattern, options, cb)

  setopts(this, pattern, options)
  this._didRealPath = false

  // process each pattern in the minimatch set
  var n = this.minimatch.set.length

  // The matches are stored as {<filename>: true,...} so that
  // duplicates are automagically pruned.
  // Later, we do an Object.keys() on these.
  // Keep them as a list so we can fill in when nonull is set.
  this.matches = new Array(n)

  if (typeof cb === 'function') {
    cb = once(cb)
    this.on('error', cb)
    this.on('end', function (matches) {
      cb(null, matches)
    })
  }

  var self = this
  this._processing = 0

  this._emitQueue = []
  this._processQueue = []
  this.paused = false

  if (this.noprocess)
    return this

  if (n === 0)
    return done()

  var sync = true
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false, done)
  }
  sync = false

  function done () {
    --self._processing
    if (self._processing <= 0) {
      if (sync) {
        process.nextTick(function () {
          self._finish()
        })
      } else {
        self._finish()
      }
    }
  }
}

Glob.prototype._finish = function () {
  assert(this instanceof Glob)
  if (this.aborted)
    return

  if (this.realpath && !this._didRealpath)
    return this._realpath()

  common.finish(this)
  this.emit('end', this.found)
}

Glob.prototype._realpath = function () {
  if (this._didRealpath)
    return

  this._didRealpath = true

  var n = this.matches.length
  if (n === 0)
    return this._finish()

  var self = this
  for (var i = 0; i < this.matches.length; i++)
    this._realpathSet(i, next)

  function next () {
    if (--n === 0)
      self._finish()
  }
}

Glob.prototype._realpathSet = function (index, cb) {
  var matchset = this.matches[index]
  if (!matchset)
    return cb()

  var found = Object.keys(matchset)
  var self = this
  var n = found.length

  if (n === 0)
    return cb()

  var set = this.matches[index] = Object.create(null)
  found.forEach(function (p, i) {
    // If there's a problem with the stat, then it means that
    // one or more of the links in the realpath couldn't be
    // resolved.  just return the abs value in that case.
    p = self._makeAbs(p)
    rp.realpath(p, self.realpathCache, function (er, real) {
      if (!er)
        set[real] = true
      else if (er.syscall === 'stat')
        set[p] = true
      else
        self.emit('error', er) // srsly wtf right here

      if (--n === 0) {
        self.matches[index] = set
        cb()
      }
    })
  })
}

Glob.prototype._mark = function (p) {
  return common.mark(this, p)
}

Glob.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
}

Glob.prototype.abort = function () {
  this.aborted = true
  this.emit('abort')
}

Glob.prototype.pause = function () {
  if (!this.paused) {
    this.paused = true
    this.emit('pause')
  }
}

Glob.prototype.resume = function () {
  if (this.paused) {
    this.emit('resume')
    this.paused = false
    if (this._emitQueue.length) {
      var eq = this._emitQueue.slice(0)
      this._emitQueue.length = 0
      for (var i = 0; i < eq.length; i ++) {
        var e = eq[i]
        this._emitMatch(e[0], e[1])
      }
    }
    if (this._processQueue.length) {
      var pq = this._processQueue.slice(0)
      this._processQueue.length = 0
      for (var i = 0; i < pq.length; i ++) {
        var p = pq[i]
        this._processing--
        this._process(p[0], p[1], p[2], p[3])
      }
    }
  }
}

Glob.prototype._process = function (pattern, index, inGlobStar, cb) {
  assert(this instanceof Glob)
  assert(typeof cb === 'function')

  if (this.aborted)
    return

  this._processing++
  if (this.paused) {
    this._processQueue.push([pattern, index, inGlobStar, cb])
    return
  }

  //console.error('PROCESS %d', this._processing, pattern)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0
  while (typeof pattern[n] === 'string') {
    n ++
  }
  // now n is the index of the first one that is *not* a string.

  // see if there's anything else
  var prefix
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index, cb)
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/')
      break
  }

  var remain = pattern.slice(n)

  // get the list of entries.
  var read
  if (prefix === null)
    read = '.'
  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
    if (!prefix || !isAbsolute(prefix))
      prefix = '/' + prefix
    read = prefix
  } else
    read = prefix

  var abs = this._makeAbs(read)

  //if ignored, skip _processing
  if (childrenIgnored(this, read))
    return cb()

  var isGlobStar = remain[0] === minimatch.GLOBSTAR
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb)
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb)
}

Glob.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this
  this._readdir(abs, inGlobStar, function (er, entries) {
    return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  })
}

Glob.prototype._processReaddir2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return cb()

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0]
  var negate = !!this.minimatch.negate
  var rawGlob = pn._glob
  var dotOk = this.dot || rawGlob.charAt(0) === '.'

  var matchedEntries = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.charAt(0) !== '.' || dotOk) {
      var m
      if (negate && !prefix) {
        m = !e.match(pn)
      } else {
        m = e.match(pn)
      }
      if (m)
        matchedEntries.push(e)
    }
  }

  //console.error('prd2', prefix, entries, remain[0]._glob, matchedEntries)

  var len = matchedEntries.length
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return cb()

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null)

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i]
      if (prefix) {
        if (prefix !== '/')
          e = prefix + '/' + e
        else
          e = prefix + e
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e)
      }
      this._emitMatch(index, e)
    }
    // This was the last one, and no stats were needed
    return cb()
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift()
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i]
    var newPattern
    if (prefix) {
      if (prefix !== '/')
        e = prefix + '/' + e
      else
        e = prefix + e
    }
    this._process([e].concat(remain), index, inGlobStar, cb)
  }
  cb()
}

Glob.prototype._emitMatch = function (index, e) {
  if (this.aborted)
    return

  if (isIgnored(this, e))
    return

  if (this.paused) {
    this._emitQueue.push([index, e])
    return
  }

  var abs = isAbsolute(e) ? e : this._makeAbs(e)

  if (this.mark)
    e = this._mark(e)

  if (this.absolute)
    e = abs

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[abs]
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true

  var st = this.statCache[abs]
  if (st)
    this.emit('stat', e, st)

  this.emit('match', e)
}

Glob.prototype._readdirInGlobStar = function (abs, cb) {
  if (this.aborted)
    return

  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false, cb)

  var lstatkey = 'lstat\0' + abs
  var self = this
  var lstatcb = inflight(lstatkey, lstatcb_)

  if (lstatcb)
    fs.lstat(abs, lstatcb)

  function lstatcb_ (er, lstat) {
    if (er && er.code === 'ENOENT')
      return cb()

    var isSym = lstat && lstat.isSymbolicLink()
    self.symlinks[abs] = isSym

    // If it's not a symlink or a dir, then it's definitely a regular file.
    // don't bother doing a readdir in that case.
    if (!isSym && lstat && !lstat.isDirectory()) {
      self.cache[abs] = 'FILE'
      cb()
    } else
      self._readdir(abs, false, cb)
  }
}

Glob.prototype._readdir = function (abs, inGlobStar, cb) {
  if (this.aborted)
    return

  cb = inflight('readdir\0'+abs+'\0'+inGlobStar, cb)
  if (!cb)
    return

  //console.error('RD %j %j', +inGlobStar, abs)
  if (inGlobStar && !ownProp(this.symlinks, abs))
    return this._readdirInGlobStar(abs, cb)

  if (ownProp(this.cache, abs)) {
    var c = this.cache[abs]
    if (!c || c === 'FILE')
      return cb()

    if (Array.isArray(c))
      return cb(null, c)
  }

  var self = this
  fs.readdir(abs, readdirCb(this, abs, cb))
}

function readdirCb (self, abs, cb) {
  return function (er, entries) {
    if (er)
      self._readdirError(abs, er, cb)
    else
      self._readdirEntries(abs, entries, cb)
  }
}

Glob.prototype._readdirEntries = function (abs, entries, cb) {
  if (this.aborted)
    return

  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i]
      if (abs === '/')
        e = abs + e
      else
        e = abs + '/' + e
      this.cache[e] = true
    }
  }

  this.cache[abs] = entries
  return cb(null, entries)
}

Glob.prototype._readdirError = function (f, er, cb) {
  if (this.aborted)
    return

  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      var abs = this._makeAbs(f)
      this.cache[abs] = 'FILE'
      if (abs === this.cwdAbs) {
        var error = new Error(er.code + ' invalid cwd ' + this.cwd)
        error.path = this.cwd
        error.code = er.code
        this.emit('error', error)
        this.abort()
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false
      if (this.strict) {
        this.emit('error', er)
        // If the error is handled, then we abort
        // if not, we threw out of here
        this.abort()
      }
      if (!this.silent)
        console.error('glob error', er)
      break
  }

  return cb()
}

Glob.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this
  this._readdir(abs, inGlobStar, function (er, entries) {
    self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  })
}


Glob.prototype._processGlobStar2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
  //console.error('pgs2', prefix, remain[0], entries)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return cb()

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1)
  var gspref = prefix ? [ prefix ] : []
  var noGlobStar = gspref.concat(remainWithoutGlobStar)

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false, cb)

  var isSym = this.symlinks[abs]
  var len = entries.length

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return cb()

  for (var i = 0; i < len; i++) {
    var e = entries[i]
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
    this._process(instead, index, true, cb)

    var below = gspref.concat(entries[i], remain)
    this._process(below, index, true, cb)
  }

  cb()
}

Glob.prototype._processSimple = function (prefix, index, cb) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var self = this
  this._stat(prefix, function (er, exists) {
    self._processSimple2(prefix, index, er, exists, cb)
  })
}
Glob.prototype._processSimple2 = function (prefix, index, er, exists, cb) {

  //console.error('ps2', prefix, exists)

  if (!this.matches[index])
    this.matches[index] = Object.create(null)

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return cb()

  if (prefix && isAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix)
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix)
    } else {
      prefix = path.resolve(this.root, prefix)
      if (trail)
        prefix += '/'
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/')

  // Mark this as a match
  this._emitMatch(index, prefix)
  cb()
}

// Returns either 'DIR', 'FILE', or false
Glob.prototype._stat = function (f, cb) {
  var abs = this._makeAbs(f)
  var needDir = f.slice(-1) === '/'

  if (f.length > this.maxLength)
    return cb()

  if (!this.stat && ownProp(this.cache, abs)) {
    var c = this.cache[abs]

    if (Array.isArray(c))
      c = 'DIR'

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return cb(null, c)

    if (needDir && c === 'FILE')
      return cb()

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }

  var exists
  var stat = this.statCache[abs]
  if (stat !== undefined) {
    if (stat === false)
      return cb(null, stat)
    else {
      var type = stat.isDirectory() ? 'DIR' : 'FILE'
      if (needDir && type === 'FILE')
        return cb()
      else
        return cb(null, type, stat)
    }
  }

  var self = this
  var statcb = inflight('stat\0' + abs, lstatcb_)
  if (statcb)
    fs.lstat(abs, statcb)

  function lstatcb_ (er, lstat) {
    if (lstat && lstat.isSymbolicLink()) {
      // If it's a symlink, then treat it as the target, unless
      // the target does not exist, then treat it as a file.
      return fs.stat(abs, function (er, stat) {
        if (er)
          self._stat2(f, abs, null, lstat, cb)
        else
          self._stat2(f, abs, er, stat, cb)
      })
    } else {
      self._stat2(f, abs, er, lstat, cb)
    }
  }
}

Glob.prototype._stat2 = function (f, abs, er, stat, cb) {
  if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
    this.statCache[abs] = false
    return cb()
  }

  var needDir = f.slice(-1) === '/'
  this.statCache[abs] = stat

  if (abs.slice(-1) === '/' && stat && !stat.isDirectory())
    return cb(null, false, stat)

  var c = true
  if (stat)
    c = stat.isDirectory() ? 'DIR' : 'FILE'
  this.cache[abs] = this.cache[abs] || c

  if (needDir && c === 'FILE')
    return cb()

  return cb(null, c, stat)
}


/***/ }),

/***/ 9504:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = globSync
globSync.GlobSync = GlobSync

var fs = __nccwpck_require__(5747)
var rp = __nccwpck_require__(1485)
var minimatch = __nccwpck_require__(3872)
var Minimatch = minimatch.Minimatch
var Glob = __nccwpck_require__(5603).Glob
var util = __nccwpck_require__(1669)
var path = __nccwpck_require__(5622)
var assert = __nccwpck_require__(2357)
var isAbsolute = __nccwpck_require__(5642)
var common = __nccwpck_require__(8324)
var setopts = common.setopts
var ownProp = common.ownProp
var childrenIgnored = common.childrenIgnored
var isIgnored = common.isIgnored

function globSync (pattern, options) {
  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  return new GlobSync(pattern, options).found
}

function GlobSync (pattern, options) {
  if (!pattern)
    throw new Error('must provide pattern')

  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  if (!(this instanceof GlobSync))
    return new GlobSync(pattern, options)

  setopts(this, pattern, options)

  if (this.noprocess)
    return this

  var n = this.minimatch.set.length
  this.matches = new Array(n)
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false)
  }
  this._finish()
}

GlobSync.prototype._finish = function () {
  assert(this instanceof GlobSync)
  if (this.realpath) {
    var self = this
    this.matches.forEach(function (matchset, index) {
      var set = self.matches[index] = Object.create(null)
      for (var p in matchset) {
        try {
          p = self._makeAbs(p)
          var real = rp.realpathSync(p, self.realpathCache)
          set[real] = true
        } catch (er) {
          if (er.syscall === 'stat')
            set[self._makeAbs(p)] = true
          else
            throw er
        }
      }
    })
  }
  common.finish(this)
}


GlobSync.prototype._process = function (pattern, index, inGlobStar) {
  assert(this instanceof GlobSync)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0
  while (typeof pattern[n] === 'string') {
    n ++
  }
  // now n is the index of the first one that is *not* a string.

  // See if there's anything else
  var prefix
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index)
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/')
      break
  }

  var remain = pattern.slice(n)

  // get the list of entries.
  var read
  if (prefix === null)
    read = '.'
  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
    if (!prefix || !isAbsolute(prefix))
      prefix = '/' + prefix
    read = prefix
  } else
    read = prefix

  var abs = this._makeAbs(read)

  //if ignored, skip processing
  if (childrenIgnored(this, read))
    return

  var isGlobStar = remain[0] === minimatch.GLOBSTAR
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar)
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar)
}


GlobSync.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar) {
  var entries = this._readdir(abs, inGlobStar)

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0]
  var negate = !!this.minimatch.negate
  var rawGlob = pn._glob
  var dotOk = this.dot || rawGlob.charAt(0) === '.'

  var matchedEntries = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.charAt(0) !== '.' || dotOk) {
      var m
      if (negate && !prefix) {
        m = !e.match(pn)
      } else {
        m = e.match(pn)
      }
      if (m)
        matchedEntries.push(e)
    }
  }

  var len = matchedEntries.length
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null)

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i]
      if (prefix) {
        if (prefix.slice(-1) !== '/')
          e = prefix + '/' + e
        else
          e = prefix + e
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e)
      }
      this._emitMatch(index, e)
    }
    // This was the last one, and no stats were needed
    return
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift()
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i]
    var newPattern
    if (prefix)
      newPattern = [prefix, e]
    else
      newPattern = [e]
    this._process(newPattern.concat(remain), index, inGlobStar)
  }
}


GlobSync.prototype._emitMatch = function (index, e) {
  if (isIgnored(this, e))
    return

  var abs = this._makeAbs(e)

  if (this.mark)
    e = this._mark(e)

  if (this.absolute) {
    e = abs
  }

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[abs]
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true

  if (this.stat)
    this._stat(e)
}


GlobSync.prototype._readdirInGlobStar = function (abs) {
  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false)

  var entries
  var lstat
  var stat
  try {
    lstat = fs.lstatSync(abs)
  } catch (er) {
    if (er.code === 'ENOENT') {
      // lstat failed, doesn't exist
      return null
    }
  }

  var isSym = lstat && lstat.isSymbolicLink()
  this.symlinks[abs] = isSym

  // If it's not a symlink or a dir, then it's definitely a regular file.
  // don't bother doing a readdir in that case.
  if (!isSym && lstat && !lstat.isDirectory())
    this.cache[abs] = 'FILE'
  else
    entries = this._readdir(abs, false)

  return entries
}

GlobSync.prototype._readdir = function (abs, inGlobStar) {
  var entries

  if (inGlobStar && !ownProp(this.symlinks, abs))
    return this._readdirInGlobStar(abs)

  if (ownProp(this.cache, abs)) {
    var c = this.cache[abs]
    if (!c || c === 'FILE')
      return null

    if (Array.isArray(c))
      return c
  }

  try {
    return this._readdirEntries(abs, fs.readdirSync(abs))
  } catch (er) {
    this._readdirError(abs, er)
    return null
  }
}

GlobSync.prototype._readdirEntries = function (abs, entries) {
  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i]
      if (abs === '/')
        e = abs + e
      else
        e = abs + '/' + e
      this.cache[e] = true
    }
  }

  this.cache[abs] = entries

  // mark and cache dir-ness
  return entries
}

GlobSync.prototype._readdirError = function (f, er) {
  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      var abs = this._makeAbs(f)
      this.cache[abs] = 'FILE'
      if (abs === this.cwdAbs) {
        var error = new Error(er.code + ' invalid cwd ' + this.cwd)
        error.path = this.cwd
        error.code = er.code
        throw error
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false
      if (this.strict)
        throw er
      if (!this.silent)
        console.error('glob error', er)
      break
  }
}

GlobSync.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar) {

  var entries = this._readdir(abs, inGlobStar)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1)
  var gspref = prefix ? [ prefix ] : []
  var noGlobStar = gspref.concat(remainWithoutGlobStar)

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false)

  var len = entries.length
  var isSym = this.symlinks[abs]

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return

  for (var i = 0; i < len; i++) {
    var e = entries[i]
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
    this._process(instead, index, true)

    var below = gspref.concat(entries[i], remain)
    this._process(below, index, true)
  }
}

GlobSync.prototype._processSimple = function (prefix, index) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var exists = this._stat(prefix)

  if (!this.matches[index])
    this.matches[index] = Object.create(null)

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return

  if (prefix && isAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix)
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix)
    } else {
      prefix = path.resolve(this.root, prefix)
      if (trail)
        prefix += '/'
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/')

  // Mark this as a match
  this._emitMatch(index, prefix)
}

// Returns either 'DIR', 'FILE', or false
GlobSync.prototype._stat = function (f) {
  var abs = this._makeAbs(f)
  var needDir = f.slice(-1) === '/'

  if (f.length > this.maxLength)
    return false

  if (!this.stat && ownProp(this.cache, abs)) {
    var c = this.cache[abs]

    if (Array.isArray(c))
      c = 'DIR'

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return c

    if (needDir && c === 'FILE')
      return false

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }

  var exists
  var stat = this.statCache[abs]
  if (!stat) {
    var lstat
    try {
      lstat = fs.lstatSync(abs)
    } catch (er) {
      if (er && (er.code === 'ENOENT' || er.code === 'ENOTDIR')) {
        this.statCache[abs] = false
        return false
      }
    }

    if (lstat && lstat.isSymbolicLink()) {
      try {
        stat = fs.statSync(abs)
      } catch (er) {
        stat = lstat
      }
    } else {
      stat = lstat
    }
  }

  this.statCache[abs] = stat

  var c = true
  if (stat)
    c = stat.isDirectory() ? 'DIR' : 'FILE'

  this.cache[abs] = this.cache[abs] || c

  if (needDir && c === 'FILE')
    return false

  return c
}

GlobSync.prototype._mark = function (p) {
  return common.mark(this, p)
}

GlobSync.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
}


/***/ }),

/***/ 6472:
/***/ ((module) => {

"use strict";


module.exports = clone

var getPrototypeOf = Object.getPrototypeOf || function (obj) {
  return obj.__proto__
}

function clone (obj) {
  if (obj === null || typeof obj !== 'object')
    return obj

  if (obj instanceof Object)
    var copy = { __proto__: getPrototypeOf(obj) }
  else
    var copy = Object.create(null)

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key))
  })

  return copy
}


/***/ }),

/***/ 1780:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var fs = __nccwpck_require__(5747)
var polyfills = __nccwpck_require__(7073)
var legacy = __nccwpck_require__(8607)
var clone = __nccwpck_require__(6472)

var util = __nccwpck_require__(1669)

/* istanbul ignore next - node 0.x polyfill */
var gracefulQueue
var previousSymbol

/* istanbul ignore else - node 0.x polyfill */
if (typeof Symbol === 'function' && typeof Symbol.for === 'function') {
  gracefulQueue = Symbol.for('graceful-fs.queue')
  // This is used in testing by future versions
  previousSymbol = Symbol.for('graceful-fs.previous')
} else {
  gracefulQueue = '___graceful-fs.queue'
  previousSymbol = '___graceful-fs.previous'
}

function noop () {}

function publishQueue(context, queue) {
  Object.defineProperty(context, gracefulQueue, {
    get: function() {
      return queue
    }
  })
}

var debug = noop
if (util.debuglog)
  debug = util.debuglog('gfs4')
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
  debug = function() {
    var m = util.format.apply(util, arguments)
    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ')
    console.error(m)
  }

// Once time initialization
if (!fs[gracefulQueue]) {
  // This queue can be shared by multiple loaded instances
  var queue = global[gracefulQueue] || []
  publishQueue(fs, queue)

  // Patch fs.close/closeSync to shared queue version, because we need
  // to retry() whenever a close happens *anywhere* in the program.
  // This is essential when multiple graceful-fs instances are
  // in play at the same time.
  fs.close = (function (fs$close) {
    function close (fd, cb) {
      return fs$close.call(fs, fd, function (err) {
        // This function uses the graceful-fs shared queue
        if (!err) {
          retry()
        }

        if (typeof cb === 'function')
          cb.apply(this, arguments)
      })
    }

    Object.defineProperty(close, previousSymbol, {
      value: fs$close
    })
    return close
  })(fs.close)

  fs.closeSync = (function (fs$closeSync) {
    function closeSync (fd) {
      // This function uses the graceful-fs shared queue
      fs$closeSync.apply(fs, arguments)
      retry()
    }

    Object.defineProperty(closeSync, previousSymbol, {
      value: fs$closeSync
    })
    return closeSync
  })(fs.closeSync)

  if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
    process.on('exit', function() {
      debug(fs[gracefulQueue])
      __nccwpck_require__(2357).equal(fs[gracefulQueue].length, 0)
    })
  }
}

if (!global[gracefulQueue]) {
  publishQueue(global, fs[gracefulQueue]);
}

module.exports = patch(clone(fs))
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
    module.exports = patch(fs)
    fs.__patched = true;
}

function patch (fs) {
  // Everything that references the open() function needs to be in here
  polyfills(fs)
  fs.gracefulify = patch

  fs.createReadStream = createReadStream
  fs.createWriteStream = createWriteStream
  var fs$readFile = fs.readFile
  fs.readFile = readFile
  function readFile (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$readFile(path, options, cb)

    function go$readFile (path, options, cb) {
      return fs$readFile(path, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readFile, [path, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$writeFile = fs.writeFile
  fs.writeFile = writeFile
  function writeFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$writeFile(path, data, options, cb)

    function go$writeFile (path, data, options, cb) {
      return fs$writeFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$writeFile, [path, data, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$appendFile = fs.appendFile
  if (fs$appendFile)
    fs.appendFile = appendFile
  function appendFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$appendFile(path, data, options, cb)

    function go$appendFile (path, data, options, cb) {
      return fs$appendFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$appendFile, [path, data, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$copyFile = fs.copyFile
  if (fs$copyFile)
    fs.copyFile = copyFile
  function copyFile (src, dest, flags, cb) {
    if (typeof flags === 'function') {
      cb = flags
      flags = 0
    }
    return fs$copyFile(src, dest, flags, function (err) {
      if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
        enqueue([fs$copyFile, [src, dest, flags, cb]])
      else {
        if (typeof cb === 'function')
          cb.apply(this, arguments)
        retry()
      }
    })
  }

  var fs$readdir = fs.readdir
  fs.readdir = readdir
  function readdir (path, options, cb) {
    var args = [path]
    if (typeof options !== 'function') {
      args.push(options)
    } else {
      cb = options
    }
    args.push(go$readdir$cb)

    return go$readdir(args)

    function go$readdir$cb (err, files) {
      if (files && files.sort)
        files.sort()

      if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
        enqueue([go$readdir, [args]])

      else {
        if (typeof cb === 'function')
          cb.apply(this, arguments)
        retry()
      }
    }
  }

  function go$readdir (args) {
    return fs$readdir.apply(fs, args)
  }

  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacy(fs)
    ReadStream = legStreams.ReadStream
    WriteStream = legStreams.WriteStream
  }

  var fs$ReadStream = fs.ReadStream
  if (fs$ReadStream) {
    ReadStream.prototype = Object.create(fs$ReadStream.prototype)
    ReadStream.prototype.open = ReadStream$open
  }

  var fs$WriteStream = fs.WriteStream
  if (fs$WriteStream) {
    WriteStream.prototype = Object.create(fs$WriteStream.prototype)
    WriteStream.prototype.open = WriteStream$open
  }

  Object.defineProperty(fs, 'ReadStream', {
    get: function () {
      return ReadStream
    },
    set: function (val) {
      ReadStream = val
    },
    enumerable: true,
    configurable: true
  })
  Object.defineProperty(fs, 'WriteStream', {
    get: function () {
      return WriteStream
    },
    set: function (val) {
      WriteStream = val
    },
    enumerable: true,
    configurable: true
  })

  // legacy names
  var FileReadStream = ReadStream
  Object.defineProperty(fs, 'FileReadStream', {
    get: function () {
      return FileReadStream
    },
    set: function (val) {
      FileReadStream = val
    },
    enumerable: true,
    configurable: true
  })
  var FileWriteStream = WriteStream
  Object.defineProperty(fs, 'FileWriteStream', {
    get: function () {
      return FileWriteStream
    },
    set: function (val) {
      FileWriteStream = val
    },
    enumerable: true,
    configurable: true
  })

  function ReadStream (path, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments)
  }

  function ReadStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy()

        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
        that.read()
      }
    })
  }

  function WriteStream (path, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments)
  }

  function WriteStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        that.destroy()
        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
      }
    })
  }

  function createReadStream (path, options) {
    return new fs.ReadStream(path, options)
  }

  function createWriteStream (path, options) {
    return new fs.WriteStream(path, options)
  }

  var fs$open = fs.open
  fs.open = open
  function open (path, flags, mode, cb) {
    if (typeof mode === 'function')
      cb = mode, mode = null

    return go$open(path, flags, mode, cb)

    function go$open (path, flags, mode, cb) {
      return fs$open(path, flags, mode, function (err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$open, [path, flags, mode, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  return fs
}

function enqueue (elem) {
  debug('ENQUEUE', elem[0].name, elem[1])
  fs[gracefulQueue].push(elem)
}

function retry () {
  var elem = fs[gracefulQueue].shift()
  if (elem) {
    debug('RETRY', elem[0].name, elem[1])
    elem[0].apply(null, elem[1])
  }
}


/***/ }),

/***/ 8607:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var Stream = __nccwpck_require__(2413).Stream

module.exports = legacy

function legacy (fs) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  }

  function ReadStream (path, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path, options);

    Stream.call(this);

    var self = this;

    this.path = path;
    this.fd = null;
    this.readable = true;
    this.paused = false;

    this.flags = 'r';
    this.mode = 438; /*=0666*/
    this.bufferSize = 64 * 1024;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function() {
        self._read();
      });
      return;
    }

    fs.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);
      self._read();
    })
  }

  function WriteStream (path, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path, options);

    Stream.call(this);

    this.path = path;
    this.fd = null;
    this.writable = true;

    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438; /*=0666*/
    this.bytesWritten = 0;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
      this.flush();
    }
  }
}


/***/ }),

/***/ 7073:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var constants = __nccwpck_require__(7619)

var origCwd = process.cwd
var cwd = null

var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform

process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process)
  return cwd
}
try {
  process.cwd()
} catch (er) {}

// This check is needed until node.js 12 is required
if (typeof process.chdir === 'function') {
  var chdir = process.chdir
  process.chdir = function (d) {
    cwd = null
    chdir.call(process, d)
  }
  if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir)
}

module.exports = patch

function patch (fs) {
  // (re-)implement some things that are known busted or missing.

  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs)
  }

  // lutimes implementation, or no-op
  if (!fs.lutimes) {
    patchLutimes(fs)
  }

  // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.

  fs.chown = chownFix(fs.chown)
  fs.fchown = chownFix(fs.fchown)
  fs.lchown = chownFix(fs.lchown)

  fs.chmod = chmodFix(fs.chmod)
  fs.fchmod = chmodFix(fs.fchmod)
  fs.lchmod = chmodFix(fs.lchmod)

  fs.chownSync = chownFixSync(fs.chownSync)
  fs.fchownSync = chownFixSync(fs.fchownSync)
  fs.lchownSync = chownFixSync(fs.lchownSync)

  fs.chmodSync = chmodFixSync(fs.chmodSync)
  fs.fchmodSync = chmodFixSync(fs.fchmodSync)
  fs.lchmodSync = chmodFixSync(fs.lchmodSync)

  fs.stat = statFix(fs.stat)
  fs.fstat = statFix(fs.fstat)
  fs.lstat = statFix(fs.lstat)

  fs.statSync = statFixSync(fs.statSync)
  fs.fstatSync = statFixSync(fs.fstatSync)
  fs.lstatSync = statFixSync(fs.lstatSync)

  // if lchmod/lchown do not exist, then make them no-ops
  if (!fs.lchmod) {
    fs.lchmod = function (path, mode, cb) {
      if (cb) process.nextTick(cb)
    }
    fs.lchmodSync = function () {}
  }
  if (!fs.lchown) {
    fs.lchown = function (path, uid, gid, cb) {
      if (cb) process.nextTick(cb)
    }
    fs.lchownSync = function () {}
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.

  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.
  if (platform === "win32") {
    fs.rename = (function (fs$rename) { return function (from, to, cb) {
      var start = Date.now()
      var backoff = 0;
      fs$rename(from, to, function CB (er) {
        if (er
            && (er.code === "EACCES" || er.code === "EPERM")
            && Date.now() - start < 60000) {
          setTimeout(function() {
            fs.stat(to, function (stater, st) {
              if (stater && stater.code === "ENOENT")
                fs$rename(from, to, CB);
              else
                cb(er)
            })
          }, backoff)
          if (backoff < 100)
            backoff += 10;
          return;
        }
        if (cb) cb(er)
      })
    }})(fs.rename)
  }

  // if read() returns EAGAIN, then just try it again.
  fs.read = (function (fs$read) {
    function read (fd, buffer, offset, length, position, callback_) {
      var callback
      if (callback_ && typeof callback_ === 'function') {
        var eagCounter = 0
        callback = function (er, _, __) {
          if (er && er.code === 'EAGAIN' && eagCounter < 10) {
            eagCounter ++
            return fs$read.call(fs, fd, buffer, offset, length, position, callback)
          }
          callback_.apply(this, arguments)
        }
      }
      return fs$read.call(fs, fd, buffer, offset, length, position, callback)
    }

    // This ensures `util.promisify` works as it does for native `fs.read`.
    if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read)
    return read
  })(fs.read)

  fs.readSync = (function (fs$readSync) { return function (fd, buffer, offset, length, position) {
    var eagCounter = 0
    while (true) {
      try {
        return fs$readSync.call(fs, fd, buffer, offset, length, position)
      } catch (er) {
        if (er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++
          continue
        }
        throw er
      }
    }
  }})(fs.readSync)

  function patchLchmod (fs) {
    fs.lchmod = function (path, mode, callback) {
      fs.open( path
             , constants.O_WRONLY | constants.O_SYMLINK
             , mode
             , function (err, fd) {
        if (err) {
          if (callback) callback(err)
          return
        }
        // prefer to return the chmod error, if one occurs,
        // but still try to close, and report closing errors if they occur.
        fs.fchmod(fd, mode, function (err) {
          fs.close(fd, function(err2) {
            if (callback) callback(err || err2)
          })
        })
      })
    }

    fs.lchmodSync = function (path, mode) {
      var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode)

      // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.
      var threw = true
      var ret
      try {
        ret = fs.fchmodSync(fd, mode)
        threw = false
      } finally {
        if (threw) {
          try {
            fs.closeSync(fd)
          } catch (er) {}
        } else {
          fs.closeSync(fd)
        }
      }
      return ret
    }
  }

  function patchLutimes (fs) {
    if (constants.hasOwnProperty("O_SYMLINK")) {
      fs.lutimes = function (path, at, mt, cb) {
        fs.open(path, constants.O_SYMLINK, function (er, fd) {
          if (er) {
            if (cb) cb(er)
            return
          }
          fs.futimes(fd, at, mt, function (er) {
            fs.close(fd, function (er2) {
              if (cb) cb(er || er2)
            })
          })
        })
      }

      fs.lutimesSync = function (path, at, mt) {
        var fd = fs.openSync(path, constants.O_SYMLINK)
        var ret
        var threw = true
        try {
          ret = fs.futimesSync(fd, at, mt)
          threw = false
        } finally {
          if (threw) {
            try {
              fs.closeSync(fd)
            } catch (er) {}
          } else {
            fs.closeSync(fd)
          }
        }
        return ret
      }

    } else {
      fs.lutimes = function (_a, _b, _c, cb) { if (cb) process.nextTick(cb) }
      fs.lutimesSync = function () {}
    }
  }

  function chmodFix (orig) {
    if (!orig) return orig
    return function (target, mode, cb) {
      return orig.call(fs, target, mode, function (er) {
        if (chownErOk(er)) er = null
        if (cb) cb.apply(this, arguments)
      })
    }
  }

  function chmodFixSync (orig) {
    if (!orig) return orig
    return function (target, mode) {
      try {
        return orig.call(fs, target, mode)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }


  function chownFix (orig) {
    if (!orig) return orig
    return function (target, uid, gid, cb) {
      return orig.call(fs, target, uid, gid, function (er) {
        if (chownErOk(er)) er = null
        if (cb) cb.apply(this, arguments)
      })
    }
  }

  function chownFixSync (orig) {
    if (!orig) return orig
    return function (target, uid, gid) {
      try {
        return orig.call(fs, target, uid, gid)
      } catch (er) {
        if (!chownErOk(er)) throw er
      }
    }
  }

  function statFix (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options, cb) {
      if (typeof options === 'function') {
        cb = options
        options = null
      }
      function callback (er, stats) {
        if (stats) {
          if (stats.uid < 0) stats.uid += 0x100000000
          if (stats.gid < 0) stats.gid += 0x100000000
        }
        if (cb) cb.apply(this, arguments)
      }
      return options ? orig.call(fs, target, options, callback)
        : orig.call(fs, target, callback)
    }
  }

  function statFixSync (orig) {
    if (!orig) return orig
    // Older versions of Node erroneously returned signed integers for
    // uid + gid.
    return function (target, options) {
      var stats = options ? orig.call(fs, target, options)
        : orig.call(fs, target)
      if (stats.uid < 0) stats.uid += 0x100000000
      if (stats.gid < 0) stats.gid += 0x100000000
      return stats;
    }
  }

  // ENOSYS means that the fs doesn't support the op. Just ignore
  // that, because it doesn't matter.
  //
  // if there's no getuid, or if getuid() is something other
  // than 0, and the error is EINVAL or EPERM, then just ignore
  // it.
  //
  // This specific case is a silent failure in cp, install, tar,
  // and most other unix tools that manage permissions.
  //
  // When running as root, or if other types of errors are
  // encountered, then it's strict.
  function chownErOk (er) {
    if (!er)
      return true

    if (er.code === "ENOSYS")
      return true

    var nonroot = !process.getuid || process.getuid() !== 0
    if (nonroot) {
      if (er.code === "EINVAL" || er.code === "EPERM")
        return true
    }

    return false
  }
}


/***/ }),

/***/ 3144:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var wrappy = __nccwpck_require__(4883)
var reqs = Object.create(null)
var once = __nccwpck_require__(9756)

module.exports = wrappy(inflight)

function inflight (key, cb) {
  if (reqs[key]) {
    reqs[key].push(cb)
    return null
  } else {
    reqs[key] = [cb]
    return makeres(key)
  }
}

function makeres (key) {
  return once(function RES () {
    var cbs = reqs[key]
    var len = cbs.length
    var args = slice(arguments)

    // XXX It's somewhat ambiguous whether a new callback added in this
    // pass should be queued for later execution if something in the
    // list of callbacks throws, or if it should just be discarded.
    // However, it's such an edge case that it hardly matters, and either
    // choice is likely as surprising as the other.
    // As it happens, we do go ahead and schedule it for later execution.
    try {
      for (var i = 0; i < len; i++) {
        cbs[i].apply(null, args)
      }
    } finally {
      if (cbs.length > len) {
        // added more in the interim.
        // de-zalgo, just in case, but don't call again.
        cbs.splice(0, len)
        process.nextTick(function () {
          RES.apply(null, args)
        })
      } else {
        delete reqs[key]
      }
    }
  })
}

function slice (args) {
  var length = args.length
  var array = []

  for (var i = 0; i < length; i++) array[i] = args[i]
  return array
}


/***/ }),

/***/ 8109:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

try {
  var util = __nccwpck_require__(1669);
  /* istanbul ignore next */
  if (typeof util.inherits !== 'function') throw '';
  module.exports = util.inherits;
} catch (e) {
  /* istanbul ignore next */
  module.exports = __nccwpck_require__(6658);
}


/***/ }),

/***/ 6658:
/***/ ((module) => {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}


/***/ }),

/***/ 4996:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

let _fs
try {
  _fs = __nccwpck_require__(1780)
} catch (_) {
  _fs = __nccwpck_require__(5747)
}
const universalify = __nccwpck_require__(3642)
const { stringify, stripBom } = __nccwpck_require__(9310)

async function _readFile (file, options = {}) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }

  const fs = options.fs || _fs

  const shouldThrow = 'throws' in options ? options.throws : true

  let data = await universalify.fromCallback(fs.readFile)(file, options)

  data = stripBom(data)

  let obj
  try {
    obj = JSON.parse(data, options ? options.reviver : null)
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`
      throw err
    } else {
      return null
    }
  }

  return obj
}

const readFile = universalify.fromPromise(_readFile)

function readFileSync (file, options = {}) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }

  const fs = options.fs || _fs

  const shouldThrow = 'throws' in options ? options.throws : true

  try {
    let content = fs.readFileSync(file, options)
    content = stripBom(content)
    return JSON.parse(content, options.reviver)
  } catch (err) {
    if (shouldThrow) {
      err.message = `${file}: ${err.message}`
      throw err
    } else {
      return null
    }
  }
}

async function _writeFile (file, obj, options = {}) {
  const fs = options.fs || _fs

  const str = stringify(obj, options)

  await universalify.fromCallback(fs.writeFile)(file, str, options)
}

const writeFile = universalify.fromPromise(_writeFile)

function writeFileSync (file, obj, options = {}) {
  const fs = options.fs || _fs

  const str = stringify(obj, options)
  // not sure if fs.writeFileSync returns anything, but just in case
  return fs.writeFileSync(file, str, options)
}

const jsonfile = {
  readFile,
  readFileSync,
  writeFile,
  writeFileSync
}

module.exports = jsonfile


/***/ }),

/***/ 9310:
/***/ ((module) => {

function stringify (obj, { EOL = '\n', finalEOL = true, replacer = null, spaces } = {}) {
  const EOF = finalEOL ? EOL : ''
  const str = JSON.stringify(obj, replacer, spaces)

  return str.replace(/\n/g, EOL) + EOF
}

function stripBom (content) {
  // we do this because JSON.parse would convert it to a utf8 string if encoding wasn't specified
  if (Buffer.isBuffer(content)) content = content.toString('utf8')
  return content.replace(/^\uFEFF/, '')
}

module.exports = { stringify, stripBom }


/***/ }),

/***/ 3872:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

module.exports = minimatch
minimatch.Minimatch = Minimatch

var path = { sep: '/' }
try {
  path = __nccwpck_require__(5622)
} catch (er) {}

var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
var expand = __nccwpck_require__(3957)

var plTypes = {
  '!': { open: '(?:(?!(?:', close: '))[^/]*?)'},
  '?': { open: '(?:', close: ')?' },
  '+': { open: '(?:', close: ')+' },
  '*': { open: '(?:', close: ')*' },
  '@': { open: '(?:', close: ')' }
}

// any single thing other than /
// don't need to escape / when using new RegExp()
var qmark = '[^/]'

// * => any number of characters
var star = qmark + '*?'

// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?'

// not a ^ or / followed by a dot,
// followed by anything, any number of times.
var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?'

// characters that need to be escaped in RegExp.
var reSpecials = charSet('().*{}+?[]^$\\!')

// "abc" -> { a:true, b:true, c:true }
function charSet (s) {
  return s.split('').reduce(function (set, c) {
    set[c] = true
    return set
  }, {})
}

// normalizes slashes.
var slashSplit = /\/+/

minimatch.filter = filter
function filter (pattern, options) {
  options = options || {}
  return function (p, i, list) {
    return minimatch(p, pattern, options)
  }
}

function ext (a, b) {
  a = a || {}
  b = b || {}
  var t = {}
  Object.keys(b).forEach(function (k) {
    t[k] = b[k]
  })
  Object.keys(a).forEach(function (k) {
    t[k] = a[k]
  })
  return t
}

minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return minimatch

  var orig = minimatch

  var m = function minimatch (p, pattern, options) {
    return orig.minimatch(p, pattern, ext(def, options))
  }

  m.Minimatch = function Minimatch (pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options))
  }

  return m
}

Minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return Minimatch
  return minimatch.defaults(def).Minimatch
}

function minimatch (p, pattern, options) {
  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}

  // shortcut: comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    return false
  }

  // "" only matches ""
  if (pattern.trim() === '') return p === ''

  return new Minimatch(pattern, options).match(p)
}

function Minimatch (pattern, options) {
  if (!(this instanceof Minimatch)) {
    return new Minimatch(pattern, options)
  }

  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}
  pattern = pattern.trim()

  // windows support: need to use /, not \
  if (path.sep !== '/') {
    pattern = pattern.split(path.sep).join('/')
  }

  this.options = options
  this.set = []
  this.pattern = pattern
  this.regexp = null
  this.negate = false
  this.comment = false
  this.empty = false

  // make the set of regexps etc.
  this.make()
}

Minimatch.prototype.debug = function () {}

Minimatch.prototype.make = make
function make () {
  // don't do it more than once.
  if (this._made) return

  var pattern = this.pattern
  var options = this.options

  // empty patterns and comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    this.comment = true
    return
  }
  if (!pattern) {
    this.empty = true
    return
  }

  // step 1: figure out negation, etc.
  this.parseNegate()

  // step 2: expand braces
  var set = this.globSet = this.braceExpand()

  if (options.debug) this.debug = console.error

  this.debug(this.pattern, set)

  // step 3: now we have a set, so turn each one into a series of path-portion
  // matching patterns.
  // These will be regexps, except in the case of "**", which is
  // set to the GLOBSTAR object for globstar behavior,
  // and will not contain any / characters
  set = this.globParts = set.map(function (s) {
    return s.split(slashSplit)
  })

  this.debug(this.pattern, set)

  // glob --> regexps
  set = set.map(function (s, si, set) {
    return s.map(this.parse, this)
  }, this)

  this.debug(this.pattern, set)

  // filter out everything that didn't compile properly.
  set = set.filter(function (s) {
    return s.indexOf(false) === -1
  })

  this.debug(this.pattern, set)

  this.set = set
}

Minimatch.prototype.parseNegate = parseNegate
function parseNegate () {
  var pattern = this.pattern
  var negate = false
  var options = this.options
  var negateOffset = 0

  if (options.nonegate) return

  for (var i = 0, l = pattern.length
    ; i < l && pattern.charAt(i) === '!'
    ; i++) {
    negate = !negate
    negateOffset++
  }

  if (negateOffset) this.pattern = pattern.substr(negateOffset)
  this.negate = negate
}

// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
  return braceExpand(pattern, options)
}

Minimatch.prototype.braceExpand = braceExpand

function braceExpand (pattern, options) {
  if (!options) {
    if (this instanceof Minimatch) {
      options = this.options
    } else {
      options = {}
    }
  }

  pattern = typeof pattern === 'undefined'
    ? this.pattern : pattern

  if (typeof pattern === 'undefined') {
    throw new TypeError('undefined pattern')
  }

  if (options.nobrace ||
    !pattern.match(/\{.*\}/)) {
    // shortcut. no need to expand.
    return [pattern]
  }

  return expand(pattern)
}

// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse
var SUBPARSE = {}
function parse (pattern, isSub) {
  if (pattern.length > 1024 * 64) {
    throw new TypeError('pattern is too long')
  }

  var options = this.options

  // shortcuts
  if (!options.noglobstar && pattern === '**') return GLOBSTAR
  if (pattern === '') return ''

  var re = ''
  var hasMagic = !!options.nocase
  var escaping = false
  // ? => one single character
  var patternListStack = []
  var negativeLists = []
  var stateChar
  var inClass = false
  var reClassStart = -1
  var classStart = -1
  // . and .. never match anything that doesn't start with .,
  // even when options.dot is set.
  var patternStart = pattern.charAt(0) === '.' ? '' // anything
  // not (start or / followed by . or .. followed by / or end)
  : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
  : '(?!\\.)'
  var self = this

  function clearStateChar () {
    if (stateChar) {
      // we had some state-tracking character
      // that wasn't consumed by this pass.
      switch (stateChar) {
        case '*':
          re += star
          hasMagic = true
        break
        case '?':
          re += qmark
          hasMagic = true
        break
        default:
          re += '\\' + stateChar
        break
      }
      self.debug('clearStateChar %j %j', stateChar, re)
      stateChar = false
    }
  }

  for (var i = 0, len = pattern.length, c
    ; (i < len) && (c = pattern.charAt(i))
    ; i++) {
    this.debug('%s\t%s %s %j', pattern, i, re, c)

    // skip over any that are escaped.
    if (escaping && reSpecials[c]) {
      re += '\\' + c
      escaping = false
      continue
    }

    switch (c) {
      case '/':
        // completely not allowed, even escaped.
        // Should already be path-split by now.
        return false

      case '\\':
        clearStateChar()
        escaping = true
      continue

      // the various stateChar values
      // for the "extglob" stuff.
      case '?':
      case '*':
      case '+':
      case '@':
      case '!':
        this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c)

        // all of those are literals inside a class, except that
        // the glob [!a] means [^a] in regexp
        if (inClass) {
          this.debug('  in class')
          if (c === '!' && i === classStart + 1) c = '^'
          re += c
          continue
        }

        // if we already have a stateChar, then it means
        // that there was something like ** or +? in there.
        // Handle the stateChar, then proceed with this one.
        self.debug('call clearStateChar %j', stateChar)
        clearStateChar()
        stateChar = c
        // if extglob is disabled, then +(asdf|foo) isn't a thing.
        // just clear the statechar *now*, rather than even diving into
        // the patternList stuff.
        if (options.noext) clearStateChar()
      continue

      case '(':
        if (inClass) {
          re += '('
          continue
        }

        if (!stateChar) {
          re += '\\('
          continue
        }

        patternListStack.push({
          type: stateChar,
          start: i - 1,
          reStart: re.length,
          open: plTypes[stateChar].open,
          close: plTypes[stateChar].close
        })
        // negation is (?:(?!js)[^/]*)
        re += stateChar === '!' ? '(?:(?!(?:' : '(?:'
        this.debug('plType %j %j', stateChar, re)
        stateChar = false
      continue

      case ')':
        if (inClass || !patternListStack.length) {
          re += '\\)'
          continue
        }

        clearStateChar()
        hasMagic = true
        var pl = patternListStack.pop()
        // negation is (?:(?!js)[^/]*)
        // The others are (?:<pattern>)<type>
        re += pl.close
        if (pl.type === '!') {
          negativeLists.push(pl)
        }
        pl.reEnd = re.length
      continue

      case '|':
        if (inClass || !patternListStack.length || escaping) {
          re += '\\|'
          escaping = false
          continue
        }

        clearStateChar()
        re += '|'
      continue

      // these are mostly the same in regexp and glob
      case '[':
        // swallow any state-tracking char before the [
        clearStateChar()

        if (inClass) {
          re += '\\' + c
          continue
        }

        inClass = true
        classStart = i
        reClassStart = re.length
        re += c
      continue

      case ']':
        //  a right bracket shall lose its special
        //  meaning and represent itself in
        //  a bracket expression if it occurs
        //  first in the list.  -- POSIX.2 2.8.3.2
        if (i === classStart + 1 || !inClass) {
          re += '\\' + c
          escaping = false
          continue
        }

        // handle the case where we left a class open.
        // "[z-a]" is valid, equivalent to "\[z-a\]"
        if (inClass) {
          // split where the last [ was, make sure we don't have
          // an invalid re. if so, re-walk the contents of the
          // would-be class to re-translate any characters that
          // were passed through as-is
          // TODO: It would probably be faster to determine this
          // without a try/catch and a new RegExp, but it's tricky
          // to do safely.  For now, this is safe and works.
          var cs = pattern.substring(classStart + 1, i)
          try {
            RegExp('[' + cs + ']')
          } catch (er) {
            // not a valid class!
            var sp = this.parse(cs, SUBPARSE)
            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]'
            hasMagic = hasMagic || sp[1]
            inClass = false
            continue
          }
        }

        // finish up the class.
        hasMagic = true
        inClass = false
        re += c
      continue

      default:
        // swallow any state char that wasn't consumed
        clearStateChar()

        if (escaping) {
          // no need
          escaping = false
        } else if (reSpecials[c]
          && !(c === '^' && inClass)) {
          re += '\\'
        }

        re += c

    } // switch
  } // for

  // handle the case where we left a class open.
  // "[abc" is valid, equivalent to "\[abc"
  if (inClass) {
    // split where the last [ was, and escape it
    // this is a huge pita.  We now have to re-walk
    // the contents of the would-be class to re-translate
    // any characters that were passed through as-is
    cs = pattern.substr(classStart + 1)
    sp = this.parse(cs, SUBPARSE)
    re = re.substr(0, reClassStart) + '\\[' + sp[0]
    hasMagic = hasMagic || sp[1]
  }

  // handle the case where we had a +( thing at the *end*
  // of the pattern.
  // each pattern list stack adds 3 chars, and we need to go through
  // and escape any | chars that were passed through as-is for the regexp.
  // Go through and escape them, taking care not to double-escape any
  // | chars that were already escaped.
  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + pl.open.length)
    this.debug('setting tail', re, pl)
    // maybe some even number of \, then maybe 1 \, followed by a |
    tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function (_, $1, $2) {
      if (!$2) {
        // the | isn't already escaped, so escape it.
        $2 = '\\'
      }

      // need to escape all those slashes *again*, without escaping the
      // one that we need for escaping the | character.  As it works out,
      // escaping an even number of slashes can be done by simply repeating
      // it exactly after itself.  That's why this trick works.
      //
      // I am sorry that you have to see this.
      return $1 + $1 + $2 + '|'
    })

    this.debug('tail=%j\n   %s', tail, tail, pl, re)
    var t = pl.type === '*' ? star
      : pl.type === '?' ? qmark
      : '\\' + pl.type

    hasMagic = true
    re = re.slice(0, pl.reStart) + t + '\\(' + tail
  }

  // handle trailing things that only matter at the very end.
  clearStateChar()
  if (escaping) {
    // trailing \\
    re += '\\\\'
  }

  // only need to apply the nodot start if the re starts with
  // something that could conceivably capture a dot
  var addPatternStart = false
  switch (re.charAt(0)) {
    case '.':
    case '[':
    case '(': addPatternStart = true
  }

  // Hack to work around lack of negative lookbehind in JS
  // A pattern like: *.!(x).!(y|z) needs to ensure that a name
  // like 'a.xyz.yz' doesn't match.  So, the first negative
  // lookahead, has to look ALL the way ahead, to the end of
  // the pattern.
  for (var n = negativeLists.length - 1; n > -1; n--) {
    var nl = negativeLists[n]

    var nlBefore = re.slice(0, nl.reStart)
    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8)
    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd)
    var nlAfter = re.slice(nl.reEnd)

    nlLast += nlAfter

    // Handle nested stuff like *(*.js|!(*.json)), where open parens
    // mean that we should *not* include the ) in the bit that is considered
    // "after" the negated section.
    var openParensBefore = nlBefore.split('(').length - 1
    var cleanAfter = nlAfter
    for (i = 0; i < openParensBefore; i++) {
      cleanAfter = cleanAfter.replace(/\)[+*?]?/, '')
    }
    nlAfter = cleanAfter

    var dollar = ''
    if (nlAfter === '' && isSub !== SUBPARSE) {
      dollar = '$'
    }
    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast
    re = newRe
  }

  // if the re is not "" at this point, then we need to make sure
  // it doesn't match against an empty path part.
  // Otherwise a/* will match a/, which it should not.
  if (re !== '' && hasMagic) {
    re = '(?=.)' + re
  }

  if (addPatternStart) {
    re = patternStart + re
  }

  // parsing just a piece of a larger pattern.
  if (isSub === SUBPARSE) {
    return [re, hasMagic]
  }

  // skip the regexp for non-magical patterns
  // unescape anything in it, though, so that it'll be
  // an exact match against a file etc.
  if (!hasMagic) {
    return globUnescape(pattern)
  }

  var flags = options.nocase ? 'i' : ''
  try {
    var regExp = new RegExp('^' + re + '$', flags)
  } catch (er) {
    // If it was an invalid regular expression, then it can't match
    // anything.  This trick looks for a character after the end of
    // the string, which is of course impossible, except in multi-line
    // mode, but it's not a /m regex.
    return new RegExp('$.')
  }

  regExp._glob = pattern
  regExp._src = re

  return regExp
}

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe()
}

Minimatch.prototype.makeRe = makeRe
function makeRe () {
  if (this.regexp || this.regexp === false) return this.regexp

  // at this point, this.set is a 2d array of partial
  // pattern strings, or "**".
  //
  // It's better to use .match().  This function shouldn't
  // be used, really, but it's pretty convenient sometimes,
  // when you just want to work with a regex.
  var set = this.set

  if (!set.length) {
    this.regexp = false
    return this.regexp
  }
  var options = this.options

  var twoStar = options.noglobstar ? star
    : options.dot ? twoStarDot
    : twoStarNoDot
  var flags = options.nocase ? 'i' : ''

  var re = set.map(function (pattern) {
    return pattern.map(function (p) {
      return (p === GLOBSTAR) ? twoStar
      : (typeof p === 'string') ? regExpEscape(p)
      : p._src
    }).join('\\\/')
  }).join('|')

  // must match entire pattern
  // ending in a * or ** will make it less strict.
  re = '^(?:' + re + ')$'

  // can match anything, as long as it's not this.
  if (this.negate) re = '^(?!' + re + ').*$'

  try {
    this.regexp = new RegExp(re, flags)
  } catch (ex) {
    this.regexp = false
  }
  return this.regexp
}

minimatch.match = function (list, pattern, options) {
  options = options || {}
  var mm = new Minimatch(pattern, options)
  list = list.filter(function (f) {
    return mm.match(f)
  })
  if (mm.options.nonull && !list.length) {
    list.push(pattern)
  }
  return list
}

Minimatch.prototype.match = match
function match (f, partial) {
  this.debug('match', f, this.pattern)
  // short-circuit in the case of busted things.
  // comments, etc.
  if (this.comment) return false
  if (this.empty) return f === ''

  if (f === '/' && partial) return true

  var options = this.options

  // windows: need to use /, not \
  if (path.sep !== '/') {
    f = f.split(path.sep).join('/')
  }

  // treat the test path as a set of pathparts.
  f = f.split(slashSplit)
  this.debug(this.pattern, 'split', f)

  // just ONE of the pattern sets in this.set needs to match
  // in order for it to be valid.  If negating, then just one
  // match means that we have failed.
  // Either way, return on the first hit.

  var set = this.set
  this.debug(this.pattern, 'set', set)

  // Find the basename of the path by looking for the last non-empty segment
  var filename
  var i
  for (i = f.length - 1; i >= 0; i--) {
    filename = f[i]
    if (filename) break
  }

  for (i = 0; i < set.length; i++) {
    var pattern = set[i]
    var file = f
    if (options.matchBase && pattern.length === 1) {
      file = [filename]
    }
    var hit = this.matchOne(file, pattern, partial)
    if (hit) {
      if (options.flipNegate) return true
      return !this.negate
    }
  }

  // didn't get any hits.  this is success if it's a negative
  // pattern, failure otherwise.
  if (options.flipNegate) return false
  return this.negate
}

// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
  var options = this.options

  this.debug('matchOne',
    { 'this': this, file: file, pattern: pattern })

  this.debug('matchOne', file.length, pattern.length)

  for (var fi = 0,
      pi = 0,
      fl = file.length,
      pl = pattern.length
      ; (fi < fl) && (pi < pl)
      ; fi++, pi++) {
    this.debug('matchOne loop')
    var p = pattern[pi]
    var f = file[fi]

    this.debug(pattern, p, f)

    // should be impossible.
    // some invalid regexp stuff in the set.
    if (p === false) return false

    if (p === GLOBSTAR) {
      this.debug('GLOBSTAR', [pattern, p, f])

      // "**"
      // a/**/b/**/c would match the following:
      // a/b/x/y/z/c
      // a/x/y/z/b/c
      // a/b/x/b/x/c
      // a/b/c
      // To do this, take the rest of the pattern after
      // the **, and see if it would match the file remainder.
      // If so, return success.
      // If not, the ** "swallows" a segment, and try again.
      // This is recursively awful.
      //
      // a/**/b/**/c matching a/b/x/y/z/c
      // - a matches a
      // - doublestar
      //   - matchOne(b/x/y/z/c, b/**/c)
      //     - b matches b
      //     - doublestar
      //       - matchOne(x/y/z/c, c) -> no
      //       - matchOne(y/z/c, c) -> no
      //       - matchOne(z/c, c) -> no
      //       - matchOne(c, c) yes, hit
      var fr = fi
      var pr = pi + 1
      if (pr === pl) {
        this.debug('** at the end')
        // a ** at the end will just swallow the rest.
        // We have found a match.
        // however, it will not swallow /.x, unless
        // options.dot is set.
        // . and .. are *never* matched by **, for explosively
        // exponential reasons.
        for (; fi < fl; fi++) {
          if (file[fi] === '.' || file[fi] === '..' ||
            (!options.dot && file[fi].charAt(0) === '.')) return false
        }
        return true
      }

      // ok, let's see if we can swallow whatever we can.
      while (fr < fl) {
        var swallowee = file[fr]

        this.debug('\nglobstar while', file, fr, pattern, pr, swallowee)

        // XXX remove this slice.  Just pass the start index.
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug('globstar found match!', fr, fl, swallowee)
          // found a match.
          return true
        } else {
          // can't swallow "." or ".." ever.
          // can only swallow ".foo" when explicitly asked.
          if (swallowee === '.' || swallowee === '..' ||
            (!options.dot && swallowee.charAt(0) === '.')) {
            this.debug('dot detected!', file, fr, pattern, pr)
            break
          }

          // ** swallows a segment, and continue.
          this.debug('globstar swallow a segment, and continue')
          fr++
        }
      }

      // no match was found.
      // However, in partial mode, we can't say this is necessarily over.
      // If there's more *pattern* left, then
      if (partial) {
        // ran out of file
        this.debug('\n>>> no match, partial?', file, fr, pattern, pr)
        if (fr === fl) return true
      }
      return false
    }

    // something other than **
    // non-magic patterns just have to match exactly
    // patterns with magic have been turned into regexps.
    var hit
    if (typeof p === 'string') {
      if (options.nocase) {
        hit = f.toLowerCase() === p.toLowerCase()
      } else {
        hit = f === p
      }
      this.debug('string match', p, f, hit)
    } else {
      hit = f.match(p)
      this.debug('pattern match', p, f, hit)
    }

    if (!hit) return false
  }

  // Note: ending in / means that we'll get a final ""
  // at the end of the pattern.  This can only match a
  // corresponding "" at the end of the file.
  // If the file ends in /, then it can only match a
  // a pattern that ends in /, unless the pattern just
  // doesn't have any more for it. But, a/b/ should *not*
  // match "a/b/*", even though "" matches against the
  // [^/]*? pattern, except in partial mode, where it might
  // simply not be reached yet.
  // However, a/b/ should still satisfy a/*

  // now either we fell off the end of the pattern, or we're done.
  if (fi === fl && pi === pl) {
    // ran out of pattern and filename at the same time.
    // an exact hit!
    return true
  } else if (fi === fl) {
    // ran out of file, but still had pattern left.
    // this is ok if we're doing the match as part of
    // a glob fs traversal.
    return partial
  } else if (pi === pl) {
    // ran out of pattern, still have file left.
    // this is only acceptable if we're on the very last
    // empty segment of a file with a trailing slash.
    // a/* should match a/b/
    var emptyFileEnd = (fi === fl - 1) && (file[fi] === '')
    return emptyFileEnd
  }

  // should be unreachable.
  throw new Error('wtf?')
}

// replace stuff like \* with *
function globUnescape (s) {
  return s.replace(/\\(.)/g, '$1')
}

function regExpEscape (s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}


/***/ }),

/***/ 9756:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var wrappy = __nccwpck_require__(4883)
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}


/***/ }),

/***/ 5642:
/***/ ((module) => {

"use strict";


function posix(path) {
	return path.charAt(0) === '/';
}

function win32(path) {
	// https://github.com/nodejs/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56
	var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
	var result = splitDeviceRe.exec(path);
	var device = result[1] || '';
	var isUnc = Boolean(device && device.charAt(1) !== ':');

	// UNC paths are always absolute
	return Boolean(result[2] || isUnc);
}

module.exports = process.platform === 'win32' ? win32 : posix;
module.exports.posix = posix;
module.exports.win32 = win32;


/***/ }),

/***/ 9096:
/***/ ((module) => {

// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2017 Kris Kowal under the terms of the MIT
 * license found at https://github.com/kriskowal/q/blob/v1/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (true) {
        module.exports = definition();

    // RequireJS
    } else { var previousQ, global; }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];

    function flush() {
        /* jshint loopfunc: true */
        var task, domain;

        while (head.next) {
            head = head.next;
            task = head.task;
            head.task = void 0;
            domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }
            runSingle(task, domain);

        }
        while (laterQueue.length) {
            task = laterQueue.pop();
            runSingle(task);
        }
        flushing = false;
    }
    // runs a single function in the async queue
    function runSingle(task, domain) {
        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process === "object" &&
        process.toString() === "[object process]" && process.nextTick) {
        // Ensure Q is in a real Node environment, with a `process.nextTick`.
        // To see through fake Node environments:
        // * Mocha test runner - exposes a `process` global without a `nextTick`
        // * Browserify - exposes a `process.nexTick` function that uses
        //   `setTimeout`. In this case `setImmediate` is preferred because
        //    it is faster. Browserify's `process.toString()` yields
        //   "[object Object]", while in a real Node environment
        //   `process.toString()` yields "[object process]".
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
        laterQueue.push(task);
        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };
    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_defineProperty = Object.defineProperty || function (obj, prop, descriptor) {
    obj[prop] = descriptor.value;
    return obj;
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack && (!error.__minimumStackCounter__ || error.__minimumStackCounter__ > p.stackCounter)) {
                object_defineProperty(error, "__minimumStackCounter__", {value: p.stackCounter, configurable: true});
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        var stack = filterStackString(concatedStacks);
        object_defineProperty(error, "stack", {value: stack, configurable: true});
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * The counter is used to determine the stopping point for building
 * long stack traces. In makeStackTraceLong we walk backwards through
 * the linked list of promises, only stacks which were created before
 * the rejection are concatenated.
 */
var longStackCounter = 1;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
            promise.stackCounter = longStackCounter++;
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;

        if (Q.longStackSupport && hasStacks) {
            // Only hold a reference to the new promise if long stacks
            // are enabled to reduce memory usage
            promise.source = newPromise;
        }

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Q can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function (resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function (answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var reportedUnhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
            if (array_indexOf(unhandledRejections, promise) !== -1) {
                process.emit("unhandledRejection", reason, promise);
                reportedUnhandledRejections.push(promise);
            }
        });
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        if (typeof process === "object" && typeof process.emit === "function") {
            Q.nextTick.runAfter(function () {
                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                if (atReport !== -1) {
                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                    reportedUnhandledRejections.splice(atReport, 1);
                }
            });
        }
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function (prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected(err) {
            pendingCount--;
            if (pendingCount === 0) {
                var rejection = err || new Error("" + err);

                rejection.message = ("Q can't get fulfillment value from any promise, all " +
                    "promises were rejected. Last error message: " + rejection.message);

                deferred.reject(rejection);
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function () {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    if (!callback || typeof callback.apply !== "function") {
        throw new Error("Q can't apply finally callback");
    }
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    if (callback === undefined) {
        throw new Error("Q can't wrap an undefined function");
    }
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

Q.noConflict = function() {
    throw new Error("Q.noConflict only works when Q is used as a global");
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});


/***/ }),

/***/ 3950:
/***/ ((module, exports) => {

exports = module.exports = SemVer

var debug
/* istanbul ignore next */
if (typeof process === 'object' &&
    process.env &&
    process.env.NODE_DEBUG &&
    /\bsemver\b/i.test(process.env.NODE_DEBUG)) {
  debug = function () {
    var args = Array.prototype.slice.call(arguments, 0)
    args.unshift('SEMVER')
    console.log.apply(console, args)
  }
} else {
  debug = function () {}
}

// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
exports.SEMVER_SPEC_VERSION = '2.0.0'

var MAX_LENGTH = 256
var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER ||
  /* istanbul ignore next */ 9007199254740991

// Max safe segment length for coercion.
var MAX_SAFE_COMPONENT_LENGTH = 16

// The actual regexps go on exports.re
var re = exports.re = []
var src = exports.src = []
var R = 0

// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.

// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.

var NUMERICIDENTIFIER = R++
src[NUMERICIDENTIFIER] = '0|[1-9]\\d*'
var NUMERICIDENTIFIERLOOSE = R++
src[NUMERICIDENTIFIERLOOSE] = '[0-9]+'

// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.

var NONNUMERICIDENTIFIER = R++
src[NONNUMERICIDENTIFIER] = '\\d*[a-zA-Z-][a-zA-Z0-9-]*'

// ## Main Version
// Three dot-separated numeric identifiers.

var MAINVERSION = R++
src[MAINVERSION] = '(' + src[NUMERICIDENTIFIER] + ')\\.' +
                   '(' + src[NUMERICIDENTIFIER] + ')\\.' +
                   '(' + src[NUMERICIDENTIFIER] + ')'

var MAINVERSIONLOOSE = R++
src[MAINVERSIONLOOSE] = '(' + src[NUMERICIDENTIFIERLOOSE] + ')\\.' +
                        '(' + src[NUMERICIDENTIFIERLOOSE] + ')\\.' +
                        '(' + src[NUMERICIDENTIFIERLOOSE] + ')'

// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.

var PRERELEASEIDENTIFIER = R++
src[PRERELEASEIDENTIFIER] = '(?:' + src[NUMERICIDENTIFIER] +
                            '|' + src[NONNUMERICIDENTIFIER] + ')'

var PRERELEASEIDENTIFIERLOOSE = R++
src[PRERELEASEIDENTIFIERLOOSE] = '(?:' + src[NUMERICIDENTIFIERLOOSE] +
                                 '|' + src[NONNUMERICIDENTIFIER] + ')'

// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.

var PRERELEASE = R++
src[PRERELEASE] = '(?:-(' + src[PRERELEASEIDENTIFIER] +
                  '(?:\\.' + src[PRERELEASEIDENTIFIER] + ')*))'

var PRERELEASELOOSE = R++
src[PRERELEASELOOSE] = '(?:-?(' + src[PRERELEASEIDENTIFIERLOOSE] +
                       '(?:\\.' + src[PRERELEASEIDENTIFIERLOOSE] + ')*))'

// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.

var BUILDIDENTIFIER = R++
src[BUILDIDENTIFIER] = '[0-9A-Za-z-]+'

// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.

var BUILD = R++
src[BUILD] = '(?:\\+(' + src[BUILDIDENTIFIER] +
             '(?:\\.' + src[BUILDIDENTIFIER] + ')*))'

// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.

// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.

var FULL = R++
var FULLPLAIN = 'v?' + src[MAINVERSION] +
                src[PRERELEASE] + '?' +
                src[BUILD] + '?'

src[FULL] = '^' + FULLPLAIN + '$'

// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
// common in the npm registry.
var LOOSEPLAIN = '[v=\\s]*' + src[MAINVERSIONLOOSE] +
                 src[PRERELEASELOOSE] + '?' +
                 src[BUILD] + '?'

var LOOSE = R++
src[LOOSE] = '^' + LOOSEPLAIN + '$'

var GTLT = R++
src[GTLT] = '((?:<|>)?=?)'

// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifer, meaning "any version"
// Only the first item is strictly required.
var XRANGEIDENTIFIERLOOSE = R++
src[XRANGEIDENTIFIERLOOSE] = src[NUMERICIDENTIFIERLOOSE] + '|x|X|\\*'
var XRANGEIDENTIFIER = R++
src[XRANGEIDENTIFIER] = src[NUMERICIDENTIFIER] + '|x|X|\\*'

var XRANGEPLAIN = R++
src[XRANGEPLAIN] = '[v=\\s]*(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:\\.(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:\\.(' + src[XRANGEIDENTIFIER] + ')' +
                   '(?:' + src[PRERELEASE] + ')?' +
                   src[BUILD] + '?' +
                   ')?)?'

var XRANGEPLAINLOOSE = R++
src[XRANGEPLAINLOOSE] = '[v=\\s]*(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:\\.(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:\\.(' + src[XRANGEIDENTIFIERLOOSE] + ')' +
                        '(?:' + src[PRERELEASELOOSE] + ')?' +
                        src[BUILD] + '?' +
                        ')?)?'

var XRANGE = R++
src[XRANGE] = '^' + src[GTLT] + '\\s*' + src[XRANGEPLAIN] + '$'
var XRANGELOOSE = R++
src[XRANGELOOSE] = '^' + src[GTLT] + '\\s*' + src[XRANGEPLAINLOOSE] + '$'

// Coercion.
// Extract anything that could conceivably be a part of a valid semver
var COERCE = R++
src[COERCE] = '(?:^|[^\\d])' +
              '(\\d{1,' + MAX_SAFE_COMPONENT_LENGTH + '})' +
              '(?:\\.(\\d{1,' + MAX_SAFE_COMPONENT_LENGTH + '}))?' +
              '(?:\\.(\\d{1,' + MAX_SAFE_COMPONENT_LENGTH + '}))?' +
              '(?:$|[^\\d])'

// Tilde ranges.
// Meaning is "reasonably at or greater than"
var LONETILDE = R++
src[LONETILDE] = '(?:~>?)'

var TILDETRIM = R++
src[TILDETRIM] = '(\\s*)' + src[LONETILDE] + '\\s+'
re[TILDETRIM] = new RegExp(src[TILDETRIM], 'g')
var tildeTrimReplace = '$1~'

var TILDE = R++
src[TILDE] = '^' + src[LONETILDE] + src[XRANGEPLAIN] + '$'
var TILDELOOSE = R++
src[TILDELOOSE] = '^' + src[LONETILDE] + src[XRANGEPLAINLOOSE] + '$'

// Caret ranges.
// Meaning is "at least and backwards compatible with"
var LONECARET = R++
src[LONECARET] = '(?:\\^)'

var CARETTRIM = R++
src[CARETTRIM] = '(\\s*)' + src[LONECARET] + '\\s+'
re[CARETTRIM] = new RegExp(src[CARETTRIM], 'g')
var caretTrimReplace = '$1^'

var CARET = R++
src[CARET] = '^' + src[LONECARET] + src[XRANGEPLAIN] + '$'
var CARETLOOSE = R++
src[CARETLOOSE] = '^' + src[LONECARET] + src[XRANGEPLAINLOOSE] + '$'

// A simple gt/lt/eq thing, or just "" to indicate "any version"
var COMPARATORLOOSE = R++
src[COMPARATORLOOSE] = '^' + src[GTLT] + '\\s*(' + LOOSEPLAIN + ')$|^$'
var COMPARATOR = R++
src[COMPARATOR] = '^' + src[GTLT] + '\\s*(' + FULLPLAIN + ')$|^$'

// An expression to strip any whitespace between the gtlt and the thing
// it modifies, so that `> 1.2.3` ==> `>1.2.3`
var COMPARATORTRIM = R++
src[COMPARATORTRIM] = '(\\s*)' + src[GTLT] +
                      '\\s*(' + LOOSEPLAIN + '|' + src[XRANGEPLAIN] + ')'

// this one has to use the /g flag
re[COMPARATORTRIM] = new RegExp(src[COMPARATORTRIM], 'g')
var comparatorTrimReplace = '$1$2$3'

// Something like `1.2.3 - 1.2.4`
// Note that these all use the loose form, because they'll be
// checked against either the strict or loose comparator form
// later.
var HYPHENRANGE = R++
src[HYPHENRANGE] = '^\\s*(' + src[XRANGEPLAIN] + ')' +
                   '\\s+-\\s+' +
                   '(' + src[XRANGEPLAIN] + ')' +
                   '\\s*$'

var HYPHENRANGELOOSE = R++
src[HYPHENRANGELOOSE] = '^\\s*(' + src[XRANGEPLAINLOOSE] + ')' +
                        '\\s+-\\s+' +
                        '(' + src[XRANGEPLAINLOOSE] + ')' +
                        '\\s*$'

// Star ranges basically just allow anything at all.
var STAR = R++
src[STAR] = '(<|>)?=?\\s*\\*'

// Compile to actual regexp objects.
// All are flag-free, unless they were created above with a flag.
for (var i = 0; i < R; i++) {
  debug(i, src[i])
  if (!re[i]) {
    re[i] = new RegExp(src[i])
  }
}

exports.parse = parse
function parse (version, options) {
  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }

  if (version instanceof SemVer) {
    return version
  }

  if (typeof version !== 'string') {
    return null
  }

  if (version.length > MAX_LENGTH) {
    return null
  }

  var r = options.loose ? re[LOOSE] : re[FULL]
  if (!r.test(version)) {
    return null
  }

  try {
    return new SemVer(version, options)
  } catch (er) {
    return null
  }
}

exports.valid = valid
function valid (version, options) {
  var v = parse(version, options)
  return v ? v.version : null
}

exports.clean = clean
function clean (version, options) {
  var s = parse(version.trim().replace(/^[=v]+/, ''), options)
  return s ? s.version : null
}

exports.SemVer = SemVer

function SemVer (version, options) {
  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }
  if (version instanceof SemVer) {
    if (version.loose === options.loose) {
      return version
    } else {
      version = version.version
    }
  } else if (typeof version !== 'string') {
    throw new TypeError('Invalid Version: ' + version)
  }

  if (version.length > MAX_LENGTH) {
    throw new TypeError('version is longer than ' + MAX_LENGTH + ' characters')
  }

  if (!(this instanceof SemVer)) {
    return new SemVer(version, options)
  }

  debug('SemVer', version, options)
  this.options = options
  this.loose = !!options.loose

  var m = version.trim().match(options.loose ? re[LOOSE] : re[FULL])

  if (!m) {
    throw new TypeError('Invalid Version: ' + version)
  }

  this.raw = version

  // these are actually numbers
  this.major = +m[1]
  this.minor = +m[2]
  this.patch = +m[3]

  if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
    throw new TypeError('Invalid major version')
  }

  if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
    throw new TypeError('Invalid minor version')
  }

  if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
    throw new TypeError('Invalid patch version')
  }

  // numberify any prerelease numeric ids
  if (!m[4]) {
    this.prerelease = []
  } else {
    this.prerelease = m[4].split('.').map(function (id) {
      if (/^[0-9]+$/.test(id)) {
        var num = +id
        if (num >= 0 && num < MAX_SAFE_INTEGER) {
          return num
        }
      }
      return id
    })
  }

  this.build = m[5] ? m[5].split('.') : []
  this.format()
}

SemVer.prototype.format = function () {
  this.version = this.major + '.' + this.minor + '.' + this.patch
  if (this.prerelease.length) {
    this.version += '-' + this.prerelease.join('.')
  }
  return this.version
}

SemVer.prototype.toString = function () {
  return this.version
}

SemVer.prototype.compare = function (other) {
  debug('SemVer.compare', this.version, this.options, other)
  if (!(other instanceof SemVer)) {
    other = new SemVer(other, this.options)
  }

  return this.compareMain(other) || this.comparePre(other)
}

SemVer.prototype.compareMain = function (other) {
  if (!(other instanceof SemVer)) {
    other = new SemVer(other, this.options)
  }

  return compareIdentifiers(this.major, other.major) ||
         compareIdentifiers(this.minor, other.minor) ||
         compareIdentifiers(this.patch, other.patch)
}

SemVer.prototype.comparePre = function (other) {
  if (!(other instanceof SemVer)) {
    other = new SemVer(other, this.options)
  }

  // NOT having a prerelease is > having one
  if (this.prerelease.length && !other.prerelease.length) {
    return -1
  } else if (!this.prerelease.length && other.prerelease.length) {
    return 1
  } else if (!this.prerelease.length && !other.prerelease.length) {
    return 0
  }

  var i = 0
  do {
    var a = this.prerelease[i]
    var b = other.prerelease[i]
    debug('prerelease compare', i, a, b)
    if (a === undefined && b === undefined) {
      return 0
    } else if (b === undefined) {
      return 1
    } else if (a === undefined) {
      return -1
    } else if (a === b) {
      continue
    } else {
      return compareIdentifiers(a, b)
    }
  } while (++i)
}

// preminor will bump the version up to the next minor release, and immediately
// down to pre-release. premajor and prepatch work the same way.
SemVer.prototype.inc = function (release, identifier) {
  switch (release) {
    case 'premajor':
      this.prerelease.length = 0
      this.patch = 0
      this.minor = 0
      this.major++
      this.inc('pre', identifier)
      break
    case 'preminor':
      this.prerelease.length = 0
      this.patch = 0
      this.minor++
      this.inc('pre', identifier)
      break
    case 'prepatch':
      // If this is already a prerelease, it will bump to the next version
      // drop any prereleases that might already exist, since they are not
      // relevant at this point.
      this.prerelease.length = 0
      this.inc('patch', identifier)
      this.inc('pre', identifier)
      break
    // If the input is a non-prerelease version, this acts the same as
    // prepatch.
    case 'prerelease':
      if (this.prerelease.length === 0) {
        this.inc('patch', identifier)
      }
      this.inc('pre', identifier)
      break

    case 'major':
      // If this is a pre-major version, bump up to the same major version.
      // Otherwise increment major.
      // 1.0.0-5 bumps to 1.0.0
      // 1.1.0 bumps to 2.0.0
      if (this.minor !== 0 ||
          this.patch !== 0 ||
          this.prerelease.length === 0) {
        this.major++
      }
      this.minor = 0
      this.patch = 0
      this.prerelease = []
      break
    case 'minor':
      // If this is a pre-minor version, bump up to the same minor version.
      // Otherwise increment minor.
      // 1.2.0-5 bumps to 1.2.0
      // 1.2.1 bumps to 1.3.0
      if (this.patch !== 0 || this.prerelease.length === 0) {
        this.minor++
      }
      this.patch = 0
      this.prerelease = []
      break
    case 'patch':
      // If this is not a pre-release version, it will increment the patch.
      // If it is a pre-release it will bump up to the same patch version.
      // 1.2.0-5 patches to 1.2.0
      // 1.2.0 patches to 1.2.1
      if (this.prerelease.length === 0) {
        this.patch++
      }
      this.prerelease = []
      break
    // This probably shouldn't be used publicly.
    // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
    case 'pre':
      if (this.prerelease.length === 0) {
        this.prerelease = [0]
      } else {
        var i = this.prerelease.length
        while (--i >= 0) {
          if (typeof this.prerelease[i] === 'number') {
            this.prerelease[i]++
            i = -2
          }
        }
        if (i === -1) {
          // didn't increment anything
          this.prerelease.push(0)
        }
      }
      if (identifier) {
        // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
        // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
        if (this.prerelease[0] === identifier) {
          if (isNaN(this.prerelease[1])) {
            this.prerelease = [identifier, 0]
          }
        } else {
          this.prerelease = [identifier, 0]
        }
      }
      break

    default:
      throw new Error('invalid increment argument: ' + release)
  }
  this.format()
  this.raw = this.version
  return this
}

exports.inc = inc
function inc (version, release, loose, identifier) {
  if (typeof (loose) === 'string') {
    identifier = loose
    loose = undefined
  }

  try {
    return new SemVer(version, loose).inc(release, identifier).version
  } catch (er) {
    return null
  }
}

exports.diff = diff
function diff (version1, version2) {
  if (eq(version1, version2)) {
    return null
  } else {
    var v1 = parse(version1)
    var v2 = parse(version2)
    var prefix = ''
    if (v1.prerelease.length || v2.prerelease.length) {
      prefix = 'pre'
      var defaultResult = 'prerelease'
    }
    for (var key in v1) {
      if (key === 'major' || key === 'minor' || key === 'patch') {
        if (v1[key] !== v2[key]) {
          return prefix + key
        }
      }
    }
    return defaultResult // may be undefined
  }
}

exports.compareIdentifiers = compareIdentifiers

var numeric = /^[0-9]+$/
function compareIdentifiers (a, b) {
  var anum = numeric.test(a)
  var bnum = numeric.test(b)

  if (anum && bnum) {
    a = +a
    b = +b
  }

  return a === b ? 0
    : (anum && !bnum) ? -1
    : (bnum && !anum) ? 1
    : a < b ? -1
    : 1
}

exports.rcompareIdentifiers = rcompareIdentifiers
function rcompareIdentifiers (a, b) {
  return compareIdentifiers(b, a)
}

exports.major = major
function major (a, loose) {
  return new SemVer(a, loose).major
}

exports.minor = minor
function minor (a, loose) {
  return new SemVer(a, loose).minor
}

exports.patch = patch
function patch (a, loose) {
  return new SemVer(a, loose).patch
}

exports.compare = compare
function compare (a, b, loose) {
  return new SemVer(a, loose).compare(new SemVer(b, loose))
}

exports.compareLoose = compareLoose
function compareLoose (a, b) {
  return compare(a, b, true)
}

exports.rcompare = rcompare
function rcompare (a, b, loose) {
  return compare(b, a, loose)
}

exports.sort = sort
function sort (list, loose) {
  return list.sort(function (a, b) {
    return exports.compare(a, b, loose)
  })
}

exports.rsort = rsort
function rsort (list, loose) {
  return list.sort(function (a, b) {
    return exports.rcompare(a, b, loose)
  })
}

exports.gt = gt
function gt (a, b, loose) {
  return compare(a, b, loose) > 0
}

exports.lt = lt
function lt (a, b, loose) {
  return compare(a, b, loose) < 0
}

exports.eq = eq
function eq (a, b, loose) {
  return compare(a, b, loose) === 0
}

exports.neq = neq
function neq (a, b, loose) {
  return compare(a, b, loose) !== 0
}

exports.gte = gte
function gte (a, b, loose) {
  return compare(a, b, loose) >= 0
}

exports.lte = lte
function lte (a, b, loose) {
  return compare(a, b, loose) <= 0
}

exports.cmp = cmp
function cmp (a, op, b, loose) {
  switch (op) {
    case '===':
      if (typeof a === 'object')
        a = a.version
      if (typeof b === 'object')
        b = b.version
      return a === b

    case '!==':
      if (typeof a === 'object')
        a = a.version
      if (typeof b === 'object')
        b = b.version
      return a !== b

    case '':
    case '=':
    case '==':
      return eq(a, b, loose)

    case '!=':
      return neq(a, b, loose)

    case '>':
      return gt(a, b, loose)

    case '>=':
      return gte(a, b, loose)

    case '<':
      return lt(a, b, loose)

    case '<=':
      return lte(a, b, loose)

    default:
      throw new TypeError('Invalid operator: ' + op)
  }
}

exports.Comparator = Comparator
function Comparator (comp, options) {
  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }

  if (comp instanceof Comparator) {
    if (comp.loose === !!options.loose) {
      return comp
    } else {
      comp = comp.value
    }
  }

  if (!(this instanceof Comparator)) {
    return new Comparator(comp, options)
  }

  debug('comparator', comp, options)
  this.options = options
  this.loose = !!options.loose
  this.parse(comp)

  if (this.semver === ANY) {
    this.value = ''
  } else {
    this.value = this.operator + this.semver.version
  }

  debug('comp', this)
}

var ANY = {}
Comparator.prototype.parse = function (comp) {
  var r = this.options.loose ? re[COMPARATORLOOSE] : re[COMPARATOR]
  var m = comp.match(r)

  if (!m) {
    throw new TypeError('Invalid comparator: ' + comp)
  }

  this.operator = m[1]
  if (this.operator === '=') {
    this.operator = ''
  }

  // if it literally is just '>' or '' then allow anything.
  if (!m[2]) {
    this.semver = ANY
  } else {
    this.semver = new SemVer(m[2], this.options.loose)
  }
}

Comparator.prototype.toString = function () {
  return this.value
}

Comparator.prototype.test = function (version) {
  debug('Comparator.test', version, this.options.loose)

  if (this.semver === ANY) {
    return true
  }

  if (typeof version === 'string') {
    version = new SemVer(version, this.options)
  }

  return cmp(version, this.operator, this.semver, this.options)
}

Comparator.prototype.intersects = function (comp, options) {
  if (!(comp instanceof Comparator)) {
    throw new TypeError('a Comparator is required')
  }

  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }

  var rangeTmp

  if (this.operator === '') {
    rangeTmp = new Range(comp.value, options)
    return satisfies(this.value, rangeTmp, options)
  } else if (comp.operator === '') {
    rangeTmp = new Range(this.value, options)
    return satisfies(comp.semver, rangeTmp, options)
  }

  var sameDirectionIncreasing =
    (this.operator === '>=' || this.operator === '>') &&
    (comp.operator === '>=' || comp.operator === '>')
  var sameDirectionDecreasing =
    (this.operator === '<=' || this.operator === '<') &&
    (comp.operator === '<=' || comp.operator === '<')
  var sameSemVer = this.semver.version === comp.semver.version
  var differentDirectionsInclusive =
    (this.operator === '>=' || this.operator === '<=') &&
    (comp.operator === '>=' || comp.operator === '<=')
  var oppositeDirectionsLessThan =
    cmp(this.semver, '<', comp.semver, options) &&
    ((this.operator === '>=' || this.operator === '>') &&
    (comp.operator === '<=' || comp.operator === '<'))
  var oppositeDirectionsGreaterThan =
    cmp(this.semver, '>', comp.semver, options) &&
    ((this.operator === '<=' || this.operator === '<') &&
    (comp.operator === '>=' || comp.operator === '>'))

  return sameDirectionIncreasing || sameDirectionDecreasing ||
    (sameSemVer && differentDirectionsInclusive) ||
    oppositeDirectionsLessThan || oppositeDirectionsGreaterThan
}

exports.Range = Range
function Range (range, options) {
  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }

  if (range instanceof Range) {
    if (range.loose === !!options.loose &&
        range.includePrerelease === !!options.includePrerelease) {
      return range
    } else {
      return new Range(range.raw, options)
    }
  }

  if (range instanceof Comparator) {
    return new Range(range.value, options)
  }

  if (!(this instanceof Range)) {
    return new Range(range, options)
  }

  this.options = options
  this.loose = !!options.loose
  this.includePrerelease = !!options.includePrerelease

  // First, split based on boolean or ||
  this.raw = range
  this.set = range.split(/\s*\|\|\s*/).map(function (range) {
    return this.parseRange(range.trim())
  }, this).filter(function (c) {
    // throw out any that are not relevant for whatever reason
    return c.length
  })

  if (!this.set.length) {
    throw new TypeError('Invalid SemVer Range: ' + range)
  }

  this.format()
}

Range.prototype.format = function () {
  this.range = this.set.map(function (comps) {
    return comps.join(' ').trim()
  }).join('||').trim()
  return this.range
}

Range.prototype.toString = function () {
  return this.range
}

Range.prototype.parseRange = function (range) {
  var loose = this.options.loose
  range = range.trim()
  // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
  var hr = loose ? re[HYPHENRANGELOOSE] : re[HYPHENRANGE]
  range = range.replace(hr, hyphenReplace)
  debug('hyphen replace', range)
  // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
  range = range.replace(re[COMPARATORTRIM], comparatorTrimReplace)
  debug('comparator trim', range, re[COMPARATORTRIM])

  // `~ 1.2.3` => `~1.2.3`
  range = range.replace(re[TILDETRIM], tildeTrimReplace)

  // `^ 1.2.3` => `^1.2.3`
  range = range.replace(re[CARETTRIM], caretTrimReplace)

  // normalize spaces
  range = range.split(/\s+/).join(' ')

  // At this point, the range is completely trimmed and
  // ready to be split into comparators.

  var compRe = loose ? re[COMPARATORLOOSE] : re[COMPARATOR]
  var set = range.split(' ').map(function (comp) {
    return parseComparator(comp, this.options)
  }, this).join(' ').split(/\s+/)
  if (this.options.loose) {
    // in loose mode, throw out any that are not valid comparators
    set = set.filter(function (comp) {
      return !!comp.match(compRe)
    })
  }
  set = set.map(function (comp) {
    return new Comparator(comp, this.options)
  }, this)

  return set
}

Range.prototype.intersects = function (range, options) {
  if (!(range instanceof Range)) {
    throw new TypeError('a Range is required')
  }

  return this.set.some(function (thisComparators) {
    return thisComparators.every(function (thisComparator) {
      return range.set.some(function (rangeComparators) {
        return rangeComparators.every(function (rangeComparator) {
          return thisComparator.intersects(rangeComparator, options)
        })
      })
    })
  })
}

// Mostly just for testing and legacy API reasons
exports.toComparators = toComparators
function toComparators (range, options) {
  return new Range(range, options).set.map(function (comp) {
    return comp.map(function (c) {
      return c.value
    }).join(' ').trim().split(' ')
  })
}

// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
function parseComparator (comp, options) {
  debug('comp', comp, options)
  comp = replaceCarets(comp, options)
  debug('caret', comp)
  comp = replaceTildes(comp, options)
  debug('tildes', comp)
  comp = replaceXRanges(comp, options)
  debug('xrange', comp)
  comp = replaceStars(comp, options)
  debug('stars', comp)
  return comp
}

function isX (id) {
  return !id || id.toLowerCase() === 'x' || id === '*'
}

// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
function replaceTildes (comp, options) {
  return comp.trim().split(/\s+/).map(function (comp) {
    return replaceTilde(comp, options)
  }).join(' ')
}

function replaceTilde (comp, options) {
  var r = options.loose ? re[TILDELOOSE] : re[TILDE]
  return comp.replace(r, function (_, M, m, p, pr) {
    debug('tilde', comp, _, M, m, p, pr)
    var ret

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0'
    } else if (isX(p)) {
      // ~1.2 == >=1.2.0 <1.3.0
      ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0'
    } else if (pr) {
      debug('replaceTilde pr', pr)
      ret = '>=' + M + '.' + m + '.' + p + '-' + pr +
            ' <' + M + '.' + (+m + 1) + '.0'
    } else {
      // ~1.2.3 == >=1.2.3 <1.3.0
      ret = '>=' + M + '.' + m + '.' + p +
            ' <' + M + '.' + (+m + 1) + '.0'
    }

    debug('tilde return', ret)
    return ret
  })
}

// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
// ^1.2.3 --> >=1.2.3 <2.0.0
// ^1.2.0 --> >=1.2.0 <2.0.0
function replaceCarets (comp, options) {
  return comp.trim().split(/\s+/).map(function (comp) {
    return replaceCaret(comp, options)
  }).join(' ')
}

function replaceCaret (comp, options) {
  debug('caret', comp, options)
  var r = options.loose ? re[CARETLOOSE] : re[CARET]
  return comp.replace(r, function (_, M, m, p, pr) {
    debug('caret', comp, _, M, m, p, pr)
    var ret

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0'
    } else if (isX(p)) {
      if (M === '0') {
        ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0'
      } else {
        ret = '>=' + M + '.' + m + '.0 <' + (+M + 1) + '.0.0'
      }
    } else if (pr) {
      debug('replaceCaret pr', pr)
      if (M === '0') {
        if (m === '0') {
          ret = '>=' + M + '.' + m + '.' + p + '-' + pr +
                ' <' + M + '.' + m + '.' + (+p + 1)
        } else {
          ret = '>=' + M + '.' + m + '.' + p + '-' + pr +
                ' <' + M + '.' + (+m + 1) + '.0'
        }
      } else {
        ret = '>=' + M + '.' + m + '.' + p + '-' + pr +
              ' <' + (+M + 1) + '.0.0'
      }
    } else {
      debug('no pr')
      if (M === '0') {
        if (m === '0') {
          ret = '>=' + M + '.' + m + '.' + p +
                ' <' + M + '.' + m + '.' + (+p + 1)
        } else {
          ret = '>=' + M + '.' + m + '.' + p +
                ' <' + M + '.' + (+m + 1) + '.0'
        }
      } else {
        ret = '>=' + M + '.' + m + '.' + p +
              ' <' + (+M + 1) + '.0.0'
      }
    }

    debug('caret return', ret)
    return ret
  })
}

function replaceXRanges (comp, options) {
  debug('replaceXRanges', comp, options)
  return comp.split(/\s+/).map(function (comp) {
    return replaceXRange(comp, options)
  }).join(' ')
}

function replaceXRange (comp, options) {
  comp = comp.trim()
  var r = options.loose ? re[XRANGELOOSE] : re[XRANGE]
  return comp.replace(r, function (ret, gtlt, M, m, p, pr) {
    debug('xRange', comp, ret, gtlt, M, m, p, pr)
    var xM = isX(M)
    var xm = xM || isX(m)
    var xp = xm || isX(p)
    var anyX = xp

    if (gtlt === '=' && anyX) {
      gtlt = ''
    }

    if (xM) {
      if (gtlt === '>' || gtlt === '<') {
        // nothing is allowed
        ret = '<0.0.0'
      } else {
        // nothing is forbidden
        ret = '*'
      }
    } else if (gtlt && anyX) {
      // we know patch is an x, because we have any x at all.
      // replace X with 0
      if (xm) {
        m = 0
      }
      p = 0

      if (gtlt === '>') {
        // >1 => >=2.0.0
        // >1.2 => >=1.3.0
        // >1.2.3 => >= 1.2.4
        gtlt = '>='
        if (xm) {
          M = +M + 1
          m = 0
          p = 0
        } else {
          m = +m + 1
          p = 0
        }
      } else if (gtlt === '<=') {
        // <=0.7.x is actually <0.8.0, since any 0.7.x should
        // pass.  Similarly, <=7.x is actually <8.0.0, etc.
        gtlt = '<'
        if (xm) {
          M = +M + 1
        } else {
          m = +m + 1
        }
      }

      ret = gtlt + M + '.' + m + '.' + p
    } else if (xm) {
      ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0'
    } else if (xp) {
      ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0'
    }

    debug('xRange return', ret)

    return ret
  })
}

// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
function replaceStars (comp, options) {
  debug('replaceStars', comp, options)
  // Looseness is ignored here.  star is always as loose as it gets!
  return comp.trim().replace(re[STAR], '')
}

// This function is passed to string.replace(re[HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0 <3.5.0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0 <3.5.0
function hyphenReplace ($0,
  from, fM, fm, fp, fpr, fb,
  to, tM, tm, tp, tpr, tb) {
  if (isX(fM)) {
    from = ''
  } else if (isX(fm)) {
    from = '>=' + fM + '.0.0'
  } else if (isX(fp)) {
    from = '>=' + fM + '.' + fm + '.0'
  } else {
    from = '>=' + from
  }

  if (isX(tM)) {
    to = ''
  } else if (isX(tm)) {
    to = '<' + (+tM + 1) + '.0.0'
  } else if (isX(tp)) {
    to = '<' + tM + '.' + (+tm + 1) + '.0'
  } else if (tpr) {
    to = '<=' + tM + '.' + tm + '.' + tp + '-' + tpr
  } else {
    to = '<=' + to
  }

  return (from + ' ' + to).trim()
}

// if ANY of the sets match ALL of its comparators, then pass
Range.prototype.test = function (version) {
  if (!version) {
    return false
  }

  if (typeof version === 'string') {
    version = new SemVer(version, this.options)
  }

  for (var i = 0; i < this.set.length; i++) {
    if (testSet(this.set[i], version, this.options)) {
      return true
    }
  }
  return false
}

function testSet (set, version, options) {
  for (var i = 0; i < set.length; i++) {
    if (!set[i].test(version)) {
      return false
    }
  }

  if (version.prerelease.length && !options.includePrerelease) {
    // Find the set of versions that are allowed to have prereleases
    // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
    // That should allow `1.2.3-pr.2` to pass.
    // However, `1.2.4-alpha.notready` should NOT be allowed,
    // even though it's within the range set by the comparators.
    for (i = 0; i < set.length; i++) {
      debug(set[i].semver)
      if (set[i].semver === ANY) {
        continue
      }

      if (set[i].semver.prerelease.length > 0) {
        var allowed = set[i].semver
        if (allowed.major === version.major &&
            allowed.minor === version.minor &&
            allowed.patch === version.patch) {
          return true
        }
      }
    }

    // Version has a -pre, but it's not one of the ones we like.
    return false
  }

  return true
}

exports.satisfies = satisfies
function satisfies (version, range, options) {
  try {
    range = new Range(range, options)
  } catch (er) {
    return false
  }
  return range.test(version)
}

exports.maxSatisfying = maxSatisfying
function maxSatisfying (versions, range, options) {
  var max = null
  var maxSV = null
  try {
    var rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach(function (v) {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!max || maxSV.compare(v) === -1) {
        // compare(max, v, true)
        max = v
        maxSV = new SemVer(max, options)
      }
    }
  })
  return max
}

exports.minSatisfying = minSatisfying
function minSatisfying (versions, range, options) {
  var min = null
  var minSV = null
  try {
    var rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach(function (v) {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!min || minSV.compare(v) === 1) {
        // compare(min, v, true)
        min = v
        minSV = new SemVer(min, options)
      }
    }
  })
  return min
}

exports.minVersion = minVersion
function minVersion (range, loose) {
  range = new Range(range, loose)

  var minver = new SemVer('0.0.0')
  if (range.test(minver)) {
    return minver
  }

  minver = new SemVer('0.0.0-0')
  if (range.test(minver)) {
    return minver
  }

  minver = null
  for (var i = 0; i < range.set.length; ++i) {
    var comparators = range.set[i]

    comparators.forEach(function (comparator) {
      // Clone to avoid manipulating the comparator's semver object.
      var compver = new SemVer(comparator.semver.version)
      switch (comparator.operator) {
        case '>':
          if (compver.prerelease.length === 0) {
            compver.patch++
          } else {
            compver.prerelease.push(0)
          }
          compver.raw = compver.format()
          /* fallthrough */
        case '':
        case '>=':
          if (!minver || gt(minver, compver)) {
            minver = compver
          }
          break
        case '<':
        case '<=':
          /* Ignore maximum versions */
          break
        /* istanbul ignore next */
        default:
          throw new Error('Unexpected operation: ' + comparator.operator)
      }
    })
  }

  if (minver && range.test(minver)) {
    return minver
  }

  return null
}

exports.validRange = validRange
function validRange (range, options) {
  try {
    // Return '*' instead of '' so that truthiness works.
    // This will throw if it's invalid anyway
    return new Range(range, options).range || '*'
  } catch (er) {
    return null
  }
}

// Determine if version is less than all the versions possible in the range
exports.ltr = ltr
function ltr (version, range, options) {
  return outside(version, range, '<', options)
}

// Determine if version is greater than all the versions possible in the range.
exports.gtr = gtr
function gtr (version, range, options) {
  return outside(version, range, '>', options)
}

exports.outside = outside
function outside (version, range, hilo, options) {
  version = new SemVer(version, options)
  range = new Range(range, options)

  var gtfn, ltefn, ltfn, comp, ecomp
  switch (hilo) {
    case '>':
      gtfn = gt
      ltefn = lte
      ltfn = lt
      comp = '>'
      ecomp = '>='
      break
    case '<':
      gtfn = lt
      ltefn = gte
      ltfn = gt
      comp = '<'
      ecomp = '<='
      break
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"')
  }

  // If it satisifes the range it is not outside
  if (satisfies(version, range, options)) {
    return false
  }

  // From now on, variable terms are as if we're in "gtr" mode.
  // but note that everything is flipped for the "ltr" function.

  for (var i = 0; i < range.set.length; ++i) {
    var comparators = range.set[i]

    var high = null
    var low = null

    comparators.forEach(function (comparator) {
      if (comparator.semver === ANY) {
        comparator = new Comparator('>=0.0.0')
      }
      high = high || comparator
      low = low || comparator
      if (gtfn(comparator.semver, high.semver, options)) {
        high = comparator
      } else if (ltfn(comparator.semver, low.semver, options)) {
        low = comparator
      }
    })

    // If the edge version comparator has a operator then our version
    // isn't outside it
    if (high.operator === comp || high.operator === ecomp) {
      return false
    }

    // If the lowest version comparator has an operator and our version
    // is less than it then it isn't higher than the range
    if ((!low.operator || low.operator === comp) &&
        ltefn(version, low.semver)) {
      return false
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false
    }
  }
  return true
}

exports.prerelease = prerelease
function prerelease (version, options) {
  var parsed = parse(version, options)
  return (parsed && parsed.prerelease.length) ? parsed.prerelease : null
}

exports.intersects = intersects
function intersects (r1, r2, options) {
  r1 = new Range(r1, options)
  r2 = new Range(r2, options)
  return r1.intersects(r2)
}

exports.coerce = coerce
function coerce (version) {
  if (version instanceof SemVer) {
    return version
  }

  if (typeof version !== 'string') {
    return null
  }

  var match = version.match(re[COERCE])

  if (match == null) {
    return null
  }

  return parse(match[1] +
    '.' + (match[2] || '0') +
    '.' + (match[3] || '0'))
}


/***/ }),

/***/ 2517:
/***/ ((module) => {

module.exports = [
  'cat',
  'cd',
  'chmod',
  'cp',
  'dirs',
  'echo',
  'exec',
  'find',
  'grep',
  'head',
  'ln',
  'ls',
  'mkdir',
  'mv',
  'pwd',
  'rm',
  'sed',
  'set',
  'sort',
  'tail',
  'tempdir',
  'test',
  'to',
  'toEnd',
  'touch',
  'uniq',
  'which',
];


/***/ }),

/***/ 8753:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

//
// ShellJS
// Unix shell commands on top of Node's API
//
// Copyright (c) 2012 Artur Adib
// http://github.com/shelljs/shelljs
//

function __ncc_wildcard$0 (arg) {
  if (arg === "cat.js" || arg === "cat") return __nccwpck_require__(4291);
  else if (arg === "cd.js" || arg === "cd") return __nccwpck_require__(2778);
  else if (arg === "chmod.js" || arg === "chmod") return __nccwpck_require__(9672);
  else if (arg === "common.js" || arg === "common") return __nccwpck_require__(8723);
  else if (arg === "cp.js" || arg === "cp") return __nccwpck_require__(2373);
  else if (arg === "dirs.js" || arg === "dirs") return __nccwpck_require__(1408);
  else if (arg === "echo.js" || arg === "echo") return __nccwpck_require__(3023);
  else if (arg === "error.js" || arg === "error") return __nccwpck_require__(7533);
  else if (arg === "exec-child.js" || arg === "exec-child") return __nccwpck_require__(7675);
  else if (arg === "exec.js" || arg === "exec") return __nccwpck_require__(6328);
  else if (arg === "find.js" || arg === "find") return __nccwpck_require__(4145);
  else if (arg === "grep.js" || arg === "grep") return __nccwpck_require__(9789);
  else if (arg === "head.js" || arg === "head") return __nccwpck_require__(4731);
  else if (arg === "ln.js" || arg === "ln") return __nccwpck_require__(9737);
  else if (arg === "ls.js" || arg === "ls") return __nccwpck_require__(3551);
  else if (arg === "mkdir.js" || arg === "mkdir") return __nccwpck_require__(5218);
  else if (arg === "mv.js" || arg === "mv") return __nccwpck_require__(5439);
  else if (arg === "popd.js" || arg === "popd") return __nccwpck_require__(8846);
  else if (arg === "pushd.js" || arg === "pushd") return __nccwpck_require__(7503);
  else if (arg === "pwd.js" || arg === "pwd") return __nccwpck_require__(6240);
  else if (arg === "rm.js" || arg === "rm") return __nccwpck_require__(8643);
  else if (arg === "sed.js" || arg === "sed") return __nccwpck_require__(2025);
  else if (arg === "set.js" || arg === "set") return __nccwpck_require__(9389);
  else if (arg === "sort.js" || arg === "sort") return __nccwpck_require__(49);
  else if (arg === "tail.js" || arg === "tail") return __nccwpck_require__(6156);
  else if (arg === "tempdir.js" || arg === "tempdir") return __nccwpck_require__(5248);
  else if (arg === "test.js" || arg === "test") return __nccwpck_require__(3805);
  else if (arg === "to.js" || arg === "to") return __nccwpck_require__(6656);
  else if (arg === "toEnd.js" || arg === "toEnd") return __nccwpck_require__(4946);
  else if (arg === "touch.js" || arg === "touch") return __nccwpck_require__(1711);
  else if (arg === "uniq.js" || arg === "uniq") return __nccwpck_require__(1280);
  else if (arg === "which.js" || arg === "which") return __nccwpck_require__(8530);
}
var common = __nccwpck_require__(8723);

//@
//@ All commands run synchronously, unless otherwise stated.
//@ All commands accept standard bash globbing characters (`*`, `?`, etc.),
//@ compatible with the [node `glob` module](https://github.com/isaacs/node-glob).
//@
//@ For less-commonly used commands and features, please check out our [wiki
//@ page](https://github.com/shelljs/shelljs/wiki).
//@

// Include the docs for all the default commands
//@commands

// Load all default commands
__nccwpck_require__(2517).forEach(function (command) {
  __ncc_wildcard$0(command);
});

//@
//@ ### exit(code)
//@
//@ Exits the current process with the given exit `code`.
exports.exit = process.exit;

//@include ./src/error
exports.error = __nccwpck_require__(7533);

//@include ./src/common
exports.ShellString = common.ShellString;

//@
//@ ### env['VAR_NAME']
//@
//@ Object containing environment variables (both getter and setter). Shortcut
//@ to `process.env`.
exports.env = process.env;

//@
//@ ### Pipes
//@
//@ Examples:
//@
//@ ```javascript
//@ grep('foo', 'file1.txt', 'file2.txt').sed(/o/g, 'a').to('output.txt');
//@ echo('files with o\'s in the name:\n' + ls().grep('o'));
//@ cat('test.js').exec('node'); // pipe to exec() call
//@ ```
//@
//@ Commands can send their output to another command in a pipe-like fashion.
//@ `sed`, `grep`, `cat`, `exec`, `to`, and `toEnd` can appear on the right-hand
//@ side of a pipe. Pipes can be chained.

//@
//@ ## Configuration
//@

exports.config = common.config;

//@
//@ ### config.silent
//@
//@ Example:
//@
//@ ```javascript
//@ var sh = require('shelljs');
//@ var silentState = sh.config.silent; // save old silent state
//@ sh.config.silent = true;
//@ /* ... */
//@ sh.config.silent = silentState; // restore old silent state
//@ ```
//@
//@ Suppresses all command output if `true`, except for `echo()` calls.
//@ Default is `false`.

//@
//@ ### config.fatal
//@
//@ Example:
//@
//@ ```javascript
//@ require('shelljs/global');
//@ config.fatal = true; // or set('-e');
//@ cp('this_file_does_not_exist', '/dev/null'); // throws Error here
//@ /* more commands... */
//@ ```
//@
//@ If `true`, the script will throw a Javascript error when any shell.js
//@ command encounters an error. Default is `false`. This is analogous to
//@ Bash's `set -e`.

//@
//@ ### config.verbose
//@
//@ Example:
//@
//@ ```javascript
//@ config.verbose = true; // or set('-v');
//@ cd('dir/');
//@ rm('-rf', 'foo.txt', 'bar.txt');
//@ exec('echo hello');
//@ ```
//@
//@ Will print each command as follows:
//@
//@ ```
//@ cd dir/
//@ rm -rf foo.txt bar.txt
//@ exec echo hello
//@ ```

//@
//@ ### config.globOptions
//@
//@ Example:
//@
//@ ```javascript
//@ config.globOptions = {nodir: true};
//@ ```
//@
//@ Use this value for calls to `glob.sync()` instead of the default options.

//@
//@ ### config.reset()
//@
//@ Example:
//@
//@ ```javascript
//@ var shell = require('shelljs');
//@ // Make changes to shell.config, and do stuff...
//@ /* ... */
//@ shell.config.reset(); // reset to original state
//@ // Do more stuff, but with original settings
//@ /* ... */
//@ ```
//@
//@ Reset `shell.config` to the defaults:
//@
//@ ```javascript
//@ {
//@   fatal: false,
//@   globOptions: {},
//@   maxdepth: 255,
//@   noglob: false,
//@   silent: false,
//@   verbose: false,
//@ }
//@ ```


/***/ }),

/***/ 4291:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);

common.register('cat', _cat, {
  canReceivePipe: true,
  cmdOptions: {
    'n': 'number',
  },
});

//@
//@ ### cat([options,] file [, file ...])
//@ ### cat([options,] file_array)
//@
//@ Available options:
//@
//@ + `-n`: number all output lines
//@
//@ Examples:
//@
//@ ```javascript
//@ var str = cat('file*.txt');
//@ var str = cat('file1', 'file2');
//@ var str = cat(['file1', 'file2']); // same as above
//@ ```
//@
//@ Returns a string containing the given file, or a concatenated string
//@ containing the files if more than one file is given (a new line character is
//@ introduced between each file).
function _cat(options, files) {
  var cat = common.readFromPipe();

  if (!files && !cat) common.error('no paths given');

  files = [].slice.call(arguments, 1);

  files.forEach(function (file) {
    if (!fs.existsSync(file)) {
      common.error('no such file or directory: ' + file);
    } else if (common.statFollowLinks(file).isDirectory()) {
      common.error(file + ': Is a directory');
    }

    cat += fs.readFileSync(file, 'utf8');
  });

  if (options.number) {
    cat = addNumbers(cat);
  }

  return cat;
}
module.exports = _cat;

function addNumbers(cat) {
  var lines = cat.split('\n');
  var lastLine = lines.pop();

  lines = lines.map(function (line, i) {
    return numberedLine(i + 1, line);
  });

  if (lastLine.length) {
    lastLine = numberedLine(lines.length + 1, lastLine);
  }
  lines.push(lastLine);

  return lines.join('\n');
}

function numberedLine(n, line) {
  // GNU cat use six pad start number + tab. See http://lingrok.org/xref/coreutils/src/cat.c#57
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
  var number = ('     ' + n).slice(-6) + '\t';
  return number + line;
}


/***/ }),

/***/ 2778:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var os = __nccwpck_require__(2087);
var common = __nccwpck_require__(8723);

common.register('cd', _cd, {});

//@
//@ ### cd([dir])
//@
//@ Changes to directory `dir` for the duration of the script. Changes to home
//@ directory if no argument is supplied.
function _cd(options, dir) {
  if (!dir) dir = os.homedir();

  if (dir === '-') {
    if (!process.env.OLDPWD) {
      common.error('could not find previous directory');
    } else {
      dir = process.env.OLDPWD;
    }
  }

  try {
    var curDir = process.cwd();
    process.chdir(dir);
    process.env.OLDPWD = curDir;
  } catch (e) {
    // something went wrong, let's figure out the error
    var err;
    try {
      common.statFollowLinks(dir); // if this succeeds, it must be some sort of file
      err = 'not a directory: ' + dir;
    } catch (e2) {
      err = 'no such file or directory: ' + dir;
    }
    if (err) common.error(err);
  }
  return '';
}
module.exports = _cd;


/***/ }),

/***/ 9672:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);

var PERMS = (function (base) {
  return {
    OTHER_EXEC: base.EXEC,
    OTHER_WRITE: base.WRITE,
    OTHER_READ: base.READ,

    GROUP_EXEC: base.EXEC << 3,
    GROUP_WRITE: base.WRITE << 3,
    GROUP_READ: base.READ << 3,

    OWNER_EXEC: base.EXEC << 6,
    OWNER_WRITE: base.WRITE << 6,
    OWNER_READ: base.READ << 6,

    // Literal octal numbers are apparently not allowed in "strict" javascript.
    STICKY: parseInt('01000', 8),
    SETGID: parseInt('02000', 8),
    SETUID: parseInt('04000', 8),

    TYPE_MASK: parseInt('0770000', 8),
  };
}({
  EXEC: 1,
  WRITE: 2,
  READ: 4,
}));

common.register('chmod', _chmod, {
});

//@
//@ ### chmod([options,] octal_mode || octal_string, file)
//@ ### chmod([options,] symbolic_mode, file)
//@
//@ Available options:
//@
//@ + `-v`: output a diagnostic for every file processed//@
//@ + `-c`: like verbose, but report only when a change is made//@
//@ + `-R`: change files and directories recursively//@
//@
//@ Examples:
//@
//@ ```javascript
//@ chmod(755, '/Users/brandon');
//@ chmod('755', '/Users/brandon'); // same as above
//@ chmod('u+x', '/Users/brandon');
//@ chmod('-R', 'a-w', '/Users/brandon');
//@ ```
//@
//@ Alters the permissions of a file or directory by either specifying the
//@ absolute permissions in octal form or expressing the changes in symbols.
//@ This command tries to mimic the POSIX behavior as much as possible.
//@ Notable exceptions:
//@
//@ + In symbolic modes, `a-r` and `-r` are identical.  No consideration is
//@   given to the `umask`.
//@ + There is no "quiet" option, since default behavior is to run silent.
function _chmod(options, mode, filePattern) {
  if (!filePattern) {
    if (options.length > 0 && options.charAt(0) === '-') {
      // Special case where the specified file permissions started with - to subtract perms, which
      // get picked up by the option parser as command flags.
      // If we are down by one argument and options starts with -, shift everything over.
      [].unshift.call(arguments, '');
    } else {
      common.error('You must specify a file.');
    }
  }

  options = common.parseOptions(options, {
    'R': 'recursive',
    'c': 'changes',
    'v': 'verbose',
  });

  filePattern = [].slice.call(arguments, 2);

  var files;

  // TODO: replace this with a call to common.expand()
  if (options.recursive) {
    files = [];
    filePattern.forEach(function addFile(expandedFile) {
      var stat = common.statNoFollowLinks(expandedFile);

      if (!stat.isSymbolicLink()) {
        files.push(expandedFile);

        if (stat.isDirectory()) {  // intentionally does not follow symlinks.
          fs.readdirSync(expandedFile).forEach(function (child) {
            addFile(expandedFile + '/' + child);
          });
        }
      }
    });
  } else {
    files = filePattern;
  }

  files.forEach(function innerChmod(file) {
    file = path.resolve(file);
    if (!fs.existsSync(file)) {
      common.error('File not found: ' + file);
    }

    // When recursing, don't follow symlinks.
    if (options.recursive && common.statNoFollowLinks(file).isSymbolicLink()) {
      return;
    }

    var stat = common.statFollowLinks(file);
    var isDir = stat.isDirectory();
    var perms = stat.mode;
    var type = perms & PERMS.TYPE_MASK;

    var newPerms = perms;

    if (isNaN(parseInt(mode, 8))) {
      // parse options
      mode.split(',').forEach(function (symbolicMode) {
        var pattern = /([ugoa]*)([=\+-])([rwxXst]*)/i;
        var matches = pattern.exec(symbolicMode);

        if (matches) {
          var applyTo = matches[1];
          var operator = matches[2];
          var change = matches[3];

          var changeOwner = applyTo.indexOf('u') !== -1 || applyTo === 'a' || applyTo === '';
          var changeGroup = applyTo.indexOf('g') !== -1 || applyTo === 'a' || applyTo === '';
          var changeOther = applyTo.indexOf('o') !== -1 || applyTo === 'a' || applyTo === '';

          var changeRead = change.indexOf('r') !== -1;
          var changeWrite = change.indexOf('w') !== -1;
          var changeExec = change.indexOf('x') !== -1;
          var changeExecDir = change.indexOf('X') !== -1;
          var changeSticky = change.indexOf('t') !== -1;
          var changeSetuid = change.indexOf('s') !== -1;

          if (changeExecDir && isDir) {
            changeExec = true;
          }

          var mask = 0;
          if (changeOwner) {
            mask |= (changeRead ? PERMS.OWNER_READ : 0) + (changeWrite ? PERMS.OWNER_WRITE : 0) + (changeExec ? PERMS.OWNER_EXEC : 0) + (changeSetuid ? PERMS.SETUID : 0);
          }
          if (changeGroup) {
            mask |= (changeRead ? PERMS.GROUP_READ : 0) + (changeWrite ? PERMS.GROUP_WRITE : 0) + (changeExec ? PERMS.GROUP_EXEC : 0) + (changeSetuid ? PERMS.SETGID : 0);
          }
          if (changeOther) {
            mask |= (changeRead ? PERMS.OTHER_READ : 0) + (changeWrite ? PERMS.OTHER_WRITE : 0) + (changeExec ? PERMS.OTHER_EXEC : 0);
          }

          // Sticky bit is special - it's not tied to user, group or other.
          if (changeSticky) {
            mask |= PERMS.STICKY;
          }

          switch (operator) {
            case '+':
              newPerms |= mask;
              break;

            case '-':
              newPerms &= ~mask;
              break;

            case '=':
              newPerms = type + mask;

              // According to POSIX, when using = to explicitly set the
              // permissions, setuid and setgid can never be cleared.
              if (common.statFollowLinks(file).isDirectory()) {
                newPerms |= (PERMS.SETUID + PERMS.SETGID) & perms;
              }
              break;
            default:
              common.error('Could not recognize operator: `' + operator + '`');
          }

          if (options.verbose) {
            console.log(file + ' -> ' + newPerms.toString(8));
          }

          if (perms !== newPerms) {
            if (!options.verbose && options.changes) {
              console.log(file + ' -> ' + newPerms.toString(8));
            }
            fs.chmodSync(file, newPerms);
            perms = newPerms; // for the next round of changes!
          }
        } else {
          common.error('Invalid symbolic mode change: ' + symbolicMode);
        }
      });
    } else {
      // they gave us a full number
      newPerms = type + parseInt(mode, 8);

      // POSIX rules are that setuid and setgid can only be added using numeric
      // form, but not cleared.
      if (common.statFollowLinks(file).isDirectory()) {
        newPerms |= (PERMS.SETUID + PERMS.SETGID) & perms;
      }

      fs.chmodSync(file, newPerms);
    }
  });
  return '';
}
module.exports = _chmod;


/***/ }),

/***/ 8723:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
// Ignore warning about 'new String()'
/* eslint no-new-wrappers: 0 */


var os = __nccwpck_require__(2087);
var fs = __nccwpck_require__(5747);
var glob = __nccwpck_require__(5603);
var shell = __nccwpck_require__(8753);

var shellMethods = Object.create(shell);

exports.extend = Object.assign;

// Check if we're running under electron
var isElectron = Boolean(process.versions.electron);

// Module globals (assume no execPath by default)
var DEFAULT_CONFIG = {
  fatal: false,
  globOptions: {},
  maxdepth: 255,
  noglob: false,
  silent: false,
  verbose: false,
  execPath: null,
  bufLength: 64 * 1024, // 64KB
};

var config = {
  reset: function () {
    Object.assign(this, DEFAULT_CONFIG);
    if (!isElectron) {
      this.execPath = process.execPath;
    }
  },
  resetForTesting: function () {
    this.reset();
    this.silent = true;
  },
};

config.reset();
exports.config = config;

// Note: commands should generally consider these as read-only values.
var state = {
  error: null,
  errorCode: 0,
  currentCmd: 'shell.js',
};
exports.state = state;

delete process.env.OLDPWD; // initially, there's no previous directory

// Reliably test if something is any sort of javascript object
function isObject(a) {
  return typeof a === 'object' && a !== null;
}
exports.isObject = isObject;

function log() {
  /* istanbul ignore next */
  if (!config.silent) {
    console.error.apply(console, arguments);
  }
}
exports.log = log;

// Converts strings to be equivalent across all platforms. Primarily responsible
// for making sure we use '/' instead of '\' as path separators, but this may be
// expanded in the future if necessary
function convertErrorOutput(msg) {
  if (typeof msg !== 'string') {
    throw new TypeError('input must be a string');
  }
  return msg.replace(/\\/g, '/');
}
exports.convertErrorOutput = convertErrorOutput;

// Shows error message. Throws if config.fatal is true
function error(msg, _code, options) {
  // Validate input
  if (typeof msg !== 'string') throw new Error('msg must be a string');

  var DEFAULT_OPTIONS = {
    continue: false,
    code: 1,
    prefix: state.currentCmd + ': ',
    silent: false,
  };

  if (typeof _code === 'number' && isObject(options)) {
    options.code = _code;
  } else if (isObject(_code)) { // no 'code'
    options = _code;
  } else if (typeof _code === 'number') { // no 'options'
    options = { code: _code };
  } else if (typeof _code !== 'number') { // only 'msg'
    options = {};
  }
  options = Object.assign({}, DEFAULT_OPTIONS, options);

  if (!state.errorCode) state.errorCode = options.code;

  var logEntry = convertErrorOutput(options.prefix + msg);
  state.error = state.error ? state.error + '\n' : '';
  state.error += logEntry;

  // Throw an error, or log the entry
  if (config.fatal) throw new Error(logEntry);
  if (msg.length > 0 && !options.silent) log(logEntry);

  if (!options.continue) {
    throw {
      msg: 'earlyExit',
      retValue: (new ShellString('', state.error, state.errorCode)),
    };
  }
}
exports.error = error;

//@
//@ ### ShellString(str)
//@
//@ Examples:
//@
//@ ```javascript
//@ var foo = ShellString('hello world');
//@ ```
//@
//@ Turns a regular string into a string-like object similar to what each
//@ command returns. This has special methods, like `.to()` and `.toEnd()`.
function ShellString(stdout, stderr, code) {
  var that;
  if (stdout instanceof Array) {
    that = stdout;
    that.stdout = stdout.join('\n');
    if (stdout.length > 0) that.stdout += '\n';
  } else {
    that = new String(stdout);
    that.stdout = stdout;
  }
  that.stderr = stderr;
  that.code = code;
  // A list of all commands that can appear on the right-hand side of a pipe
  // (populated by calls to common.wrap())
  pipeMethods.forEach(function (cmd) {
    that[cmd] = shellMethods[cmd].bind(that);
  });
  return that;
}

exports.ShellString = ShellString;

// Returns {'alice': true, 'bob': false} when passed a string and dictionary as follows:
//   parseOptions('-a', {'a':'alice', 'b':'bob'});
// Returns {'reference': 'string-value', 'bob': false} when passed two dictionaries of the form:
//   parseOptions({'-r': 'string-value'}, {'r':'reference', 'b':'bob'});
// Throws an error when passed a string that does not start with '-':
//   parseOptions('a', {'a':'alice'}); // throws
function parseOptions(opt, map, errorOptions) {
  // Validate input
  if (typeof opt !== 'string' && !isObject(opt)) {
    throw new Error('options must be strings or key-value pairs');
  } else if (!isObject(map)) {
    throw new Error('parseOptions() internal error: map must be an object');
  } else if (errorOptions && !isObject(errorOptions)) {
    throw new Error('parseOptions() internal error: errorOptions must be object');
  }

  if (opt === '--') {
    // This means there are no options.
    return {};
  }

  // All options are false by default
  var options = {};
  Object.keys(map).forEach(function (letter) {
    var optName = map[letter];
    if (optName[0] !== '!') {
      options[optName] = false;
    }
  });

  if (opt === '') return options; // defaults

  if (typeof opt === 'string') {
    if (opt[0] !== '-') {
      throw new Error("Options string must start with a '-'");
    }

    // e.g. chars = ['R', 'f']
    var chars = opt.slice(1).split('');

    chars.forEach(function (c) {
      if (c in map) {
        var optionName = map[c];
        if (optionName[0] === '!') {
          options[optionName.slice(1)] = false;
        } else {
          options[optionName] = true;
        }
      } else {
        error('option not recognized: ' + c, errorOptions || {});
      }
    });
  } else { // opt is an Object
    Object.keys(opt).forEach(function (key) {
      // key is a string of the form '-r', '-d', etc.
      var c = key[1];
      if (c in map) {
        var optionName = map[c];
        options[optionName] = opt[key]; // assign the given value
      } else {
        error('option not recognized: ' + c, errorOptions || {});
      }
    });
  }
  return options;
}
exports.parseOptions = parseOptions;

// Expands wildcards with matching (ie. existing) file names.
// For example:
//   expand(['file*.js']) = ['file1.js', 'file2.js', ...]
//   (if the files 'file1.js', 'file2.js', etc, exist in the current dir)
function expand(list) {
  if (!Array.isArray(list)) {
    throw new TypeError('must be an array');
  }
  var expanded = [];
  list.forEach(function (listEl) {
    // Don't expand non-strings
    if (typeof listEl !== 'string') {
      expanded.push(listEl);
    } else {
      var ret;
      try {
        ret = glob.sync(listEl, config.globOptions);
        // if nothing matched, interpret the string literally
        ret = ret.length > 0 ? ret : [listEl];
      } catch (e) {
        // if glob fails, interpret the string literally
        ret = [listEl];
      }
      expanded = expanded.concat(ret);
    }
  });
  return expanded;
}
exports.expand = expand;

// Normalizes Buffer creation, using Buffer.alloc if possible.
// Also provides a good default buffer length for most use cases.
var buffer = typeof Buffer.alloc === 'function' ?
  function (len) {
    return Buffer.alloc(len || config.bufLength);
  } :
  function (len) {
    return new Buffer(len || config.bufLength);
  };
exports.buffer = buffer;

// Normalizes _unlinkSync() across platforms to match Unix behavior, i.e.
// file can be unlinked even if it's read-only, see https://github.com/joyent/node/issues/3006
function unlinkSync(file) {
  try {
    fs.unlinkSync(file);
  } catch (e) {
    // Try to override file permission
    /* istanbul ignore next */
    if (e.code === 'EPERM') {
      fs.chmodSync(file, '0666');
      fs.unlinkSync(file);
    } else {
      throw e;
    }
  }
}
exports.unlinkSync = unlinkSync;

// wrappers around common.statFollowLinks and common.statNoFollowLinks that clarify intent
// and improve readability
function statFollowLinks() {
  return fs.statSync.apply(fs, arguments);
}
exports.statFollowLinks = statFollowLinks;

function statNoFollowLinks() {
  return fs.lstatSync.apply(fs, arguments);
}
exports.statNoFollowLinks = statNoFollowLinks;

// e.g. 'shelljs_a5f185d0443ca...'
function randomFileName() {
  function randomHash(count) {
    if (count === 1) {
      return parseInt(16 * Math.random(), 10).toString(16);
    }
    var hash = '';
    for (var i = 0; i < count; i++) {
      hash += randomHash(1);
    }
    return hash;
  }

  return 'shelljs_' + randomHash(20);
}
exports.randomFileName = randomFileName;

// Common wrapper for all Unix-like commands that performs glob expansion,
// command-logging, and other nice things
function wrap(cmd, fn, options) {
  options = options || {};
  return function () {
    var retValue = null;

    state.currentCmd = cmd;
    state.error = null;
    state.errorCode = 0;

    try {
      var args = [].slice.call(arguments, 0);

      // Log the command to stderr, if appropriate
      if (config.verbose) {
        console.error.apply(console, [cmd].concat(args));
      }

      // If this is coming from a pipe, let's set the pipedValue (otherwise, set
      // it to the empty string)
      state.pipedValue = (this && typeof this.stdout === 'string') ? this.stdout : '';

      if (options.unix === false) { // this branch is for exec()
        retValue = fn.apply(this, args);
      } else { // and this branch is for everything else
        if (isObject(args[0]) && args[0].constructor.name === 'Object') {
          // a no-op, allowing the syntax `touch({'-r': file}, ...)`
        } else if (args.length === 0 || typeof args[0] !== 'string' || args[0].length <= 1 || args[0][0] !== '-') {
          args.unshift(''); // only add dummy option if '-option' not already present
        }

        // flatten out arrays that are arguments, to make the syntax:
        //    `cp([file1, file2, file3], dest);`
        // equivalent to:
        //    `cp(file1, file2, file3, dest);`
        args = args.reduce(function (accum, cur) {
          if (Array.isArray(cur)) {
            return accum.concat(cur);
          }
          accum.push(cur);
          return accum;
        }, []);

        // Convert ShellStrings (basically just String objects) to regular strings
        args = args.map(function (arg) {
          if (isObject(arg) && arg.constructor.name === 'String') {
            return arg.toString();
          }
          return arg;
        });

        // Expand the '~' if appropriate
        var homeDir = os.homedir();
        args = args.map(function (arg) {
          if (typeof arg === 'string' && arg.slice(0, 2) === '~/' || arg === '~') {
            return arg.replace(/^~/, homeDir);
          }
          return arg;
        });

        // Perform glob-expansion on all arguments after globStart, but preserve
        // the arguments before it (like regexes for sed and grep)
        if (!config.noglob && options.allowGlobbing === true) {
          args = args.slice(0, options.globStart).concat(expand(args.slice(options.globStart)));
        }

        try {
          // parse options if options are provided
          if (isObject(options.cmdOptions)) {
            args[0] = parseOptions(args[0], options.cmdOptions);
          }

          retValue = fn.apply(this, args);
        } catch (e) {
          /* istanbul ignore else */
          if (e.msg === 'earlyExit') {
            retValue = e.retValue;
          } else {
            throw e; // this is probably a bug that should be thrown up the call stack
          }
        }
      }
    } catch (e) {
      /* istanbul ignore next */
      if (!state.error) {
        // If state.error hasn't been set it's an error thrown by Node, not us - probably a bug...
        e.name = 'ShellJSInternalError';
        throw e;
      }
      if (config.fatal) throw e;
    }

    if (options.wrapOutput &&
        (typeof retValue === 'string' || Array.isArray(retValue))) {
      retValue = new ShellString(retValue, state.error, state.errorCode);
    }

    state.currentCmd = 'shell.js';
    return retValue;
  };
} // wrap
exports.wrap = wrap;

// This returns all the input that is piped into the current command (or the
// empty string, if this isn't on the right-hand side of a pipe
function _readFromPipe() {
  return state.pipedValue;
}
exports.readFromPipe = _readFromPipe;

var DEFAULT_WRAP_OPTIONS = {
  allowGlobbing: true,
  canReceivePipe: false,
  cmdOptions: null,
  globStart: 1,
  pipeOnly: false,
  wrapOutput: true,
  unix: true,
};

// This is populated during plugin registration
var pipeMethods = [];

// Register a new ShellJS command
function _register(name, implementation, wrapOptions) {
  wrapOptions = wrapOptions || {};

  // Validate options
  Object.keys(wrapOptions).forEach(function (option) {
    if (!DEFAULT_WRAP_OPTIONS.hasOwnProperty(option)) {
      throw new Error("Unknown option '" + option + "'");
    }
    if (typeof wrapOptions[option] !== typeof DEFAULT_WRAP_OPTIONS[option]) {
      throw new TypeError("Unsupported type '" + typeof wrapOptions[option] +
        "' for option '" + option + "'");
    }
  });

  // If an option isn't specified, use the default
  wrapOptions = Object.assign({}, DEFAULT_WRAP_OPTIONS, wrapOptions);

  if (shell.hasOwnProperty(name)) {
    throw new Error('Command `' + name + '` already exists');
  }

  if (wrapOptions.pipeOnly) {
    wrapOptions.canReceivePipe = true;
    shellMethods[name] = wrap(name, implementation, wrapOptions);
  } else {
    shell[name] = wrap(name, implementation, wrapOptions);
  }

  if (wrapOptions.canReceivePipe) {
    pipeMethods.push(name);
  }
}
exports.register = _register;


/***/ }),

/***/ 2373:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);
var common = __nccwpck_require__(8723);

common.register('cp', _cp, {
  cmdOptions: {
    'f': '!no_force',
    'n': 'no_force',
    'u': 'update',
    'R': 'recursive',
    'r': 'recursive',
    'L': 'followsymlink',
    'P': 'noFollowsymlink',
  },
  wrapOutput: false,
});

// Buffered file copy, synchronous
// (Using readFileSync() + writeFileSync() could easily cause a memory overflow
//  with large files)
function copyFileSync(srcFile, destFile, options) {
  if (!fs.existsSync(srcFile)) {
    common.error('copyFileSync: no such file or directory: ' + srcFile);
  }

  var isWindows = process.platform === 'win32';

  // Check the mtimes of the files if the '-u' flag is provided
  try {
    if (options.update && common.statFollowLinks(srcFile).mtime < fs.statSync(destFile).mtime) {
      return;
    }
  } catch (e) {
    // If we're here, destFile probably doesn't exist, so just do a normal copy
  }

  if (common.statNoFollowLinks(srcFile).isSymbolicLink() && !options.followsymlink) {
    try {
      common.statNoFollowLinks(destFile);
      common.unlinkSync(destFile); // re-link it
    } catch (e) {
      // it doesn't exist, so no work needs to be done
    }

    var symlinkFull = fs.readlinkSync(srcFile);
    fs.symlinkSync(symlinkFull, destFile, isWindows ? 'junction' : null);
  } else {
    var buf = common.buffer();
    var bufLength = buf.length;
    var bytesRead = bufLength;
    var pos = 0;
    var fdr = null;
    var fdw = null;

    try {
      fdr = fs.openSync(srcFile, 'r');
    } catch (e) {
      /* istanbul ignore next */
      common.error('copyFileSync: could not read src file (' + srcFile + ')');
    }

    try {
      fdw = fs.openSync(destFile, 'w');
    } catch (e) {
      /* istanbul ignore next */
      common.error('copyFileSync: could not write to dest file (code=' + e.code + '):' + destFile);
    }

    while (bytesRead === bufLength) {
      bytesRead = fs.readSync(fdr, buf, 0, bufLength, pos);
      fs.writeSync(fdw, buf, 0, bytesRead);
      pos += bytesRead;
    }

    fs.closeSync(fdr);
    fs.closeSync(fdw);

    fs.chmodSync(destFile, common.statFollowLinks(srcFile).mode);
  }
}

// Recursively copies 'sourceDir' into 'destDir'
// Adapted from https://github.com/ryanmcgrath/wrench-js
//
// Copyright (c) 2010 Ryan McGrath
// Copyright (c) 2012 Artur Adib
//
// Licensed under the MIT License
// http://www.opensource.org/licenses/mit-license.php
function cpdirSyncRecursive(sourceDir, destDir, currentDepth, opts) {
  if (!opts) opts = {};

  // Ensure there is not a run away recursive copy
  if (currentDepth >= common.config.maxdepth) return;
  currentDepth++;

  var isWindows = process.platform === 'win32';

  // Create the directory where all our junk is moving to; read the mode of the
  // source directory and mirror it
  try {
    fs.mkdirSync(destDir);
  } catch (e) {
    // if the directory already exists, that's okay
    if (e.code !== 'EEXIST') throw e;
  }

  var files = fs.readdirSync(sourceDir);

  for (var i = 0; i < files.length; i++) {
    var srcFile = sourceDir + '/' + files[i];
    var destFile = destDir + '/' + files[i];
    var srcFileStat = common.statNoFollowLinks(srcFile);

    var symlinkFull;
    if (opts.followsymlink) {
      if (cpcheckcycle(sourceDir, srcFile)) {
        // Cycle link found.
        console.error('Cycle link found.');
        symlinkFull = fs.readlinkSync(srcFile);
        fs.symlinkSync(symlinkFull, destFile, isWindows ? 'junction' : null);
        continue;
      }
    }
    if (srcFileStat.isDirectory()) {
      /* recursion this thing right on back. */
      cpdirSyncRecursive(srcFile, destFile, currentDepth, opts);
    } else if (srcFileStat.isSymbolicLink() && !opts.followsymlink) {
      symlinkFull = fs.readlinkSync(srcFile);
      try {
        common.statNoFollowLinks(destFile);
        common.unlinkSync(destFile); // re-link it
      } catch (e) {
        // it doesn't exist, so no work needs to be done
      }
      fs.symlinkSync(symlinkFull, destFile, isWindows ? 'junction' : null);
    } else if (srcFileStat.isSymbolicLink() && opts.followsymlink) {
      srcFileStat = common.statFollowLinks(srcFile);
      if (srcFileStat.isDirectory()) {
        cpdirSyncRecursive(srcFile, destFile, currentDepth, opts);
      } else {
        copyFileSync(srcFile, destFile, opts);
      }
    } else {
      /* At this point, we've hit a file actually worth copying... so copy it on over. */
      if (fs.existsSync(destFile) && opts.no_force) {
        common.log('skipping existing file: ' + files[i]);
      } else {
        copyFileSync(srcFile, destFile, opts);
      }
    }
  } // for files

  // finally change the mode for the newly created directory (otherwise, we
  // couldn't add files to a read-only directory).
  var checkDir = common.statFollowLinks(sourceDir);
  fs.chmodSync(destDir, checkDir.mode);
} // cpdirSyncRecursive

// Checks if cureent file was created recently
function checkRecentCreated(sources, index) {
  var lookedSource = sources[index];
  return sources.slice(0, index).some(function (src) {
    return path.basename(src) === path.basename(lookedSource);
  });
}

function cpcheckcycle(sourceDir, srcFile) {
  var srcFileStat = common.statNoFollowLinks(srcFile);
  if (srcFileStat.isSymbolicLink()) {
    // Do cycle check. For example:
    //   $ mkdir -p 1/2/3/4
    //   $ cd  1/2/3/4
    //   $ ln -s ../../3 link
    //   $ cd ../../../..
    //   $ cp -RL 1 copy
    var cyclecheck = common.statFollowLinks(srcFile);
    if (cyclecheck.isDirectory()) {
      var sourcerealpath = fs.realpathSync(sourceDir);
      var symlinkrealpath = fs.realpathSync(srcFile);
      var re = new RegExp(symlinkrealpath);
      if (re.test(sourcerealpath)) {
        return true;
      }
    }
  }
  return false;
}

//@
//@ ### cp([options,] source [, source ...], dest)
//@ ### cp([options,] source_array, dest)
//@
//@ Available options:
//@
//@ + `-f`: force (default behavior)
//@ + `-n`: no-clobber
//@ + `-u`: only copy if `source` is newer than `dest`
//@ + `-r`, `-R`: recursive
//@ + `-L`: follow symlinks
//@ + `-P`: don't follow symlinks
//@
//@ Examples:
//@
//@ ```javascript
//@ cp('file1', 'dir1');
//@ cp('-R', 'path/to/dir/', '~/newCopy/');
//@ cp('-Rf', '/tmp/*', '/usr/local/*', '/home/tmp');
//@ cp('-Rf', ['/tmp/*', '/usr/local/*'], '/home/tmp'); // same as above
//@ ```
//@
//@ Copies files.
function _cp(options, sources, dest) {
  // If we're missing -R, it actually implies -L (unless -P is explicit)
  if (options.followsymlink) {
    options.noFollowsymlink = false;
  }
  if (!options.recursive && !options.noFollowsymlink) {
    options.followsymlink = true;
  }

  // Get sources, dest
  if (arguments.length < 3) {
    common.error('missing <source> and/or <dest>');
  } else {
    sources = [].slice.call(arguments, 1, arguments.length - 1);
    dest = arguments[arguments.length - 1];
  }

  var destExists = fs.existsSync(dest);
  var destStat = destExists && common.statFollowLinks(dest);

  // Dest is not existing dir, but multiple sources given
  if ((!destExists || !destStat.isDirectory()) && sources.length > 1) {
    common.error('dest is not a directory (too many sources)');
  }

  // Dest is an existing file, but -n is given
  if (destExists && destStat.isFile() && options.no_force) {
    return new common.ShellString('', '', 0);
  }

  sources.forEach(function (src, srcIndex) {
    if (!fs.existsSync(src)) {
      if (src === '') src = "''"; // if src was empty string, display empty string
      common.error('no such file or directory: ' + src, { continue: true });
      return; // skip file
    }
    var srcStat = common.statFollowLinks(src);
    if (!options.noFollowsymlink && srcStat.isDirectory()) {
      if (!options.recursive) {
        // Non-Recursive
        common.error("omitting directory '" + src + "'", { continue: true });
      } else {
        // Recursive
        // 'cp /a/source dest' should create 'source' in 'dest'
        var newDest = (destStat && destStat.isDirectory()) ?
            path.join(dest, path.basename(src)) :
            dest;

        try {
          common.statFollowLinks(path.dirname(dest));
          cpdirSyncRecursive(src, newDest, 0, { no_force: options.no_force, followsymlink: options.followsymlink });
        } catch (e) {
          /* istanbul ignore next */
          common.error("cannot create directory '" + dest + "': No such file or directory");
        }
      }
    } else {
      // If here, src is a file

      // When copying to '/path/dir':
      //    thisDest = '/path/dir/file1'
      var thisDest = dest;
      if (destStat && destStat.isDirectory()) {
        thisDest = path.normalize(dest + '/' + path.basename(src));
      }

      var thisDestExists = fs.existsSync(thisDest);
      if (thisDestExists && checkRecentCreated(sources, srcIndex)) {
        // cannot overwrite file created recently in current execution, but we want to continue copying other files
        if (!options.no_force) {
          common.error("will not overwrite just-created '" + thisDest + "' with '" + src + "'", { continue: true });
        }
        return;
      }

      if (thisDestExists && options.no_force) {
        return; // skip file
      }

      if (path.relative(src, thisDest) === '') {
        // a file cannot be copied to itself, but we want to continue copying other files
        common.error("'" + thisDest + "' and '" + src + "' are the same file", { continue: true });
        return;
      }

      copyFileSync(src, thisDest, options);
    }
  }); // forEach(src)

  return new common.ShellString('', common.state.error, common.state.errorCode);
}
module.exports = _cp;


/***/ }),

/***/ 1408:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var _cd = __nccwpck_require__(2778);
var path = __nccwpck_require__(5622);

common.register('dirs', _dirs, {
  wrapOutput: false,
});
common.register('pushd', _pushd, {
  wrapOutput: false,
});
common.register('popd', _popd, {
  wrapOutput: false,
});

// Pushd/popd/dirs internals
var _dirStack = [];

function _isStackIndex(index) {
  return (/^[\-+]\d+$/).test(index);
}

function _parseStackIndex(index) {
  if (_isStackIndex(index)) {
    if (Math.abs(index) < _dirStack.length + 1) { // +1 for pwd
      return (/^-/).test(index) ? Number(index) - 1 : Number(index);
    }
    common.error(index + ': directory stack index out of range');
  } else {
    common.error(index + ': invalid number');
  }
}

function _actualDirStack() {
  return [process.cwd()].concat(_dirStack);
}

//@
//@ ### pushd([options,] [dir | '-N' | '+N'])
//@
//@ Available options:
//@
//@ + `-n`: Suppresses the normal change of directory when adding directories to the stack, so that only the stack is manipulated.
//@ + `-q`: Supresses output to the console.
//@
//@ Arguments:
//@
//@ + `dir`: Sets the current working directory to the top of the stack, then executes the equivalent of `cd dir`.
//@ + `+N`: Brings the Nth directory (counting from the left of the list printed by dirs, starting with zero) to the top of the list by rotating the stack.
//@ + `-N`: Brings the Nth directory (counting from the right of the list printed by dirs, starting with zero) to the top of the list by rotating the stack.
//@
//@ Examples:
//@
//@ ```javascript
//@ // process.cwd() === '/usr'
//@ pushd('/etc'); // Returns /etc /usr
//@ pushd('+1');   // Returns /usr /etc
//@ ```
//@
//@ Save the current directory on the top of the directory stack and then `cd` to `dir`. With no arguments, `pushd` exchanges the top two directories. Returns an array of paths in the stack.
function _pushd(options, dir) {
  if (_isStackIndex(options)) {
    dir = options;
    options = '';
  }

  options = common.parseOptions(options, {
    'n': 'no-cd',
    'q': 'quiet',
  });

  var dirs = _actualDirStack();

  if (dir === '+0') {
    return dirs; // +0 is a noop
  } else if (!dir) {
    if (dirs.length > 1) {
      dirs = dirs.splice(1, 1).concat(dirs);
    } else {
      return common.error('no other directory');
    }
  } else if (_isStackIndex(dir)) {
    var n = _parseStackIndex(dir);
    dirs = dirs.slice(n).concat(dirs.slice(0, n));
  } else {
    if (options['no-cd']) {
      dirs.splice(1, 0, dir);
    } else {
      dirs.unshift(dir);
    }
  }

  if (options['no-cd']) {
    dirs = dirs.slice(1);
  } else {
    dir = path.resolve(dirs.shift());
    _cd('', dir);
  }

  _dirStack = dirs;
  return _dirs(options.quiet ? '-q' : '');
}
exports.pushd = _pushd;

//@
//@
//@ ### popd([options,] ['-N' | '+N'])
//@
//@ Available options:
//@
//@ + `-n`: Suppress the normal directory change when removing directories from the stack, so that only the stack is manipulated.
//@ + `-q`: Supresses output to the console.
//@
//@ Arguments:
//@
//@ + `+N`: Removes the Nth directory (counting from the left of the list printed by dirs), starting with zero.
//@ + `-N`: Removes the Nth directory (counting from the right of the list printed by dirs), starting with zero.
//@
//@ Examples:
//@
//@ ```javascript
//@ echo(process.cwd()); // '/usr'
//@ pushd('/etc');       // '/etc /usr'
//@ echo(process.cwd()); // '/etc'
//@ popd();              // '/usr'
//@ echo(process.cwd()); // '/usr'
//@ ```
//@
//@ When no arguments are given, `popd` removes the top directory from the stack and performs a `cd` to the new top directory. The elements are numbered from 0, starting at the first directory listed with dirs (i.e., `popd` is equivalent to `popd +0`). Returns an array of paths in the stack.
function _popd(options, index) {
  if (_isStackIndex(options)) {
    index = options;
    options = '';
  }

  options = common.parseOptions(options, {
    'n': 'no-cd',
    'q': 'quiet',
  });

  if (!_dirStack.length) {
    return common.error('directory stack empty');
  }

  index = _parseStackIndex(index || '+0');

  if (options['no-cd'] || index > 0 || _dirStack.length + index === 0) {
    index = index > 0 ? index - 1 : index;
    _dirStack.splice(index, 1);
  } else {
    var dir = path.resolve(_dirStack.shift());
    _cd('', dir);
  }

  return _dirs(options.quiet ? '-q' : '');
}
exports.popd = _popd;

//@
//@
//@ ### dirs([options | '+N' | '-N'])
//@
//@ Available options:
//@
//@ + `-c`: Clears the directory stack by deleting all of the elements.
//@ + `-q`: Supresses output to the console.
//@
//@ Arguments:
//@
//@ + `+N`: Displays the Nth directory (counting from the left of the list printed by dirs when invoked without options), starting with zero.
//@ + `-N`: Displays the Nth directory (counting from the right of the list printed by dirs when invoked without options), starting with zero.
//@
//@ Display the list of currently remembered directories. Returns an array of paths in the stack, or a single path if `+N` or `-N` was specified.
//@
//@ See also: `pushd`, `popd`
function _dirs(options, index) {
  if (_isStackIndex(options)) {
    index = options;
    options = '';
  }

  options = common.parseOptions(options, {
    'c': 'clear',
    'q': 'quiet',
  });

  if (options.clear) {
    _dirStack = [];
    return _dirStack;
  }

  var stack = _actualDirStack();

  if (index) {
    index = _parseStackIndex(index);

    if (index < 0) {
      index = stack.length + index;
    }

    if (!options.quiet) {
      common.log(stack[index]);
    }
    return stack[index];
  }

  if (!options.quiet) {
    common.log(stack.join(' '));
  }

  return stack;
}
exports.dirs = _dirs;


/***/ }),

/***/ 3023:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var format = __nccwpck_require__(1669).format;

var common = __nccwpck_require__(8723);

common.register('echo', _echo, {
  allowGlobbing: false,
});

//@
//@ ### echo([options,] string [, string ...])
//@
//@ Available options:
//@
//@ + `-e`: interpret backslash escapes (default)
//@ + `-n`: remove trailing newline from output
//@
//@ Examples:
//@
//@ ```javascript
//@ echo('hello world');
//@ var str = echo('hello world');
//@ echo('-n', 'no newline at end');
//@ ```
//@
//@ Prints `string` to stdout, and returns string with additional utility methods
//@ like `.to()`.
function _echo(opts) {
  // allow strings starting with '-', see issue #20
  var messages = [].slice.call(arguments, opts ? 0 : 1);
  var options = {};

  // If the first argument starts with '-', parse it as options string.
  // If parseOptions throws, it wasn't an options string.
  try {
    options = common.parseOptions(messages[0], {
      'e': 'escapes',
      'n': 'no_newline',
    }, {
      silent: true,
    });

    // Allow null to be echoed
    if (messages[0]) {
      messages.shift();
    }
  } catch (_) {
    // Clear out error if an error occurred
    common.state.error = null;
  }

  var output = format.apply(null, messages);

  // Add newline if -n is not passed.
  if (!options.no_newline) {
    output += '\n';
  }

  process.stdout.write(output);

  return output;
}

module.exports = _echo;


/***/ }),

/***/ 7533:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);

//@
//@ ### error()
//@
//@ Tests if error occurred in the last command. Returns a truthy value if an
//@ error returned, or a falsy value otherwise.
//@
//@ **Note**: do not rely on the
//@ return value to be an error message. If you need the last error message, use
//@ the `.stderr` attribute from the last command's return value instead.
function error() {
  return common.state.error;
}
module.exports = error;


/***/ }),

/***/ 7675:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/* module decorator */ module = __nccwpck_require__.nmd(module);
if (require.main !== module) {
  throw new Error('This file should not be required');
}

var childProcess = __nccwpck_require__(3129);
var fs = __nccwpck_require__(5747);

var paramFilePath = process.argv[2];

var serializedParams = fs.readFileSync(paramFilePath, 'utf8');
var params = JSON.parse(serializedParams);

var cmd = params.command;
var execOptions = params.execOptions;
var pipe = params.pipe;
var stdoutFile = params.stdoutFile;
var stderrFile = params.stderrFile;

var c = childProcess.exec(cmd, execOptions, function (err) {
  if (!err) {
    process.exitCode = 0;
  } else if (err.code === undefined) {
    process.exitCode = 1;
  } else {
    process.exitCode = err.code;
  }
});

var stdoutStream = fs.createWriteStream(stdoutFile);
var stderrStream = fs.createWriteStream(stderrFile);

c.stdout.pipe(stdoutStream);
c.stderr.pipe(stderrStream);
c.stdout.pipe(process.stdout);
c.stderr.pipe(process.stderr);

if (pipe) {
  c.stdin.end(pipe);
}


/***/ }),

/***/ 6328:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var _tempDir = __nccwpck_require__(5248).tempDir;
var _pwd = __nccwpck_require__(6240);
var path = __nccwpck_require__(5622);
var fs = __nccwpck_require__(5747);
var child = __nccwpck_require__(3129);

var DEFAULT_MAXBUFFER_SIZE = 20 * 1024 * 1024;
var DEFAULT_ERROR_CODE = 1;

common.register('exec', _exec, {
  unix: false,
  canReceivePipe: true,
  wrapOutput: false,
});

// We use this function to run `exec` synchronously while also providing realtime
// output.
function execSync(cmd, opts, pipe) {
  if (!common.config.execPath) {
    common.error('Unable to find a path to the node binary. Please manually set config.execPath');
  }

  var tempDir = _tempDir();
  var paramsFile = path.resolve(tempDir + '/' + common.randomFileName());
  var stderrFile = path.resolve(tempDir + '/' + common.randomFileName());
  var stdoutFile = path.resolve(tempDir + '/' + common.randomFileName());

  opts = common.extend({
    silent: common.config.silent,
    cwd: _pwd().toString(),
    env: process.env,
    maxBuffer: DEFAULT_MAXBUFFER_SIZE,
    encoding: 'utf8',
  }, opts);

  if (fs.existsSync(paramsFile)) common.unlinkSync(paramsFile);
  if (fs.existsSync(stderrFile)) common.unlinkSync(stderrFile);
  if (fs.existsSync(stdoutFile)) common.unlinkSync(stdoutFile);

  opts.cwd = path.resolve(opts.cwd);

  var paramsToSerialize = {
    command: cmd,
    execOptions: opts,
    pipe: pipe,
    stdoutFile: stdoutFile,
    stderrFile: stderrFile,
  };

  fs.writeFileSync(paramsFile, JSON.stringify(paramsToSerialize), 'utf8');

  var execArgs = [
    __nccwpck_require__.ab + "exec-child.js",
    paramsFile,
  ];

  /* istanbul ignore else */
  if (opts.silent) {
    opts.stdio = 'ignore';
  } else {
    opts.stdio = [0, 1, 2];
  }

  var code = 0;

  // Welcome to the future
  try {
    // Bad things if we pass in a `shell` option to child_process.execFileSync,
    // so we need to explicitly remove it here.
    delete opts.shell;

    child.execFileSync(common.config.execPath, execArgs, opts);
  } catch (e) {
    // Commands with non-zero exit code raise an exception.
    code = e.status || DEFAULT_ERROR_CODE;
  }

  // fs.readFileSync uses buffer encoding by default, so call
  // it without the encoding option if the encoding is 'buffer'.
  // Also, if the exec timeout is too short for node to start up,
  // the files will not be created, so these calls will throw.
  var stdout = '';
  var stderr = '';
  if (opts.encoding === 'buffer') {
    stdout = fs.readFileSync(stdoutFile);
    stderr = fs.readFileSync(stderrFile);
  } else {
    stdout = fs.readFileSync(stdoutFile, opts.encoding);
    stderr = fs.readFileSync(stderrFile, opts.encoding);
  }

  // No biggie if we can't erase the files now -- they're in a temp dir anyway
  try { common.unlinkSync(paramsFile); } catch (e) {}
  try { common.unlinkSync(stderrFile); } catch (e) {}
  try { common.unlinkSync(stdoutFile); } catch (e) {}

  if (code !== 0) {
    // Note: `silent` should be unconditionally true to avoid double-printing
    // the command's stderr, and to avoid printing any stderr when the user has
    // set `shell.config.silent`.
    common.error(stderr, code, { continue: true, silent: true });
  }
  var obj = common.ShellString(stdout, stderr, code);
  return obj;
} // execSync()

// Wrapper around exec() to enable echoing output to console in real time
function execAsync(cmd, opts, pipe, callback) {
  opts = common.extend({
    silent: common.config.silent,
    cwd: _pwd().toString(),
    env: process.env,
    maxBuffer: DEFAULT_MAXBUFFER_SIZE,
    encoding: 'utf8',
  }, opts);

  var c = child.exec(cmd, opts, function (err, stdout, stderr) {
    if (callback) {
      if (!err) {
        callback(0, stdout, stderr);
      } else if (err.code === undefined) {
        // See issue #536
        /* istanbul ignore next */
        callback(1, stdout, stderr);
      } else {
        callback(err.code, stdout, stderr);
      }
    }
  });

  if (pipe) c.stdin.end(pipe);

  if (!opts.silent) {
    c.stdout.pipe(process.stdout);
    c.stderr.pipe(process.stderr);
  }

  return c;
}

//@
//@ ### exec(command [, options] [, callback])
//@
//@ Available options:
//@
//@ + `async`: Asynchronous execution. If a callback is provided, it will be set to
//@   `true`, regardless of the passed value (default: `false`).
//@ + `silent`: Do not echo program output to console (default: `false`).
//@ + `encoding`: Character encoding to use. Affects the values returned to stdout and stderr, and
//@   what is written to stdout and stderr when not in silent mode (default: `'utf8'`).
//@ + and any option available to Node.js's
//@   [`child_process.exec()`](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback)
//@
//@ Examples:
//@
//@ ```javascript
//@ var version = exec('node --version', {silent:true}).stdout;
//@
//@ var child = exec('some_long_running_process', {async:true});
//@ child.stdout.on('data', function(data) {
//@   /* ... do something with data ... */
//@ });
//@
//@ exec('some_long_running_process', function(code, stdout, stderr) {
//@   console.log('Exit code:', code);
//@   console.log('Program output:', stdout);
//@   console.log('Program stderr:', stderr);
//@ });
//@ ```
//@
//@ Executes the given `command` _synchronously_, unless otherwise specified.  When in synchronous
//@ mode, this returns a `ShellString` (compatible with ShellJS v0.6.x, which returns an object
//@ of the form `{ code:..., stdout:... , stderr:... }`). Otherwise, this returns the child process
//@ object, and the `callback` receives the arguments `(code, stdout, stderr)`.
//@
//@ Not seeing the behavior you want? `exec()` runs everything through `sh`
//@ by default (or `cmd.exe` on Windows), which differs from `bash`. If you
//@ need bash-specific behavior, try out the `{shell: 'path/to/bash'}` option.
function _exec(command, options, callback) {
  options = options || {};
  if (!command) common.error('must specify command');

  var pipe = common.readFromPipe();

  // Callback is defined instead of options.
  if (typeof options === 'function') {
    callback = options;
    options = { async: true };
  }

  // Callback is defined with options.
  if (typeof options === 'object' && typeof callback === 'function') {
    options.async = true;
  }

  options = common.extend({
    silent: common.config.silent,
    async: false,
  }, options);

  if (options.async) {
    return execAsync(command, options, pipe, callback);
  } else {
    return execSync(command, options, pipe);
  }
}
module.exports = _exec;


/***/ }),

/***/ 4145:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var path = __nccwpck_require__(5622);
var common = __nccwpck_require__(8723);
var _ls = __nccwpck_require__(3551);

common.register('find', _find, {});

//@
//@ ### find(path [, path ...])
//@ ### find(path_array)
//@
//@ Examples:
//@
//@ ```javascript
//@ find('src', 'lib');
//@ find(['src', 'lib']); // same as above
//@ find('.').filter(function(file) { return file.match(/\.js$/); });
//@ ```
//@
//@ Returns array of all files (however deep) in the given paths.
//@
//@ The main difference from `ls('-R', path)` is that the resulting file names
//@ include the base directories (e.g., `lib/resources/file1` instead of just `file1`).
function _find(options, paths) {
  if (!paths) {
    common.error('no path specified');
  } else if (typeof paths === 'string') {
    paths = [].slice.call(arguments, 1);
  }

  var list = [];

  function pushFile(file) {
    if (process.platform === 'win32') {
      file = file.replace(/\\/g, '/');
    }
    list.push(file);
  }

  // why not simply do `ls('-R', paths)`? because the output wouldn't give the base dirs
  // to get the base dir in the output, we need instead `ls('-R', 'dir/*')` for every directory

  paths.forEach(function (file) {
    var stat;
    try {
      stat = common.statFollowLinks(file);
    } catch (e) {
      common.error('no such file or directory: ' + file);
    }

    pushFile(file);

    if (stat.isDirectory()) {
      _ls({ recursive: true, all: true }, file).forEach(function (subfile) {
        pushFile(path.join(file, subfile));
      });
    }
  });

  return list;
}
module.exports = _find;


/***/ }),

/***/ 9789:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);

common.register('grep', _grep, {
  globStart: 2, // don't glob-expand the regex
  canReceivePipe: true,
  cmdOptions: {
    'v': 'inverse',
    'l': 'nameOnly',
    'i': 'ignoreCase',
  },
});

//@
//@ ### grep([options,] regex_filter, file [, file ...])
//@ ### grep([options,] regex_filter, file_array)
//@
//@ Available options:
//@
//@ + `-v`: Invert `regex_filter` (only print non-matching lines).
//@ + `-l`: Print only filenames of matching files.
//@ + `-i`: Ignore case.
//@
//@ Examples:
//@
//@ ```javascript
//@ grep('-v', 'GLOBAL_VARIABLE', '*.js');
//@ grep('GLOBAL_VARIABLE', '*.js');
//@ ```
//@
//@ Reads input string from given files and returns a string containing all lines of the
//@ file that match the given `regex_filter`.
function _grep(options, regex, files) {
  // Check if this is coming from a pipe
  var pipe = common.readFromPipe();

  if (!files && !pipe) common.error('no paths given', 2);

  files = [].slice.call(arguments, 2);

  if (pipe) {
    files.unshift('-');
  }

  var grep = [];
  if (options.ignoreCase) {
    regex = new RegExp(regex, 'i');
  }
  files.forEach(function (file) {
    if (!fs.existsSync(file) && file !== '-') {
      common.error('no such file or directory: ' + file, 2, { continue: true });
      return;
    }

    var contents = file === '-' ? pipe : fs.readFileSync(file, 'utf8');
    if (options.nameOnly) {
      if (contents.match(regex)) {
        grep.push(file);
      }
    } else {
      var lines = contents.split('\n');
      lines.forEach(function (line) {
        var matched = line.match(regex);
        if ((options.inverse && !matched) || (!options.inverse && matched)) {
          grep.push(line);
        }
      });
    }
  });

  return grep.join('\n') + '\n';
}
module.exports = _grep;


/***/ }),

/***/ 4731:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);

common.register('head', _head, {
  canReceivePipe: true,
  cmdOptions: {
    'n': 'numLines',
  },
});

// Reads |numLines| lines or the entire file, whichever is less.
function readSomeLines(file, numLines) {
  var buf = common.buffer();
  var bufLength = buf.length;
  var bytesRead = bufLength;
  var pos = 0;

  var fdr = fs.openSync(file, 'r');
  var numLinesRead = 0;
  var ret = '';
  while (bytesRead === bufLength && numLinesRead < numLines) {
    bytesRead = fs.readSync(fdr, buf, 0, bufLength, pos);
    var bufStr = buf.toString('utf8', 0, bytesRead);
    numLinesRead += bufStr.split('\n').length - 1;
    ret += bufStr;
    pos += bytesRead;
  }

  fs.closeSync(fdr);
  return ret;
}

//@
//@ ### head([{'-n': \<num\>},] file [, file ...])
//@ ### head([{'-n': \<num\>},] file_array)
//@
//@ Available options:
//@
//@ + `-n <num>`: Show the first `<num>` lines of the files
//@
//@ Examples:
//@
//@ ```javascript
//@ var str = head({'-n': 1}, 'file*.txt');
//@ var str = head('file1', 'file2');
//@ var str = head(['file1', 'file2']); // same as above
//@ ```
//@
//@ Read the start of a file.
function _head(options, files) {
  var head = [];
  var pipe = common.readFromPipe();

  if (!files && !pipe) common.error('no paths given');

  var idx = 1;
  if (options.numLines === true) {
    idx = 2;
    options.numLines = Number(arguments[1]);
  } else if (options.numLines === false) {
    options.numLines = 10;
  }
  files = [].slice.call(arguments, idx);

  if (pipe) {
    files.unshift('-');
  }

  var shouldAppendNewline = false;
  files.forEach(function (file) {
    if (file !== '-') {
      if (!fs.existsSync(file)) {
        common.error('no such file or directory: ' + file, { continue: true });
        return;
      } else if (common.statFollowLinks(file).isDirectory()) {
        common.error("error reading '" + file + "': Is a directory", {
          continue: true,
        });
        return;
      }
    }

    var contents;
    if (file === '-') {
      contents = pipe;
    } else if (options.numLines < 0) {
      contents = fs.readFileSync(file, 'utf8');
    } else {
      contents = readSomeLines(file, options.numLines);
    }

    var lines = contents.split('\n');
    var hasTrailingNewline = (lines[lines.length - 1] === '');
    if (hasTrailingNewline) {
      lines.pop();
    }
    shouldAppendNewline = (hasTrailingNewline || options.numLines < lines.length);

    head = head.concat(lines.slice(0, options.numLines));
  });

  if (shouldAppendNewline) {
    head.push(''); // to add a trailing newline once we join
  }
  return head.join('\n');
}
module.exports = _head;


/***/ }),

/***/ 9737:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);
var common = __nccwpck_require__(8723);

common.register('ln', _ln, {
  cmdOptions: {
    's': 'symlink',
    'f': 'force',
  },
});

//@
//@ ### ln([options,] source, dest)
//@
//@ Available options:
//@
//@ + `-s`: symlink
//@ + `-f`: force
//@
//@ Examples:
//@
//@ ```javascript
//@ ln('file', 'newlink');
//@ ln('-sf', 'file', 'existing');
//@ ```
//@
//@ Links `source` to `dest`. Use `-f` to force the link, should `dest` already exist.
function _ln(options, source, dest) {
  if (!source || !dest) {
    common.error('Missing <source> and/or <dest>');
  }

  source = String(source);
  var sourcePath = path.normalize(source).replace(RegExp(path.sep + '$'), '');
  var isAbsolute = (path.resolve(source) === sourcePath);
  dest = path.resolve(process.cwd(), String(dest));

  if (fs.existsSync(dest)) {
    if (!options.force) {
      common.error('Destination file exists', { continue: true });
    }

    fs.unlinkSync(dest);
  }

  if (options.symlink) {
    var isWindows = process.platform === 'win32';
    var linkType = isWindows ? 'file' : null;
    var resolvedSourcePath = isAbsolute ? sourcePath : path.resolve(process.cwd(), path.dirname(dest), source);
    if (!fs.existsSync(resolvedSourcePath)) {
      common.error('Source file does not exist', { continue: true });
    } else if (isWindows && common.statFollowLinks(resolvedSourcePath).isDirectory()) {
      linkType = 'junction';
    }

    try {
      fs.symlinkSync(linkType === 'junction' ? resolvedSourcePath : source, dest, linkType);
    } catch (err) {
      common.error(err.message);
    }
  } else {
    if (!fs.existsSync(source)) {
      common.error('Source file does not exist', { continue: true });
    }
    try {
      fs.linkSync(source, dest);
    } catch (err) {
      common.error(err.message);
    }
  }
  return '';
}
module.exports = _ln;


/***/ }),

/***/ 3551:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var path = __nccwpck_require__(5622);
var fs = __nccwpck_require__(5747);
var common = __nccwpck_require__(8723);
var glob = __nccwpck_require__(5603);

var globPatternRecursive = path.sep + '**';

common.register('ls', _ls, {
  cmdOptions: {
    'R': 'recursive',
    'A': 'all',
    'L': 'link',
    'a': 'all_deprecated',
    'd': 'directory',
    'l': 'long',
  },
});

//@
//@ ### ls([options,] [path, ...])
//@ ### ls([options,] path_array)
//@
//@ Available options:
//@
//@ + `-R`: recursive
//@ + `-A`: all files (include files beginning with `.`, except for `.` and `..`)
//@ + `-L`: follow symlinks
//@ + `-d`: list directories themselves, not their contents
//@ + `-l`: list objects representing each file, each with fields containing `ls
//@         -l` output fields. See
//@         [`fs.Stats`](https://nodejs.org/api/fs.html#fs_class_fs_stats)
//@         for more info
//@
//@ Examples:
//@
//@ ```javascript
//@ ls('projs/*.js');
//@ ls('-R', '/users/me', '/tmp');
//@ ls('-R', ['/users/me', '/tmp']); // same as above
//@ ls('-l', 'file.txt'); // { name: 'file.txt', mode: 33188, nlink: 1, ...}
//@ ```
//@
//@ Returns array of files in the given `path`, or files in
//@ the current directory if no `path` is  provided.
function _ls(options, paths) {
  if (options.all_deprecated) {
    // We won't support the -a option as it's hard to image why it's useful
    // (it includes '.' and '..' in addition to '.*' files)
    // For backwards compatibility we'll dump a deprecated message and proceed as before
    common.log('ls: Option -a is deprecated. Use -A instead');
    options.all = true;
  }

  if (!paths) {
    paths = ['.'];
  } else {
    paths = [].slice.call(arguments, 1);
  }

  var list = [];

  function pushFile(abs, relName, stat) {
    if (process.platform === 'win32') {
      relName = relName.replace(/\\/g, '/');
    }
    if (options.long) {
      stat = stat || (options.link ? common.statFollowLinks(abs) : common.statNoFollowLinks(abs));
      list.push(addLsAttributes(relName, stat));
    } else {
      // list.push(path.relative(rel || '.', file));
      list.push(relName);
    }
  }

  paths.forEach(function (p) {
    var stat;

    try {
      stat = options.link ? common.statFollowLinks(p) : common.statNoFollowLinks(p);
      // follow links to directories by default
      if (stat.isSymbolicLink()) {
        /* istanbul ignore next */
        // workaround for https://github.com/shelljs/shelljs/issues/795
        // codecov seems to have a bug that miscalculate this block as uncovered.
        // but according to nyc report this block does get covered.
        try {
          var _stat = common.statFollowLinks(p);
          if (_stat.isDirectory()) {
            stat = _stat;
          }
        } catch (_) {} // bad symlink, treat it like a file
      }
    } catch (e) {
      common.error('no such file or directory: ' + p, 2, { continue: true });
      return;
    }

    // If the stat succeeded
    if (stat.isDirectory() && !options.directory) {
      if (options.recursive) {
        // use glob, because it's simple
        glob.sync(p + globPatternRecursive, { dot: options.all, follow: options.link })
          .forEach(function (item) {
            // Glob pattern returns the directory itself and needs to be filtered out.
            if (path.relative(p, item)) {
              pushFile(item, path.relative(p, item));
            }
          });
      } else if (options.all) {
        // use fs.readdirSync, because it's fast
        fs.readdirSync(p).forEach(function (item) {
          pushFile(path.join(p, item), item);
        });
      } else {
        // use fs.readdirSync and then filter out secret files
        fs.readdirSync(p).forEach(function (item) {
          if (item[0] !== '.') {
            pushFile(path.join(p, item), item);
          }
        });
      }
    } else {
      pushFile(p, p, stat);
    }
  });

  // Add methods, to make this more compatible with ShellStrings
  return list;
}

function addLsAttributes(pathName, stats) {
  // Note: this object will contain more information than .toString() returns
  stats.name = pathName;
  stats.toString = function () {
    // Return a string resembling unix's `ls -l` format
    return [this.mode, this.nlink, this.uid, this.gid, this.size, this.mtime, this.name].join(' ');
  };
  return stats;
}

module.exports = _ls;


/***/ }),

/***/ 5218:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);

common.register('mkdir', _mkdir, {
  cmdOptions: {
    'p': 'fullpath',
  },
});

// Recursively creates `dir`
function mkdirSyncRecursive(dir) {
  var baseDir = path.dirname(dir);

  // Prevents some potential problems arising from malformed UNCs or
  // insufficient permissions.
  /* istanbul ignore next */
  if (baseDir === dir) {
    common.error('dirname() failed: [' + dir + ']');
  }

  // Base dir exists, no recursion necessary
  if (fs.existsSync(baseDir)) {
    fs.mkdirSync(dir, parseInt('0777', 8));
    return;
  }

  // Base dir does not exist, go recursive
  mkdirSyncRecursive(baseDir);

  // Base dir created, can create dir
  fs.mkdirSync(dir, parseInt('0777', 8));
}

//@
//@ ### mkdir([options,] dir [, dir ...])
//@ ### mkdir([options,] dir_array)
//@
//@ Available options:
//@
//@ + `-p`: full path (and create intermediate directories, if necessary)
//@
//@ Examples:
//@
//@ ```javascript
//@ mkdir('-p', '/tmp/a/b/c/d', '/tmp/e/f/g');
//@ mkdir('-p', ['/tmp/a/b/c/d', '/tmp/e/f/g']); // same as above
//@ ```
//@
//@ Creates directories.
function _mkdir(options, dirs) {
  if (!dirs) common.error('no paths given');

  if (typeof dirs === 'string') {
    dirs = [].slice.call(arguments, 1);
  }
  // if it's array leave it as it is

  dirs.forEach(function (dir) {
    try {
      var stat = common.statNoFollowLinks(dir);
      if (!options.fullpath) {
        common.error('path already exists: ' + dir, { continue: true });
      } else if (stat.isFile()) {
        common.error('cannot create directory ' + dir + ': File exists', { continue: true });
      }
      return; // skip dir
    } catch (e) {
      // do nothing
    }

    // Base dir does not exist, and no -p option given
    var baseDir = path.dirname(dir);
    if (!fs.existsSync(baseDir) && !options.fullpath) {
      common.error('no such file or directory: ' + baseDir, { continue: true });
      return; // skip dir
    }

    try {
      if (options.fullpath) {
        mkdirSyncRecursive(path.resolve(dir));
      } else {
        fs.mkdirSync(dir, parseInt('0777', 8));
      }
    } catch (e) {
      var reason;
      if (e.code === 'EACCES') {
        reason = 'Permission denied';
      } else if (e.code === 'ENOTDIR' || e.code === 'ENOENT') {
        reason = 'Not a directory';
      } else {
        /* istanbul ignore next */
        throw e;
      }
      common.error('cannot create directory ' + dir + ': ' + reason, { continue: true });
    }
  });
  return '';
} // mkdir
module.exports = _mkdir;


/***/ }),

/***/ 5439:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);
var common = __nccwpck_require__(8723);
var cp = __nccwpck_require__(2373);
var rm = __nccwpck_require__(8643);

common.register('mv', _mv, {
  cmdOptions: {
    'f': '!no_force',
    'n': 'no_force',
  },
});

// Checks if cureent file was created recently
function checkRecentCreated(sources, index) {
  var lookedSource = sources[index];
  return sources.slice(0, index).some(function (src) {
    return path.basename(src) === path.basename(lookedSource);
  });
}

//@
//@ ### mv([options ,] source [, source ...], dest')
//@ ### mv([options ,] source_array, dest')
//@
//@ Available options:
//@
//@ + `-f`: force (default behavior)
//@ + `-n`: no-clobber
//@
//@ Examples:
//@
//@ ```javascript
//@ mv('-n', 'file', 'dir/');
//@ mv('file1', 'file2', 'dir/');
//@ mv(['file1', 'file2'], 'dir/'); // same as above
//@ ```
//@
//@ Moves `source` file(s) to `dest`.
function _mv(options, sources, dest) {
  // Get sources, dest
  if (arguments.length < 3) {
    common.error('missing <source> and/or <dest>');
  } else if (arguments.length > 3) {
    sources = [].slice.call(arguments, 1, arguments.length - 1);
    dest = arguments[arguments.length - 1];
  } else if (typeof sources === 'string') {
    sources = [sources];
  } else {
    // TODO(nate): figure out if we actually need this line
    common.error('invalid arguments');
  }

  var exists = fs.existsSync(dest);
  var stats = exists && common.statFollowLinks(dest);

  // Dest is not existing dir, but multiple sources given
  if ((!exists || !stats.isDirectory()) && sources.length > 1) {
    common.error('dest is not a directory (too many sources)');
  }

  // Dest is an existing file, but no -f given
  if (exists && stats.isFile() && options.no_force) {
    common.error('dest file already exists: ' + dest);
  }

  sources.forEach(function (src, srcIndex) {
    if (!fs.existsSync(src)) {
      common.error('no such file or directory: ' + src, { continue: true });
      return; // skip file
    }

    // If here, src exists

    // When copying to '/path/dir':
    //    thisDest = '/path/dir/file1'
    var thisDest = dest;
    if (fs.existsSync(dest) && common.statFollowLinks(dest).isDirectory()) {
      thisDest = path.normalize(dest + '/' + path.basename(src));
    }

    var thisDestExists = fs.existsSync(thisDest);

    if (thisDestExists && checkRecentCreated(sources, srcIndex)) {
      // cannot overwrite file created recently in current execution, but we want to continue copying other files
      if (!options.no_force) {
        common.error("will not overwrite just-created '" + thisDest + "' with '" + src + "'", { continue: true });
      }
      return;
    }

    if (fs.existsSync(thisDest) && options.no_force) {
      common.error('dest file already exists: ' + thisDest, { continue: true });
      return; // skip file
    }

    if (path.resolve(src) === path.dirname(path.resolve(thisDest))) {
      common.error('cannot move to self: ' + src, { continue: true });
      return; // skip file
    }

    try {
      fs.renameSync(src, thisDest);
    } catch (e) {
      /* istanbul ignore next */
      if (e.code === 'EXDEV') {
        // If we're trying to `mv` to an external partition, we'll actually need
        // to perform a copy and then clean up the original file. If either the
        // copy or the rm fails with an exception, we should allow this
        // exception to pass up to the top level.
        cp('-r', src, thisDest);
        rm('-rf', src);
      }
    }
  }); // forEach(src)
  return '';
} // mv
module.exports = _mv;


/***/ }),

/***/ 8846:
/***/ (() => {

// see dirs.js


/***/ }),

/***/ 7503:
/***/ (() => {

// see dirs.js


/***/ }),

/***/ 6240:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var path = __nccwpck_require__(5622);
var common = __nccwpck_require__(8723);

common.register('pwd', _pwd, {
  allowGlobbing: false,
});

//@
//@ ### pwd()
//@
//@ Returns the current directory.
function _pwd() {
  var pwd = path.resolve(process.cwd());
  return pwd;
}
module.exports = _pwd;


/***/ }),

/***/ 8643:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);

common.register('rm', _rm, {
  cmdOptions: {
    'f': 'force',
    'r': 'recursive',
    'R': 'recursive',
  },
});

// Recursively removes 'dir'
// Adapted from https://github.com/ryanmcgrath/wrench-js
//
// Copyright (c) 2010 Ryan McGrath
// Copyright (c) 2012 Artur Adib
//
// Licensed under the MIT License
// http://www.opensource.org/licenses/mit-license.php
function rmdirSyncRecursive(dir, force, fromSymlink) {
  var files;

  files = fs.readdirSync(dir);

  // Loop through and delete everything in the sub-tree after checking it
  for (var i = 0; i < files.length; i++) {
    var file = dir + '/' + files[i];
    var currFile = common.statNoFollowLinks(file);

    if (currFile.isDirectory()) { // Recursive function back to the beginning
      rmdirSyncRecursive(file, force);
    } else { // Assume it's a file - perhaps a try/catch belongs here?
      if (force || isWriteable(file)) {
        try {
          common.unlinkSync(file);
        } catch (e) {
          /* istanbul ignore next */
          common.error('could not remove file (code ' + e.code + '): ' + file, {
            continue: true,
          });
        }
      }
    }
  }

  // if was directory was referenced through a symbolic link,
  // the contents should be removed, but not the directory itself
  if (fromSymlink) return;

  // Now that we know everything in the sub-tree has been deleted, we can delete the main directory.
  // Huzzah for the shopkeep.

  var result;
  try {
    // Retry on windows, sometimes it takes a little time before all the files in the directory are gone
    var start = Date.now();

    // TODO: replace this with a finite loop
    for (;;) {
      try {
        result = fs.rmdirSync(dir);
        if (fs.existsSync(dir)) throw { code: 'EAGAIN' };
        break;
      } catch (er) {
        /* istanbul ignore next */
        // In addition to error codes, also check if the directory still exists and loop again if true
        if (process.platform === 'win32' && (er.code === 'ENOTEMPTY' || er.code === 'EBUSY' || er.code === 'EPERM' || er.code === 'EAGAIN')) {
          if (Date.now() - start > 1000) throw er;
        } else if (er.code === 'ENOENT') {
          // Directory did not exist, deletion was successful
          break;
        } else {
          throw er;
        }
      }
    }
  } catch (e) {
    common.error('could not remove directory (code ' + e.code + '): ' + dir, { continue: true });
  }

  return result;
} // rmdirSyncRecursive

// Hack to determine if file has write permissions for current user
// Avoids having to check user, group, etc, but it's probably slow
function isWriteable(file) {
  var writePermission = true;
  try {
    var __fd = fs.openSync(file, 'a');
    fs.closeSync(__fd);
  } catch (e) {
    writePermission = false;
  }

  return writePermission;
}

function handleFile(file, options) {
  if (options.force || isWriteable(file)) {
    // -f was passed, or file is writable, so it can be removed
    common.unlinkSync(file);
  } else {
    common.error('permission denied: ' + file, { continue: true });
  }
}

function handleDirectory(file, options) {
  if (options.recursive) {
    // -r was passed, so directory can be removed
    rmdirSyncRecursive(file, options.force);
  } else {
    common.error('path is a directory', { continue: true });
  }
}

function handleSymbolicLink(file, options) {
  var stats;
  try {
    stats = common.statFollowLinks(file);
  } catch (e) {
    // symlink is broken, so remove the symlink itself
    common.unlinkSync(file);
    return;
  }

  if (stats.isFile()) {
    common.unlinkSync(file);
  } else if (stats.isDirectory()) {
    if (file[file.length - 1] === '/') {
      // trailing separator, so remove the contents, not the link
      if (options.recursive) {
        // -r was passed, so directory can be removed
        var fromSymlink = true;
        rmdirSyncRecursive(file, options.force, fromSymlink);
      } else {
        common.error('path is a directory', { continue: true });
      }
    } else {
      // no trailing separator, so remove the link
      common.unlinkSync(file);
    }
  }
}

function handleFIFO(file) {
  common.unlinkSync(file);
}

//@
//@ ### rm([options,] file [, file ...])
//@ ### rm([options,] file_array)
//@
//@ Available options:
//@
//@ + `-f`: force
//@ + `-r, -R`: recursive
//@
//@ Examples:
//@
//@ ```javascript
//@ rm('-rf', '/tmp/*');
//@ rm('some_file.txt', 'another_file.txt');
//@ rm(['some_file.txt', 'another_file.txt']); // same as above
//@ ```
//@
//@ Removes files.
function _rm(options, files) {
  if (!files) common.error('no paths given');

  // Convert to array
  files = [].slice.call(arguments, 1);

  files.forEach(function (file) {
    var lstats;
    try {
      var filepath = (file[file.length - 1] === '/')
        ? file.slice(0, -1) // remove the '/' so lstatSync can detect symlinks
        : file;
      lstats = common.statNoFollowLinks(filepath); // test for existence
    } catch (e) {
      // Path does not exist, no force flag given
      if (!options.force) {
        common.error('no such file or directory: ' + file, { continue: true });
      }
      return; // skip file
    }

    // If here, path exists
    if (lstats.isFile()) {
      handleFile(file, options);
    } else if (lstats.isDirectory()) {
      handleDirectory(file, options);
    } else if (lstats.isSymbolicLink()) {
      handleSymbolicLink(file, options);
    } else if (lstats.isFIFO()) {
      handleFIFO(file);
    }
  }); // forEach(file)
  return '';
} // rm
module.exports = _rm;


/***/ }),

/***/ 2025:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);

common.register('sed', _sed, {
  globStart: 3, // don't glob-expand regexes
  canReceivePipe: true,
  cmdOptions: {
    'i': 'inplace',
  },
});

//@
//@ ### sed([options,] search_regex, replacement, file [, file ...])
//@ ### sed([options,] search_regex, replacement, file_array)
//@
//@ Available options:
//@
//@ + `-i`: Replace contents of `file` in-place. _Note that no backups will be created!_
//@
//@ Examples:
//@
//@ ```javascript
//@ sed('-i', 'PROGRAM_VERSION', 'v0.1.3', 'source.js');
//@ sed(/.*DELETE_THIS_LINE.*\n/, '', 'source.js');
//@ ```
//@
//@ Reads an input string from `file`s, and performs a JavaScript `replace()` on the input
//@ using the given `search_regex` and `replacement` string or function. Returns the new string after replacement.
//@
//@ Note:
//@
//@ Like unix `sed`, ShellJS `sed` supports capture groups. Capture groups are specified
//@ using the `$n` syntax:
//@
//@ ```javascript
//@ sed(/(\w+)\s(\w+)/, '$2, $1', 'file.txt');
//@ ```
function _sed(options, regex, replacement, files) {
  // Check if this is coming from a pipe
  var pipe = common.readFromPipe();

  if (typeof replacement !== 'string' && typeof replacement !== 'function') {
    if (typeof replacement === 'number') {
      replacement = replacement.toString(); // fallback
    } else {
      common.error('invalid replacement string');
    }
  }

  // Convert all search strings to RegExp
  if (typeof regex === 'string') {
    regex = RegExp(regex);
  }

  if (!files && !pipe) {
    common.error('no files given');
  }

  files = [].slice.call(arguments, 3);

  if (pipe) {
    files.unshift('-');
  }

  var sed = [];
  files.forEach(function (file) {
    if (!fs.existsSync(file) && file !== '-') {
      common.error('no such file or directory: ' + file, 2, { continue: true });
      return;
    }

    var contents = file === '-' ? pipe : fs.readFileSync(file, 'utf8');
    var lines = contents.split('\n');
    var result = lines.map(function (line) {
      return line.replace(regex, replacement);
    }).join('\n');

    sed.push(result);

    if (options.inplace) {
      fs.writeFileSync(file, result, 'utf8');
    }
  });

  return sed.join('\n');
}
module.exports = _sed;


/***/ }),

/***/ 9389:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);

common.register('set', _set, {
  allowGlobbing: false,
  wrapOutput: false,
});

//@
//@ ### set(options)
//@
//@ Available options:
//@
//@ + `+/-e`: exit upon error (`config.fatal`)
//@ + `+/-v`: verbose: show all commands (`config.verbose`)
//@ + `+/-f`: disable filename expansion (globbing)
//@
//@ Examples:
//@
//@ ```javascript
//@ set('-e'); // exit upon first error
//@ set('+e'); // this undoes a "set('-e')"
//@ ```
//@
//@ Sets global configuration variables.
function _set(options) {
  if (!options) {
    var args = [].slice.call(arguments, 0);
    if (args.length < 2) common.error('must provide an argument');
    options = args[1];
  }
  var negate = (options[0] === '+');
  if (negate) {
    options = '-' + options.slice(1); // parseOptions needs a '-' prefix
  }
  options = common.parseOptions(options, {
    'e': 'fatal',
    'v': 'verbose',
    'f': 'noglob',
  });

  if (negate) {
    Object.keys(options).forEach(function (key) {
      options[key] = !options[key];
    });
  }

  Object.keys(options).forEach(function (key) {
    // Only change the global config if `negate` is false and the option is true
    // or if `negate` is true and the option is false (aka negate !== option)
    if (negate !== options[key]) {
      common.config[key] = options[key];
    }
  });
  return;
}
module.exports = _set;


/***/ }),

/***/ 49:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);

common.register('sort', _sort, {
  canReceivePipe: true,
  cmdOptions: {
    'r': 'reverse',
    'n': 'numerical',
  },
});

// parse out the number prefix of a line
function parseNumber(str) {
  var match = str.match(/^\s*(\d*)\s*(.*)$/);
  return { num: Number(match[1]), value: match[2] };
}

// compare two strings case-insensitively, but examine case for strings that are
// case-insensitive equivalent
function unixCmp(a, b) {
  var aLower = a.toLowerCase();
  var bLower = b.toLowerCase();
  return (aLower === bLower ?
      -1 * a.localeCompare(b) : // unix sort treats case opposite how javascript does
      aLower.localeCompare(bLower));
}

// compare two strings in the fashion that unix sort's -n option works
function numericalCmp(a, b) {
  var objA = parseNumber(a);
  var objB = parseNumber(b);
  if (objA.hasOwnProperty('num') && objB.hasOwnProperty('num')) {
    return ((objA.num !== objB.num) ?
        (objA.num - objB.num) :
        unixCmp(objA.value, objB.value));
  } else {
    return unixCmp(objA.value, objB.value);
  }
}

//@
//@ ### sort([options,] file [, file ...])
//@ ### sort([options,] file_array)
//@
//@ Available options:
//@
//@ + `-r`: Reverse the results
//@ + `-n`: Compare according to numerical value
//@
//@ Examples:
//@
//@ ```javascript
//@ sort('foo.txt', 'bar.txt');
//@ sort('-r', 'foo.txt');
//@ ```
//@
//@ Return the contents of the `file`s, sorted line-by-line. Sorting multiple
//@ files mixes their content (just as unix `sort` does).
function _sort(options, files) {
  // Check if this is coming from a pipe
  var pipe = common.readFromPipe();

  if (!files && !pipe) common.error('no files given');

  files = [].slice.call(arguments, 1);

  if (pipe) {
    files.unshift('-');
  }

  var lines = files.reduce(function (accum, file) {
    if (file !== '-') {
      if (!fs.existsSync(file)) {
        common.error('no such file or directory: ' + file, { continue: true });
        return accum;
      } else if (common.statFollowLinks(file).isDirectory()) {
        common.error('read failed: ' + file + ': Is a directory', {
          continue: true,
        });
        return accum;
      }
    }

    var contents = file === '-' ? pipe : fs.readFileSync(file, 'utf8');
    return accum.concat(contents.trimRight().split('\n'));
  }, []);

  var sorted = lines.sort(options.numerical ? numericalCmp : unixCmp);

  if (options.reverse) {
    sorted = sorted.reverse();
  }

  return sorted.join('\n') + '\n';
}

module.exports = _sort;


/***/ }),

/***/ 6156:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);

common.register('tail', _tail, {
  canReceivePipe: true,
  cmdOptions: {
    'n': 'numLines',
  },
});

//@
//@ ### tail([{'-n': \<num\>},] file [, file ...])
//@ ### tail([{'-n': \<num\>},] file_array)
//@
//@ Available options:
//@
//@ + `-n <num>`: Show the last `<num>` lines of `file`s
//@
//@ Examples:
//@
//@ ```javascript
//@ var str = tail({'-n': 1}, 'file*.txt');
//@ var str = tail('file1', 'file2');
//@ var str = tail(['file1', 'file2']); // same as above
//@ ```
//@
//@ Read the end of a `file`.
function _tail(options, files) {
  var tail = [];
  var pipe = common.readFromPipe();

  if (!files && !pipe) common.error('no paths given');

  var idx = 1;
  if (options.numLines === true) {
    idx = 2;
    options.numLines = Number(arguments[1]);
  } else if (options.numLines === false) {
    options.numLines = 10;
  }
  options.numLines = -1 * Math.abs(options.numLines);
  files = [].slice.call(arguments, idx);

  if (pipe) {
    files.unshift('-');
  }

  var shouldAppendNewline = false;
  files.forEach(function (file) {
    if (file !== '-') {
      if (!fs.existsSync(file)) {
        common.error('no such file or directory: ' + file, { continue: true });
        return;
      } else if (common.statFollowLinks(file).isDirectory()) {
        common.error("error reading '" + file + "': Is a directory", {
          continue: true,
        });
        return;
      }
    }

    var contents = file === '-' ? pipe : fs.readFileSync(file, 'utf8');

    var lines = contents.split('\n');
    if (lines[lines.length - 1] === '') {
      lines.pop();
      shouldAppendNewline = true;
    } else {
      shouldAppendNewline = false;
    }

    tail = tail.concat(lines.slice(options.numLines));
  });

  if (shouldAppendNewline) {
    tail.push(''); // to add a trailing newline once we join
  }
  return tail.join('\n');
}
module.exports = _tail;


/***/ }),

/***/ 5248:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var os = __nccwpck_require__(2087);
var fs = __nccwpck_require__(5747);

common.register('tempdir', _tempDir, {
  allowGlobbing: false,
  wrapOutput: false,
});

// Returns false if 'dir' is not a writeable directory, 'dir' otherwise
function writeableDir(dir) {
  if (!dir || !fs.existsSync(dir)) return false;

  if (!common.statFollowLinks(dir).isDirectory()) return false;

  var testFile = dir + '/' + common.randomFileName();
  try {
    fs.writeFileSync(testFile, ' ');
    common.unlinkSync(testFile);
    return dir;
  } catch (e) {
    /* istanbul ignore next */
    return false;
  }
}

// Variable to cache the tempdir value for successive lookups.
var cachedTempDir;

//@
//@ ### tempdir()
//@
//@ Examples:
//@
//@ ```javascript
//@ var tmp = tempdir(); // "/tmp" for most *nix platforms
//@ ```
//@
//@ Searches and returns string containing a writeable, platform-dependent temporary directory.
//@ Follows Python's [tempfile algorithm](http://docs.python.org/library/tempfile.html#tempfile.tempdir).
function _tempDir() {
  if (cachedTempDir) return cachedTempDir;

  cachedTempDir = writeableDir(os.tmpdir()) ||
                  writeableDir(process.env.TMPDIR) ||
                  writeableDir(process.env.TEMP) ||
                  writeableDir(process.env.TMP) ||
                  writeableDir(process.env.Wimp$ScrapDir) || // RiscOS
                  writeableDir('C:\\TEMP') || // Windows
                  writeableDir('C:\\TMP') || // Windows
                  writeableDir('\\TEMP') || // Windows
                  writeableDir('\\TMP') || // Windows
                  writeableDir('/tmp') ||
                  writeableDir('/var/tmp') ||
                  writeableDir('/usr/tmp') ||
                  writeableDir('.'); // last resort

  return cachedTempDir;
}

// Indicates if the tempdir value is currently cached. This is exposed for tests
// only. The return value should only be tested for truthiness.
function isCached() {
  return cachedTempDir;
}

// Clears the cached tempDir value, if one is cached. This is exposed for tests
// only.
function clearCache() {
  cachedTempDir = undefined;
}

module.exports.tempDir = _tempDir;
module.exports.isCached = isCached;
module.exports.clearCache = clearCache;


/***/ }),

/***/ 3805:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);

common.register('test', _test, {
  cmdOptions: {
    'b': 'block',
    'c': 'character',
    'd': 'directory',
    'e': 'exists',
    'f': 'file',
    'L': 'link',
    'p': 'pipe',
    'S': 'socket',
  },
  wrapOutput: false,
  allowGlobbing: false,
});


//@
//@ ### test(expression)
//@
//@ Available expression primaries:
//@
//@ + `'-b', 'path'`: true if path is a block device
//@ + `'-c', 'path'`: true if path is a character device
//@ + `'-d', 'path'`: true if path is a directory
//@ + `'-e', 'path'`: true if path exists
//@ + `'-f', 'path'`: true if path is a regular file
//@ + `'-L', 'path'`: true if path is a symbolic link
//@ + `'-p', 'path'`: true if path is a pipe (FIFO)
//@ + `'-S', 'path'`: true if path is a socket
//@
//@ Examples:
//@
//@ ```javascript
//@ if (test('-d', path)) { /* do something with dir */ };
//@ if (!test('-f', path)) continue; // skip if it's a regular file
//@ ```
//@
//@ Evaluates `expression` using the available primaries and returns corresponding value.
function _test(options, path) {
  if (!path) common.error('no path given');

  var canInterpret = false;
  Object.keys(options).forEach(function (key) {
    if (options[key] === true) {
      canInterpret = true;
    }
  });

  if (!canInterpret) common.error('could not interpret expression');

  if (options.link) {
    try {
      return common.statNoFollowLinks(path).isSymbolicLink();
    } catch (e) {
      return false;
    }
  }

  if (!fs.existsSync(path)) return false;

  if (options.exists) return true;

  var stats = common.statFollowLinks(path);

  if (options.block) return stats.isBlockDevice();

  if (options.character) return stats.isCharacterDevice();

  if (options.directory) return stats.isDirectory();

  if (options.file) return stats.isFile();

  /* istanbul ignore next */
  if (options.pipe) return stats.isFIFO();

  /* istanbul ignore next */
  if (options.socket) return stats.isSocket();

  /* istanbul ignore next */
  return false; // fallback
} // test
module.exports = _test;


/***/ }),

/***/ 6656:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);

common.register('to', _to, {
  pipeOnly: true,
  wrapOutput: false,
});

//@
//@ ### ShellString.prototype.to(file)
//@
//@ Examples:
//@
//@ ```javascript
//@ cat('input.txt').to('output.txt');
//@ ```
//@
//@ Analogous to the redirection operator `>` in Unix, but works with
//@ `ShellStrings` (such as those returned by `cat`, `grep`, etc.). _Like Unix
//@ redirections, `to()` will overwrite any existing file!_
function _to(options, file) {
  if (!file) common.error('wrong arguments');

  if (!fs.existsSync(path.dirname(file))) {
    common.error('no such file or directory: ' + path.dirname(file));
  }

  try {
    fs.writeFileSync(file, this.stdout || this.toString(), 'utf8');
    return this;
  } catch (e) {
    /* istanbul ignore next */
    common.error('could not write to file (code ' + e.code + '): ' + file, { continue: true });
  }
}
module.exports = _to;


/***/ }),

/***/ 4946:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);

common.register('toEnd', _toEnd, {
  pipeOnly: true,
  wrapOutput: false,
});

//@
//@ ### ShellString.prototype.toEnd(file)
//@
//@ Examples:
//@
//@ ```javascript
//@ cat('input.txt').toEnd('output.txt');
//@ ```
//@
//@ Analogous to the redirect-and-append operator `>>` in Unix, but works with
//@ `ShellStrings` (such as those returned by `cat`, `grep`, etc.).
function _toEnd(options, file) {
  if (!file) common.error('wrong arguments');

  if (!fs.existsSync(path.dirname(file))) {
    common.error('no such file or directory: ' + path.dirname(file));
  }

  try {
    fs.appendFileSync(file, this.stdout || this.toString(), 'utf8');
    return this;
  } catch (e) {
    /* istanbul ignore next */
    common.error('could not append to file (code ' + e.code + '): ' + file, { continue: true });
  }
}
module.exports = _toEnd;


/***/ }),

/***/ 1711:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);

common.register('touch', _touch, {
  cmdOptions: {
    'a': 'atime_only',
    'c': 'no_create',
    'd': 'date',
    'm': 'mtime_only',
    'r': 'reference',
  },
});

//@
//@ ### touch([options,] file [, file ...])
//@ ### touch([options,] file_array)
//@
//@ Available options:
//@
//@ + `-a`: Change only the access time
//@ + `-c`: Do not create any files
//@ + `-m`: Change only the modification time
//@ + `-d DATE`: Parse `DATE` and use it instead of current time
//@ + `-r FILE`: Use `FILE`'s times instead of current time
//@
//@ Examples:
//@
//@ ```javascript
//@ touch('source.js');
//@ touch('-c', '/path/to/some/dir/source.js');
//@ touch({ '-r': FILE }, '/path/to/some/dir/source.js');
//@ ```
//@
//@ Update the access and modification times of each `FILE` to the current time.
//@ A `FILE` argument that does not exist is created empty, unless `-c` is supplied.
//@ This is a partial implementation of [`touch(1)`](http://linux.die.net/man/1/touch).
function _touch(opts, files) {
  if (!files) {
    common.error('no files given');
  } else if (typeof files === 'string') {
    files = [].slice.call(arguments, 1);
  } else {
    common.error('file arg should be a string file path or an Array of string file paths');
  }

  files.forEach(function (f) {
    touchFile(opts, f);
  });
  return '';
}

function touchFile(opts, file) {
  var stat = tryStatFile(file);

  if (stat && stat.isDirectory()) {
    // don't error just exit
    return;
  }

  // if the file doesn't already exist and the user has specified --no-create then
  // this script is finished
  if (!stat && opts.no_create) {
    return;
  }

  // open the file and then close it. this will create it if it doesn't exist but will
  // not truncate the file
  fs.closeSync(fs.openSync(file, 'a'));

  //
  // Set timestamps
  //

  // setup some defaults
  var now = new Date();
  var mtime = opts.date || now;
  var atime = opts.date || now;

  // use reference file
  if (opts.reference) {
    var refStat = tryStatFile(opts.reference);
    if (!refStat) {
      common.error('failed to get attributess of ' + opts.reference);
    }
    mtime = refStat.mtime;
    atime = refStat.atime;
  } else if (opts.date) {
    mtime = opts.date;
    atime = opts.date;
  }

  if (opts.atime_only && opts.mtime_only) {
    // keep the new values of mtime and atime like GNU
  } else if (opts.atime_only) {
    mtime = stat.mtime;
  } else if (opts.mtime_only) {
    atime = stat.atime;
  }

  fs.utimesSync(file, atime, mtime);
}

module.exports = _touch;

function tryStatFile(filePath) {
  try {
    return common.statFollowLinks(filePath);
  } catch (e) {
    return null;
  }
}


/***/ }),

/***/ 1280:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);

// add c spaces to the left of str
function lpad(c, str) {
  var res = '' + str;
  if (res.length < c) {
    res = Array((c - res.length) + 1).join(' ') + res;
  }
  return res;
}

common.register('uniq', _uniq, {
  canReceivePipe: true,
  cmdOptions: {
    'i': 'ignoreCase',
    'c': 'count',
    'd': 'duplicates',
  },
});

//@
//@ ### uniq([options,] [input, [output]])
//@
//@ Available options:
//@
//@ + `-i`: Ignore case while comparing
//@ + `-c`: Prefix lines by the number of occurrences
//@ + `-d`: Only print duplicate lines, one for each group of identical lines
//@
//@ Examples:
//@
//@ ```javascript
//@ uniq('foo.txt');
//@ uniq('-i', 'foo.txt');
//@ uniq('-cd', 'foo.txt', 'bar.txt');
//@ ```
//@
//@ Filter adjacent matching lines from `input`.
function _uniq(options, input, output) {
  // Check if this is coming from a pipe
  var pipe = common.readFromPipe();

  if (!pipe) {
    if (!input) common.error('no input given');

    if (!fs.existsSync(input)) {
      common.error(input + ': No such file or directory');
    } else if (common.statFollowLinks(input).isDirectory()) {
      common.error("error reading '" + input + "'");
    }
  }
  if (output && fs.existsSync(output) && common.statFollowLinks(output).isDirectory()) {
    common.error(output + ': Is a directory');
  }

  var lines = (input ? fs.readFileSync(input, 'utf8') : pipe).
              trimRight().
              split('\n');

  var compare = function (a, b) {
    return options.ignoreCase ?
           a.toLocaleLowerCase().localeCompare(b.toLocaleLowerCase()) :
           a.localeCompare(b);
  };
  var uniqed = lines.reduceRight(function (res, e) {
    // Perform uniq -c on the input
    if (res.length === 0) {
      return [{ count: 1, ln: e }];
    } else if (compare(res[0].ln, e) === 0) {
      return [{ count: res[0].count + 1, ln: e }].concat(res.slice(1));
    } else {
      return [{ count: 1, ln: e }].concat(res);
    }
  }, []).filter(function (obj) {
                 // Do we want only duplicated objects?
    return options.duplicates ? obj.count > 1 : true;
  }).map(function (obj) {
                 // Are we tracking the counts of each line?
    return (options.count ? (lpad(7, obj.count) + ' ') : '') + obj.ln;
  }).join('\n') + '\n';

  if (output) {
    (new common.ShellString(uniqed)).to(output);
    // if uniq writes to output, nothing is passed to the next command in the pipeline (if any)
    return '';
  } else {
    return uniqed;
  }
}

module.exports = _uniq;


/***/ }),

/***/ 8530:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var common = __nccwpck_require__(8723);
var fs = __nccwpck_require__(5747);
var path = __nccwpck_require__(5622);

common.register('which', _which, {
  allowGlobbing: false,
  cmdOptions: {
    'a': 'all',
  },
});

// XP's system default value for `PATHEXT` system variable, just in case it's not
// set on Windows.
var XP_DEFAULT_PATHEXT = '.com;.exe;.bat;.cmd;.vbs;.vbe;.js;.jse;.wsf;.wsh';

// For earlier versions of NodeJS that doesn't have a list of constants (< v6)
var FILE_EXECUTABLE_MODE = 1;

function isWindowsPlatform() {
  return process.platform === 'win32';
}

// Cross-platform method for splitting environment `PATH` variables
function splitPath(p) {
  return p ? p.split(path.delimiter) : [];
}

// Tests are running all cases for this func but it stays uncovered by codecov due to unknown reason
/* istanbul ignore next */
function isExecutable(pathName) {
  try {
    // TODO(node-support): replace with fs.constants.X_OK once remove support for node < v6
    fs.accessSync(pathName, FILE_EXECUTABLE_MODE);
  } catch (err) {
    return false;
  }
  return true;
}

function checkPath(pathName) {
  return fs.existsSync(pathName) && !common.statFollowLinks(pathName).isDirectory()
    && (isWindowsPlatform() || isExecutable(pathName));
}

//@
//@ ### which(command)
//@
//@ Examples:
//@
//@ ```javascript
//@ var nodeExec = which('node');
//@ ```
//@
//@ Searches for `command` in the system's `PATH`. On Windows, this uses the
//@ `PATHEXT` variable to append the extension if it's not already executable.
//@ Returns string containing the absolute path to `command`.
function _which(options, cmd) {
  if (!cmd) common.error('must specify command');

  var isWindows = isWindowsPlatform();
  var pathArray = splitPath(process.env.PATH);

  var queryMatches = [];

  // No relative/absolute paths provided?
  if (cmd.indexOf('/') === -1) {
    // Assume that there are no extensions to append to queries (this is the
    // case for unix)
    var pathExtArray = [''];
    if (isWindows) {
      // In case the PATHEXT variable is somehow not set (e.g.
      // child_process.spawn with an empty environment), use the XP default.
      var pathExtEnv = process.env.PATHEXT || XP_DEFAULT_PATHEXT;
      pathExtArray = splitPath(pathExtEnv.toUpperCase());
    }

    // Search for command in PATH
    for (var k = 0; k < pathArray.length; k++) {
      // already found it
      if (queryMatches.length > 0 && !options.all) break;

      var attempt = path.resolve(pathArray[k], cmd);

      if (isWindows) {
        attempt = attempt.toUpperCase();
      }

      var match = attempt.match(/\.[^<>:"/\|?*.]+$/);
      if (match && pathExtArray.indexOf(match[0]) >= 0) { // this is Windows-only
        // The user typed a query with the file extension, like
        // `which('node.exe')`
        if (checkPath(attempt)) {
          queryMatches.push(attempt);
          break;
        }
      } else { // All-platforms
        // Cycle through the PATHEXT array, and check each extension
        // Note: the array is always [''] on Unix
        for (var i = 0; i < pathExtArray.length; i++) {
          var ext = pathExtArray[i];
          var newAttempt = attempt + ext;
          if (checkPath(newAttempt)) {
            queryMatches.push(newAttempt);
            break;
          }
        }
      }
    }
  } else if (checkPath(cmd)) { // a valid absolute or relative path
    queryMatches.push(path.resolve(cmd));
  }

  if (queryMatches.length > 0) {
    return options.all ? queryMatches : queryMatches[0];
  }
  return options.all ? [] : null;
}
module.exports = _which;


/***/ }),

/***/ 3642:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


exports.fromCallback = function (fn) {
  return Object.defineProperty(function (...args) {
    if (typeof args[args.length - 1] === 'function') fn.apply(this, args)
    else {
      return new Promise((resolve, reject) => {
        fn.call(
          this,
          ...args,
          (err, res) => (err != null) ? reject(err) : resolve(res)
        )
      })
    }
  }, 'name', { value: fn.name })
}

exports.fromPromise = function (fn) {
  return Object.defineProperty(function (...args) {
    const cb = args[args.length - 1]
    if (typeof cb !== 'function') return fn.apply(this, args)
    else fn.apply(this, args.slice(0, -1)).then(r => cb(null, r), cb)
  }, 'name', { value: fn.name })
}


/***/ }),

/***/ 7560:
/***/ ((module) => {

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  return ([
    bth[buf[i++]], bth[buf[i++]],
    bth[buf[i++]], bth[buf[i++]], '-',
    bth[buf[i++]], bth[buf[i++]], '-',
    bth[buf[i++]], bth[buf[i++]], '-',
    bth[buf[i++]], bth[buf[i++]], '-',
    bth[buf[i++]], bth[buf[i++]],
    bth[buf[i++]], bth[buf[i++]],
    bth[buf[i++]], bth[buf[i++]]
  ]).join('');
}

module.exports = bytesToUuid;


/***/ }),

/***/ 9980:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

// Unique ID creation requires a high quality random # generator.  In node.js
// this is pretty straight-forward - we use the crypto API.

var crypto = __nccwpck_require__(6417);

module.exports = function nodeRNG() {
  return crypto.randomBytes(16);
};


/***/ }),

/***/ 5547:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

var rng = __nccwpck_require__(9980);
var bytesToUuid = __nccwpck_require__(7560);

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;


/***/ }),

/***/ 4883:
/***/ ((module) => {

// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}


/***/ }),

/***/ 2357:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(357);;

/***/ }),

/***/ 3129:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(129);;

/***/ }),

/***/ 7619:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(619);;

/***/ }),

/***/ 6417:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(417);;

/***/ }),

/***/ 8614:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(614);;

/***/ }),

/***/ 5747:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(747);;

/***/ }),

/***/ 2087:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(87);;

/***/ }),

/***/ 5622:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(622);;

/***/ }),

/***/ 2413:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(413);;

/***/ }),

/***/ 1669:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(669);;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__nccwpck_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(3556);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 907:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

(()=>{var e={650:e=>{var r=Object.prototype.toString;var n=typeof Buffer.alloc==="function"&&typeof Buffer.allocUnsafe==="function"&&typeof Buffer.from==="function";function isArrayBuffer(e){return r.call(e).slice(8,-1)==="ArrayBuffer"}function fromArrayBuffer(e,r,t){r>>>=0;var o=e.byteLength-r;if(o<0){throw new RangeError("'offset' is out of bounds")}if(t===undefined){t=o}else{t>>>=0;if(t>o){throw new RangeError("'length' is out of bounds")}}return n?Buffer.from(e.slice(r,r+t)):new Buffer(new Uint8Array(e.slice(r,r+t)))}function fromString(e,r){if(typeof r!=="string"||r===""){r="utf8"}if(!Buffer.isEncoding(r)){throw new TypeError('"encoding" must be a valid string encoding')}return n?Buffer.from(e,r):new Buffer(e,r)}function bufferFrom(e,r,t){if(typeof e==="number"){throw new TypeError('"value" argument must not be a number')}if(isArrayBuffer(e)){return fromArrayBuffer(e,r,t)}if(typeof e==="string"){return fromString(e,r)}return n?Buffer.from(e):new Buffer(e)}e.exports=bufferFrom},284:(e,r,n)=>{e=n.nmd(e);var t=n(596).SourceMapConsumer;var o=n(622);var i;try{i=n(747);if(!i.existsSync||!i.readFileSync){i=null}}catch(e){}var a=n(650);function dynamicRequire(e,r){return e.require(r)}var u=false;var s=false;var l=false;var c="auto";var p={};var f={};var g=/^data:application\/json[^,]+base64,/;var h=[];var d=[];function isInBrowser(){if(c==="browser")return true;if(c==="node")return false;return typeof window!=="undefined"&&typeof XMLHttpRequest==="function"&&!(window.require&&window.module&&window.process&&window.process.type==="renderer")}function hasGlobalProcessEventEmitter(){return typeof process==="object"&&process!==null&&typeof process.on==="function"}function handlerExec(e){return function(r){for(var n=0;n<e.length;n++){var t=e[n](r);if(t){return t}}return null}}var m=handlerExec(h);h.push((function(e){e=e.trim();if(/^file:/.test(e)){e=e.replace(/file:\/\/\/(\w:)?/,(function(e,r){return r?"":"/"}))}if(e in p){return p[e]}var r="";try{if(!i){var n=new XMLHttpRequest;n.open("GET",e,false);n.send(null);if(n.readyState===4&&n.status===200){r=n.responseText}}else if(i.existsSync(e)){r=i.readFileSync(e,"utf8")}}catch(e){}return p[e]=r}));function supportRelativeURL(e,r){if(!e)return r;var n=o.dirname(e);var t=/^\w+:\/\/[^\/]*/.exec(n);var i=t?t[0]:"";var a=n.slice(i.length);if(i&&/^\/\w\:/.test(a)){i+="/";return i+o.resolve(n.slice(i.length),r).replace(/\\/g,"/")}return i+o.resolve(n.slice(i.length),r)}function retrieveSourceMapURL(e){var r;if(isInBrowser()){try{var n=new XMLHttpRequest;n.open("GET",e,false);n.send(null);r=n.readyState===4?n.responseText:null;var t=n.getResponseHeader("SourceMap")||n.getResponseHeader("X-SourceMap");if(t){return t}}catch(e){}}r=m(e);var o=/(?:\/\/[@#][\s]*sourceMappingURL=([^\s'"]+)[\s]*$)|(?:\/\*[@#][\s]*sourceMappingURL=([^\s*'"]+)[\s]*(?:\*\/)[\s]*$)/gm;var i,a;while(a=o.exec(r))i=a;if(!i)return null;return i[1]}var v=handlerExec(d);d.push((function(e){var r=retrieveSourceMapURL(e);if(!r)return null;var n;if(g.test(r)){var t=r.slice(r.indexOf(",")+1);n=a(t,"base64").toString();r=e}else{r=supportRelativeURL(e,r);n=m(r)}if(!n){return null}return{url:r,map:n}}));function mapSourcePosition(e){var r=f[e.source];if(!r){var n=v(e.source);if(n){r=f[e.source]={url:n.url,map:new t(n.map)};if(r.map.sourcesContent){r.map.sources.forEach((function(e,n){var t=r.map.sourcesContent[n];if(t){var o=supportRelativeURL(r.url,e);p[o]=t}}))}}else{r=f[e.source]={url:null,map:null}}}if(r&&r.map&&typeof r.map.originalPositionFor==="function"){var o=r.map.originalPositionFor(e);if(o.source!==null){o.source=supportRelativeURL(r.url,o.source);return o}}return e}function mapEvalOrigin(e){var r=/^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(e);if(r){var n=mapSourcePosition({source:r[2],line:+r[3],column:r[4]-1});return"eval at "+r[1]+" ("+n.source+":"+n.line+":"+(n.column+1)+")"}r=/^eval at ([^(]+) \((.+)\)$/.exec(e);if(r){return"eval at "+r[1]+" ("+mapEvalOrigin(r[2])+")"}return e}function CallSiteToString(){var e;var r="";if(this.isNative()){r="native"}else{e=this.getScriptNameOrSourceURL();if(!e&&this.isEval()){r=this.getEvalOrigin();r+=", "}if(e){r+=e}else{r+="<anonymous>"}var n=this.getLineNumber();if(n!=null){r+=":"+n;var t=this.getColumnNumber();if(t){r+=":"+t}}}var o="";var i=this.getFunctionName();var a=true;var u=this.isConstructor();var s=!(this.isToplevel()||u);if(s){var l=this.getTypeName();if(l==="[object Object]"){l="null"}var c=this.getMethodName();if(i){if(l&&i.indexOf(l)!=0){o+=l+"."}o+=i;if(c&&i.indexOf("."+c)!=i.length-c.length-1){o+=" [as "+c+"]"}}else{o+=l+"."+(c||"<anonymous>")}}else if(u){o+="new "+(i||"<anonymous>")}else if(i){o+=i}else{o+=r;a=false}if(a){o+=" ("+r+")"}return o}function cloneCallSite(e){var r={};Object.getOwnPropertyNames(Object.getPrototypeOf(e)).forEach((function(n){r[n]=/^(?:is|get)/.test(n)?function(){return e[n].call(e)}:e[n]}));r.toString=CallSiteToString;return r}function wrapCallSite(e,r){if(r===undefined){r={nextPosition:null,curPosition:null}}if(e.isNative()){r.curPosition=null;return e}var n=e.getFileName()||e.getScriptNameOrSourceURL();if(n){var t=e.getLineNumber();var o=e.getColumnNumber()-1;var i=/^v(10\.1[6-9]|10\.[2-9][0-9]|10\.[0-9]{3,}|1[2-9]\d*|[2-9]\d|\d{3,}|11\.11)/;var a=i.test(process.version)?0:62;if(t===1&&o>a&&!isInBrowser()&&!e.isEval()){o-=a}var u=mapSourcePosition({source:n,line:t,column:o});r.curPosition=u;e=cloneCallSite(e);var s=e.getFunctionName;e.getFunctionName=function(){if(r.nextPosition==null){return s()}return r.nextPosition.name||s()};e.getFileName=function(){return u.source};e.getLineNumber=function(){return u.line};e.getColumnNumber=function(){return u.column+1};e.getScriptNameOrSourceURL=function(){return u.source};return e}var l=e.isEval()&&e.getEvalOrigin();if(l){l=mapEvalOrigin(l);e=cloneCallSite(e);e.getEvalOrigin=function(){return l};return e}return e}function prepareStackTrace(e,r){if(l){p={};f={}}var n=e.name||"Error";var t=e.message||"";var o=n+": "+t;var i={nextPosition:null,curPosition:null};var a=[];for(var u=r.length-1;u>=0;u--){a.push("\n    at "+wrapCallSite(r[u],i));i.nextPosition=i.curPosition}i.curPosition=i.nextPosition=null;return o+a.reverse().join("")}function getErrorSource(e){var r=/\n    at [^(]+ \((.*):(\d+):(\d+)\)/.exec(e.stack);if(r){var n=r[1];var t=+r[2];var o=+r[3];var a=p[n];if(!a&&i&&i.existsSync(n)){try{a=i.readFileSync(n,"utf8")}catch(e){a=""}}if(a){var u=a.split(/(?:\r\n|\r|\n)/)[t-1];if(u){return n+":"+t+"\n"+u+"\n"+new Array(o).join(" ")+"^"}}}return null}function printErrorAndExit(e){var r=getErrorSource(e);if(process.stderr._handle&&process.stderr._handle.setBlocking){process.stderr._handle.setBlocking(true)}if(r){console.error();console.error(r)}console.error(e.stack);process.exit(1)}function shimEmitUncaughtException(){var e=process.emit;process.emit=function(r){if(r==="uncaughtException"){var n=arguments[1]&&arguments[1].stack;var t=this.listeners(r).length>0;if(n&&!t){return printErrorAndExit(arguments[1])}}return e.apply(this,arguments)}}var S=h.slice(0);var _=d.slice(0);r.wrapCallSite=wrapCallSite;r.getErrorSource=getErrorSource;r.mapSourcePosition=mapSourcePosition;r.retrieveSourceMap=v;r.install=function(r){r=r||{};if(r.environment){c=r.environment;if(["node","browser","auto"].indexOf(c)===-1){throw new Error("environment "+c+" was unknown. Available options are {auto, browser, node}")}}if(r.retrieveFile){if(r.overrideRetrieveFile){h.length=0}h.unshift(r.retrieveFile)}if(r.retrieveSourceMap){if(r.overrideRetrieveSourceMap){d.length=0}d.unshift(r.retrieveSourceMap)}if(r.hookRequire&&!isInBrowser()){var n=dynamicRequire(e,"module");var t=n.prototype._compile;if(!t.__sourceMapSupport){n.prototype._compile=function(e,r){p[r]=e;f[r]=undefined;return t.call(this,e,r)};n.prototype._compile.__sourceMapSupport=true}}if(!l){l="emptyCacheBetweenOperations"in r?r.emptyCacheBetweenOperations:false}if(!u){u=true;Error.prepareStackTrace=prepareStackTrace}if(!s){var o="handleUncaughtExceptions"in r?r.handleUncaughtExceptions:true;try{var i=dynamicRequire(e,"worker_threads");if(i.isMainThread===false){o=false}}catch(e){}if(o&&hasGlobalProcessEventEmitter()){s=true;shimEmitUncaughtException()}}};r.resetRetrieveHandlers=function(){h.length=0;d.length=0;h=S.slice(0);d=_.slice(0);v=handlerExec(d);m=handlerExec(h)}},837:(e,r,n)=>{var t=n(983);var o=Object.prototype.hasOwnProperty;var i=typeof Map!=="undefined";function ArraySet(){this._array=[];this._set=i?new Map:Object.create(null)}ArraySet.fromArray=function ArraySet_fromArray(e,r){var n=new ArraySet;for(var t=0,o=e.length;t<o;t++){n.add(e[t],r)}return n};ArraySet.prototype.size=function ArraySet_size(){return i?this._set.size:Object.getOwnPropertyNames(this._set).length};ArraySet.prototype.add=function ArraySet_add(e,r){var n=i?e:t.toSetString(e);var a=i?this.has(e):o.call(this._set,n);var u=this._array.length;if(!a||r){this._array.push(e)}if(!a){if(i){this._set.set(e,u)}else{this._set[n]=u}}};ArraySet.prototype.has=function ArraySet_has(e){if(i){return this._set.has(e)}else{var r=t.toSetString(e);return o.call(this._set,r)}};ArraySet.prototype.indexOf=function ArraySet_indexOf(e){if(i){var r=this._set.get(e);if(r>=0){return r}}else{var n=t.toSetString(e);if(o.call(this._set,n)){return this._set[n]}}throw new Error('"'+e+'" is not in the set.')};ArraySet.prototype.at=function ArraySet_at(e){if(e>=0&&e<this._array.length){return this._array[e]}throw new Error("No element indexed by "+e)};ArraySet.prototype.toArray=function ArraySet_toArray(){return this._array.slice()};r.I=ArraySet},215:(e,r,n)=>{var t=n(537);var o=5;var i=1<<o;var a=i-1;var u=i;function toVLQSigned(e){return e<0?(-e<<1)+1:(e<<1)+0}function fromVLQSigned(e){var r=(e&1)===1;var n=e>>1;return r?-n:n}r.encode=function base64VLQ_encode(e){var r="";var n;var i=toVLQSigned(e);do{n=i&a;i>>>=o;if(i>0){n|=u}r+=t.encode(n)}while(i>0);return r};r.decode=function base64VLQ_decode(e,r,n){var i=e.length;var s=0;var l=0;var c,p;do{if(r>=i){throw new Error("Expected more digits in base 64 VLQ value.")}p=t.decode(e.charCodeAt(r++));if(p===-1){throw new Error("Invalid base64 digit: "+e.charAt(r-1))}c=!!(p&u);p&=a;s=s+(p<<l);l+=o}while(c);n.value=fromVLQSigned(s);n.rest=r}},537:(e,r)=>{var n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");r.encode=function(e){if(0<=e&&e<n.length){return n[e]}throw new TypeError("Must be between 0 and 63: "+e)};r.decode=function(e){var r=65;var n=90;var t=97;var o=122;var i=48;var a=57;var u=43;var s=47;var l=26;var c=52;if(r<=e&&e<=n){return e-r}if(t<=e&&e<=o){return e-t+l}if(i<=e&&e<=a){return e-i+c}if(e==u){return 62}if(e==s){return 63}return-1}},164:(e,r)=>{r.GREATEST_LOWER_BOUND=1;r.LEAST_UPPER_BOUND=2;function recursiveSearch(e,n,t,o,i,a){var u=Math.floor((n-e)/2)+e;var s=i(t,o[u],true);if(s===0){return u}else if(s>0){if(n-u>1){return recursiveSearch(u,n,t,o,i,a)}if(a==r.LEAST_UPPER_BOUND){return n<o.length?n:-1}else{return u}}else{if(u-e>1){return recursiveSearch(e,u,t,o,i,a)}if(a==r.LEAST_UPPER_BOUND){return u}else{return e<0?-1:e}}}r.search=function search(e,n,t,o){if(n.length===0){return-1}var i=recursiveSearch(-1,n.length,e,n,t,o||r.GREATEST_LOWER_BOUND);if(i<0){return-1}while(i-1>=0){if(t(n[i],n[i-1],true)!==0){break}--i}return i}},740:(e,r,n)=>{var t=n(983);function generatedPositionAfter(e,r){var n=e.generatedLine;var o=r.generatedLine;var i=e.generatedColumn;var a=r.generatedColumn;return o>n||o==n&&a>=i||t.compareByGeneratedPositionsInflated(e,r)<=0}function MappingList(){this._array=[];this._sorted=true;this._last={generatedLine:-1,generatedColumn:0}}MappingList.prototype.unsortedForEach=function MappingList_forEach(e,r){this._array.forEach(e,r)};MappingList.prototype.add=function MappingList_add(e){if(generatedPositionAfter(this._last,e)){this._last=e;this._array.push(e)}else{this._sorted=false;this._array.push(e)}};MappingList.prototype.toArray=function MappingList_toArray(){if(!this._sorted){this._array.sort(t.compareByGeneratedPositionsInflated);this._sorted=true}return this._array};r.H=MappingList},226:(e,r)=>{function swap(e,r,n){var t=e[r];e[r]=e[n];e[n]=t}function randomIntInRange(e,r){return Math.round(e+Math.random()*(r-e))}function doQuickSort(e,r,n,t){if(n<t){var o=randomIntInRange(n,t);var i=n-1;swap(e,o,t);var a=e[t];for(var u=n;u<t;u++){if(r(e[u],a)<=0){i+=1;swap(e,i,u)}}swap(e,i+1,u);var s=i+1;doQuickSort(e,r,n,s-1);doQuickSort(e,r,s+1,t)}}r.U=function(e,r){doQuickSort(e,r,0,e.length-1)}},327:(e,r,n)=>{var t;var o=n(983);var i=n(164);var a=n(837).I;var u=n(215);var s=n(226).U;function SourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}return n.sections!=null?new IndexedSourceMapConsumer(n,r):new BasicSourceMapConsumer(n,r)}SourceMapConsumer.fromSourceMap=function(e,r){return BasicSourceMapConsumer.fromSourceMap(e,r)};SourceMapConsumer.prototype._version=3;SourceMapConsumer.prototype.__generatedMappings=null;Object.defineProperty(SourceMapConsumer.prototype,"_generatedMappings",{configurable:true,enumerable:true,get:function(){if(!this.__generatedMappings){this._parseMappings(this._mappings,this.sourceRoot)}return this.__generatedMappings}});SourceMapConsumer.prototype.__originalMappings=null;Object.defineProperty(SourceMapConsumer.prototype,"_originalMappings",{configurable:true,enumerable:true,get:function(){if(!this.__originalMappings){this._parseMappings(this._mappings,this.sourceRoot)}return this.__originalMappings}});SourceMapConsumer.prototype._charIsMappingSeparator=function SourceMapConsumer_charIsMappingSeparator(e,r){var n=e.charAt(r);return n===";"||n===","};SourceMapConsumer.prototype._parseMappings=function SourceMapConsumer_parseMappings(e,r){throw new Error("Subclasses must implement _parseMappings")};SourceMapConsumer.GENERATED_ORDER=1;SourceMapConsumer.ORIGINAL_ORDER=2;SourceMapConsumer.GREATEST_LOWER_BOUND=1;SourceMapConsumer.LEAST_UPPER_BOUND=2;SourceMapConsumer.prototype.eachMapping=function SourceMapConsumer_eachMapping(e,r,n){var t=r||null;var i=n||SourceMapConsumer.GENERATED_ORDER;var a;switch(i){case SourceMapConsumer.GENERATED_ORDER:a=this._generatedMappings;break;case SourceMapConsumer.ORIGINAL_ORDER:a=this._originalMappings;break;default:throw new Error("Unknown order of iteration.")}var u=this.sourceRoot;a.map((function(e){var r=e.source===null?null:this._sources.at(e.source);r=o.computeSourceURL(u,r,this._sourceMapURL);return{source:r,generatedLine:e.generatedLine,generatedColumn:e.generatedColumn,originalLine:e.originalLine,originalColumn:e.originalColumn,name:e.name===null?null:this._names.at(e.name)}}),this).forEach(e,t)};SourceMapConsumer.prototype.allGeneratedPositionsFor=function SourceMapConsumer_allGeneratedPositionsFor(e){var r=o.getArg(e,"line");var n={source:o.getArg(e,"source"),originalLine:r,originalColumn:o.getArg(e,"column",0)};n.source=this._findSourceIndex(n.source);if(n.source<0){return[]}var t=[];var a=this._findMapping(n,this._originalMappings,"originalLine","originalColumn",o.compareByOriginalPositions,i.LEAST_UPPER_BOUND);if(a>=0){var u=this._originalMappings[a];if(e.column===undefined){var s=u.originalLine;while(u&&u.originalLine===s){t.push({line:o.getArg(u,"generatedLine",null),column:o.getArg(u,"generatedColumn",null),lastColumn:o.getArg(u,"lastGeneratedColumn",null)});u=this._originalMappings[++a]}}else{var l=u.originalColumn;while(u&&u.originalLine===r&&u.originalColumn==l){t.push({line:o.getArg(u,"generatedLine",null),column:o.getArg(u,"generatedColumn",null),lastColumn:o.getArg(u,"lastGeneratedColumn",null)});u=this._originalMappings[++a]}}}return t};r.SourceMapConsumer=SourceMapConsumer;function BasicSourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}var t=o.getArg(n,"version");var i=o.getArg(n,"sources");var u=o.getArg(n,"names",[]);var s=o.getArg(n,"sourceRoot",null);var l=o.getArg(n,"sourcesContent",null);var c=o.getArg(n,"mappings");var p=o.getArg(n,"file",null);if(t!=this._version){throw new Error("Unsupported version: "+t)}if(s){s=o.normalize(s)}i=i.map(String).map(o.normalize).map((function(e){return s&&o.isAbsolute(s)&&o.isAbsolute(e)?o.relative(s,e):e}));this._names=a.fromArray(u.map(String),true);this._sources=a.fromArray(i,true);this._absoluteSources=this._sources.toArray().map((function(e){return o.computeSourceURL(s,e,r)}));this.sourceRoot=s;this.sourcesContent=l;this._mappings=c;this._sourceMapURL=r;this.file=p}BasicSourceMapConsumer.prototype=Object.create(SourceMapConsumer.prototype);BasicSourceMapConsumer.prototype.consumer=SourceMapConsumer;BasicSourceMapConsumer.prototype._findSourceIndex=function(e){var r=e;if(this.sourceRoot!=null){r=o.relative(this.sourceRoot,r)}if(this._sources.has(r)){return this._sources.indexOf(r)}var n;for(n=0;n<this._absoluteSources.length;++n){if(this._absoluteSources[n]==e){return n}}return-1};BasicSourceMapConsumer.fromSourceMap=function SourceMapConsumer_fromSourceMap(e,r){var n=Object.create(BasicSourceMapConsumer.prototype);var t=n._names=a.fromArray(e._names.toArray(),true);var i=n._sources=a.fromArray(e._sources.toArray(),true);n.sourceRoot=e._sourceRoot;n.sourcesContent=e._generateSourcesContent(n._sources.toArray(),n.sourceRoot);n.file=e._file;n._sourceMapURL=r;n._absoluteSources=n._sources.toArray().map((function(e){return o.computeSourceURL(n.sourceRoot,e,r)}));var u=e._mappings.toArray().slice();var l=n.__generatedMappings=[];var c=n.__originalMappings=[];for(var p=0,f=u.length;p<f;p++){var g=u[p];var h=new Mapping;h.generatedLine=g.generatedLine;h.generatedColumn=g.generatedColumn;if(g.source){h.source=i.indexOf(g.source);h.originalLine=g.originalLine;h.originalColumn=g.originalColumn;if(g.name){h.name=t.indexOf(g.name)}c.push(h)}l.push(h)}s(n.__originalMappings,o.compareByOriginalPositions);return n};BasicSourceMapConsumer.prototype._version=3;Object.defineProperty(BasicSourceMapConsumer.prototype,"sources",{get:function(){return this._absoluteSources.slice()}});function Mapping(){this.generatedLine=0;this.generatedColumn=0;this.source=null;this.originalLine=null;this.originalColumn=null;this.name=null}BasicSourceMapConsumer.prototype._parseMappings=function SourceMapConsumer_parseMappings(e,r){var n=1;var t=0;var i=0;var a=0;var l=0;var c=0;var p=e.length;var f=0;var g={};var h={};var d=[];var m=[];var v,S,_,C,y;while(f<p){if(e.charAt(f)===";"){n++;f++;t=0}else if(e.charAt(f)===","){f++}else{v=new Mapping;v.generatedLine=n;for(C=f;C<p;C++){if(this._charIsMappingSeparator(e,C)){break}}S=e.slice(f,C);_=g[S];if(_){f+=S.length}else{_=[];while(f<C){u.decode(e,f,h);y=h.value;f=h.rest;_.push(y)}if(_.length===2){throw new Error("Found a source, but no line and column")}if(_.length===3){throw new Error("Found a source and line, but no column")}g[S]=_}v.generatedColumn=t+_[0];t=v.generatedColumn;if(_.length>1){v.source=l+_[1];l+=_[1];v.originalLine=i+_[2];i=v.originalLine;v.originalLine+=1;v.originalColumn=a+_[3];a=v.originalColumn;if(_.length>4){v.name=c+_[4];c+=_[4]}}m.push(v);if(typeof v.originalLine==="number"){d.push(v)}}}s(m,o.compareByGeneratedPositionsDeflated);this.__generatedMappings=m;s(d,o.compareByOriginalPositions);this.__originalMappings=d};BasicSourceMapConsumer.prototype._findMapping=function SourceMapConsumer_findMapping(e,r,n,t,o,a){if(e[n]<=0){throw new TypeError("Line must be greater than or equal to 1, got "+e[n])}if(e[t]<0){throw new TypeError("Column must be greater than or equal to 0, got "+e[t])}return i.search(e,r,o,a)};BasicSourceMapConsumer.prototype.computeColumnSpans=function SourceMapConsumer_computeColumnSpans(){for(var e=0;e<this._generatedMappings.length;++e){var r=this._generatedMappings[e];if(e+1<this._generatedMappings.length){var n=this._generatedMappings[e+1];if(r.generatedLine===n.generatedLine){r.lastGeneratedColumn=n.generatedColumn-1;continue}}r.lastGeneratedColumn=Infinity}};BasicSourceMapConsumer.prototype.originalPositionFor=function SourceMapConsumer_originalPositionFor(e){var r={generatedLine:o.getArg(e,"line"),generatedColumn:o.getArg(e,"column")};var n=this._findMapping(r,this._generatedMappings,"generatedLine","generatedColumn",o.compareByGeneratedPositionsDeflated,o.getArg(e,"bias",SourceMapConsumer.GREATEST_LOWER_BOUND));if(n>=0){var t=this._generatedMappings[n];if(t.generatedLine===r.generatedLine){var i=o.getArg(t,"source",null);if(i!==null){i=this._sources.at(i);i=o.computeSourceURL(this.sourceRoot,i,this._sourceMapURL)}var a=o.getArg(t,"name",null);if(a!==null){a=this._names.at(a)}return{source:i,line:o.getArg(t,"originalLine",null),column:o.getArg(t,"originalColumn",null),name:a}}}return{source:null,line:null,column:null,name:null}};BasicSourceMapConsumer.prototype.hasContentsOfAllSources=function BasicSourceMapConsumer_hasContentsOfAllSources(){if(!this.sourcesContent){return false}return this.sourcesContent.length>=this._sources.size()&&!this.sourcesContent.some((function(e){return e==null}))};BasicSourceMapConsumer.prototype.sourceContentFor=function SourceMapConsumer_sourceContentFor(e,r){if(!this.sourcesContent){return null}var n=this._findSourceIndex(e);if(n>=0){return this.sourcesContent[n]}var t=e;if(this.sourceRoot!=null){t=o.relative(this.sourceRoot,t)}var i;if(this.sourceRoot!=null&&(i=o.urlParse(this.sourceRoot))){var a=t.replace(/^file:\/\//,"");if(i.scheme=="file"&&this._sources.has(a)){return this.sourcesContent[this._sources.indexOf(a)]}if((!i.path||i.path=="/")&&this._sources.has("/"+t)){return this.sourcesContent[this._sources.indexOf("/"+t)]}}if(r){return null}else{throw new Error('"'+t+'" is not in the SourceMap.')}};BasicSourceMapConsumer.prototype.generatedPositionFor=function SourceMapConsumer_generatedPositionFor(e){var r=o.getArg(e,"source");r=this._findSourceIndex(r);if(r<0){return{line:null,column:null,lastColumn:null}}var n={source:r,originalLine:o.getArg(e,"line"),originalColumn:o.getArg(e,"column")};var t=this._findMapping(n,this._originalMappings,"originalLine","originalColumn",o.compareByOriginalPositions,o.getArg(e,"bias",SourceMapConsumer.GREATEST_LOWER_BOUND));if(t>=0){var i=this._originalMappings[t];if(i.source===n.source){return{line:o.getArg(i,"generatedLine",null),column:o.getArg(i,"generatedColumn",null),lastColumn:o.getArg(i,"lastGeneratedColumn",null)}}}return{line:null,column:null,lastColumn:null}};t=BasicSourceMapConsumer;function IndexedSourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}var t=o.getArg(n,"version");var i=o.getArg(n,"sections");if(t!=this._version){throw new Error("Unsupported version: "+t)}this._sources=new a;this._names=new a;var u={line:-1,column:0};this._sections=i.map((function(e){if(e.url){throw new Error("Support for url field in sections not implemented.")}var n=o.getArg(e,"offset");var t=o.getArg(n,"line");var i=o.getArg(n,"column");if(t<u.line||t===u.line&&i<u.column){throw new Error("Section offsets must be ordered and non-overlapping.")}u=n;return{generatedOffset:{generatedLine:t+1,generatedColumn:i+1},consumer:new SourceMapConsumer(o.getArg(e,"map"),r)}}))}IndexedSourceMapConsumer.prototype=Object.create(SourceMapConsumer.prototype);IndexedSourceMapConsumer.prototype.constructor=SourceMapConsumer;IndexedSourceMapConsumer.prototype._version=3;Object.defineProperty(IndexedSourceMapConsumer.prototype,"sources",{get:function(){var e=[];for(var r=0;r<this._sections.length;r++){for(var n=0;n<this._sections[r].consumer.sources.length;n++){e.push(this._sections[r].consumer.sources[n])}}return e}});IndexedSourceMapConsumer.prototype.originalPositionFor=function IndexedSourceMapConsumer_originalPositionFor(e){var r={generatedLine:o.getArg(e,"line"),generatedColumn:o.getArg(e,"column")};var n=i.search(r,this._sections,(function(e,r){var n=e.generatedLine-r.generatedOffset.generatedLine;if(n){return n}return e.generatedColumn-r.generatedOffset.generatedColumn}));var t=this._sections[n];if(!t){return{source:null,line:null,column:null,name:null}}return t.consumer.originalPositionFor({line:r.generatedLine-(t.generatedOffset.generatedLine-1),column:r.generatedColumn-(t.generatedOffset.generatedLine===r.generatedLine?t.generatedOffset.generatedColumn-1:0),bias:e.bias})};IndexedSourceMapConsumer.prototype.hasContentsOfAllSources=function IndexedSourceMapConsumer_hasContentsOfAllSources(){return this._sections.every((function(e){return e.consumer.hasContentsOfAllSources()}))};IndexedSourceMapConsumer.prototype.sourceContentFor=function IndexedSourceMapConsumer_sourceContentFor(e,r){for(var n=0;n<this._sections.length;n++){var t=this._sections[n];var o=t.consumer.sourceContentFor(e,true);if(o){return o}}if(r){return null}else{throw new Error('"'+e+'" is not in the SourceMap.')}};IndexedSourceMapConsumer.prototype.generatedPositionFor=function IndexedSourceMapConsumer_generatedPositionFor(e){for(var r=0;r<this._sections.length;r++){var n=this._sections[r];if(n.consumer._findSourceIndex(o.getArg(e,"source"))===-1){continue}var t=n.consumer.generatedPositionFor(e);if(t){var i={line:t.line+(n.generatedOffset.generatedLine-1),column:t.column+(n.generatedOffset.generatedLine===t.line?n.generatedOffset.generatedColumn-1:0)};return i}}return{line:null,column:null}};IndexedSourceMapConsumer.prototype._parseMappings=function IndexedSourceMapConsumer_parseMappings(e,r){this.__generatedMappings=[];this.__originalMappings=[];for(var n=0;n<this._sections.length;n++){var t=this._sections[n];var i=t.consumer._generatedMappings;for(var a=0;a<i.length;a++){var u=i[a];var l=t.consumer._sources.at(u.source);l=o.computeSourceURL(t.consumer.sourceRoot,l,this._sourceMapURL);this._sources.add(l);l=this._sources.indexOf(l);var c=null;if(u.name){c=t.consumer._names.at(u.name);this._names.add(c);c=this._names.indexOf(c)}var p={source:l,generatedLine:u.generatedLine+(t.generatedOffset.generatedLine-1),generatedColumn:u.generatedColumn+(t.generatedOffset.generatedLine===u.generatedLine?t.generatedOffset.generatedColumn-1:0),originalLine:u.originalLine,originalColumn:u.originalColumn,name:c};this.__generatedMappings.push(p);if(typeof p.originalLine==="number"){this.__originalMappings.push(p)}}}s(this.__generatedMappings,o.compareByGeneratedPositionsDeflated);s(this.__originalMappings,o.compareByOriginalPositions)};t=IndexedSourceMapConsumer},341:(e,r,n)=>{var t=n(215);var o=n(983);var i=n(837).I;var a=n(740).H;function SourceMapGenerator(e){if(!e){e={}}this._file=o.getArg(e,"file",null);this._sourceRoot=o.getArg(e,"sourceRoot",null);this._skipValidation=o.getArg(e,"skipValidation",false);this._sources=new i;this._names=new i;this._mappings=new a;this._sourcesContents=null}SourceMapGenerator.prototype._version=3;SourceMapGenerator.fromSourceMap=function SourceMapGenerator_fromSourceMap(e){var r=e.sourceRoot;var n=new SourceMapGenerator({file:e.file,sourceRoot:r});e.eachMapping((function(e){var t={generated:{line:e.generatedLine,column:e.generatedColumn}};if(e.source!=null){t.source=e.source;if(r!=null){t.source=o.relative(r,t.source)}t.original={line:e.originalLine,column:e.originalColumn};if(e.name!=null){t.name=e.name}}n.addMapping(t)}));e.sources.forEach((function(t){var i=t;if(r!==null){i=o.relative(r,t)}if(!n._sources.has(i)){n._sources.add(i)}var a=e.sourceContentFor(t);if(a!=null){n.setSourceContent(t,a)}}));return n};SourceMapGenerator.prototype.addMapping=function SourceMapGenerator_addMapping(e){var r=o.getArg(e,"generated");var n=o.getArg(e,"original",null);var t=o.getArg(e,"source",null);var i=o.getArg(e,"name",null);if(!this._skipValidation){this._validateMapping(r,n,t,i)}if(t!=null){t=String(t);if(!this._sources.has(t)){this._sources.add(t)}}if(i!=null){i=String(i);if(!this._names.has(i)){this._names.add(i)}}this._mappings.add({generatedLine:r.line,generatedColumn:r.column,originalLine:n!=null&&n.line,originalColumn:n!=null&&n.column,source:t,name:i})};SourceMapGenerator.prototype.setSourceContent=function SourceMapGenerator_setSourceContent(e,r){var n=e;if(this._sourceRoot!=null){n=o.relative(this._sourceRoot,n)}if(r!=null){if(!this._sourcesContents){this._sourcesContents=Object.create(null)}this._sourcesContents[o.toSetString(n)]=r}else if(this._sourcesContents){delete this._sourcesContents[o.toSetString(n)];if(Object.keys(this._sourcesContents).length===0){this._sourcesContents=null}}};SourceMapGenerator.prototype.applySourceMap=function SourceMapGenerator_applySourceMap(e,r,n){var t=r;if(r==null){if(e.file==null){throw new Error("SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, "+'or the source map\'s "file" property. Both were omitted.')}t=e.file}var a=this._sourceRoot;if(a!=null){t=o.relative(a,t)}var u=new i;var s=new i;this._mappings.unsortedForEach((function(r){if(r.source===t&&r.originalLine!=null){var i=e.originalPositionFor({line:r.originalLine,column:r.originalColumn});if(i.source!=null){r.source=i.source;if(n!=null){r.source=o.join(n,r.source)}if(a!=null){r.source=o.relative(a,r.source)}r.originalLine=i.line;r.originalColumn=i.column;if(i.name!=null){r.name=i.name}}}var l=r.source;if(l!=null&&!u.has(l)){u.add(l)}var c=r.name;if(c!=null&&!s.has(c)){s.add(c)}}),this);this._sources=u;this._names=s;e.sources.forEach((function(r){var t=e.sourceContentFor(r);if(t!=null){if(n!=null){r=o.join(n,r)}if(a!=null){r=o.relative(a,r)}this.setSourceContent(r,t)}}),this)};SourceMapGenerator.prototype._validateMapping=function SourceMapGenerator_validateMapping(e,r,n,t){if(r&&typeof r.line!=="number"&&typeof r.column!=="number"){throw new Error("original.line and original.column are not numbers -- you probably meant to omit "+"the original mapping entirely and only map the generated position. If so, pass "+"null for the original mapping instead of an object with empty or null values.")}if(e&&"line"in e&&"column"in e&&e.line>0&&e.column>=0&&!r&&!n&&!t){return}else if(e&&"line"in e&&"column"in e&&r&&"line"in r&&"column"in r&&e.line>0&&e.column>=0&&r.line>0&&r.column>=0&&n){return}else{throw new Error("Invalid mapping: "+JSON.stringify({generated:e,source:n,original:r,name:t}))}};SourceMapGenerator.prototype._serializeMappings=function SourceMapGenerator_serializeMappings(){var e=0;var r=1;var n=0;var i=0;var a=0;var u=0;var s="";var l;var c;var p;var f;var g=this._mappings.toArray();for(var h=0,d=g.length;h<d;h++){c=g[h];l="";if(c.generatedLine!==r){e=0;while(c.generatedLine!==r){l+=";";r++}}else{if(h>0){if(!o.compareByGeneratedPositionsInflated(c,g[h-1])){continue}l+=","}}l+=t.encode(c.generatedColumn-e);e=c.generatedColumn;if(c.source!=null){f=this._sources.indexOf(c.source);l+=t.encode(f-u);u=f;l+=t.encode(c.originalLine-1-i);i=c.originalLine-1;l+=t.encode(c.originalColumn-n);n=c.originalColumn;if(c.name!=null){p=this._names.indexOf(c.name);l+=t.encode(p-a);a=p}}s+=l}return s};SourceMapGenerator.prototype._generateSourcesContent=function SourceMapGenerator_generateSourcesContent(e,r){return e.map((function(e){if(!this._sourcesContents){return null}if(r!=null){e=o.relative(r,e)}var n=o.toSetString(e);return Object.prototype.hasOwnProperty.call(this._sourcesContents,n)?this._sourcesContents[n]:null}),this)};SourceMapGenerator.prototype.toJSON=function SourceMapGenerator_toJSON(){var e={version:this._version,sources:this._sources.toArray(),names:this._names.toArray(),mappings:this._serializeMappings()};if(this._file!=null){e.file=this._file}if(this._sourceRoot!=null){e.sourceRoot=this._sourceRoot}if(this._sourcesContents){e.sourcesContent=this._generateSourcesContent(e.sources,e.sourceRoot)}return e};SourceMapGenerator.prototype.toString=function SourceMapGenerator_toString(){return JSON.stringify(this.toJSON())};r.h=SourceMapGenerator},990:(e,r,n)=>{var t;var o=n(341).h;var i=n(983);var a=/(\r?\n)/;var u=10;var s="$$$isSourceNode$$$";function SourceNode(e,r,n,t,o){this.children=[];this.sourceContents={};this.line=e==null?null:e;this.column=r==null?null:r;this.source=n==null?null:n;this.name=o==null?null:o;this[s]=true;if(t!=null)this.add(t)}SourceNode.fromStringWithSourceMap=function SourceNode_fromStringWithSourceMap(e,r,n){var t=new SourceNode;var o=e.split(a);var u=0;var shiftNextLine=function(){var e=getNextLine();var r=getNextLine()||"";return e+r;function getNextLine(){return u<o.length?o[u++]:undefined}};var s=1,l=0;var c=null;r.eachMapping((function(e){if(c!==null){if(s<e.generatedLine){addMappingWithCode(c,shiftNextLine());s++;l=0}else{var r=o[u]||"";var n=r.substr(0,e.generatedColumn-l);o[u]=r.substr(e.generatedColumn-l);l=e.generatedColumn;addMappingWithCode(c,n);c=e;return}}while(s<e.generatedLine){t.add(shiftNextLine());s++}if(l<e.generatedColumn){var r=o[u]||"";t.add(r.substr(0,e.generatedColumn));o[u]=r.substr(e.generatedColumn);l=e.generatedColumn}c=e}),this);if(u<o.length){if(c){addMappingWithCode(c,shiftNextLine())}t.add(o.splice(u).join(""))}r.sources.forEach((function(e){var o=r.sourceContentFor(e);if(o!=null){if(n!=null){e=i.join(n,e)}t.setSourceContent(e,o)}}));return t;function addMappingWithCode(e,r){if(e===null||e.source===undefined){t.add(r)}else{var o=n?i.join(n,e.source):e.source;t.add(new SourceNode(e.originalLine,e.originalColumn,o,r,e.name))}}};SourceNode.prototype.add=function SourceNode_add(e){if(Array.isArray(e)){e.forEach((function(e){this.add(e)}),this)}else if(e[s]||typeof e==="string"){if(e){this.children.push(e)}}else{throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+e)}return this};SourceNode.prototype.prepend=function SourceNode_prepend(e){if(Array.isArray(e)){for(var r=e.length-1;r>=0;r--){this.prepend(e[r])}}else if(e[s]||typeof e==="string"){this.children.unshift(e)}else{throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+e)}return this};SourceNode.prototype.walk=function SourceNode_walk(e){var r;for(var n=0,t=this.children.length;n<t;n++){r=this.children[n];if(r[s]){r.walk(e)}else{if(r!==""){e(r,{source:this.source,line:this.line,column:this.column,name:this.name})}}}};SourceNode.prototype.join=function SourceNode_join(e){var r;var n;var t=this.children.length;if(t>0){r=[];for(n=0;n<t-1;n++){r.push(this.children[n]);r.push(e)}r.push(this.children[n]);this.children=r}return this};SourceNode.prototype.replaceRight=function SourceNode_replaceRight(e,r){var n=this.children[this.children.length-1];if(n[s]){n.replaceRight(e,r)}else if(typeof n==="string"){this.children[this.children.length-1]=n.replace(e,r)}else{this.children.push("".replace(e,r))}return this};SourceNode.prototype.setSourceContent=function SourceNode_setSourceContent(e,r){this.sourceContents[i.toSetString(e)]=r};SourceNode.prototype.walkSourceContents=function SourceNode_walkSourceContents(e){for(var r=0,n=this.children.length;r<n;r++){if(this.children[r][s]){this.children[r].walkSourceContents(e)}}var t=Object.keys(this.sourceContents);for(var r=0,n=t.length;r<n;r++){e(i.fromSetString(t[r]),this.sourceContents[t[r]])}};SourceNode.prototype.toString=function SourceNode_toString(){var e="";this.walk((function(r){e+=r}));return e};SourceNode.prototype.toStringWithSourceMap=function SourceNode_toStringWithSourceMap(e){var r={code:"",line:1,column:0};var n=new o(e);var t=false;var i=null;var a=null;var s=null;var l=null;this.walk((function(e,o){r.code+=e;if(o.source!==null&&o.line!==null&&o.column!==null){if(i!==o.source||a!==o.line||s!==o.column||l!==o.name){n.addMapping({source:o.source,original:{line:o.line,column:o.column},generated:{line:r.line,column:r.column},name:o.name})}i=o.source;a=o.line;s=o.column;l=o.name;t=true}else if(t){n.addMapping({generated:{line:r.line,column:r.column}});i=null;t=false}for(var c=0,p=e.length;c<p;c++){if(e.charCodeAt(c)===u){r.line++;r.column=0;if(c+1===p){i=null;t=false}else if(t){n.addMapping({source:o.source,original:{line:o.line,column:o.column},generated:{line:r.line,column:r.column},name:o.name})}}else{r.column++}}}));this.walkSourceContents((function(e,r){n.setSourceContent(e,r)}));return{code:r.code,map:n}};t=SourceNode},983:(e,r)=>{function getArg(e,r,n){if(r in e){return e[r]}else if(arguments.length===3){return n}else{throw new Error('"'+r+'" is a required argument.')}}r.getArg=getArg;var n=/^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;var t=/^data:.+\,.+$/;function urlParse(e){var r=e.match(n);if(!r){return null}return{scheme:r[1],auth:r[2],host:r[3],port:r[4],path:r[5]}}r.urlParse=urlParse;function urlGenerate(e){var r="";if(e.scheme){r+=e.scheme+":"}r+="//";if(e.auth){r+=e.auth+"@"}if(e.host){r+=e.host}if(e.port){r+=":"+e.port}if(e.path){r+=e.path}return r}r.urlGenerate=urlGenerate;function normalize(e){var n=e;var t=urlParse(e);if(t){if(!t.path){return e}n=t.path}var o=r.isAbsolute(n);var i=n.split(/\/+/);for(var a,u=0,s=i.length-1;s>=0;s--){a=i[s];if(a==="."){i.splice(s,1)}else if(a===".."){u++}else if(u>0){if(a===""){i.splice(s+1,u);u=0}else{i.splice(s,2);u--}}}n=i.join("/");if(n===""){n=o?"/":"."}if(t){t.path=n;return urlGenerate(t)}return n}r.normalize=normalize;function join(e,r){if(e===""){e="."}if(r===""){r="."}var n=urlParse(r);var o=urlParse(e);if(o){e=o.path||"/"}if(n&&!n.scheme){if(o){n.scheme=o.scheme}return urlGenerate(n)}if(n||r.match(t)){return r}if(o&&!o.host&&!o.path){o.host=r;return urlGenerate(o)}var i=r.charAt(0)==="/"?r:normalize(e.replace(/\/+$/,"")+"/"+r);if(o){o.path=i;return urlGenerate(o)}return i}r.join=join;r.isAbsolute=function(e){return e.charAt(0)==="/"||n.test(e)};function relative(e,r){if(e===""){e="."}e=e.replace(/\/$/,"");var n=0;while(r.indexOf(e+"/")!==0){var t=e.lastIndexOf("/");if(t<0){return r}e=e.slice(0,t);if(e.match(/^([^\/]+:\/)?\/*$/)){return r}++n}return Array(n+1).join("../")+r.substr(e.length+1)}r.relative=relative;var o=function(){var e=Object.create(null);return!("__proto__"in e)}();function identity(e){return e}function toSetString(e){if(isProtoString(e)){return"$"+e}return e}r.toSetString=o?identity:toSetString;function fromSetString(e){if(isProtoString(e)){return e.slice(1)}return e}r.fromSetString=o?identity:fromSetString;function isProtoString(e){if(!e){return false}var r=e.length;if(r<9){return false}if(e.charCodeAt(r-1)!==95||e.charCodeAt(r-2)!==95||e.charCodeAt(r-3)!==111||e.charCodeAt(r-4)!==116||e.charCodeAt(r-5)!==111||e.charCodeAt(r-6)!==114||e.charCodeAt(r-7)!==112||e.charCodeAt(r-8)!==95||e.charCodeAt(r-9)!==95){return false}for(var n=r-10;n>=0;n--){if(e.charCodeAt(n)!==36){return false}}return true}function compareByOriginalPositions(e,r,n){var t=strcmp(e.source,r.source);if(t!==0){return t}t=e.originalLine-r.originalLine;if(t!==0){return t}t=e.originalColumn-r.originalColumn;if(t!==0||n){return t}t=e.generatedColumn-r.generatedColumn;if(t!==0){return t}t=e.generatedLine-r.generatedLine;if(t!==0){return t}return strcmp(e.name,r.name)}r.compareByOriginalPositions=compareByOriginalPositions;function compareByGeneratedPositionsDeflated(e,r,n){var t=e.generatedLine-r.generatedLine;if(t!==0){return t}t=e.generatedColumn-r.generatedColumn;if(t!==0||n){return t}t=strcmp(e.source,r.source);if(t!==0){return t}t=e.originalLine-r.originalLine;if(t!==0){return t}t=e.originalColumn-r.originalColumn;if(t!==0){return t}return strcmp(e.name,r.name)}r.compareByGeneratedPositionsDeflated=compareByGeneratedPositionsDeflated;function strcmp(e,r){if(e===r){return 0}if(e===null){return 1}if(r===null){return-1}if(e>r){return 1}return-1}function compareByGeneratedPositionsInflated(e,r){var n=e.generatedLine-r.generatedLine;if(n!==0){return n}n=e.generatedColumn-r.generatedColumn;if(n!==0){return n}n=strcmp(e.source,r.source);if(n!==0){return n}n=e.originalLine-r.originalLine;if(n!==0){return n}n=e.originalColumn-r.originalColumn;if(n!==0){return n}return strcmp(e.name,r.name)}r.compareByGeneratedPositionsInflated=compareByGeneratedPositionsInflated;function parseSourceMapInput(e){return JSON.parse(e.replace(/^\)]}'[^\n]*\n/,""))}r.parseSourceMapInput=parseSourceMapInput;function computeSourceURL(e,r,n){r=r||"";if(e){if(e[e.length-1]!=="/"&&r[0]!=="/"){e+="/"}r=e+r}if(n){var t=urlParse(n);if(!t){throw new Error("sourceMapURL could not be parsed")}if(t.path){var o=t.path.lastIndexOf("/");if(o>=0){t.path=t.path.substring(0,o+1)}}r=join(urlGenerate(t),r)}return normalize(r)}r.computeSourceURL=computeSourceURL},596:(e,r,n)=>{n(341).h;r.SourceMapConsumer=n(327).SourceMapConsumer;n(990)},747:e=>{"use strict";e.exports=__nccwpck_require__(747)},622:e=>{"use strict";e.exports=__nccwpck_require__(622)}};var r={};function __nested_webpack_require_40201__(n){var t=r[n];if(t!==undefined){return t.exports}var o=r[n]={id:n,loaded:false,exports:{}};var i=true;try{e[n](o,o.exports,__nested_webpack_require_40201__);i=false}finally{if(i)delete r[n]}o.loaded=true;return o.exports}(()=>{__nested_webpack_require_40201__.nmd=e=>{e.paths=[];if(!e.children)e.children=[];return e}})();if(true)__nested_webpack_require_40201__.ab=__dirname+"/";var n={};(()=>{__nested_webpack_require_40201__(284).install()})();module.exports=n})();

/***/ }),

/***/ 357:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(357);;

/***/ }),

/***/ 129:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(129);;

/***/ }),

/***/ 619:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(619);;

/***/ }),

/***/ 417:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(417);;

/***/ }),

/***/ 614:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(614);;

/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(747);;

/***/ }),

/***/ 87:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(87);;

/***/ }),

/***/ 622:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(622);;

/***/ }),

/***/ 413:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(413);;

/***/ }),

/***/ 669:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(669);;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(131);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 907:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

(()=>{var e={650:e=>{var r=Object.prototype.toString;var n=typeof Buffer.alloc==="function"&&typeof Buffer.allocUnsafe==="function"&&typeof Buffer.from==="function";function isArrayBuffer(e){return r.call(e).slice(8,-1)==="ArrayBuffer"}function fromArrayBuffer(e,r,t){r>>>=0;var o=e.byteLength-r;if(o<0){throw new RangeError("'offset' is out of bounds")}if(t===undefined){t=o}else{t>>>=0;if(t>o){throw new RangeError("'length' is out of bounds")}}return n?Buffer.from(e.slice(r,r+t)):new Buffer(new Uint8Array(e.slice(r,r+t)))}function fromString(e,r){if(typeof r!=="string"||r===""){r="utf8"}if(!Buffer.isEncoding(r)){throw new TypeError('"encoding" must be a valid string encoding')}return n?Buffer.from(e,r):new Buffer(e,r)}function bufferFrom(e,r,t){if(typeof e==="number"){throw new TypeError('"value" argument must not be a number')}if(isArrayBuffer(e)){return fromArrayBuffer(e,r,t)}if(typeof e==="string"){return fromString(e,r)}return n?Buffer.from(e):new Buffer(e)}e.exports=bufferFrom},284:(e,r,n)=>{e=n.nmd(e);var t=n(596).SourceMapConsumer;var o=n(622);var i;try{i=n(747);if(!i.existsSync||!i.readFileSync){i=null}}catch(e){}var a=n(650);function dynamicRequire(e,r){return e.require(r)}var u=false;var s=false;var l=false;var c="auto";var p={};var f={};var g=/^data:application\/json[^,]+base64,/;var h=[];var d=[];function isInBrowser(){if(c==="browser")return true;if(c==="node")return false;return typeof window!=="undefined"&&typeof XMLHttpRequest==="function"&&!(window.require&&window.module&&window.process&&window.process.type==="renderer")}function hasGlobalProcessEventEmitter(){return typeof process==="object"&&process!==null&&typeof process.on==="function"}function handlerExec(e){return function(r){for(var n=0;n<e.length;n++){var t=e[n](r);if(t){return t}}return null}}var m=handlerExec(h);h.push((function(e){e=e.trim();if(/^file:/.test(e)){e=e.replace(/file:\/\/\/(\w:)?/,(function(e,r){return r?"":"/"}))}if(e in p){return p[e]}var r="";try{if(!i){var n=new XMLHttpRequest;n.open("GET",e,false);n.send(null);if(n.readyState===4&&n.status===200){r=n.responseText}}else if(i.existsSync(e)){r=i.readFileSync(e,"utf8")}}catch(e){}return p[e]=r}));function supportRelativeURL(e,r){if(!e)return r;var n=o.dirname(e);var t=/^\w+:\/\/[^\/]*/.exec(n);var i=t?t[0]:"";var a=n.slice(i.length);if(i&&/^\/\w\:/.test(a)){i+="/";return i+o.resolve(n.slice(i.length),r).replace(/\\/g,"/")}return i+o.resolve(n.slice(i.length),r)}function retrieveSourceMapURL(e){var r;if(isInBrowser()){try{var n=new XMLHttpRequest;n.open("GET",e,false);n.send(null);r=n.readyState===4?n.responseText:null;var t=n.getResponseHeader("SourceMap")||n.getResponseHeader("X-SourceMap");if(t){return t}}catch(e){}}r=m(e);var o=/(?:\/\/[@#][\s]*sourceMappingURL=([^\s'"]+)[\s]*$)|(?:\/\*[@#][\s]*sourceMappingURL=([^\s*'"]+)[\s]*(?:\*\/)[\s]*$)/gm;var i,a;while(a=o.exec(r))i=a;if(!i)return null;return i[1]}var v=handlerExec(d);d.push((function(e){var r=retrieveSourceMapURL(e);if(!r)return null;var n;if(g.test(r)){var t=r.slice(r.indexOf(",")+1);n=a(t,"base64").toString();r=e}else{r=supportRelativeURL(e,r);n=m(r)}if(!n){return null}return{url:r,map:n}}));function mapSourcePosition(e){var r=f[e.source];if(!r){var n=v(e.source);if(n){r=f[e.source]={url:n.url,map:new t(n.map)};if(r.map.sourcesContent){r.map.sources.forEach((function(e,n){var t=r.map.sourcesContent[n];if(t){var o=supportRelativeURL(r.url,e);p[o]=t}}))}}else{r=f[e.source]={url:null,map:null}}}if(r&&r.map&&typeof r.map.originalPositionFor==="function"){var o=r.map.originalPositionFor(e);if(o.source!==null){o.source=supportRelativeURL(r.url,o.source);return o}}return e}function mapEvalOrigin(e){var r=/^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(e);if(r){var n=mapSourcePosition({source:r[2],line:+r[3],column:r[4]-1});return"eval at "+r[1]+" ("+n.source+":"+n.line+":"+(n.column+1)+")"}r=/^eval at ([^(]+) \((.+)\)$/.exec(e);if(r){return"eval at "+r[1]+" ("+mapEvalOrigin(r[2])+")"}return e}function CallSiteToString(){var e;var r="";if(this.isNative()){r="native"}else{e=this.getScriptNameOrSourceURL();if(!e&&this.isEval()){r=this.getEvalOrigin();r+=", "}if(e){r+=e}else{r+="<anonymous>"}var n=this.getLineNumber();if(n!=null){r+=":"+n;var t=this.getColumnNumber();if(t){r+=":"+t}}}var o="";var i=this.getFunctionName();var a=true;var u=this.isConstructor();var s=!(this.isToplevel()||u);if(s){var l=this.getTypeName();if(l==="[object Object]"){l="null"}var c=this.getMethodName();if(i){if(l&&i.indexOf(l)!=0){o+=l+"."}o+=i;if(c&&i.indexOf("."+c)!=i.length-c.length-1){o+=" [as "+c+"]"}}else{o+=l+"."+(c||"<anonymous>")}}else if(u){o+="new "+(i||"<anonymous>")}else if(i){o+=i}else{o+=r;a=false}if(a){o+=" ("+r+")"}return o}function cloneCallSite(e){var r={};Object.getOwnPropertyNames(Object.getPrototypeOf(e)).forEach((function(n){r[n]=/^(?:is|get)/.test(n)?function(){return e[n].call(e)}:e[n]}));r.toString=CallSiteToString;return r}function wrapCallSite(e,r){if(r===undefined){r={nextPosition:null,curPosition:null}}if(e.isNative()){r.curPosition=null;return e}var n=e.getFileName()||e.getScriptNameOrSourceURL();if(n){var t=e.getLineNumber();var o=e.getColumnNumber()-1;var i=/^v(10\.1[6-9]|10\.[2-9][0-9]|10\.[0-9]{3,}|1[2-9]\d*|[2-9]\d|\d{3,}|11\.11)/;var a=i.test(process.version)?0:62;if(t===1&&o>a&&!isInBrowser()&&!e.isEval()){o-=a}var u=mapSourcePosition({source:n,line:t,column:o});r.curPosition=u;e=cloneCallSite(e);var s=e.getFunctionName;e.getFunctionName=function(){if(r.nextPosition==null){return s()}return r.nextPosition.name||s()};e.getFileName=function(){return u.source};e.getLineNumber=function(){return u.line};e.getColumnNumber=function(){return u.column+1};e.getScriptNameOrSourceURL=function(){return u.source};return e}var l=e.isEval()&&e.getEvalOrigin();if(l){l=mapEvalOrigin(l);e=cloneCallSite(e);e.getEvalOrigin=function(){return l};return e}return e}function prepareStackTrace(e,r){if(l){p={};f={}}var n=e.name||"Error";var t=e.message||"";var o=n+": "+t;var i={nextPosition:null,curPosition:null};var a=[];for(var u=r.length-1;u>=0;u--){a.push("\n    at "+wrapCallSite(r[u],i));i.nextPosition=i.curPosition}i.curPosition=i.nextPosition=null;return o+a.reverse().join("")}function getErrorSource(e){var r=/\n    at [^(]+ \((.*):(\d+):(\d+)\)/.exec(e.stack);if(r){var n=r[1];var t=+r[2];var o=+r[3];var a=p[n];if(!a&&i&&i.existsSync(n)){try{a=i.readFileSync(n,"utf8")}catch(e){a=""}}if(a){var u=a.split(/(?:\r\n|\r|\n)/)[t-1];if(u){return n+":"+t+"\n"+u+"\n"+new Array(o).join(" ")+"^"}}}return null}function printErrorAndExit(e){var r=getErrorSource(e);if(process.stderr._handle&&process.stderr._handle.setBlocking){process.stderr._handle.setBlocking(true)}if(r){console.error();console.error(r)}console.error(e.stack);process.exit(1)}function shimEmitUncaughtException(){var e=process.emit;process.emit=function(r){if(r==="uncaughtException"){var n=arguments[1]&&arguments[1].stack;var t=this.listeners(r).length>0;if(n&&!t){return printErrorAndExit(arguments[1])}}return e.apply(this,arguments)}}var S=h.slice(0);var _=d.slice(0);r.wrapCallSite=wrapCallSite;r.getErrorSource=getErrorSource;r.mapSourcePosition=mapSourcePosition;r.retrieveSourceMap=v;r.install=function(r){r=r||{};if(r.environment){c=r.environment;if(["node","browser","auto"].indexOf(c)===-1){throw new Error("environment "+c+" was unknown. Available options are {auto, browser, node}")}}if(r.retrieveFile){if(r.overrideRetrieveFile){h.length=0}h.unshift(r.retrieveFile)}if(r.retrieveSourceMap){if(r.overrideRetrieveSourceMap){d.length=0}d.unshift(r.retrieveSourceMap)}if(r.hookRequire&&!isInBrowser()){var n=dynamicRequire(e,"module");var t=n.prototype._compile;if(!t.__sourceMapSupport){n.prototype._compile=function(e,r){p[r]=e;f[r]=undefined;return t.call(this,e,r)};n.prototype._compile.__sourceMapSupport=true}}if(!l){l="emptyCacheBetweenOperations"in r?r.emptyCacheBetweenOperations:false}if(!u){u=true;Error.prepareStackTrace=prepareStackTrace}if(!s){var o="handleUncaughtExceptions"in r?r.handleUncaughtExceptions:true;try{var i=dynamicRequire(e,"worker_threads");if(i.isMainThread===false){o=false}}catch(e){}if(o&&hasGlobalProcessEventEmitter()){s=true;shimEmitUncaughtException()}}};r.resetRetrieveHandlers=function(){h.length=0;d.length=0;h=S.slice(0);d=_.slice(0);v=handlerExec(d);m=handlerExec(h)}},837:(e,r,n)=>{var t=n(983);var o=Object.prototype.hasOwnProperty;var i=typeof Map!=="undefined";function ArraySet(){this._array=[];this._set=i?new Map:Object.create(null)}ArraySet.fromArray=function ArraySet_fromArray(e,r){var n=new ArraySet;for(var t=0,o=e.length;t<o;t++){n.add(e[t],r)}return n};ArraySet.prototype.size=function ArraySet_size(){return i?this._set.size:Object.getOwnPropertyNames(this._set).length};ArraySet.prototype.add=function ArraySet_add(e,r){var n=i?e:t.toSetString(e);var a=i?this.has(e):o.call(this._set,n);var u=this._array.length;if(!a||r){this._array.push(e)}if(!a){if(i){this._set.set(e,u)}else{this._set[n]=u}}};ArraySet.prototype.has=function ArraySet_has(e){if(i){return this._set.has(e)}else{var r=t.toSetString(e);return o.call(this._set,r)}};ArraySet.prototype.indexOf=function ArraySet_indexOf(e){if(i){var r=this._set.get(e);if(r>=0){return r}}else{var n=t.toSetString(e);if(o.call(this._set,n)){return this._set[n]}}throw new Error('"'+e+'" is not in the set.')};ArraySet.prototype.at=function ArraySet_at(e){if(e>=0&&e<this._array.length){return this._array[e]}throw new Error("No element indexed by "+e)};ArraySet.prototype.toArray=function ArraySet_toArray(){return this._array.slice()};r.I=ArraySet},215:(e,r,n)=>{var t=n(537);var o=5;var i=1<<o;var a=i-1;var u=i;function toVLQSigned(e){return e<0?(-e<<1)+1:(e<<1)+0}function fromVLQSigned(e){var r=(e&1)===1;var n=e>>1;return r?-n:n}r.encode=function base64VLQ_encode(e){var r="";var n;var i=toVLQSigned(e);do{n=i&a;i>>>=o;if(i>0){n|=u}r+=t.encode(n)}while(i>0);return r};r.decode=function base64VLQ_decode(e,r,n){var i=e.length;var s=0;var l=0;var c,p;do{if(r>=i){throw new Error("Expected more digits in base 64 VLQ value.")}p=t.decode(e.charCodeAt(r++));if(p===-1){throw new Error("Invalid base64 digit: "+e.charAt(r-1))}c=!!(p&u);p&=a;s=s+(p<<l);l+=o}while(c);n.value=fromVLQSigned(s);n.rest=r}},537:(e,r)=>{var n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");r.encode=function(e){if(0<=e&&e<n.length){return n[e]}throw new TypeError("Must be between 0 and 63: "+e)};r.decode=function(e){var r=65;var n=90;var t=97;var o=122;var i=48;var a=57;var u=43;var s=47;var l=26;var c=52;if(r<=e&&e<=n){return e-r}if(t<=e&&e<=o){return e-t+l}if(i<=e&&e<=a){return e-i+c}if(e==u){return 62}if(e==s){return 63}return-1}},164:(e,r)=>{r.GREATEST_LOWER_BOUND=1;r.LEAST_UPPER_BOUND=2;function recursiveSearch(e,n,t,o,i,a){var u=Math.floor((n-e)/2)+e;var s=i(t,o[u],true);if(s===0){return u}else if(s>0){if(n-u>1){return recursiveSearch(u,n,t,o,i,a)}if(a==r.LEAST_UPPER_BOUND){return n<o.length?n:-1}else{return u}}else{if(u-e>1){return recursiveSearch(e,u,t,o,i,a)}if(a==r.LEAST_UPPER_BOUND){return u}else{return e<0?-1:e}}}r.search=function search(e,n,t,o){if(n.length===0){return-1}var i=recursiveSearch(-1,n.length,e,n,t,o||r.GREATEST_LOWER_BOUND);if(i<0){return-1}while(i-1>=0){if(t(n[i],n[i-1],true)!==0){break}--i}return i}},740:(e,r,n)=>{var t=n(983);function generatedPositionAfter(e,r){var n=e.generatedLine;var o=r.generatedLine;var i=e.generatedColumn;var a=r.generatedColumn;return o>n||o==n&&a>=i||t.compareByGeneratedPositionsInflated(e,r)<=0}function MappingList(){this._array=[];this._sorted=true;this._last={generatedLine:-1,generatedColumn:0}}MappingList.prototype.unsortedForEach=function MappingList_forEach(e,r){this._array.forEach(e,r)};MappingList.prototype.add=function MappingList_add(e){if(generatedPositionAfter(this._last,e)){this._last=e;this._array.push(e)}else{this._sorted=false;this._array.push(e)}};MappingList.prototype.toArray=function MappingList_toArray(){if(!this._sorted){this._array.sort(t.compareByGeneratedPositionsInflated);this._sorted=true}return this._array};r.H=MappingList},226:(e,r)=>{function swap(e,r,n){var t=e[r];e[r]=e[n];e[n]=t}function randomIntInRange(e,r){return Math.round(e+Math.random()*(r-e))}function doQuickSort(e,r,n,t){if(n<t){var o=randomIntInRange(n,t);var i=n-1;swap(e,o,t);var a=e[t];for(var u=n;u<t;u++){if(r(e[u],a)<=0){i+=1;swap(e,i,u)}}swap(e,i+1,u);var s=i+1;doQuickSort(e,r,n,s-1);doQuickSort(e,r,s+1,t)}}r.U=function(e,r){doQuickSort(e,r,0,e.length-1)}},327:(e,r,n)=>{var t;var o=n(983);var i=n(164);var a=n(837).I;var u=n(215);var s=n(226).U;function SourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}return n.sections!=null?new IndexedSourceMapConsumer(n,r):new BasicSourceMapConsumer(n,r)}SourceMapConsumer.fromSourceMap=function(e,r){return BasicSourceMapConsumer.fromSourceMap(e,r)};SourceMapConsumer.prototype._version=3;SourceMapConsumer.prototype.__generatedMappings=null;Object.defineProperty(SourceMapConsumer.prototype,"_generatedMappings",{configurable:true,enumerable:true,get:function(){if(!this.__generatedMappings){this._parseMappings(this._mappings,this.sourceRoot)}return this.__generatedMappings}});SourceMapConsumer.prototype.__originalMappings=null;Object.defineProperty(SourceMapConsumer.prototype,"_originalMappings",{configurable:true,enumerable:true,get:function(){if(!this.__originalMappings){this._parseMappings(this._mappings,this.sourceRoot)}return this.__originalMappings}});SourceMapConsumer.prototype._charIsMappingSeparator=function SourceMapConsumer_charIsMappingSeparator(e,r){var n=e.charAt(r);return n===";"||n===","};SourceMapConsumer.prototype._parseMappings=function SourceMapConsumer_parseMappings(e,r){throw new Error("Subclasses must implement _parseMappings")};SourceMapConsumer.GENERATED_ORDER=1;SourceMapConsumer.ORIGINAL_ORDER=2;SourceMapConsumer.GREATEST_LOWER_BOUND=1;SourceMapConsumer.LEAST_UPPER_BOUND=2;SourceMapConsumer.prototype.eachMapping=function SourceMapConsumer_eachMapping(e,r,n){var t=r||null;var i=n||SourceMapConsumer.GENERATED_ORDER;var a;switch(i){case SourceMapConsumer.GENERATED_ORDER:a=this._generatedMappings;break;case SourceMapConsumer.ORIGINAL_ORDER:a=this._originalMappings;break;default:throw new Error("Unknown order of iteration.")}var u=this.sourceRoot;a.map((function(e){var r=e.source===null?null:this._sources.at(e.source);r=o.computeSourceURL(u,r,this._sourceMapURL);return{source:r,generatedLine:e.generatedLine,generatedColumn:e.generatedColumn,originalLine:e.originalLine,originalColumn:e.originalColumn,name:e.name===null?null:this._names.at(e.name)}}),this).forEach(e,t)};SourceMapConsumer.prototype.allGeneratedPositionsFor=function SourceMapConsumer_allGeneratedPositionsFor(e){var r=o.getArg(e,"line");var n={source:o.getArg(e,"source"),originalLine:r,originalColumn:o.getArg(e,"column",0)};n.source=this._findSourceIndex(n.source);if(n.source<0){return[]}var t=[];var a=this._findMapping(n,this._originalMappings,"originalLine","originalColumn",o.compareByOriginalPositions,i.LEAST_UPPER_BOUND);if(a>=0){var u=this._originalMappings[a];if(e.column===undefined){var s=u.originalLine;while(u&&u.originalLine===s){t.push({line:o.getArg(u,"generatedLine",null),column:o.getArg(u,"generatedColumn",null),lastColumn:o.getArg(u,"lastGeneratedColumn",null)});u=this._originalMappings[++a]}}else{var l=u.originalColumn;while(u&&u.originalLine===r&&u.originalColumn==l){t.push({line:o.getArg(u,"generatedLine",null),column:o.getArg(u,"generatedColumn",null),lastColumn:o.getArg(u,"lastGeneratedColumn",null)});u=this._originalMappings[++a]}}}return t};r.SourceMapConsumer=SourceMapConsumer;function BasicSourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}var t=o.getArg(n,"version");var i=o.getArg(n,"sources");var u=o.getArg(n,"names",[]);var s=o.getArg(n,"sourceRoot",null);var l=o.getArg(n,"sourcesContent",null);var c=o.getArg(n,"mappings");var p=o.getArg(n,"file",null);if(t!=this._version){throw new Error("Unsupported version: "+t)}if(s){s=o.normalize(s)}i=i.map(String).map(o.normalize).map((function(e){return s&&o.isAbsolute(s)&&o.isAbsolute(e)?o.relative(s,e):e}));this._names=a.fromArray(u.map(String),true);this._sources=a.fromArray(i,true);this._absoluteSources=this._sources.toArray().map((function(e){return o.computeSourceURL(s,e,r)}));this.sourceRoot=s;this.sourcesContent=l;this._mappings=c;this._sourceMapURL=r;this.file=p}BasicSourceMapConsumer.prototype=Object.create(SourceMapConsumer.prototype);BasicSourceMapConsumer.prototype.consumer=SourceMapConsumer;BasicSourceMapConsumer.prototype._findSourceIndex=function(e){var r=e;if(this.sourceRoot!=null){r=o.relative(this.sourceRoot,r)}if(this._sources.has(r)){return this._sources.indexOf(r)}var n;for(n=0;n<this._absoluteSources.length;++n){if(this._absoluteSources[n]==e){return n}}return-1};BasicSourceMapConsumer.fromSourceMap=function SourceMapConsumer_fromSourceMap(e,r){var n=Object.create(BasicSourceMapConsumer.prototype);var t=n._names=a.fromArray(e._names.toArray(),true);var i=n._sources=a.fromArray(e._sources.toArray(),true);n.sourceRoot=e._sourceRoot;n.sourcesContent=e._generateSourcesContent(n._sources.toArray(),n.sourceRoot);n.file=e._file;n._sourceMapURL=r;n._absoluteSources=n._sources.toArray().map((function(e){return o.computeSourceURL(n.sourceRoot,e,r)}));var u=e._mappings.toArray().slice();var l=n.__generatedMappings=[];var c=n.__originalMappings=[];for(var p=0,f=u.length;p<f;p++){var g=u[p];var h=new Mapping;h.generatedLine=g.generatedLine;h.generatedColumn=g.generatedColumn;if(g.source){h.source=i.indexOf(g.source);h.originalLine=g.originalLine;h.originalColumn=g.originalColumn;if(g.name){h.name=t.indexOf(g.name)}c.push(h)}l.push(h)}s(n.__originalMappings,o.compareByOriginalPositions);return n};BasicSourceMapConsumer.prototype._version=3;Object.defineProperty(BasicSourceMapConsumer.prototype,"sources",{get:function(){return this._absoluteSources.slice()}});function Mapping(){this.generatedLine=0;this.generatedColumn=0;this.source=null;this.originalLine=null;this.originalColumn=null;this.name=null}BasicSourceMapConsumer.prototype._parseMappings=function SourceMapConsumer_parseMappings(e,r){var n=1;var t=0;var i=0;var a=0;var l=0;var c=0;var p=e.length;var f=0;var g={};var h={};var d=[];var m=[];var v,S,_,C,y;while(f<p){if(e.charAt(f)===";"){n++;f++;t=0}else if(e.charAt(f)===","){f++}else{v=new Mapping;v.generatedLine=n;for(C=f;C<p;C++){if(this._charIsMappingSeparator(e,C)){break}}S=e.slice(f,C);_=g[S];if(_){f+=S.length}else{_=[];while(f<C){u.decode(e,f,h);y=h.value;f=h.rest;_.push(y)}if(_.length===2){throw new Error("Found a source, but no line and column")}if(_.length===3){throw new Error("Found a source and line, but no column")}g[S]=_}v.generatedColumn=t+_[0];t=v.generatedColumn;if(_.length>1){v.source=l+_[1];l+=_[1];v.originalLine=i+_[2];i=v.originalLine;v.originalLine+=1;v.originalColumn=a+_[3];a=v.originalColumn;if(_.length>4){v.name=c+_[4];c+=_[4]}}m.push(v);if(typeof v.originalLine==="number"){d.push(v)}}}s(m,o.compareByGeneratedPositionsDeflated);this.__generatedMappings=m;s(d,o.compareByOriginalPositions);this.__originalMappings=d};BasicSourceMapConsumer.prototype._findMapping=function SourceMapConsumer_findMapping(e,r,n,t,o,a){if(e[n]<=0){throw new TypeError("Line must be greater than or equal to 1, got "+e[n])}if(e[t]<0){throw new TypeError("Column must be greater than or equal to 0, got "+e[t])}return i.search(e,r,o,a)};BasicSourceMapConsumer.prototype.computeColumnSpans=function SourceMapConsumer_computeColumnSpans(){for(var e=0;e<this._generatedMappings.length;++e){var r=this._generatedMappings[e];if(e+1<this._generatedMappings.length){var n=this._generatedMappings[e+1];if(r.generatedLine===n.generatedLine){r.lastGeneratedColumn=n.generatedColumn-1;continue}}r.lastGeneratedColumn=Infinity}};BasicSourceMapConsumer.prototype.originalPositionFor=function SourceMapConsumer_originalPositionFor(e){var r={generatedLine:o.getArg(e,"line"),generatedColumn:o.getArg(e,"column")};var n=this._findMapping(r,this._generatedMappings,"generatedLine","generatedColumn",o.compareByGeneratedPositionsDeflated,o.getArg(e,"bias",SourceMapConsumer.GREATEST_LOWER_BOUND));if(n>=0){var t=this._generatedMappings[n];if(t.generatedLine===r.generatedLine){var i=o.getArg(t,"source",null);if(i!==null){i=this._sources.at(i);i=o.computeSourceURL(this.sourceRoot,i,this._sourceMapURL)}var a=o.getArg(t,"name",null);if(a!==null){a=this._names.at(a)}return{source:i,line:o.getArg(t,"originalLine",null),column:o.getArg(t,"originalColumn",null),name:a}}}return{source:null,line:null,column:null,name:null}};BasicSourceMapConsumer.prototype.hasContentsOfAllSources=function BasicSourceMapConsumer_hasContentsOfAllSources(){if(!this.sourcesContent){return false}return this.sourcesContent.length>=this._sources.size()&&!this.sourcesContent.some((function(e){return e==null}))};BasicSourceMapConsumer.prototype.sourceContentFor=function SourceMapConsumer_sourceContentFor(e,r){if(!this.sourcesContent){return null}var n=this._findSourceIndex(e);if(n>=0){return this.sourcesContent[n]}var t=e;if(this.sourceRoot!=null){t=o.relative(this.sourceRoot,t)}var i;if(this.sourceRoot!=null&&(i=o.urlParse(this.sourceRoot))){var a=t.replace(/^file:\/\//,"");if(i.scheme=="file"&&this._sources.has(a)){return this.sourcesContent[this._sources.indexOf(a)]}if((!i.path||i.path=="/")&&this._sources.has("/"+t)){return this.sourcesContent[this._sources.indexOf("/"+t)]}}if(r){return null}else{throw new Error('"'+t+'" is not in the SourceMap.')}};BasicSourceMapConsumer.prototype.generatedPositionFor=function SourceMapConsumer_generatedPositionFor(e){var r=o.getArg(e,"source");r=this._findSourceIndex(r);if(r<0){return{line:null,column:null,lastColumn:null}}var n={source:r,originalLine:o.getArg(e,"line"),originalColumn:o.getArg(e,"column")};var t=this._findMapping(n,this._originalMappings,"originalLine","originalColumn",o.compareByOriginalPositions,o.getArg(e,"bias",SourceMapConsumer.GREATEST_LOWER_BOUND));if(t>=0){var i=this._originalMappings[t];if(i.source===n.source){return{line:o.getArg(i,"generatedLine",null),column:o.getArg(i,"generatedColumn",null),lastColumn:o.getArg(i,"lastGeneratedColumn",null)}}}return{line:null,column:null,lastColumn:null}};t=BasicSourceMapConsumer;function IndexedSourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}var t=o.getArg(n,"version");var i=o.getArg(n,"sections");if(t!=this._version){throw new Error("Unsupported version: "+t)}this._sources=new a;this._names=new a;var u={line:-1,column:0};this._sections=i.map((function(e){if(e.url){throw new Error("Support for url field in sections not implemented.")}var n=o.getArg(e,"offset");var t=o.getArg(n,"line");var i=o.getArg(n,"column");if(t<u.line||t===u.line&&i<u.column){throw new Error("Section offsets must be ordered and non-overlapping.")}u=n;return{generatedOffset:{generatedLine:t+1,generatedColumn:i+1},consumer:new SourceMapConsumer(o.getArg(e,"map"),r)}}))}IndexedSourceMapConsumer.prototype=Object.create(SourceMapConsumer.prototype);IndexedSourceMapConsumer.prototype.constructor=SourceMapConsumer;IndexedSourceMapConsumer.prototype._version=3;Object.defineProperty(IndexedSourceMapConsumer.prototype,"sources",{get:function(){var e=[];for(var r=0;r<this._sections.length;r++){for(var n=0;n<this._sections[r].consumer.sources.length;n++){e.push(this._sections[r].consumer.sources[n])}}return e}});IndexedSourceMapConsumer.prototype.originalPositionFor=function IndexedSourceMapConsumer_originalPositionFor(e){var r={generatedLine:o.getArg(e,"line"),generatedColumn:o.getArg(e,"column")};var n=i.search(r,this._sections,(function(e,r){var n=e.generatedLine-r.generatedOffset.generatedLine;if(n){return n}return e.generatedColumn-r.generatedOffset.generatedColumn}));var t=this._sections[n];if(!t){return{source:null,line:null,column:null,name:null}}return t.consumer.originalPositionFor({line:r.generatedLine-(t.generatedOffset.generatedLine-1),column:r.generatedColumn-(t.generatedOffset.generatedLine===r.generatedLine?t.generatedOffset.generatedColumn-1:0),bias:e.bias})};IndexedSourceMapConsumer.prototype.hasContentsOfAllSources=function IndexedSourceMapConsumer_hasContentsOfAllSources(){return this._sections.every((function(e){return e.consumer.hasContentsOfAllSources()}))};IndexedSourceMapConsumer.prototype.sourceContentFor=function IndexedSourceMapConsumer_sourceContentFor(e,r){for(var n=0;n<this._sections.length;n++){var t=this._sections[n];var o=t.consumer.sourceContentFor(e,true);if(o){return o}}if(r){return null}else{throw new Error('"'+e+'" is not in the SourceMap.')}};IndexedSourceMapConsumer.prototype.generatedPositionFor=function IndexedSourceMapConsumer_generatedPositionFor(e){for(var r=0;r<this._sections.length;r++){var n=this._sections[r];if(n.consumer._findSourceIndex(o.getArg(e,"source"))===-1){continue}var t=n.consumer.generatedPositionFor(e);if(t){var i={line:t.line+(n.generatedOffset.generatedLine-1),column:t.column+(n.generatedOffset.generatedLine===t.line?n.generatedOffset.generatedColumn-1:0)};return i}}return{line:null,column:null}};IndexedSourceMapConsumer.prototype._parseMappings=function IndexedSourceMapConsumer_parseMappings(e,r){this.__generatedMappings=[];this.__originalMappings=[];for(var n=0;n<this._sections.length;n++){var t=this._sections[n];var i=t.consumer._generatedMappings;for(var a=0;a<i.length;a++){var u=i[a];var l=t.consumer._sources.at(u.source);l=o.computeSourceURL(t.consumer.sourceRoot,l,this._sourceMapURL);this._sources.add(l);l=this._sources.indexOf(l);var c=null;if(u.name){c=t.consumer._names.at(u.name);this._names.add(c);c=this._names.indexOf(c)}var p={source:l,generatedLine:u.generatedLine+(t.generatedOffset.generatedLine-1),generatedColumn:u.generatedColumn+(t.generatedOffset.generatedLine===u.generatedLine?t.generatedOffset.generatedColumn-1:0),originalLine:u.originalLine,originalColumn:u.originalColumn,name:c};this.__generatedMappings.push(p);if(typeof p.originalLine==="number"){this.__originalMappings.push(p)}}}s(this.__generatedMappings,o.compareByGeneratedPositionsDeflated);s(this.__originalMappings,o.compareByOriginalPositions)};t=IndexedSourceMapConsumer},341:(e,r,n)=>{var t=n(215);var o=n(983);var i=n(837).I;var a=n(740).H;function SourceMapGenerator(e){if(!e){e={}}this._file=o.getArg(e,"file",null);this._sourceRoot=o.getArg(e,"sourceRoot",null);this._skipValidation=o.getArg(e,"skipValidation",false);this._sources=new i;this._names=new i;this._mappings=new a;this._sourcesContents=null}SourceMapGenerator.prototype._version=3;SourceMapGenerator.fromSourceMap=function SourceMapGenerator_fromSourceMap(e){var r=e.sourceRoot;var n=new SourceMapGenerator({file:e.file,sourceRoot:r});e.eachMapping((function(e){var t={generated:{line:e.generatedLine,column:e.generatedColumn}};if(e.source!=null){t.source=e.source;if(r!=null){t.source=o.relative(r,t.source)}t.original={line:e.originalLine,column:e.originalColumn};if(e.name!=null){t.name=e.name}}n.addMapping(t)}));e.sources.forEach((function(t){var i=t;if(r!==null){i=o.relative(r,t)}if(!n._sources.has(i)){n._sources.add(i)}var a=e.sourceContentFor(t);if(a!=null){n.setSourceContent(t,a)}}));return n};SourceMapGenerator.prototype.addMapping=function SourceMapGenerator_addMapping(e){var r=o.getArg(e,"generated");var n=o.getArg(e,"original",null);var t=o.getArg(e,"source",null);var i=o.getArg(e,"name",null);if(!this._skipValidation){this._validateMapping(r,n,t,i)}if(t!=null){t=String(t);if(!this._sources.has(t)){this._sources.add(t)}}if(i!=null){i=String(i);if(!this._names.has(i)){this._names.add(i)}}this._mappings.add({generatedLine:r.line,generatedColumn:r.column,originalLine:n!=null&&n.line,originalColumn:n!=null&&n.column,source:t,name:i})};SourceMapGenerator.prototype.setSourceContent=function SourceMapGenerator_setSourceContent(e,r){var n=e;if(this._sourceRoot!=null){n=o.relative(this._sourceRoot,n)}if(r!=null){if(!this._sourcesContents){this._sourcesContents=Object.create(null)}this._sourcesContents[o.toSetString(n)]=r}else if(this._sourcesContents){delete this._sourcesContents[o.toSetString(n)];if(Object.keys(this._sourcesContents).length===0){this._sourcesContents=null}}};SourceMapGenerator.prototype.applySourceMap=function SourceMapGenerator_applySourceMap(e,r,n){var t=r;if(r==null){if(e.file==null){throw new Error("SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, "+'or the source map\'s "file" property. Both were omitted.')}t=e.file}var a=this._sourceRoot;if(a!=null){t=o.relative(a,t)}var u=new i;var s=new i;this._mappings.unsortedForEach((function(r){if(r.source===t&&r.originalLine!=null){var i=e.originalPositionFor({line:r.originalLine,column:r.originalColumn});if(i.source!=null){r.source=i.source;if(n!=null){r.source=o.join(n,r.source)}if(a!=null){r.source=o.relative(a,r.source)}r.originalLine=i.line;r.originalColumn=i.column;if(i.name!=null){r.name=i.name}}}var l=r.source;if(l!=null&&!u.has(l)){u.add(l)}var c=r.name;if(c!=null&&!s.has(c)){s.add(c)}}),this);this._sources=u;this._names=s;e.sources.forEach((function(r){var t=e.sourceContentFor(r);if(t!=null){if(n!=null){r=o.join(n,r)}if(a!=null){r=o.relative(a,r)}this.setSourceContent(r,t)}}),this)};SourceMapGenerator.prototype._validateMapping=function SourceMapGenerator_validateMapping(e,r,n,t){if(r&&typeof r.line!=="number"&&typeof r.column!=="number"){throw new Error("original.line and original.column are not numbers -- you probably meant to omit "+"the original mapping entirely and only map the generated position. If so, pass "+"null for the original mapping instead of an object with empty or null values.")}if(e&&"line"in e&&"column"in e&&e.line>0&&e.column>=0&&!r&&!n&&!t){return}else if(e&&"line"in e&&"column"in e&&r&&"line"in r&&"column"in r&&e.line>0&&e.column>=0&&r.line>0&&r.column>=0&&n){return}else{throw new Error("Invalid mapping: "+JSON.stringify({generated:e,source:n,original:r,name:t}))}};SourceMapGenerator.prototype._serializeMappings=function SourceMapGenerator_serializeMappings(){var e=0;var r=1;var n=0;var i=0;var a=0;var u=0;var s="";var l;var c;var p;var f;var g=this._mappings.toArray();for(var h=0,d=g.length;h<d;h++){c=g[h];l="";if(c.generatedLine!==r){e=0;while(c.generatedLine!==r){l+=";";r++}}else{if(h>0){if(!o.compareByGeneratedPositionsInflated(c,g[h-1])){continue}l+=","}}l+=t.encode(c.generatedColumn-e);e=c.generatedColumn;if(c.source!=null){f=this._sources.indexOf(c.source);l+=t.encode(f-u);u=f;l+=t.encode(c.originalLine-1-i);i=c.originalLine-1;l+=t.encode(c.originalColumn-n);n=c.originalColumn;if(c.name!=null){p=this._names.indexOf(c.name);l+=t.encode(p-a);a=p}}s+=l}return s};SourceMapGenerator.prototype._generateSourcesContent=function SourceMapGenerator_generateSourcesContent(e,r){return e.map((function(e){if(!this._sourcesContents){return null}if(r!=null){e=o.relative(r,e)}var n=o.toSetString(e);return Object.prototype.hasOwnProperty.call(this._sourcesContents,n)?this._sourcesContents[n]:null}),this)};SourceMapGenerator.prototype.toJSON=function SourceMapGenerator_toJSON(){var e={version:this._version,sources:this._sources.toArray(),names:this._names.toArray(),mappings:this._serializeMappings()};if(this._file!=null){e.file=this._file}if(this._sourceRoot!=null){e.sourceRoot=this._sourceRoot}if(this._sourcesContents){e.sourcesContent=this._generateSourcesContent(e.sources,e.sourceRoot)}return e};SourceMapGenerator.prototype.toString=function SourceMapGenerator_toString(){return JSON.stringify(this.toJSON())};r.h=SourceMapGenerator},990:(e,r,n)=>{var t;var o=n(341).h;var i=n(983);var a=/(\r?\n)/;var u=10;var s="$$$isSourceNode$$$";function SourceNode(e,r,n,t,o){this.children=[];this.sourceContents={};this.line=e==null?null:e;this.column=r==null?null:r;this.source=n==null?null:n;this.name=o==null?null:o;this[s]=true;if(t!=null)this.add(t)}SourceNode.fromStringWithSourceMap=function SourceNode_fromStringWithSourceMap(e,r,n){var t=new SourceNode;var o=e.split(a);var u=0;var shiftNextLine=function(){var e=getNextLine();var r=getNextLine()||"";return e+r;function getNextLine(){return u<o.length?o[u++]:undefined}};var s=1,l=0;var c=null;r.eachMapping((function(e){if(c!==null){if(s<e.generatedLine){addMappingWithCode(c,shiftNextLine());s++;l=0}else{var r=o[u]||"";var n=r.substr(0,e.generatedColumn-l);o[u]=r.substr(e.generatedColumn-l);l=e.generatedColumn;addMappingWithCode(c,n);c=e;return}}while(s<e.generatedLine){t.add(shiftNextLine());s++}if(l<e.generatedColumn){var r=o[u]||"";t.add(r.substr(0,e.generatedColumn));o[u]=r.substr(e.generatedColumn);l=e.generatedColumn}c=e}),this);if(u<o.length){if(c){addMappingWithCode(c,shiftNextLine())}t.add(o.splice(u).join(""))}r.sources.forEach((function(e){var o=r.sourceContentFor(e);if(o!=null){if(n!=null){e=i.join(n,e)}t.setSourceContent(e,o)}}));return t;function addMappingWithCode(e,r){if(e===null||e.source===undefined){t.add(r)}else{var o=n?i.join(n,e.source):e.source;t.add(new SourceNode(e.originalLine,e.originalColumn,o,r,e.name))}}};SourceNode.prototype.add=function SourceNode_add(e){if(Array.isArray(e)){e.forEach((function(e){this.add(e)}),this)}else if(e[s]||typeof e==="string"){if(e){this.children.push(e)}}else{throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+e)}return this};SourceNode.prototype.prepend=function SourceNode_prepend(e){if(Array.isArray(e)){for(var r=e.length-1;r>=0;r--){this.prepend(e[r])}}else if(e[s]||typeof e==="string"){this.children.unshift(e)}else{throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+e)}return this};SourceNode.prototype.walk=function SourceNode_walk(e){var r;for(var n=0,t=this.children.length;n<t;n++){r=this.children[n];if(r[s]){r.walk(e)}else{if(r!==""){e(r,{source:this.source,line:this.line,column:this.column,name:this.name})}}}};SourceNode.prototype.join=function SourceNode_join(e){var r;var n;var t=this.children.length;if(t>0){r=[];for(n=0;n<t-1;n++){r.push(this.children[n]);r.push(e)}r.push(this.children[n]);this.children=r}return this};SourceNode.prototype.replaceRight=function SourceNode_replaceRight(e,r){var n=this.children[this.children.length-1];if(n[s]){n.replaceRight(e,r)}else if(typeof n==="string"){this.children[this.children.length-1]=n.replace(e,r)}else{this.children.push("".replace(e,r))}return this};SourceNode.prototype.setSourceContent=function SourceNode_setSourceContent(e,r){this.sourceContents[i.toSetString(e)]=r};SourceNode.prototype.walkSourceContents=function SourceNode_walkSourceContents(e){for(var r=0,n=this.children.length;r<n;r++){if(this.children[r][s]){this.children[r].walkSourceContents(e)}}var t=Object.keys(this.sourceContents);for(var r=0,n=t.length;r<n;r++){e(i.fromSetString(t[r]),this.sourceContents[t[r]])}};SourceNode.prototype.toString=function SourceNode_toString(){var e="";this.walk((function(r){e+=r}));return e};SourceNode.prototype.toStringWithSourceMap=function SourceNode_toStringWithSourceMap(e){var r={code:"",line:1,column:0};var n=new o(e);var t=false;var i=null;var a=null;var s=null;var l=null;this.walk((function(e,o){r.code+=e;if(o.source!==null&&o.line!==null&&o.column!==null){if(i!==o.source||a!==o.line||s!==o.column||l!==o.name){n.addMapping({source:o.source,original:{line:o.line,column:o.column},generated:{line:r.line,column:r.column},name:o.name})}i=o.source;a=o.line;s=o.column;l=o.name;t=true}else if(t){n.addMapping({generated:{line:r.line,column:r.column}});i=null;t=false}for(var c=0,p=e.length;c<p;c++){if(e.charCodeAt(c)===u){r.line++;r.column=0;if(c+1===p){i=null;t=false}else if(t){n.addMapping({source:o.source,original:{line:o.line,column:o.column},generated:{line:r.line,column:r.column},name:o.name})}}else{r.column++}}}));this.walkSourceContents((function(e,r){n.setSourceContent(e,r)}));return{code:r.code,map:n}};t=SourceNode},983:(e,r)=>{function getArg(e,r,n){if(r in e){return e[r]}else if(arguments.length===3){return n}else{throw new Error('"'+r+'" is a required argument.')}}r.getArg=getArg;var n=/^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;var t=/^data:.+\,.+$/;function urlParse(e){var r=e.match(n);if(!r){return null}return{scheme:r[1],auth:r[2],host:r[3],port:r[4],path:r[5]}}r.urlParse=urlParse;function urlGenerate(e){var r="";if(e.scheme){r+=e.scheme+":"}r+="//";if(e.auth){r+=e.auth+"@"}if(e.host){r+=e.host}if(e.port){r+=":"+e.port}if(e.path){r+=e.path}return r}r.urlGenerate=urlGenerate;function normalize(e){var n=e;var t=urlParse(e);if(t){if(!t.path){return e}n=t.path}var o=r.isAbsolute(n);var i=n.split(/\/+/);for(var a,u=0,s=i.length-1;s>=0;s--){a=i[s];if(a==="."){i.splice(s,1)}else if(a===".."){u++}else if(u>0){if(a===""){i.splice(s+1,u);u=0}else{i.splice(s,2);u--}}}n=i.join("/");if(n===""){n=o?"/":"."}if(t){t.path=n;return urlGenerate(t)}return n}r.normalize=normalize;function join(e,r){if(e===""){e="."}if(r===""){r="."}var n=urlParse(r);var o=urlParse(e);if(o){e=o.path||"/"}if(n&&!n.scheme){if(o){n.scheme=o.scheme}return urlGenerate(n)}if(n||r.match(t)){return r}if(o&&!o.host&&!o.path){o.host=r;return urlGenerate(o)}var i=r.charAt(0)==="/"?r:normalize(e.replace(/\/+$/,"")+"/"+r);if(o){o.path=i;return urlGenerate(o)}return i}r.join=join;r.isAbsolute=function(e){return e.charAt(0)==="/"||n.test(e)};function relative(e,r){if(e===""){e="."}e=e.replace(/\/$/,"");var n=0;while(r.indexOf(e+"/")!==0){var t=e.lastIndexOf("/");if(t<0){return r}e=e.slice(0,t);if(e.match(/^([^\/]+:\/)?\/*$/)){return r}++n}return Array(n+1).join("../")+r.substr(e.length+1)}r.relative=relative;var o=function(){var e=Object.create(null);return!("__proto__"in e)}();function identity(e){return e}function toSetString(e){if(isProtoString(e)){return"$"+e}return e}r.toSetString=o?identity:toSetString;function fromSetString(e){if(isProtoString(e)){return e.slice(1)}return e}r.fromSetString=o?identity:fromSetString;function isProtoString(e){if(!e){return false}var r=e.length;if(r<9){return false}if(e.charCodeAt(r-1)!==95||e.charCodeAt(r-2)!==95||e.charCodeAt(r-3)!==111||e.charCodeAt(r-4)!==116||e.charCodeAt(r-5)!==111||e.charCodeAt(r-6)!==114||e.charCodeAt(r-7)!==112||e.charCodeAt(r-8)!==95||e.charCodeAt(r-9)!==95){return false}for(var n=r-10;n>=0;n--){if(e.charCodeAt(n)!==36){return false}}return true}function compareByOriginalPositions(e,r,n){var t=strcmp(e.source,r.source);if(t!==0){return t}t=e.originalLine-r.originalLine;if(t!==0){return t}t=e.originalColumn-r.originalColumn;if(t!==0||n){return t}t=e.generatedColumn-r.generatedColumn;if(t!==0){return t}t=e.generatedLine-r.generatedLine;if(t!==0){return t}return strcmp(e.name,r.name)}r.compareByOriginalPositions=compareByOriginalPositions;function compareByGeneratedPositionsDeflated(e,r,n){var t=e.generatedLine-r.generatedLine;if(t!==0){return t}t=e.generatedColumn-r.generatedColumn;if(t!==0||n){return t}t=strcmp(e.source,r.source);if(t!==0){return t}t=e.originalLine-r.originalLine;if(t!==0){return t}t=e.originalColumn-r.originalColumn;if(t!==0){return t}return strcmp(e.name,r.name)}r.compareByGeneratedPositionsDeflated=compareByGeneratedPositionsDeflated;function strcmp(e,r){if(e===r){return 0}if(e===null){return 1}if(r===null){return-1}if(e>r){return 1}return-1}function compareByGeneratedPositionsInflated(e,r){var n=e.generatedLine-r.generatedLine;if(n!==0){return n}n=e.generatedColumn-r.generatedColumn;if(n!==0){return n}n=strcmp(e.source,r.source);if(n!==0){return n}n=e.originalLine-r.originalLine;if(n!==0){return n}n=e.originalColumn-r.originalColumn;if(n!==0){return n}return strcmp(e.name,r.name)}r.compareByGeneratedPositionsInflated=compareByGeneratedPositionsInflated;function parseSourceMapInput(e){return JSON.parse(e.replace(/^\)]}'[^\n]*\n/,""))}r.parseSourceMapInput=parseSourceMapInput;function computeSourceURL(e,r,n){r=r||"";if(e){if(e[e.length-1]!=="/"&&r[0]!=="/"){e+="/"}r=e+r}if(n){var t=urlParse(n);if(!t){throw new Error("sourceMapURL could not be parsed")}if(t.path){var o=t.path.lastIndexOf("/");if(o>=0){t.path=t.path.substring(0,o+1)}}r=join(urlGenerate(t),r)}return normalize(r)}r.computeSourceURL=computeSourceURL},596:(e,r,n)=>{n(341).h;r.SourceMapConsumer=n(327).SourceMapConsumer;n(990)},747:e=>{"use strict";e.exports=__nccwpck_require__(747)},622:e=>{"use strict";e.exports=__nccwpck_require__(622)}};var r={};function __nested_webpack_require_40201__(n){var t=r[n];if(t!==undefined){return t.exports}var o=r[n]={id:n,loaded:false,exports:{}};var i=true;try{e[n](o,o.exports,__nested_webpack_require_40201__);i=false}finally{if(i)delete r[n]}o.loaded=true;return o.exports}(()=>{__nested_webpack_require_40201__.nmd=e=>{e.paths=[];if(!e.children)e.children=[];return e}})();if(true)__nested_webpack_require_40201__.ab=__dirname+"/";var n={};(()=>{__nested_webpack_require_40201__(284).install()})();module.exports=n})();

/***/ }),

/***/ 357:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(357);;

/***/ }),

/***/ 129:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(129);;

/***/ }),

/***/ 619:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(619);;

/***/ }),

/***/ 417:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(417);;

/***/ }),

/***/ 614:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(614);;

/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(747);;

/***/ }),

/***/ 87:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(87);;

/***/ }),

/***/ 622:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(622);;

/***/ }),

/***/ 413:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(413);;

/***/ }),

/***/ 669:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(669);;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(131);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 907:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

(()=>{var e={650:e=>{var r=Object.prototype.toString;var n=typeof Buffer.alloc==="function"&&typeof Buffer.allocUnsafe==="function"&&typeof Buffer.from==="function";function isArrayBuffer(e){return r.call(e).slice(8,-1)==="ArrayBuffer"}function fromArrayBuffer(e,r,t){r>>>=0;var o=e.byteLength-r;if(o<0){throw new RangeError("'offset' is out of bounds")}if(t===undefined){t=o}else{t>>>=0;if(t>o){throw new RangeError("'length' is out of bounds")}}return n?Buffer.from(e.slice(r,r+t)):new Buffer(new Uint8Array(e.slice(r,r+t)))}function fromString(e,r){if(typeof r!=="string"||r===""){r="utf8"}if(!Buffer.isEncoding(r)){throw new TypeError('"encoding" must be a valid string encoding')}return n?Buffer.from(e,r):new Buffer(e,r)}function bufferFrom(e,r,t){if(typeof e==="number"){throw new TypeError('"value" argument must not be a number')}if(isArrayBuffer(e)){return fromArrayBuffer(e,r,t)}if(typeof e==="string"){return fromString(e,r)}return n?Buffer.from(e):new Buffer(e)}e.exports=bufferFrom},284:(e,r,n)=>{e=n.nmd(e);var t=n(596).SourceMapConsumer;var o=n(622);var i;try{i=n(747);if(!i.existsSync||!i.readFileSync){i=null}}catch(e){}var a=n(650);function dynamicRequire(e,r){return e.require(r)}var u=false;var s=false;var l=false;var c="auto";var p={};var f={};var g=/^data:application\/json[^,]+base64,/;var h=[];var d=[];function isInBrowser(){if(c==="browser")return true;if(c==="node")return false;return typeof window!=="undefined"&&typeof XMLHttpRequest==="function"&&!(window.require&&window.module&&window.process&&window.process.type==="renderer")}function hasGlobalProcessEventEmitter(){return typeof process==="object"&&process!==null&&typeof process.on==="function"}function handlerExec(e){return function(r){for(var n=0;n<e.length;n++){var t=e[n](r);if(t){return t}}return null}}var m=handlerExec(h);h.push((function(e){e=e.trim();if(/^file:/.test(e)){e=e.replace(/file:\/\/\/(\w:)?/,(function(e,r){return r?"":"/"}))}if(e in p){return p[e]}var r="";try{if(!i){var n=new XMLHttpRequest;n.open("GET",e,false);n.send(null);if(n.readyState===4&&n.status===200){r=n.responseText}}else if(i.existsSync(e)){r=i.readFileSync(e,"utf8")}}catch(e){}return p[e]=r}));function supportRelativeURL(e,r){if(!e)return r;var n=o.dirname(e);var t=/^\w+:\/\/[^\/]*/.exec(n);var i=t?t[0]:"";var a=n.slice(i.length);if(i&&/^\/\w\:/.test(a)){i+="/";return i+o.resolve(n.slice(i.length),r).replace(/\\/g,"/")}return i+o.resolve(n.slice(i.length),r)}function retrieveSourceMapURL(e){var r;if(isInBrowser()){try{var n=new XMLHttpRequest;n.open("GET",e,false);n.send(null);r=n.readyState===4?n.responseText:null;var t=n.getResponseHeader("SourceMap")||n.getResponseHeader("X-SourceMap");if(t){return t}}catch(e){}}r=m(e);var o=/(?:\/\/[@#][\s]*sourceMappingURL=([^\s'"]+)[\s]*$)|(?:\/\*[@#][\s]*sourceMappingURL=([^\s*'"]+)[\s]*(?:\*\/)[\s]*$)/gm;var i,a;while(a=o.exec(r))i=a;if(!i)return null;return i[1]}var v=handlerExec(d);d.push((function(e){var r=retrieveSourceMapURL(e);if(!r)return null;var n;if(g.test(r)){var t=r.slice(r.indexOf(",")+1);n=a(t,"base64").toString();r=e}else{r=supportRelativeURL(e,r);n=m(r)}if(!n){return null}return{url:r,map:n}}));function mapSourcePosition(e){var r=f[e.source];if(!r){var n=v(e.source);if(n){r=f[e.source]={url:n.url,map:new t(n.map)};if(r.map.sourcesContent){r.map.sources.forEach((function(e,n){var t=r.map.sourcesContent[n];if(t){var o=supportRelativeURL(r.url,e);p[o]=t}}))}}else{r=f[e.source]={url:null,map:null}}}if(r&&r.map&&typeof r.map.originalPositionFor==="function"){var o=r.map.originalPositionFor(e);if(o.source!==null){o.source=supportRelativeURL(r.url,o.source);return o}}return e}function mapEvalOrigin(e){var r=/^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(e);if(r){var n=mapSourcePosition({source:r[2],line:+r[3],column:r[4]-1});return"eval at "+r[1]+" ("+n.source+":"+n.line+":"+(n.column+1)+")"}r=/^eval at ([^(]+) \((.+)\)$/.exec(e);if(r){return"eval at "+r[1]+" ("+mapEvalOrigin(r[2])+")"}return e}function CallSiteToString(){var e;var r="";if(this.isNative()){r="native"}else{e=this.getScriptNameOrSourceURL();if(!e&&this.isEval()){r=this.getEvalOrigin();r+=", "}if(e){r+=e}else{r+="<anonymous>"}var n=this.getLineNumber();if(n!=null){r+=":"+n;var t=this.getColumnNumber();if(t){r+=":"+t}}}var o="";var i=this.getFunctionName();var a=true;var u=this.isConstructor();var s=!(this.isToplevel()||u);if(s){var l=this.getTypeName();if(l==="[object Object]"){l="null"}var c=this.getMethodName();if(i){if(l&&i.indexOf(l)!=0){o+=l+"."}o+=i;if(c&&i.indexOf("."+c)!=i.length-c.length-1){o+=" [as "+c+"]"}}else{o+=l+"."+(c||"<anonymous>")}}else if(u){o+="new "+(i||"<anonymous>")}else if(i){o+=i}else{o+=r;a=false}if(a){o+=" ("+r+")"}return o}function cloneCallSite(e){var r={};Object.getOwnPropertyNames(Object.getPrototypeOf(e)).forEach((function(n){r[n]=/^(?:is|get)/.test(n)?function(){return e[n].call(e)}:e[n]}));r.toString=CallSiteToString;return r}function wrapCallSite(e,r){if(r===undefined){r={nextPosition:null,curPosition:null}}if(e.isNative()){r.curPosition=null;return e}var n=e.getFileName()||e.getScriptNameOrSourceURL();if(n){var t=e.getLineNumber();var o=e.getColumnNumber()-1;var i=/^v(10\.1[6-9]|10\.[2-9][0-9]|10\.[0-9]{3,}|1[2-9]\d*|[2-9]\d|\d{3,}|11\.11)/;var a=i.test(process.version)?0:62;if(t===1&&o>a&&!isInBrowser()&&!e.isEval()){o-=a}var u=mapSourcePosition({source:n,line:t,column:o});r.curPosition=u;e=cloneCallSite(e);var s=e.getFunctionName;e.getFunctionName=function(){if(r.nextPosition==null){return s()}return r.nextPosition.name||s()};e.getFileName=function(){return u.source};e.getLineNumber=function(){return u.line};e.getColumnNumber=function(){return u.column+1};e.getScriptNameOrSourceURL=function(){return u.source};return e}var l=e.isEval()&&e.getEvalOrigin();if(l){l=mapEvalOrigin(l);e=cloneCallSite(e);e.getEvalOrigin=function(){return l};return e}return e}function prepareStackTrace(e,r){if(l){p={};f={}}var n=e.name||"Error";var t=e.message||"";var o=n+": "+t;var i={nextPosition:null,curPosition:null};var a=[];for(var u=r.length-1;u>=0;u--){a.push("\n    at "+wrapCallSite(r[u],i));i.nextPosition=i.curPosition}i.curPosition=i.nextPosition=null;return o+a.reverse().join("")}function getErrorSource(e){var r=/\n    at [^(]+ \((.*):(\d+):(\d+)\)/.exec(e.stack);if(r){var n=r[1];var t=+r[2];var o=+r[3];var a=p[n];if(!a&&i&&i.existsSync(n)){try{a=i.readFileSync(n,"utf8")}catch(e){a=""}}if(a){var u=a.split(/(?:\r\n|\r|\n)/)[t-1];if(u){return n+":"+t+"\n"+u+"\n"+new Array(o).join(" ")+"^"}}}return null}function printErrorAndExit(e){var r=getErrorSource(e);if(process.stderr._handle&&process.stderr._handle.setBlocking){process.stderr._handle.setBlocking(true)}if(r){console.error();console.error(r)}console.error(e.stack);process.exit(1)}function shimEmitUncaughtException(){var e=process.emit;process.emit=function(r){if(r==="uncaughtException"){var n=arguments[1]&&arguments[1].stack;var t=this.listeners(r).length>0;if(n&&!t){return printErrorAndExit(arguments[1])}}return e.apply(this,arguments)}}var S=h.slice(0);var _=d.slice(0);r.wrapCallSite=wrapCallSite;r.getErrorSource=getErrorSource;r.mapSourcePosition=mapSourcePosition;r.retrieveSourceMap=v;r.install=function(r){r=r||{};if(r.environment){c=r.environment;if(["node","browser","auto"].indexOf(c)===-1){throw new Error("environment "+c+" was unknown. Available options are {auto, browser, node}")}}if(r.retrieveFile){if(r.overrideRetrieveFile){h.length=0}h.unshift(r.retrieveFile)}if(r.retrieveSourceMap){if(r.overrideRetrieveSourceMap){d.length=0}d.unshift(r.retrieveSourceMap)}if(r.hookRequire&&!isInBrowser()){var n=dynamicRequire(e,"module");var t=n.prototype._compile;if(!t.__sourceMapSupport){n.prototype._compile=function(e,r){p[r]=e;f[r]=undefined;return t.call(this,e,r)};n.prototype._compile.__sourceMapSupport=true}}if(!l){l="emptyCacheBetweenOperations"in r?r.emptyCacheBetweenOperations:false}if(!u){u=true;Error.prepareStackTrace=prepareStackTrace}if(!s){var o="handleUncaughtExceptions"in r?r.handleUncaughtExceptions:true;try{var i=dynamicRequire(e,"worker_threads");if(i.isMainThread===false){o=false}}catch(e){}if(o&&hasGlobalProcessEventEmitter()){s=true;shimEmitUncaughtException()}}};r.resetRetrieveHandlers=function(){h.length=0;d.length=0;h=S.slice(0);d=_.slice(0);v=handlerExec(d);m=handlerExec(h)}},837:(e,r,n)=>{var t=n(983);var o=Object.prototype.hasOwnProperty;var i=typeof Map!=="undefined";function ArraySet(){this._array=[];this._set=i?new Map:Object.create(null)}ArraySet.fromArray=function ArraySet_fromArray(e,r){var n=new ArraySet;for(var t=0,o=e.length;t<o;t++){n.add(e[t],r)}return n};ArraySet.prototype.size=function ArraySet_size(){return i?this._set.size:Object.getOwnPropertyNames(this._set).length};ArraySet.prototype.add=function ArraySet_add(e,r){var n=i?e:t.toSetString(e);var a=i?this.has(e):o.call(this._set,n);var u=this._array.length;if(!a||r){this._array.push(e)}if(!a){if(i){this._set.set(e,u)}else{this._set[n]=u}}};ArraySet.prototype.has=function ArraySet_has(e){if(i){return this._set.has(e)}else{var r=t.toSetString(e);return o.call(this._set,r)}};ArraySet.prototype.indexOf=function ArraySet_indexOf(e){if(i){var r=this._set.get(e);if(r>=0){return r}}else{var n=t.toSetString(e);if(o.call(this._set,n)){return this._set[n]}}throw new Error('"'+e+'" is not in the set.')};ArraySet.prototype.at=function ArraySet_at(e){if(e>=0&&e<this._array.length){return this._array[e]}throw new Error("No element indexed by "+e)};ArraySet.prototype.toArray=function ArraySet_toArray(){return this._array.slice()};r.I=ArraySet},215:(e,r,n)=>{var t=n(537);var o=5;var i=1<<o;var a=i-1;var u=i;function toVLQSigned(e){return e<0?(-e<<1)+1:(e<<1)+0}function fromVLQSigned(e){var r=(e&1)===1;var n=e>>1;return r?-n:n}r.encode=function base64VLQ_encode(e){var r="";var n;var i=toVLQSigned(e);do{n=i&a;i>>>=o;if(i>0){n|=u}r+=t.encode(n)}while(i>0);return r};r.decode=function base64VLQ_decode(e,r,n){var i=e.length;var s=0;var l=0;var c,p;do{if(r>=i){throw new Error("Expected more digits in base 64 VLQ value.")}p=t.decode(e.charCodeAt(r++));if(p===-1){throw new Error("Invalid base64 digit: "+e.charAt(r-1))}c=!!(p&u);p&=a;s=s+(p<<l);l+=o}while(c);n.value=fromVLQSigned(s);n.rest=r}},537:(e,r)=>{var n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");r.encode=function(e){if(0<=e&&e<n.length){return n[e]}throw new TypeError("Must be between 0 and 63: "+e)};r.decode=function(e){var r=65;var n=90;var t=97;var o=122;var i=48;var a=57;var u=43;var s=47;var l=26;var c=52;if(r<=e&&e<=n){return e-r}if(t<=e&&e<=o){return e-t+l}if(i<=e&&e<=a){return e-i+c}if(e==u){return 62}if(e==s){return 63}return-1}},164:(e,r)=>{r.GREATEST_LOWER_BOUND=1;r.LEAST_UPPER_BOUND=2;function recursiveSearch(e,n,t,o,i,a){var u=Math.floor((n-e)/2)+e;var s=i(t,o[u],true);if(s===0){return u}else if(s>0){if(n-u>1){return recursiveSearch(u,n,t,o,i,a)}if(a==r.LEAST_UPPER_BOUND){return n<o.length?n:-1}else{return u}}else{if(u-e>1){return recursiveSearch(e,u,t,o,i,a)}if(a==r.LEAST_UPPER_BOUND){return u}else{return e<0?-1:e}}}r.search=function search(e,n,t,o){if(n.length===0){return-1}var i=recursiveSearch(-1,n.length,e,n,t,o||r.GREATEST_LOWER_BOUND);if(i<0){return-1}while(i-1>=0){if(t(n[i],n[i-1],true)!==0){break}--i}return i}},740:(e,r,n)=>{var t=n(983);function generatedPositionAfter(e,r){var n=e.generatedLine;var o=r.generatedLine;var i=e.generatedColumn;var a=r.generatedColumn;return o>n||o==n&&a>=i||t.compareByGeneratedPositionsInflated(e,r)<=0}function MappingList(){this._array=[];this._sorted=true;this._last={generatedLine:-1,generatedColumn:0}}MappingList.prototype.unsortedForEach=function MappingList_forEach(e,r){this._array.forEach(e,r)};MappingList.prototype.add=function MappingList_add(e){if(generatedPositionAfter(this._last,e)){this._last=e;this._array.push(e)}else{this._sorted=false;this._array.push(e)}};MappingList.prototype.toArray=function MappingList_toArray(){if(!this._sorted){this._array.sort(t.compareByGeneratedPositionsInflated);this._sorted=true}return this._array};r.H=MappingList},226:(e,r)=>{function swap(e,r,n){var t=e[r];e[r]=e[n];e[n]=t}function randomIntInRange(e,r){return Math.round(e+Math.random()*(r-e))}function doQuickSort(e,r,n,t){if(n<t){var o=randomIntInRange(n,t);var i=n-1;swap(e,o,t);var a=e[t];for(var u=n;u<t;u++){if(r(e[u],a)<=0){i+=1;swap(e,i,u)}}swap(e,i+1,u);var s=i+1;doQuickSort(e,r,n,s-1);doQuickSort(e,r,s+1,t)}}r.U=function(e,r){doQuickSort(e,r,0,e.length-1)}},327:(e,r,n)=>{var t;var o=n(983);var i=n(164);var a=n(837).I;var u=n(215);var s=n(226).U;function SourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}return n.sections!=null?new IndexedSourceMapConsumer(n,r):new BasicSourceMapConsumer(n,r)}SourceMapConsumer.fromSourceMap=function(e,r){return BasicSourceMapConsumer.fromSourceMap(e,r)};SourceMapConsumer.prototype._version=3;SourceMapConsumer.prototype.__generatedMappings=null;Object.defineProperty(SourceMapConsumer.prototype,"_generatedMappings",{configurable:true,enumerable:true,get:function(){if(!this.__generatedMappings){this._parseMappings(this._mappings,this.sourceRoot)}return this.__generatedMappings}});SourceMapConsumer.prototype.__originalMappings=null;Object.defineProperty(SourceMapConsumer.prototype,"_originalMappings",{configurable:true,enumerable:true,get:function(){if(!this.__originalMappings){this._parseMappings(this._mappings,this.sourceRoot)}return this.__originalMappings}});SourceMapConsumer.prototype._charIsMappingSeparator=function SourceMapConsumer_charIsMappingSeparator(e,r){var n=e.charAt(r);return n===";"||n===","};SourceMapConsumer.prototype._parseMappings=function SourceMapConsumer_parseMappings(e,r){throw new Error("Subclasses must implement _parseMappings")};SourceMapConsumer.GENERATED_ORDER=1;SourceMapConsumer.ORIGINAL_ORDER=2;SourceMapConsumer.GREATEST_LOWER_BOUND=1;SourceMapConsumer.LEAST_UPPER_BOUND=2;SourceMapConsumer.prototype.eachMapping=function SourceMapConsumer_eachMapping(e,r,n){var t=r||null;var i=n||SourceMapConsumer.GENERATED_ORDER;var a;switch(i){case SourceMapConsumer.GENERATED_ORDER:a=this._generatedMappings;break;case SourceMapConsumer.ORIGINAL_ORDER:a=this._originalMappings;break;default:throw new Error("Unknown order of iteration.")}var u=this.sourceRoot;a.map((function(e){var r=e.source===null?null:this._sources.at(e.source);r=o.computeSourceURL(u,r,this._sourceMapURL);return{source:r,generatedLine:e.generatedLine,generatedColumn:e.generatedColumn,originalLine:e.originalLine,originalColumn:e.originalColumn,name:e.name===null?null:this._names.at(e.name)}}),this).forEach(e,t)};SourceMapConsumer.prototype.allGeneratedPositionsFor=function SourceMapConsumer_allGeneratedPositionsFor(e){var r=o.getArg(e,"line");var n={source:o.getArg(e,"source"),originalLine:r,originalColumn:o.getArg(e,"column",0)};n.source=this._findSourceIndex(n.source);if(n.source<0){return[]}var t=[];var a=this._findMapping(n,this._originalMappings,"originalLine","originalColumn",o.compareByOriginalPositions,i.LEAST_UPPER_BOUND);if(a>=0){var u=this._originalMappings[a];if(e.column===undefined){var s=u.originalLine;while(u&&u.originalLine===s){t.push({line:o.getArg(u,"generatedLine",null),column:o.getArg(u,"generatedColumn",null),lastColumn:o.getArg(u,"lastGeneratedColumn",null)});u=this._originalMappings[++a]}}else{var l=u.originalColumn;while(u&&u.originalLine===r&&u.originalColumn==l){t.push({line:o.getArg(u,"generatedLine",null),column:o.getArg(u,"generatedColumn",null),lastColumn:o.getArg(u,"lastGeneratedColumn",null)});u=this._originalMappings[++a]}}}return t};r.SourceMapConsumer=SourceMapConsumer;function BasicSourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}var t=o.getArg(n,"version");var i=o.getArg(n,"sources");var u=o.getArg(n,"names",[]);var s=o.getArg(n,"sourceRoot",null);var l=o.getArg(n,"sourcesContent",null);var c=o.getArg(n,"mappings");var p=o.getArg(n,"file",null);if(t!=this._version){throw new Error("Unsupported version: "+t)}if(s){s=o.normalize(s)}i=i.map(String).map(o.normalize).map((function(e){return s&&o.isAbsolute(s)&&o.isAbsolute(e)?o.relative(s,e):e}));this._names=a.fromArray(u.map(String),true);this._sources=a.fromArray(i,true);this._absoluteSources=this._sources.toArray().map((function(e){return o.computeSourceURL(s,e,r)}));this.sourceRoot=s;this.sourcesContent=l;this._mappings=c;this._sourceMapURL=r;this.file=p}BasicSourceMapConsumer.prototype=Object.create(SourceMapConsumer.prototype);BasicSourceMapConsumer.prototype.consumer=SourceMapConsumer;BasicSourceMapConsumer.prototype._findSourceIndex=function(e){var r=e;if(this.sourceRoot!=null){r=o.relative(this.sourceRoot,r)}if(this._sources.has(r)){return this._sources.indexOf(r)}var n;for(n=0;n<this._absoluteSources.length;++n){if(this._absoluteSources[n]==e){return n}}return-1};BasicSourceMapConsumer.fromSourceMap=function SourceMapConsumer_fromSourceMap(e,r){var n=Object.create(BasicSourceMapConsumer.prototype);var t=n._names=a.fromArray(e._names.toArray(),true);var i=n._sources=a.fromArray(e._sources.toArray(),true);n.sourceRoot=e._sourceRoot;n.sourcesContent=e._generateSourcesContent(n._sources.toArray(),n.sourceRoot);n.file=e._file;n._sourceMapURL=r;n._absoluteSources=n._sources.toArray().map((function(e){return o.computeSourceURL(n.sourceRoot,e,r)}));var u=e._mappings.toArray().slice();var l=n.__generatedMappings=[];var c=n.__originalMappings=[];for(var p=0,f=u.length;p<f;p++){var g=u[p];var h=new Mapping;h.generatedLine=g.generatedLine;h.generatedColumn=g.generatedColumn;if(g.source){h.source=i.indexOf(g.source);h.originalLine=g.originalLine;h.originalColumn=g.originalColumn;if(g.name){h.name=t.indexOf(g.name)}c.push(h)}l.push(h)}s(n.__originalMappings,o.compareByOriginalPositions);return n};BasicSourceMapConsumer.prototype._version=3;Object.defineProperty(BasicSourceMapConsumer.prototype,"sources",{get:function(){return this._absoluteSources.slice()}});function Mapping(){this.generatedLine=0;this.generatedColumn=0;this.source=null;this.originalLine=null;this.originalColumn=null;this.name=null}BasicSourceMapConsumer.prototype._parseMappings=function SourceMapConsumer_parseMappings(e,r){var n=1;var t=0;var i=0;var a=0;var l=0;var c=0;var p=e.length;var f=0;var g={};var h={};var d=[];var m=[];var v,S,_,C,y;while(f<p){if(e.charAt(f)===";"){n++;f++;t=0}else if(e.charAt(f)===","){f++}else{v=new Mapping;v.generatedLine=n;for(C=f;C<p;C++){if(this._charIsMappingSeparator(e,C)){break}}S=e.slice(f,C);_=g[S];if(_){f+=S.length}else{_=[];while(f<C){u.decode(e,f,h);y=h.value;f=h.rest;_.push(y)}if(_.length===2){throw new Error("Found a source, but no line and column")}if(_.length===3){throw new Error("Found a source and line, but no column")}g[S]=_}v.generatedColumn=t+_[0];t=v.generatedColumn;if(_.length>1){v.source=l+_[1];l+=_[1];v.originalLine=i+_[2];i=v.originalLine;v.originalLine+=1;v.originalColumn=a+_[3];a=v.originalColumn;if(_.length>4){v.name=c+_[4];c+=_[4]}}m.push(v);if(typeof v.originalLine==="number"){d.push(v)}}}s(m,o.compareByGeneratedPositionsDeflated);this.__generatedMappings=m;s(d,o.compareByOriginalPositions);this.__originalMappings=d};BasicSourceMapConsumer.prototype._findMapping=function SourceMapConsumer_findMapping(e,r,n,t,o,a){if(e[n]<=0){throw new TypeError("Line must be greater than or equal to 1, got "+e[n])}if(e[t]<0){throw new TypeError("Column must be greater than or equal to 0, got "+e[t])}return i.search(e,r,o,a)};BasicSourceMapConsumer.prototype.computeColumnSpans=function SourceMapConsumer_computeColumnSpans(){for(var e=0;e<this._generatedMappings.length;++e){var r=this._generatedMappings[e];if(e+1<this._generatedMappings.length){var n=this._generatedMappings[e+1];if(r.generatedLine===n.generatedLine){r.lastGeneratedColumn=n.generatedColumn-1;continue}}r.lastGeneratedColumn=Infinity}};BasicSourceMapConsumer.prototype.originalPositionFor=function SourceMapConsumer_originalPositionFor(e){var r={generatedLine:o.getArg(e,"line"),generatedColumn:o.getArg(e,"column")};var n=this._findMapping(r,this._generatedMappings,"generatedLine","generatedColumn",o.compareByGeneratedPositionsDeflated,o.getArg(e,"bias",SourceMapConsumer.GREATEST_LOWER_BOUND));if(n>=0){var t=this._generatedMappings[n];if(t.generatedLine===r.generatedLine){var i=o.getArg(t,"source",null);if(i!==null){i=this._sources.at(i);i=o.computeSourceURL(this.sourceRoot,i,this._sourceMapURL)}var a=o.getArg(t,"name",null);if(a!==null){a=this._names.at(a)}return{source:i,line:o.getArg(t,"originalLine",null),column:o.getArg(t,"originalColumn",null),name:a}}}return{source:null,line:null,column:null,name:null}};BasicSourceMapConsumer.prototype.hasContentsOfAllSources=function BasicSourceMapConsumer_hasContentsOfAllSources(){if(!this.sourcesContent){return false}return this.sourcesContent.length>=this._sources.size()&&!this.sourcesContent.some((function(e){return e==null}))};BasicSourceMapConsumer.prototype.sourceContentFor=function SourceMapConsumer_sourceContentFor(e,r){if(!this.sourcesContent){return null}var n=this._findSourceIndex(e);if(n>=0){return this.sourcesContent[n]}var t=e;if(this.sourceRoot!=null){t=o.relative(this.sourceRoot,t)}var i;if(this.sourceRoot!=null&&(i=o.urlParse(this.sourceRoot))){var a=t.replace(/^file:\/\//,"");if(i.scheme=="file"&&this._sources.has(a)){return this.sourcesContent[this._sources.indexOf(a)]}if((!i.path||i.path=="/")&&this._sources.has("/"+t)){return this.sourcesContent[this._sources.indexOf("/"+t)]}}if(r){return null}else{throw new Error('"'+t+'" is not in the SourceMap.')}};BasicSourceMapConsumer.prototype.generatedPositionFor=function SourceMapConsumer_generatedPositionFor(e){var r=o.getArg(e,"source");r=this._findSourceIndex(r);if(r<0){return{line:null,column:null,lastColumn:null}}var n={source:r,originalLine:o.getArg(e,"line"),originalColumn:o.getArg(e,"column")};var t=this._findMapping(n,this._originalMappings,"originalLine","originalColumn",o.compareByOriginalPositions,o.getArg(e,"bias",SourceMapConsumer.GREATEST_LOWER_BOUND));if(t>=0){var i=this._originalMappings[t];if(i.source===n.source){return{line:o.getArg(i,"generatedLine",null),column:o.getArg(i,"generatedColumn",null),lastColumn:o.getArg(i,"lastGeneratedColumn",null)}}}return{line:null,column:null,lastColumn:null}};t=BasicSourceMapConsumer;function IndexedSourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}var t=o.getArg(n,"version");var i=o.getArg(n,"sections");if(t!=this._version){throw new Error("Unsupported version: "+t)}this._sources=new a;this._names=new a;var u={line:-1,column:0};this._sections=i.map((function(e){if(e.url){throw new Error("Support for url field in sections not implemented.")}var n=o.getArg(e,"offset");var t=o.getArg(n,"line");var i=o.getArg(n,"column");if(t<u.line||t===u.line&&i<u.column){throw new Error("Section offsets must be ordered and non-overlapping.")}u=n;return{generatedOffset:{generatedLine:t+1,generatedColumn:i+1},consumer:new SourceMapConsumer(o.getArg(e,"map"),r)}}))}IndexedSourceMapConsumer.prototype=Object.create(SourceMapConsumer.prototype);IndexedSourceMapConsumer.prototype.constructor=SourceMapConsumer;IndexedSourceMapConsumer.prototype._version=3;Object.defineProperty(IndexedSourceMapConsumer.prototype,"sources",{get:function(){var e=[];for(var r=0;r<this._sections.length;r++){for(var n=0;n<this._sections[r].consumer.sources.length;n++){e.push(this._sections[r].consumer.sources[n])}}return e}});IndexedSourceMapConsumer.prototype.originalPositionFor=function IndexedSourceMapConsumer_originalPositionFor(e){var r={generatedLine:o.getArg(e,"line"),generatedColumn:o.getArg(e,"column")};var n=i.search(r,this._sections,(function(e,r){var n=e.generatedLine-r.generatedOffset.generatedLine;if(n){return n}return e.generatedColumn-r.generatedOffset.generatedColumn}));var t=this._sections[n];if(!t){return{source:null,line:null,column:null,name:null}}return t.consumer.originalPositionFor({line:r.generatedLine-(t.generatedOffset.generatedLine-1),column:r.generatedColumn-(t.generatedOffset.generatedLine===r.generatedLine?t.generatedOffset.generatedColumn-1:0),bias:e.bias})};IndexedSourceMapConsumer.prototype.hasContentsOfAllSources=function IndexedSourceMapConsumer_hasContentsOfAllSources(){return this._sections.every((function(e){return e.consumer.hasContentsOfAllSources()}))};IndexedSourceMapConsumer.prototype.sourceContentFor=function IndexedSourceMapConsumer_sourceContentFor(e,r){for(var n=0;n<this._sections.length;n++){var t=this._sections[n];var o=t.consumer.sourceContentFor(e,true);if(o){return o}}if(r){return null}else{throw new Error('"'+e+'" is not in the SourceMap.')}};IndexedSourceMapConsumer.prototype.generatedPositionFor=function IndexedSourceMapConsumer_generatedPositionFor(e){for(var r=0;r<this._sections.length;r++){var n=this._sections[r];if(n.consumer._findSourceIndex(o.getArg(e,"source"))===-1){continue}var t=n.consumer.generatedPositionFor(e);if(t){var i={line:t.line+(n.generatedOffset.generatedLine-1),column:t.column+(n.generatedOffset.generatedLine===t.line?n.generatedOffset.generatedColumn-1:0)};return i}}return{line:null,column:null}};IndexedSourceMapConsumer.prototype._parseMappings=function IndexedSourceMapConsumer_parseMappings(e,r){this.__generatedMappings=[];this.__originalMappings=[];for(var n=0;n<this._sections.length;n++){var t=this._sections[n];var i=t.consumer._generatedMappings;for(var a=0;a<i.length;a++){var u=i[a];var l=t.consumer._sources.at(u.source);l=o.computeSourceURL(t.consumer.sourceRoot,l,this._sourceMapURL);this._sources.add(l);l=this._sources.indexOf(l);var c=null;if(u.name){c=t.consumer._names.at(u.name);this._names.add(c);c=this._names.indexOf(c)}var p={source:l,generatedLine:u.generatedLine+(t.generatedOffset.generatedLine-1),generatedColumn:u.generatedColumn+(t.generatedOffset.generatedLine===u.generatedLine?t.generatedOffset.generatedColumn-1:0),originalLine:u.originalLine,originalColumn:u.originalColumn,name:c};this.__generatedMappings.push(p);if(typeof p.originalLine==="number"){this.__originalMappings.push(p)}}}s(this.__generatedMappings,o.compareByGeneratedPositionsDeflated);s(this.__originalMappings,o.compareByOriginalPositions)};t=IndexedSourceMapConsumer},341:(e,r,n)=>{var t=n(215);var o=n(983);var i=n(837).I;var a=n(740).H;function SourceMapGenerator(e){if(!e){e={}}this._file=o.getArg(e,"file",null);this._sourceRoot=o.getArg(e,"sourceRoot",null);this._skipValidation=o.getArg(e,"skipValidation",false);this._sources=new i;this._names=new i;this._mappings=new a;this._sourcesContents=null}SourceMapGenerator.prototype._version=3;SourceMapGenerator.fromSourceMap=function SourceMapGenerator_fromSourceMap(e){var r=e.sourceRoot;var n=new SourceMapGenerator({file:e.file,sourceRoot:r});e.eachMapping((function(e){var t={generated:{line:e.generatedLine,column:e.generatedColumn}};if(e.source!=null){t.source=e.source;if(r!=null){t.source=o.relative(r,t.source)}t.original={line:e.originalLine,column:e.originalColumn};if(e.name!=null){t.name=e.name}}n.addMapping(t)}));e.sources.forEach((function(t){var i=t;if(r!==null){i=o.relative(r,t)}if(!n._sources.has(i)){n._sources.add(i)}var a=e.sourceContentFor(t);if(a!=null){n.setSourceContent(t,a)}}));return n};SourceMapGenerator.prototype.addMapping=function SourceMapGenerator_addMapping(e){var r=o.getArg(e,"generated");var n=o.getArg(e,"original",null);var t=o.getArg(e,"source",null);var i=o.getArg(e,"name",null);if(!this._skipValidation){this._validateMapping(r,n,t,i)}if(t!=null){t=String(t);if(!this._sources.has(t)){this._sources.add(t)}}if(i!=null){i=String(i);if(!this._names.has(i)){this._names.add(i)}}this._mappings.add({generatedLine:r.line,generatedColumn:r.column,originalLine:n!=null&&n.line,originalColumn:n!=null&&n.column,source:t,name:i})};SourceMapGenerator.prototype.setSourceContent=function SourceMapGenerator_setSourceContent(e,r){var n=e;if(this._sourceRoot!=null){n=o.relative(this._sourceRoot,n)}if(r!=null){if(!this._sourcesContents){this._sourcesContents=Object.create(null)}this._sourcesContents[o.toSetString(n)]=r}else if(this._sourcesContents){delete this._sourcesContents[o.toSetString(n)];if(Object.keys(this._sourcesContents).length===0){this._sourcesContents=null}}};SourceMapGenerator.prototype.applySourceMap=function SourceMapGenerator_applySourceMap(e,r,n){var t=r;if(r==null){if(e.file==null){throw new Error("SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, "+'or the source map\'s "file" property. Both were omitted.')}t=e.file}var a=this._sourceRoot;if(a!=null){t=o.relative(a,t)}var u=new i;var s=new i;this._mappings.unsortedForEach((function(r){if(r.source===t&&r.originalLine!=null){var i=e.originalPositionFor({line:r.originalLine,column:r.originalColumn});if(i.source!=null){r.source=i.source;if(n!=null){r.source=o.join(n,r.source)}if(a!=null){r.source=o.relative(a,r.source)}r.originalLine=i.line;r.originalColumn=i.column;if(i.name!=null){r.name=i.name}}}var l=r.source;if(l!=null&&!u.has(l)){u.add(l)}var c=r.name;if(c!=null&&!s.has(c)){s.add(c)}}),this);this._sources=u;this._names=s;e.sources.forEach((function(r){var t=e.sourceContentFor(r);if(t!=null){if(n!=null){r=o.join(n,r)}if(a!=null){r=o.relative(a,r)}this.setSourceContent(r,t)}}),this)};SourceMapGenerator.prototype._validateMapping=function SourceMapGenerator_validateMapping(e,r,n,t){if(r&&typeof r.line!=="number"&&typeof r.column!=="number"){throw new Error("original.line and original.column are not numbers -- you probably meant to omit "+"the original mapping entirely and only map the generated position. If so, pass "+"null for the original mapping instead of an object with empty or null values.")}if(e&&"line"in e&&"column"in e&&e.line>0&&e.column>=0&&!r&&!n&&!t){return}else if(e&&"line"in e&&"column"in e&&r&&"line"in r&&"column"in r&&e.line>0&&e.column>=0&&r.line>0&&r.column>=0&&n){return}else{throw new Error("Invalid mapping: "+JSON.stringify({generated:e,source:n,original:r,name:t}))}};SourceMapGenerator.prototype._serializeMappings=function SourceMapGenerator_serializeMappings(){var e=0;var r=1;var n=0;var i=0;var a=0;var u=0;var s="";var l;var c;var p;var f;var g=this._mappings.toArray();for(var h=0,d=g.length;h<d;h++){c=g[h];l="";if(c.generatedLine!==r){e=0;while(c.generatedLine!==r){l+=";";r++}}else{if(h>0){if(!o.compareByGeneratedPositionsInflated(c,g[h-1])){continue}l+=","}}l+=t.encode(c.generatedColumn-e);e=c.generatedColumn;if(c.source!=null){f=this._sources.indexOf(c.source);l+=t.encode(f-u);u=f;l+=t.encode(c.originalLine-1-i);i=c.originalLine-1;l+=t.encode(c.originalColumn-n);n=c.originalColumn;if(c.name!=null){p=this._names.indexOf(c.name);l+=t.encode(p-a);a=p}}s+=l}return s};SourceMapGenerator.prototype._generateSourcesContent=function SourceMapGenerator_generateSourcesContent(e,r){return e.map((function(e){if(!this._sourcesContents){return null}if(r!=null){e=o.relative(r,e)}var n=o.toSetString(e);return Object.prototype.hasOwnProperty.call(this._sourcesContents,n)?this._sourcesContents[n]:null}),this)};SourceMapGenerator.prototype.toJSON=function SourceMapGenerator_toJSON(){var e={version:this._version,sources:this._sources.toArray(),names:this._names.toArray(),mappings:this._serializeMappings()};if(this._file!=null){e.file=this._file}if(this._sourceRoot!=null){e.sourceRoot=this._sourceRoot}if(this._sourcesContents){e.sourcesContent=this._generateSourcesContent(e.sources,e.sourceRoot)}return e};SourceMapGenerator.prototype.toString=function SourceMapGenerator_toString(){return JSON.stringify(this.toJSON())};r.h=SourceMapGenerator},990:(e,r,n)=>{var t;var o=n(341).h;var i=n(983);var a=/(\r?\n)/;var u=10;var s="$$$isSourceNode$$$";function SourceNode(e,r,n,t,o){this.children=[];this.sourceContents={};this.line=e==null?null:e;this.column=r==null?null:r;this.source=n==null?null:n;this.name=o==null?null:o;this[s]=true;if(t!=null)this.add(t)}SourceNode.fromStringWithSourceMap=function SourceNode_fromStringWithSourceMap(e,r,n){var t=new SourceNode;var o=e.split(a);var u=0;var shiftNextLine=function(){var e=getNextLine();var r=getNextLine()||"";return e+r;function getNextLine(){return u<o.length?o[u++]:undefined}};var s=1,l=0;var c=null;r.eachMapping((function(e){if(c!==null){if(s<e.generatedLine){addMappingWithCode(c,shiftNextLine());s++;l=0}else{var r=o[u]||"";var n=r.substr(0,e.generatedColumn-l);o[u]=r.substr(e.generatedColumn-l);l=e.generatedColumn;addMappingWithCode(c,n);c=e;return}}while(s<e.generatedLine){t.add(shiftNextLine());s++}if(l<e.generatedColumn){var r=o[u]||"";t.add(r.substr(0,e.generatedColumn));o[u]=r.substr(e.generatedColumn);l=e.generatedColumn}c=e}),this);if(u<o.length){if(c){addMappingWithCode(c,shiftNextLine())}t.add(o.splice(u).join(""))}r.sources.forEach((function(e){var o=r.sourceContentFor(e);if(o!=null){if(n!=null){e=i.join(n,e)}t.setSourceContent(e,o)}}));return t;function addMappingWithCode(e,r){if(e===null||e.source===undefined){t.add(r)}else{var o=n?i.join(n,e.source):e.source;t.add(new SourceNode(e.originalLine,e.originalColumn,o,r,e.name))}}};SourceNode.prototype.add=function SourceNode_add(e){if(Array.isArray(e)){e.forEach((function(e){this.add(e)}),this)}else if(e[s]||typeof e==="string"){if(e){this.children.push(e)}}else{throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+e)}return this};SourceNode.prototype.prepend=function SourceNode_prepend(e){if(Array.isArray(e)){for(var r=e.length-1;r>=0;r--){this.prepend(e[r])}}else if(e[s]||typeof e==="string"){this.children.unshift(e)}else{throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+e)}return this};SourceNode.prototype.walk=function SourceNode_walk(e){var r;for(var n=0,t=this.children.length;n<t;n++){r=this.children[n];if(r[s]){r.walk(e)}else{if(r!==""){e(r,{source:this.source,line:this.line,column:this.column,name:this.name})}}}};SourceNode.prototype.join=function SourceNode_join(e){var r;var n;var t=this.children.length;if(t>0){r=[];for(n=0;n<t-1;n++){r.push(this.children[n]);r.push(e)}r.push(this.children[n]);this.children=r}return this};SourceNode.prototype.replaceRight=function SourceNode_replaceRight(e,r){var n=this.children[this.children.length-1];if(n[s]){n.replaceRight(e,r)}else if(typeof n==="string"){this.children[this.children.length-1]=n.replace(e,r)}else{this.children.push("".replace(e,r))}return this};SourceNode.prototype.setSourceContent=function SourceNode_setSourceContent(e,r){this.sourceContents[i.toSetString(e)]=r};SourceNode.prototype.walkSourceContents=function SourceNode_walkSourceContents(e){for(var r=0,n=this.children.length;r<n;r++){if(this.children[r][s]){this.children[r].walkSourceContents(e)}}var t=Object.keys(this.sourceContents);for(var r=0,n=t.length;r<n;r++){e(i.fromSetString(t[r]),this.sourceContents[t[r]])}};SourceNode.prototype.toString=function SourceNode_toString(){var e="";this.walk((function(r){e+=r}));return e};SourceNode.prototype.toStringWithSourceMap=function SourceNode_toStringWithSourceMap(e){var r={code:"",line:1,column:0};var n=new o(e);var t=false;var i=null;var a=null;var s=null;var l=null;this.walk((function(e,o){r.code+=e;if(o.source!==null&&o.line!==null&&o.column!==null){if(i!==o.source||a!==o.line||s!==o.column||l!==o.name){n.addMapping({source:o.source,original:{line:o.line,column:o.column},generated:{line:r.line,column:r.column},name:o.name})}i=o.source;a=o.line;s=o.column;l=o.name;t=true}else if(t){n.addMapping({generated:{line:r.line,column:r.column}});i=null;t=false}for(var c=0,p=e.length;c<p;c++){if(e.charCodeAt(c)===u){r.line++;r.column=0;if(c+1===p){i=null;t=false}else if(t){n.addMapping({source:o.source,original:{line:o.line,column:o.column},generated:{line:r.line,column:r.column},name:o.name})}}else{r.column++}}}));this.walkSourceContents((function(e,r){n.setSourceContent(e,r)}));return{code:r.code,map:n}};t=SourceNode},983:(e,r)=>{function getArg(e,r,n){if(r in e){return e[r]}else if(arguments.length===3){return n}else{throw new Error('"'+r+'" is a required argument.')}}r.getArg=getArg;var n=/^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;var t=/^data:.+\,.+$/;function urlParse(e){var r=e.match(n);if(!r){return null}return{scheme:r[1],auth:r[2],host:r[3],port:r[4],path:r[5]}}r.urlParse=urlParse;function urlGenerate(e){var r="";if(e.scheme){r+=e.scheme+":"}r+="//";if(e.auth){r+=e.auth+"@"}if(e.host){r+=e.host}if(e.port){r+=":"+e.port}if(e.path){r+=e.path}return r}r.urlGenerate=urlGenerate;function normalize(e){var n=e;var t=urlParse(e);if(t){if(!t.path){return e}n=t.path}var o=r.isAbsolute(n);var i=n.split(/\/+/);for(var a,u=0,s=i.length-1;s>=0;s--){a=i[s];if(a==="."){i.splice(s,1)}else if(a===".."){u++}else if(u>0){if(a===""){i.splice(s+1,u);u=0}else{i.splice(s,2);u--}}}n=i.join("/");if(n===""){n=o?"/":"."}if(t){t.path=n;return urlGenerate(t)}return n}r.normalize=normalize;function join(e,r){if(e===""){e="."}if(r===""){r="."}var n=urlParse(r);var o=urlParse(e);if(o){e=o.path||"/"}if(n&&!n.scheme){if(o){n.scheme=o.scheme}return urlGenerate(n)}if(n||r.match(t)){return r}if(o&&!o.host&&!o.path){o.host=r;return urlGenerate(o)}var i=r.charAt(0)==="/"?r:normalize(e.replace(/\/+$/,"")+"/"+r);if(o){o.path=i;return urlGenerate(o)}return i}r.join=join;r.isAbsolute=function(e){return e.charAt(0)==="/"||n.test(e)};function relative(e,r){if(e===""){e="."}e=e.replace(/\/$/,"");var n=0;while(r.indexOf(e+"/")!==0){var t=e.lastIndexOf("/");if(t<0){return r}e=e.slice(0,t);if(e.match(/^([^\/]+:\/)?\/*$/)){return r}++n}return Array(n+1).join("../")+r.substr(e.length+1)}r.relative=relative;var o=function(){var e=Object.create(null);return!("__proto__"in e)}();function identity(e){return e}function toSetString(e){if(isProtoString(e)){return"$"+e}return e}r.toSetString=o?identity:toSetString;function fromSetString(e){if(isProtoString(e)){return e.slice(1)}return e}r.fromSetString=o?identity:fromSetString;function isProtoString(e){if(!e){return false}var r=e.length;if(r<9){return false}if(e.charCodeAt(r-1)!==95||e.charCodeAt(r-2)!==95||e.charCodeAt(r-3)!==111||e.charCodeAt(r-4)!==116||e.charCodeAt(r-5)!==111||e.charCodeAt(r-6)!==114||e.charCodeAt(r-7)!==112||e.charCodeAt(r-8)!==95||e.charCodeAt(r-9)!==95){return false}for(var n=r-10;n>=0;n--){if(e.charCodeAt(n)!==36){return false}}return true}function compareByOriginalPositions(e,r,n){var t=strcmp(e.source,r.source);if(t!==0){return t}t=e.originalLine-r.originalLine;if(t!==0){return t}t=e.originalColumn-r.originalColumn;if(t!==0||n){return t}t=e.generatedColumn-r.generatedColumn;if(t!==0){return t}t=e.generatedLine-r.generatedLine;if(t!==0){return t}return strcmp(e.name,r.name)}r.compareByOriginalPositions=compareByOriginalPositions;function compareByGeneratedPositionsDeflated(e,r,n){var t=e.generatedLine-r.generatedLine;if(t!==0){return t}t=e.generatedColumn-r.generatedColumn;if(t!==0||n){return t}t=strcmp(e.source,r.source);if(t!==0){return t}t=e.originalLine-r.originalLine;if(t!==0){return t}t=e.originalColumn-r.originalColumn;if(t!==0){return t}return strcmp(e.name,r.name)}r.compareByGeneratedPositionsDeflated=compareByGeneratedPositionsDeflated;function strcmp(e,r){if(e===r){return 0}if(e===null){return 1}if(r===null){return-1}if(e>r){return 1}return-1}function compareByGeneratedPositionsInflated(e,r){var n=e.generatedLine-r.generatedLine;if(n!==0){return n}n=e.generatedColumn-r.generatedColumn;if(n!==0){return n}n=strcmp(e.source,r.source);if(n!==0){return n}n=e.originalLine-r.originalLine;if(n!==0){return n}n=e.originalColumn-r.originalColumn;if(n!==0){return n}return strcmp(e.name,r.name)}r.compareByGeneratedPositionsInflated=compareByGeneratedPositionsInflated;function parseSourceMapInput(e){return JSON.parse(e.replace(/^\)]}'[^\n]*\n/,""))}r.parseSourceMapInput=parseSourceMapInput;function computeSourceURL(e,r,n){r=r||"";if(e){if(e[e.length-1]!=="/"&&r[0]!=="/"){e+="/"}r=e+r}if(n){var t=urlParse(n);if(!t){throw new Error("sourceMapURL could not be parsed")}if(t.path){var o=t.path.lastIndexOf("/");if(o>=0){t.path=t.path.substring(0,o+1)}}r=join(urlGenerate(t),r)}return normalize(r)}r.computeSourceURL=computeSourceURL},596:(e,r,n)=>{n(341).h;r.SourceMapConsumer=n(327).SourceMapConsumer;n(990)},747:e=>{"use strict";e.exports=__nccwpck_require__(747)},622:e=>{"use strict";e.exports=__nccwpck_require__(622)}};var r={};function __nested_webpack_require_40201__(n){var t=r[n];if(t!==undefined){return t.exports}var o=r[n]={id:n,loaded:false,exports:{}};var i=true;try{e[n](o,o.exports,__nested_webpack_require_40201__);i=false}finally{if(i)delete r[n]}o.loaded=true;return o.exports}(()=>{__nested_webpack_require_40201__.nmd=e=>{e.paths=[];if(!e.children)e.children=[];return e}})();if(true)__nested_webpack_require_40201__.ab=__dirname+"/";var n={};(()=>{__nested_webpack_require_40201__(284).install()})();module.exports=n})();

/***/ }),

/***/ 357:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(357);;

/***/ }),

/***/ 129:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(129);;

/***/ }),

/***/ 619:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(619);;

/***/ }),

/***/ 417:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(417);;

/***/ }),

/***/ 614:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(614);;

/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(747);;

/***/ }),

/***/ 87:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(87);;

/***/ }),

/***/ 622:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(622);;

/***/ }),

/***/ 413:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(413);;

/***/ }),

/***/ 669:
/***/ ((module) => {

"use strict";
module.exports = __nccwpck_require__(669);;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(131);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 907:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

(()=>{var e={650:e=>{var r=Object.prototype.toString;var n=typeof Buffer.alloc==="function"&&typeof Buffer.allocUnsafe==="function"&&typeof Buffer.from==="function";function isArrayBuffer(e){return r.call(e).slice(8,-1)==="ArrayBuffer"}function fromArrayBuffer(e,r,t){r>>>=0;var o=e.byteLength-r;if(o<0){throw new RangeError("'offset' is out of bounds")}if(t===undefined){t=o}else{t>>>=0;if(t>o){throw new RangeError("'length' is out of bounds")}}return n?Buffer.from(e.slice(r,r+t)):new Buffer(new Uint8Array(e.slice(r,r+t)))}function fromString(e,r){if(typeof r!=="string"||r===""){r="utf8"}if(!Buffer.isEncoding(r)){throw new TypeError('"encoding" must be a valid string encoding')}return n?Buffer.from(e,r):new Buffer(e,r)}function bufferFrom(e,r,t){if(typeof e==="number"){throw new TypeError('"value" argument must not be a number')}if(isArrayBuffer(e)){return fromArrayBuffer(e,r,t)}if(typeof e==="string"){return fromString(e,r)}return n?Buffer.from(e):new Buffer(e)}e.exports=bufferFrom},284:(e,r,n)=>{e=n.nmd(e);var t=n(596).SourceMapConsumer;var o=n(622);var i;try{i=n(747);if(!i.existsSync||!i.readFileSync){i=null}}catch(e){}var a=n(650);function dynamicRequire(e,r){return e.require(r)}var u=false;var s=false;var l=false;var c="auto";var p={};var f={};var g=/^data:application\/json[^,]+base64,/;var h=[];var d=[];function isInBrowser(){if(c==="browser")return true;if(c==="node")return false;return typeof window!=="undefined"&&typeof XMLHttpRequest==="function"&&!(window.require&&window.module&&window.process&&window.process.type==="renderer")}function hasGlobalProcessEventEmitter(){return typeof process==="object"&&process!==null&&typeof process.on==="function"}function handlerExec(e){return function(r){for(var n=0;n<e.length;n++){var t=e[n](r);if(t){return t}}return null}}var m=handlerExec(h);h.push((function(e){e=e.trim();if(/^file:/.test(e)){e=e.replace(/file:\/\/\/(\w:)?/,(function(e,r){return r?"":"/"}))}if(e in p){return p[e]}var r="";try{if(!i){var n=new XMLHttpRequest;n.open("GET",e,false);n.send(null);if(n.readyState===4&&n.status===200){r=n.responseText}}else if(i.existsSync(e)){r=i.readFileSync(e,"utf8")}}catch(e){}return p[e]=r}));function supportRelativeURL(e,r){if(!e)return r;var n=o.dirname(e);var t=/^\w+:\/\/[^\/]*/.exec(n);var i=t?t[0]:"";var a=n.slice(i.length);if(i&&/^\/\w\:/.test(a)){i+="/";return i+o.resolve(n.slice(i.length),r).replace(/\\/g,"/")}return i+o.resolve(n.slice(i.length),r)}function retrieveSourceMapURL(e){var r;if(isInBrowser()){try{var n=new XMLHttpRequest;n.open("GET",e,false);n.send(null);r=n.readyState===4?n.responseText:null;var t=n.getResponseHeader("SourceMap")||n.getResponseHeader("X-SourceMap");if(t){return t}}catch(e){}}r=m(e);var o=/(?:\/\/[@#][\s]*sourceMappingURL=([^\s'"]+)[\s]*$)|(?:\/\*[@#][\s]*sourceMappingURL=([^\s*'"]+)[\s]*(?:\*\/)[\s]*$)/gm;var i,a;while(a=o.exec(r))i=a;if(!i)return null;return i[1]}var v=handlerExec(d);d.push((function(e){var r=retrieveSourceMapURL(e);if(!r)return null;var n;if(g.test(r)){var t=r.slice(r.indexOf(",")+1);n=a(t,"base64").toString();r=e}else{r=supportRelativeURL(e,r);n=m(r)}if(!n){return null}return{url:r,map:n}}));function mapSourcePosition(e){var r=f[e.source];if(!r){var n=v(e.source);if(n){r=f[e.source]={url:n.url,map:new t(n.map)};if(r.map.sourcesContent){r.map.sources.forEach((function(e,n){var t=r.map.sourcesContent[n];if(t){var o=supportRelativeURL(r.url,e);p[o]=t}}))}}else{r=f[e.source]={url:null,map:null}}}if(r&&r.map&&typeof r.map.originalPositionFor==="function"){var o=r.map.originalPositionFor(e);if(o.source!==null){o.source=supportRelativeURL(r.url,o.source);return o}}return e}function mapEvalOrigin(e){var r=/^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(e);if(r){var n=mapSourcePosition({source:r[2],line:+r[3],column:r[4]-1});return"eval at "+r[1]+" ("+n.source+":"+n.line+":"+(n.column+1)+")"}r=/^eval at ([^(]+) \((.+)\)$/.exec(e);if(r){return"eval at "+r[1]+" ("+mapEvalOrigin(r[2])+")"}return e}function CallSiteToString(){var e;var r="";if(this.isNative()){r="native"}else{e=this.getScriptNameOrSourceURL();if(!e&&this.isEval()){r=this.getEvalOrigin();r+=", "}if(e){r+=e}else{r+="<anonymous>"}var n=this.getLineNumber();if(n!=null){r+=":"+n;var t=this.getColumnNumber();if(t){r+=":"+t}}}var o="";var i=this.getFunctionName();var a=true;var u=this.isConstructor();var s=!(this.isToplevel()||u);if(s){var l=this.getTypeName();if(l==="[object Object]"){l="null"}var c=this.getMethodName();if(i){if(l&&i.indexOf(l)!=0){o+=l+"."}o+=i;if(c&&i.indexOf("."+c)!=i.length-c.length-1){o+=" [as "+c+"]"}}else{o+=l+"."+(c||"<anonymous>")}}else if(u){o+="new "+(i||"<anonymous>")}else if(i){o+=i}else{o+=r;a=false}if(a){o+=" ("+r+")"}return o}function cloneCallSite(e){var r={};Object.getOwnPropertyNames(Object.getPrototypeOf(e)).forEach((function(n){r[n]=/^(?:is|get)/.test(n)?function(){return e[n].call(e)}:e[n]}));r.toString=CallSiteToString;return r}function wrapCallSite(e,r){if(r===undefined){r={nextPosition:null,curPosition:null}}if(e.isNative()){r.curPosition=null;return e}var n=e.getFileName()||e.getScriptNameOrSourceURL();if(n){var t=e.getLineNumber();var o=e.getColumnNumber()-1;var i=/^v(10\.1[6-9]|10\.[2-9][0-9]|10\.[0-9]{3,}|1[2-9]\d*|[2-9]\d|\d{3,}|11\.11)/;var a=i.test(process.version)?0:62;if(t===1&&o>a&&!isInBrowser()&&!e.isEval()){o-=a}var u=mapSourcePosition({source:n,line:t,column:o});r.curPosition=u;e=cloneCallSite(e);var s=e.getFunctionName;e.getFunctionName=function(){if(r.nextPosition==null){return s()}return r.nextPosition.name||s()};e.getFileName=function(){return u.source};e.getLineNumber=function(){return u.line};e.getColumnNumber=function(){return u.column+1};e.getScriptNameOrSourceURL=function(){return u.source};return e}var l=e.isEval()&&e.getEvalOrigin();if(l){l=mapEvalOrigin(l);e=cloneCallSite(e);e.getEvalOrigin=function(){return l};return e}return e}function prepareStackTrace(e,r){if(l){p={};f={}}var n=e.name||"Error";var t=e.message||"";var o=n+": "+t;var i={nextPosition:null,curPosition:null};var a=[];for(var u=r.length-1;u>=0;u--){a.push("\n    at "+wrapCallSite(r[u],i));i.nextPosition=i.curPosition}i.curPosition=i.nextPosition=null;return o+a.reverse().join("")}function getErrorSource(e){var r=/\n    at [^(]+ \((.*):(\d+):(\d+)\)/.exec(e.stack);if(r){var n=r[1];var t=+r[2];var o=+r[3];var a=p[n];if(!a&&i&&i.existsSync(n)){try{a=i.readFileSync(n,"utf8")}catch(e){a=""}}if(a){var u=a.split(/(?:\r\n|\r|\n)/)[t-1];if(u){return n+":"+t+"\n"+u+"\n"+new Array(o).join(" ")+"^"}}}return null}function printErrorAndExit(e){var r=getErrorSource(e);if(process.stderr._handle&&process.stderr._handle.setBlocking){process.stderr._handle.setBlocking(true)}if(r){console.error();console.error(r)}console.error(e.stack);process.exit(1)}function shimEmitUncaughtException(){var e=process.emit;process.emit=function(r){if(r==="uncaughtException"){var n=arguments[1]&&arguments[1].stack;var t=this.listeners(r).length>0;if(n&&!t){return printErrorAndExit(arguments[1])}}return e.apply(this,arguments)}}var S=h.slice(0);var _=d.slice(0);r.wrapCallSite=wrapCallSite;r.getErrorSource=getErrorSource;r.mapSourcePosition=mapSourcePosition;r.retrieveSourceMap=v;r.install=function(r){r=r||{};if(r.environment){c=r.environment;if(["node","browser","auto"].indexOf(c)===-1){throw new Error("environment "+c+" was unknown. Available options are {auto, browser, node}")}}if(r.retrieveFile){if(r.overrideRetrieveFile){h.length=0}h.unshift(r.retrieveFile)}if(r.retrieveSourceMap){if(r.overrideRetrieveSourceMap){d.length=0}d.unshift(r.retrieveSourceMap)}if(r.hookRequire&&!isInBrowser()){var n=dynamicRequire(e,"module");var t=n.prototype._compile;if(!t.__sourceMapSupport){n.prototype._compile=function(e,r){p[r]=e;f[r]=undefined;return t.call(this,e,r)};n.prototype._compile.__sourceMapSupport=true}}if(!l){l="emptyCacheBetweenOperations"in r?r.emptyCacheBetweenOperations:false}if(!u){u=true;Error.prepareStackTrace=prepareStackTrace}if(!s){var o="handleUncaughtExceptions"in r?r.handleUncaughtExceptions:true;try{var i=dynamicRequire(e,"worker_threads");if(i.isMainThread===false){o=false}}catch(e){}if(o&&hasGlobalProcessEventEmitter()){s=true;shimEmitUncaughtException()}}};r.resetRetrieveHandlers=function(){h.length=0;d.length=0;h=S.slice(0);d=_.slice(0);v=handlerExec(d);m=handlerExec(h)}},837:(e,r,n)=>{var t=n(983);var o=Object.prototype.hasOwnProperty;var i=typeof Map!=="undefined";function ArraySet(){this._array=[];this._set=i?new Map:Object.create(null)}ArraySet.fromArray=function ArraySet_fromArray(e,r){var n=new ArraySet;for(var t=0,o=e.length;t<o;t++){n.add(e[t],r)}return n};ArraySet.prototype.size=function ArraySet_size(){return i?this._set.size:Object.getOwnPropertyNames(this._set).length};ArraySet.prototype.add=function ArraySet_add(e,r){var n=i?e:t.toSetString(e);var a=i?this.has(e):o.call(this._set,n);var u=this._array.length;if(!a||r){this._array.push(e)}if(!a){if(i){this._set.set(e,u)}else{this._set[n]=u}}};ArraySet.prototype.has=function ArraySet_has(e){if(i){return this._set.has(e)}else{var r=t.toSetString(e);return o.call(this._set,r)}};ArraySet.prototype.indexOf=function ArraySet_indexOf(e){if(i){var r=this._set.get(e);if(r>=0){return r}}else{var n=t.toSetString(e);if(o.call(this._set,n)){return this._set[n]}}throw new Error('"'+e+'" is not in the set.')};ArraySet.prototype.at=function ArraySet_at(e){if(e>=0&&e<this._array.length){return this._array[e]}throw new Error("No element indexed by "+e)};ArraySet.prototype.toArray=function ArraySet_toArray(){return this._array.slice()};r.I=ArraySet},215:(e,r,n)=>{var t=n(537);var o=5;var i=1<<o;var a=i-1;var u=i;function toVLQSigned(e){return e<0?(-e<<1)+1:(e<<1)+0}function fromVLQSigned(e){var r=(e&1)===1;var n=e>>1;return r?-n:n}r.encode=function base64VLQ_encode(e){var r="";var n;var i=toVLQSigned(e);do{n=i&a;i>>>=o;if(i>0){n|=u}r+=t.encode(n)}while(i>0);return r};r.decode=function base64VLQ_decode(e,r,n){var i=e.length;var s=0;var l=0;var c,p;do{if(r>=i){throw new Error("Expected more digits in base 64 VLQ value.")}p=t.decode(e.charCodeAt(r++));if(p===-1){throw new Error("Invalid base64 digit: "+e.charAt(r-1))}c=!!(p&u);p&=a;s=s+(p<<l);l+=o}while(c);n.value=fromVLQSigned(s);n.rest=r}},537:(e,r)=>{var n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");r.encode=function(e){if(0<=e&&e<n.length){return n[e]}throw new TypeError("Must be between 0 and 63: "+e)};r.decode=function(e){var r=65;var n=90;var t=97;var o=122;var i=48;var a=57;var u=43;var s=47;var l=26;var c=52;if(r<=e&&e<=n){return e-r}if(t<=e&&e<=o){return e-t+l}if(i<=e&&e<=a){return e-i+c}if(e==u){return 62}if(e==s){return 63}return-1}},164:(e,r)=>{r.GREATEST_LOWER_BOUND=1;r.LEAST_UPPER_BOUND=2;function recursiveSearch(e,n,t,o,i,a){var u=Math.floor((n-e)/2)+e;var s=i(t,o[u],true);if(s===0){return u}else if(s>0){if(n-u>1){return recursiveSearch(u,n,t,o,i,a)}if(a==r.LEAST_UPPER_BOUND){return n<o.length?n:-1}else{return u}}else{if(u-e>1){return recursiveSearch(e,u,t,o,i,a)}if(a==r.LEAST_UPPER_BOUND){return u}else{return e<0?-1:e}}}r.search=function search(e,n,t,o){if(n.length===0){return-1}var i=recursiveSearch(-1,n.length,e,n,t,o||r.GREATEST_LOWER_BOUND);if(i<0){return-1}while(i-1>=0){if(t(n[i],n[i-1],true)!==0){break}--i}return i}},740:(e,r,n)=>{var t=n(983);function generatedPositionAfter(e,r){var n=e.generatedLine;var o=r.generatedLine;var i=e.generatedColumn;var a=r.generatedColumn;return o>n||o==n&&a>=i||t.compareByGeneratedPositionsInflated(e,r)<=0}function MappingList(){this._array=[];this._sorted=true;this._last={generatedLine:-1,generatedColumn:0}}MappingList.prototype.unsortedForEach=function MappingList_forEach(e,r){this._array.forEach(e,r)};MappingList.prototype.add=function MappingList_add(e){if(generatedPositionAfter(this._last,e)){this._last=e;this._array.push(e)}else{this._sorted=false;this._array.push(e)}};MappingList.prototype.toArray=function MappingList_toArray(){if(!this._sorted){this._array.sort(t.compareByGeneratedPositionsInflated);this._sorted=true}return this._array};r.H=MappingList},226:(e,r)=>{function swap(e,r,n){var t=e[r];e[r]=e[n];e[n]=t}function randomIntInRange(e,r){return Math.round(e+Math.random()*(r-e))}function doQuickSort(e,r,n,t){if(n<t){var o=randomIntInRange(n,t);var i=n-1;swap(e,o,t);var a=e[t];for(var u=n;u<t;u++){if(r(e[u],a)<=0){i+=1;swap(e,i,u)}}swap(e,i+1,u);var s=i+1;doQuickSort(e,r,n,s-1);doQuickSort(e,r,s+1,t)}}r.U=function(e,r){doQuickSort(e,r,0,e.length-1)}},327:(e,r,n)=>{var t;var o=n(983);var i=n(164);var a=n(837).I;var u=n(215);var s=n(226).U;function SourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}return n.sections!=null?new IndexedSourceMapConsumer(n,r):new BasicSourceMapConsumer(n,r)}SourceMapConsumer.fromSourceMap=function(e,r){return BasicSourceMapConsumer.fromSourceMap(e,r)};SourceMapConsumer.prototype._version=3;SourceMapConsumer.prototype.__generatedMappings=null;Object.defineProperty(SourceMapConsumer.prototype,"_generatedMappings",{configurable:true,enumerable:true,get:function(){if(!this.__generatedMappings){this._parseMappings(this._mappings,this.sourceRoot)}return this.__generatedMappings}});SourceMapConsumer.prototype.__originalMappings=null;Object.defineProperty(SourceMapConsumer.prototype,"_originalMappings",{configurable:true,enumerable:true,get:function(){if(!this.__originalMappings){this._parseMappings(this._mappings,this.sourceRoot)}return this.__originalMappings}});SourceMapConsumer.prototype._charIsMappingSeparator=function SourceMapConsumer_charIsMappingSeparator(e,r){var n=e.charAt(r);return n===";"||n===","};SourceMapConsumer.prototype._parseMappings=function SourceMapConsumer_parseMappings(e,r){throw new Error("Subclasses must implement _parseMappings")};SourceMapConsumer.GENERATED_ORDER=1;SourceMapConsumer.ORIGINAL_ORDER=2;SourceMapConsumer.GREATEST_LOWER_BOUND=1;SourceMapConsumer.LEAST_UPPER_BOUND=2;SourceMapConsumer.prototype.eachMapping=function SourceMapConsumer_eachMapping(e,r,n){var t=r||null;var i=n||SourceMapConsumer.GENERATED_ORDER;var a;switch(i){case SourceMapConsumer.GENERATED_ORDER:a=this._generatedMappings;break;case SourceMapConsumer.ORIGINAL_ORDER:a=this._originalMappings;break;default:throw new Error("Unknown order of iteration.")}var u=this.sourceRoot;a.map((function(e){var r=e.source===null?null:this._sources.at(e.source);r=o.computeSourceURL(u,r,this._sourceMapURL);return{source:r,generatedLine:e.generatedLine,generatedColumn:e.generatedColumn,originalLine:e.originalLine,originalColumn:e.originalColumn,name:e.name===null?null:this._names.at(e.name)}}),this).forEach(e,t)};SourceMapConsumer.prototype.allGeneratedPositionsFor=function SourceMapConsumer_allGeneratedPositionsFor(e){var r=o.getArg(e,"line");var n={source:o.getArg(e,"source"),originalLine:r,originalColumn:o.getArg(e,"column",0)};n.source=this._findSourceIndex(n.source);if(n.source<0){return[]}var t=[];var a=this._findMapping(n,this._originalMappings,"originalLine","originalColumn",o.compareByOriginalPositions,i.LEAST_UPPER_BOUND);if(a>=0){var u=this._originalMappings[a];if(e.column===undefined){var s=u.originalLine;while(u&&u.originalLine===s){t.push({line:o.getArg(u,"generatedLine",null),column:o.getArg(u,"generatedColumn",null),lastColumn:o.getArg(u,"lastGeneratedColumn",null)});u=this._originalMappings[++a]}}else{var l=u.originalColumn;while(u&&u.originalLine===r&&u.originalColumn==l){t.push({line:o.getArg(u,"generatedLine",null),column:o.getArg(u,"generatedColumn",null),lastColumn:o.getArg(u,"lastGeneratedColumn",null)});u=this._originalMappings[++a]}}}return t};r.SourceMapConsumer=SourceMapConsumer;function BasicSourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}var t=o.getArg(n,"version");var i=o.getArg(n,"sources");var u=o.getArg(n,"names",[]);var s=o.getArg(n,"sourceRoot",null);var l=o.getArg(n,"sourcesContent",null);var c=o.getArg(n,"mappings");var p=o.getArg(n,"file",null);if(t!=this._version){throw new Error("Unsupported version: "+t)}if(s){s=o.normalize(s)}i=i.map(String).map(o.normalize).map((function(e){return s&&o.isAbsolute(s)&&o.isAbsolute(e)?o.relative(s,e):e}));this._names=a.fromArray(u.map(String),true);this._sources=a.fromArray(i,true);this._absoluteSources=this._sources.toArray().map((function(e){return o.computeSourceURL(s,e,r)}));this.sourceRoot=s;this.sourcesContent=l;this._mappings=c;this._sourceMapURL=r;this.file=p}BasicSourceMapConsumer.prototype=Object.create(SourceMapConsumer.prototype);BasicSourceMapConsumer.prototype.consumer=SourceMapConsumer;BasicSourceMapConsumer.prototype._findSourceIndex=function(e){var r=e;if(this.sourceRoot!=null){r=o.relative(this.sourceRoot,r)}if(this._sources.has(r)){return this._sources.indexOf(r)}var n;for(n=0;n<this._absoluteSources.length;++n){if(this._absoluteSources[n]==e){return n}}return-1};BasicSourceMapConsumer.fromSourceMap=function SourceMapConsumer_fromSourceMap(e,r){var n=Object.create(BasicSourceMapConsumer.prototype);var t=n._names=a.fromArray(e._names.toArray(),true);var i=n._sources=a.fromArray(e._sources.toArray(),true);n.sourceRoot=e._sourceRoot;n.sourcesContent=e._generateSourcesContent(n._sources.toArray(),n.sourceRoot);n.file=e._file;n._sourceMapURL=r;n._absoluteSources=n._sources.toArray().map((function(e){return o.computeSourceURL(n.sourceRoot,e,r)}));var u=e._mappings.toArray().slice();var l=n.__generatedMappings=[];var c=n.__originalMappings=[];for(var p=0,f=u.length;p<f;p++){var g=u[p];var h=new Mapping;h.generatedLine=g.generatedLine;h.generatedColumn=g.generatedColumn;if(g.source){h.source=i.indexOf(g.source);h.originalLine=g.originalLine;h.originalColumn=g.originalColumn;if(g.name){h.name=t.indexOf(g.name)}c.push(h)}l.push(h)}s(n.__originalMappings,o.compareByOriginalPositions);return n};BasicSourceMapConsumer.prototype._version=3;Object.defineProperty(BasicSourceMapConsumer.prototype,"sources",{get:function(){return this._absoluteSources.slice()}});function Mapping(){this.generatedLine=0;this.generatedColumn=0;this.source=null;this.originalLine=null;this.originalColumn=null;this.name=null}BasicSourceMapConsumer.prototype._parseMappings=function SourceMapConsumer_parseMappings(e,r){var n=1;var t=0;var i=0;var a=0;var l=0;var c=0;var p=e.length;var f=0;var g={};var h={};var d=[];var m=[];var v,S,_,C,y;while(f<p){if(e.charAt(f)===";"){n++;f++;t=0}else if(e.charAt(f)===","){f++}else{v=new Mapping;v.generatedLine=n;for(C=f;C<p;C++){if(this._charIsMappingSeparator(e,C)){break}}S=e.slice(f,C);_=g[S];if(_){f+=S.length}else{_=[];while(f<C){u.decode(e,f,h);y=h.value;f=h.rest;_.push(y)}if(_.length===2){throw new Error("Found a source, but no line and column")}if(_.length===3){throw new Error("Found a source and line, but no column")}g[S]=_}v.generatedColumn=t+_[0];t=v.generatedColumn;if(_.length>1){v.source=l+_[1];l+=_[1];v.originalLine=i+_[2];i=v.originalLine;v.originalLine+=1;v.originalColumn=a+_[3];a=v.originalColumn;if(_.length>4){v.name=c+_[4];c+=_[4]}}m.push(v);if(typeof v.originalLine==="number"){d.push(v)}}}s(m,o.compareByGeneratedPositionsDeflated);this.__generatedMappings=m;s(d,o.compareByOriginalPositions);this.__originalMappings=d};BasicSourceMapConsumer.prototype._findMapping=function SourceMapConsumer_findMapping(e,r,n,t,o,a){if(e[n]<=0){throw new TypeError("Line must be greater than or equal to 1, got "+e[n])}if(e[t]<0){throw new TypeError("Column must be greater than or equal to 0, got "+e[t])}return i.search(e,r,o,a)};BasicSourceMapConsumer.prototype.computeColumnSpans=function SourceMapConsumer_computeColumnSpans(){for(var e=0;e<this._generatedMappings.length;++e){var r=this._generatedMappings[e];if(e+1<this._generatedMappings.length){var n=this._generatedMappings[e+1];if(r.generatedLine===n.generatedLine){r.lastGeneratedColumn=n.generatedColumn-1;continue}}r.lastGeneratedColumn=Infinity}};BasicSourceMapConsumer.prototype.originalPositionFor=function SourceMapConsumer_originalPositionFor(e){var r={generatedLine:o.getArg(e,"line"),generatedColumn:o.getArg(e,"column")};var n=this._findMapping(r,this._generatedMappings,"generatedLine","generatedColumn",o.compareByGeneratedPositionsDeflated,o.getArg(e,"bias",SourceMapConsumer.GREATEST_LOWER_BOUND));if(n>=0){var t=this._generatedMappings[n];if(t.generatedLine===r.generatedLine){var i=o.getArg(t,"source",null);if(i!==null){i=this._sources.at(i);i=o.computeSourceURL(this.sourceRoot,i,this._sourceMapURL)}var a=o.getArg(t,"name",null);if(a!==null){a=this._names.at(a)}return{source:i,line:o.getArg(t,"originalLine",null),column:o.getArg(t,"originalColumn",null),name:a}}}return{source:null,line:null,column:null,name:null}};BasicSourceMapConsumer.prototype.hasContentsOfAllSources=function BasicSourceMapConsumer_hasContentsOfAllSources(){if(!this.sourcesContent){return false}return this.sourcesContent.length>=this._sources.size()&&!this.sourcesContent.some((function(e){return e==null}))};BasicSourceMapConsumer.prototype.sourceContentFor=function SourceMapConsumer_sourceContentFor(e,r){if(!this.sourcesContent){return null}var n=this._findSourceIndex(e);if(n>=0){return this.sourcesContent[n]}var t=e;if(this.sourceRoot!=null){t=o.relative(this.sourceRoot,t)}var i;if(this.sourceRoot!=null&&(i=o.urlParse(this.sourceRoot))){var a=t.replace(/^file:\/\//,"");if(i.scheme=="file"&&this._sources.has(a)){return this.sourcesContent[this._sources.indexOf(a)]}if((!i.path||i.path=="/")&&this._sources.has("/"+t)){return this.sourcesContent[this._sources.indexOf("/"+t)]}}if(r){return null}else{throw new Error('"'+t+'" is not in the SourceMap.')}};BasicSourceMapConsumer.prototype.generatedPositionFor=function SourceMapConsumer_generatedPositionFor(e){var r=o.getArg(e,"source");r=this._findSourceIndex(r);if(r<0){return{line:null,column:null,lastColumn:null}}var n={source:r,originalLine:o.getArg(e,"line"),originalColumn:o.getArg(e,"column")};var t=this._findMapping(n,this._originalMappings,"originalLine","originalColumn",o.compareByOriginalPositions,o.getArg(e,"bias",SourceMapConsumer.GREATEST_LOWER_BOUND));if(t>=0){var i=this._originalMappings[t];if(i.source===n.source){return{line:o.getArg(i,"generatedLine",null),column:o.getArg(i,"generatedColumn",null),lastColumn:o.getArg(i,"lastGeneratedColumn",null)}}}return{line:null,column:null,lastColumn:null}};t=BasicSourceMapConsumer;function IndexedSourceMapConsumer(e,r){var n=e;if(typeof e==="string"){n=o.parseSourceMapInput(e)}var t=o.getArg(n,"version");var i=o.getArg(n,"sections");if(t!=this._version){throw new Error("Unsupported version: "+t)}this._sources=new a;this._names=new a;var u={line:-1,column:0};this._sections=i.map((function(e){if(e.url){throw new Error("Support for url field in sections not implemented.")}var n=o.getArg(e,"offset");var t=o.getArg(n,"line");var i=o.getArg(n,"column");if(t<u.line||t===u.line&&i<u.column){throw new Error("Section offsets must be ordered and non-overlapping.")}u=n;return{generatedOffset:{generatedLine:t+1,generatedColumn:i+1},consumer:new SourceMapConsumer(o.getArg(e,"map"),r)}}))}IndexedSourceMapConsumer.prototype=Object.create(SourceMapConsumer.prototype);IndexedSourceMapConsumer.prototype.constructor=SourceMapConsumer;IndexedSourceMapConsumer.prototype._version=3;Object.defineProperty(IndexedSourceMapConsumer.prototype,"sources",{get:function(){var e=[];for(var r=0;r<this._sections.length;r++){for(var n=0;n<this._sections[r].consumer.sources.length;n++){e.push(this._sections[r].consumer.sources[n])}}return e}});IndexedSourceMapConsumer.prototype.originalPositionFor=function IndexedSourceMapConsumer_originalPositionFor(e){var r={generatedLine:o.getArg(e,"line"),generatedColumn:o.getArg(e,"column")};var n=i.search(r,this._sections,(function(e,r){var n=e.generatedLine-r.generatedOffset.generatedLine;if(n){return n}return e.generatedColumn-r.generatedOffset.generatedColumn}));var t=this._sections[n];if(!t){return{source:null,line:null,column:null,name:null}}return t.consumer.originalPositionFor({line:r.generatedLine-(t.generatedOffset.generatedLine-1),column:r.generatedColumn-(t.generatedOffset.generatedLine===r.generatedLine?t.generatedOffset.generatedColumn-1:0),bias:e.bias})};IndexedSourceMapConsumer.prototype.hasContentsOfAllSources=function IndexedSourceMapConsumer_hasContentsOfAllSources(){return this._sections.every((function(e){return e.consumer.hasContentsOfAllSources()}))};IndexedSourceMapConsumer.prototype.sourceContentFor=function IndexedSourceMapConsumer_sourceContentFor(e,r){for(var n=0;n<this._sections.length;n++){var t=this._sections[n];var o=t.consumer.sourceContentFor(e,true);if(o){return o}}if(r){return null}else{throw new Error('"'+e+'" is not in the SourceMap.')}};IndexedSourceMapConsumer.prototype.generatedPositionFor=function IndexedSourceMapConsumer_generatedPositionFor(e){for(var r=0;r<this._sections.length;r++){var n=this._sections[r];if(n.consumer._findSourceIndex(o.getArg(e,"source"))===-1){continue}var t=n.consumer.generatedPositionFor(e);if(t){var i={line:t.line+(n.generatedOffset.generatedLine-1),column:t.column+(n.generatedOffset.generatedLine===t.line?n.generatedOffset.generatedColumn-1:0)};return i}}return{line:null,column:null}};IndexedSourceMapConsumer.prototype._parseMappings=function IndexedSourceMapConsumer_parseMappings(e,r){this.__generatedMappings=[];this.__originalMappings=[];for(var n=0;n<this._sections.length;n++){var t=this._sections[n];var i=t.consumer._generatedMappings;for(var a=0;a<i.length;a++){var u=i[a];var l=t.consumer._sources.at(u.source);l=o.computeSourceURL(t.consumer.sourceRoot,l,this._sourceMapURL);this._sources.add(l);l=this._sources.indexOf(l);var c=null;if(u.name){c=t.consumer._names.at(u.name);this._names.add(c);c=this._names.indexOf(c)}var p={source:l,generatedLine:u.generatedLine+(t.generatedOffset.generatedLine-1),generatedColumn:u.generatedColumn+(t.generatedOffset.generatedLine===u.generatedLine?t.generatedOffset.generatedColumn-1:0),originalLine:u.originalLine,originalColumn:u.originalColumn,name:c};this.__generatedMappings.push(p);if(typeof p.originalLine==="number"){this.__originalMappings.push(p)}}}s(this.__generatedMappings,o.compareByGeneratedPositionsDeflated);s(this.__originalMappings,o.compareByOriginalPositions)};t=IndexedSourceMapConsumer},341:(e,r,n)=>{var t=n(215);var o=n(983);var i=n(837).I;var a=n(740).H;function SourceMapGenerator(e){if(!e){e={}}this._file=o.getArg(e,"file",null);this._sourceRoot=o.getArg(e,"sourceRoot",null);this._skipValidation=o.getArg(e,"skipValidation",false);this._sources=new i;this._names=new i;this._mappings=new a;this._sourcesContents=null}SourceMapGenerator.prototype._version=3;SourceMapGenerator.fromSourceMap=function SourceMapGenerator_fromSourceMap(e){var r=e.sourceRoot;var n=new SourceMapGenerator({file:e.file,sourceRoot:r});e.eachMapping((function(e){var t={generated:{line:e.generatedLine,column:e.generatedColumn}};if(e.source!=null){t.source=e.source;if(r!=null){t.source=o.relative(r,t.source)}t.original={line:e.originalLine,column:e.originalColumn};if(e.name!=null){t.name=e.name}}n.addMapping(t)}));e.sources.forEach((function(t){var i=t;if(r!==null){i=o.relative(r,t)}if(!n._sources.has(i)){n._sources.add(i)}var a=e.sourceContentFor(t);if(a!=null){n.setSourceContent(t,a)}}));return n};SourceMapGenerator.prototype.addMapping=function SourceMapGenerator_addMapping(e){var r=o.getArg(e,"generated");var n=o.getArg(e,"original",null);var t=o.getArg(e,"source",null);var i=o.getArg(e,"name",null);if(!this._skipValidation){this._validateMapping(r,n,t,i)}if(t!=null){t=String(t);if(!this._sources.has(t)){this._sources.add(t)}}if(i!=null){i=String(i);if(!this._names.has(i)){this._names.add(i)}}this._mappings.add({generatedLine:r.line,generatedColumn:r.column,originalLine:n!=null&&n.line,originalColumn:n!=null&&n.column,source:t,name:i})};SourceMapGenerator.prototype.setSourceContent=function SourceMapGenerator_setSourceContent(e,r){var n=e;if(this._sourceRoot!=null){n=o.relative(this._sourceRoot,n)}if(r!=null){if(!this._sourcesContents){this._sourcesContents=Object.create(null)}this._sourcesContents[o.toSetString(n)]=r}else if(this._sourcesContents){delete this._sourcesContents[o.toSetString(n)];if(Object.keys(this._sourcesContents).length===0){this._sourcesContents=null}}};SourceMapGenerator.prototype.applySourceMap=function SourceMapGenerator_applySourceMap(e,r,n){var t=r;if(r==null){if(e.file==null){throw new Error("SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, "+'or the source map\'s "file" property. Both were omitted.')}t=e.file}var a=this._sourceRoot;if(a!=null){t=o.relative(a,t)}var u=new i;var s=new i;this._mappings.unsortedForEach((function(r){if(r.source===t&&r.originalLine!=null){var i=e.originalPositionFor({line:r.originalLine,column:r.originalColumn});if(i.source!=null){r.source=i.source;if(n!=null){r.source=o.join(n,r.source)}if(a!=null){r.source=o.relative(a,r.source)}r.originalLine=i.line;r.originalColumn=i.column;if(i.name!=null){r.name=i.name}}}var l=r.source;if(l!=null&&!u.has(l)){u.add(l)}var c=r.name;if(c!=null&&!s.has(c)){s.add(c)}}),this);this._sources=u;this._names=s;e.sources.forEach((function(r){var t=e.sourceContentFor(r);if(t!=null){if(n!=null){r=o.join(n,r)}if(a!=null){r=o.relative(a,r)}this.setSourceContent(r,t)}}),this)};SourceMapGenerator.prototype._validateMapping=function SourceMapGenerator_validateMapping(e,r,n,t){if(r&&typeof r.line!=="number"&&typeof r.column!=="number"){throw new Error("original.line and original.column are not numbers -- you probably meant to omit "+"the original mapping entirely and only map the generated position. If so, pass "+"null for the original mapping instead of an object with empty or null values.")}if(e&&"line"in e&&"column"in e&&e.line>0&&e.column>=0&&!r&&!n&&!t){return}else if(e&&"line"in e&&"column"in e&&r&&"line"in r&&"column"in r&&e.line>0&&e.column>=0&&r.line>0&&r.column>=0&&n){return}else{throw new Error("Invalid mapping: "+JSON.stringify({generated:e,source:n,original:r,name:t}))}};SourceMapGenerator.prototype._serializeMappings=function SourceMapGenerator_serializeMappings(){var e=0;var r=1;var n=0;var i=0;var a=0;var u=0;var s="";var l;var c;var p;var f;var g=this._mappings.toArray();for(var h=0,d=g.length;h<d;h++){c=g[h];l="";if(c.generatedLine!==r){e=0;while(c.generatedLine!==r){l+=";";r++}}else{if(h>0){if(!o.compareByGeneratedPositionsInflated(c,g[h-1])){continue}l+=","}}l+=t.encode(c.generatedColumn-e);e=c.generatedColumn;if(c.source!=null){f=this._sources.indexOf(c.source);l+=t.encode(f-u);u=f;l+=t.encode(c.originalLine-1-i);i=c.originalLine-1;l+=t.encode(c.originalColumn-n);n=c.originalColumn;if(c.name!=null){p=this._names.indexOf(c.name);l+=t.encode(p-a);a=p}}s+=l}return s};SourceMapGenerator.prototype._generateSourcesContent=function SourceMapGenerator_generateSourcesContent(e,r){return e.map((function(e){if(!this._sourcesContents){return null}if(r!=null){e=o.relative(r,e)}var n=o.toSetString(e);return Object.prototype.hasOwnProperty.call(this._sourcesContents,n)?this._sourcesContents[n]:null}),this)};SourceMapGenerator.prototype.toJSON=function SourceMapGenerator_toJSON(){var e={version:this._version,sources:this._sources.toArray(),names:this._names.toArray(),mappings:this._serializeMappings()};if(this._file!=null){e.file=this._file}if(this._sourceRoot!=null){e.sourceRoot=this._sourceRoot}if(this._sourcesContents){e.sourcesContent=this._generateSourcesContent(e.sources,e.sourceRoot)}return e};SourceMapGenerator.prototype.toString=function SourceMapGenerator_toString(){return JSON.stringify(this.toJSON())};r.h=SourceMapGenerator},990:(e,r,n)=>{var t;var o=n(341).h;var i=n(983);var a=/(\r?\n)/;var u=10;var s="$$$isSourceNode$$$";function SourceNode(e,r,n,t,o){this.children=[];this.sourceContents={};this.line=e==null?null:e;this.column=r==null?null:r;this.source=n==null?null:n;this.name=o==null?null:o;this[s]=true;if(t!=null)this.add(t)}SourceNode.fromStringWithSourceMap=function SourceNode_fromStringWithSourceMap(e,r,n){var t=new SourceNode;var o=e.split(a);var u=0;var shiftNextLine=function(){var e=getNextLine();var r=getNextLine()||"";return e+r;function getNextLine(){return u<o.length?o[u++]:undefined}};var s=1,l=0;var c=null;r.eachMapping((function(e){if(c!==null){if(s<e.generatedLine){addMappingWithCode(c,shiftNextLine());s++;l=0}else{var r=o[u]||"";var n=r.substr(0,e.generatedColumn-l);o[u]=r.substr(e.generatedColumn-l);l=e.generatedColumn;addMappingWithCode(c,n);c=e;return}}while(s<e.generatedLine){t.add(shiftNextLine());s++}if(l<e.generatedColumn){var r=o[u]||"";t.add(r.substr(0,e.generatedColumn));o[u]=r.substr(e.generatedColumn);l=e.generatedColumn}c=e}),this);if(u<o.length){if(c){addMappingWithCode(c,shiftNextLine())}t.add(o.splice(u).join(""))}r.sources.forEach((function(e){var o=r.sourceContentFor(e);if(o!=null){if(n!=null){e=i.join(n,e)}t.setSourceContent(e,o)}}));return t;function addMappingWithCode(e,r){if(e===null||e.source===undefined){t.add(r)}else{var o=n?i.join(n,e.source):e.source;t.add(new SourceNode(e.originalLine,e.originalColumn,o,r,e.name))}}};SourceNode.prototype.add=function SourceNode_add(e){if(Array.isArray(e)){e.forEach((function(e){this.add(e)}),this)}else if(e[s]||typeof e==="string"){if(e){this.children.push(e)}}else{throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+e)}return this};SourceNode.prototype.prepend=function SourceNode_prepend(e){if(Array.isArray(e)){for(var r=e.length-1;r>=0;r--){this.prepend(e[r])}}else if(e[s]||typeof e==="string"){this.children.unshift(e)}else{throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+e)}return this};SourceNode.prototype.walk=function SourceNode_walk(e){var r;for(var n=0,t=this.children.length;n<t;n++){r=this.children[n];if(r[s]){r.walk(e)}else{if(r!==""){e(r,{source:this.source,line:this.line,column:this.column,name:this.name})}}}};SourceNode.prototype.join=function SourceNode_join(e){var r;var n;var t=this.children.length;if(t>0){r=[];for(n=0;n<t-1;n++){r.push(this.children[n]);r.push(e)}r.push(this.children[n]);this.children=r}return this};SourceNode.prototype.replaceRight=function SourceNode_replaceRight(e,r){var n=this.children[this.children.length-1];if(n[s]){n.replaceRight(e,r)}else if(typeof n==="string"){this.children[this.children.length-1]=n.replace(e,r)}else{this.children.push("".replace(e,r))}return this};SourceNode.prototype.setSourceContent=function SourceNode_setSourceContent(e,r){this.sourceContents[i.toSetString(e)]=r};SourceNode.prototype.walkSourceContents=function SourceNode_walkSourceContents(e){for(var r=0,n=this.children.length;r<n;r++){if(this.children[r][s]){this.children[r].walkSourceContents(e)}}var t=Object.keys(this.sourceContents);for(var r=0,n=t.length;r<n;r++){e(i.fromSetString(t[r]),this.sourceContents[t[r]])}};SourceNode.prototype.toString=function SourceNode_toString(){var e="";this.walk((function(r){e+=r}));return e};SourceNode.prototype.toStringWithSourceMap=function SourceNode_toStringWithSourceMap(e){var r={code:"",line:1,column:0};var n=new o(e);var t=false;var i=null;var a=null;var s=null;var l=null;this.walk((function(e,o){r.code+=e;if(o.source!==null&&o.line!==null&&o.column!==null){if(i!==o.source||a!==o.line||s!==o.column||l!==o.name){n.addMapping({source:o.source,original:{line:o.line,column:o.column},generated:{line:r.line,column:r.column},name:o.name})}i=o.source;a=o.line;s=o.column;l=o.name;t=true}else if(t){n.addMapping({generated:{line:r.line,column:r.column}});i=null;t=false}for(var c=0,p=e.length;c<p;c++){if(e.charCodeAt(c)===u){r.line++;r.column=0;if(c+1===p){i=null;t=false}else if(t){n.addMapping({source:o.source,original:{line:o.line,column:o.column},generated:{line:r.line,column:r.column},name:o.name})}}else{r.column++}}}));this.walkSourceContents((function(e,r){n.setSourceContent(e,r)}));return{code:r.code,map:n}};t=SourceNode},983:(e,r)=>{function getArg(e,r,n){if(r in e){return e[r]}else if(arguments.length===3){return n}else{throw new Error('"'+r+'" is a required argument.')}}r.getArg=getArg;var n=/^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;var t=/^data:.+\,.+$/;function urlParse(e){var r=e.match(n);if(!r){return null}return{scheme:r[1],auth:r[2],host:r[3],port:r[4],path:r[5]}}r.urlParse=urlParse;function urlGenerate(e){var r="";if(e.scheme){r+=e.scheme+":"}r+="//";if(e.auth){r+=e.auth+"@"}if(e.host){r+=e.host}if(e.port){r+=":"+e.port}if(e.path){r+=e.path}return r}r.urlGenerate=urlGenerate;function normalize(e){var n=e;var t=urlParse(e);if(t){if(!t.path){return e}n=t.path}var o=r.isAbsolute(n);var i=n.split(/\/+/);for(var a,u=0,s=i.length-1;s>=0;s--){a=i[s];if(a==="."){i.splice(s,1)}else if(a===".."){u++}else if(u>0){if(a===""){i.splice(s+1,u);u=0}else{i.splice(s,2);u--}}}n=i.join("/");if(n===""){n=o?"/":"."}if(t){t.path=n;return urlGenerate(t)}return n}r.normalize=normalize;function join(e,r){if(e===""){e="."}if(r===""){r="."}var n=urlParse(r);var o=urlParse(e);if(o){e=o.path||"/"}if(n&&!n.scheme){if(o){n.scheme=o.scheme}return urlGenerate(n)}if(n||r.match(t)){return r}if(o&&!o.host&&!o.path){o.host=r;return urlGenerate(o)}var i=r.charAt(0)==="/"?r:normalize(e.replace(/\/+$/,"")+"/"+r);if(o){o.path=i;return urlGenerate(o)}return i}r.join=join;r.isAbsolute=function(e){return e.charAt(0)==="/"||n.test(e)};function relative(e,r){if(e===""){e="."}e=e.replace(/\/$/,"");var n=0;while(r.indexOf(e+"/")!==0){var t=e.lastIndexOf("/");if(t<0){return r}e=e.slice(0,t);if(e.match(/^([^\/]+:\/)?\/*$/)){return r}++n}return Array(n+1).join("../")+r.substr(e.length+1)}r.relative=relative;var o=function(){var e=Object.create(null);return!("__proto__"in e)}();function identity(e){return e}function toSetString(e){if(isProtoString(e)){return"$"+e}return e}r.toSetString=o?identity:toSetString;function fromSetString(e){if(isProtoString(e)){return e.slice(1)}return e}r.fromSetString=o?identity:fromSetString;function isProtoString(e){if(!e){return false}var r=e.length;if(r<9){return false}if(e.charCodeAt(r-1)!==95||e.charCodeAt(r-2)!==95||e.charCodeAt(r-3)!==111||e.charCodeAt(r-4)!==116||e.charCodeAt(r-5)!==111||e.charCodeAt(r-6)!==114||e.charCodeAt(r-7)!==112||e.charCodeAt(r-8)!==95||e.charCodeAt(r-9)!==95){return false}for(var n=r-10;n>=0;n--){if(e.charCodeAt(n)!==36){return false}}return true}function compareByOriginalPositions(e,r,n){var t=strcmp(e.source,r.source);if(t!==0){return t}t=e.originalLine-r.originalLine;if(t!==0){return t}t=e.originalColumn-r.originalColumn;if(t!==0||n){return t}t=e.generatedColumn-r.generatedColumn;if(t!==0){return t}t=e.generatedLine-r.generatedLine;if(t!==0){return t}return strcmp(e.name,r.name)}r.compareByOriginalPositions=compareByOriginalPositions;function compareByGeneratedPositionsDeflated(e,r,n){var t=e.generatedLine-r.generatedLine;if(t!==0){return t}t=e.generatedColumn-r.generatedColumn;if(t!==0||n){return t}t=strcmp(e.source,r.source);if(t!==0){return t}t=e.originalLine-r.originalLine;if(t!==0){return t}t=e.originalColumn-r.originalColumn;if(t!==0){return t}return strcmp(e.name,r.name)}r.compareByGeneratedPositionsDeflated=compareByGeneratedPositionsDeflated;function strcmp(e,r){if(e===r){return 0}if(e===null){return 1}if(r===null){return-1}if(e>r){return 1}return-1}function compareByGeneratedPositionsInflated(e,r){var n=e.generatedLine-r.generatedLine;if(n!==0){return n}n=e.generatedColumn-r.generatedColumn;if(n!==0){return n}n=strcmp(e.source,r.source);if(n!==0){return n}n=e.originalLine-r.originalLine;if(n!==0){return n}n=e.originalColumn-r.originalColumn;if(n!==0){return n}return strcmp(e.name,r.name)}r.compareByGeneratedPositionsInflated=compareByGeneratedPositionsInflated;function parseSourceMapInput(e){return JSON.parse(e.replace(/^\)]}'[^\n]*\n/,""))}r.parseSourceMapInput=parseSourceMapInput;function computeSourceURL(e,r,n){r=r||"";if(e){if(e[e.length-1]!=="/"&&r[0]!=="/"){e+="/"}r=e+r}if(n){var t=urlParse(n);if(!t){throw new Error("sourceMapURL could not be parsed")}if(t.path){var o=t.path.lastIndexOf("/");if(o>=0){t.path=t.path.substring(0,o+1)}}r=join(urlGenerate(t),r)}return normalize(r)}r.computeSourceURL=computeSourceURL},596:(e,r,n)=>{n(341).h;r.SourceMapConsumer=n(327).SourceMapConsumer;n(990)},747:e=>{"use strict";e.exports=__nccwpck_require__(747)},622:e=>{"use strict";e.exports=__nccwpck_require__(622)}};var r={};function __nested_webpack_require_40201__(n){var t=r[n];if(t!==undefined){return t.exports}var o=r[n]={id:n,loaded:false,exports:{}};var i=true;try{e[n](o,o.exports,__nested_webpack_require_40201__);i=false}finally{if(i)delete r[n]}o.loaded=true;return o.exports}(()=>{__nested_webpack_require_40201__.nmd=e=>{e.paths=[];if(!e.children)e.children=[];return e}})();if(true)__nested_webpack_require_40201__.ab=__dirname+"/";var n={};(()=>{__nested_webpack_require_40201__(284).install()})();module.exports=n})();

/***/ }),

/***/ 357:
/***/ ((module) => {

"use strict";
module.exports = require("assert");;

/***/ }),

/***/ 129:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");;

/***/ }),

/***/ 619:
/***/ ((module) => {

"use strict";
module.exports = require("constants");;

/***/ }),

/***/ 417:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");;

/***/ }),

/***/ 614:
/***/ ((module) => {

"use strict";
module.exports = require("events");;

/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");;

/***/ }),

/***/ 87:
/***/ ((module) => {

"use strict";
module.exports = require("os");;

/***/ }),

/***/ 622:
/***/ ((module) => {

"use strict";
module.exports = require("path");;

/***/ }),

/***/ 413:
/***/ ((module) => {

"use strict";
module.exports = require("stream");;

/***/ }),

/***/ 669:
/***/ ((module) => {

"use strict";
module.exports = require("util");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(131);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map
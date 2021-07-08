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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Operations = void 0;
const path = __importStar(require("path"));
const exec_1 = require("./utils/exec");
const constant_1 = require("./constant");
const programmingLanguages_1 = require("./enums/programmingLanguages");
const fs = __importStar(require("fs-extra"));
const errors_1 = require("./errors");
const buildMapQuerier_1 = require("./buildMapQuerier");
const tl = __importStar(require("azure-pipelines-task-lib/task"));
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

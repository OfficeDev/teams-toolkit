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
const constant_1 = require("./constant");
const operations_1 = require("./operations");
const operationTypes_1 = require("./enums/operationTypes");
const words_to_list_1 = require("./utils/words-to-list");
const errors_1 = require("./errors");
const capabilities_1 = require("./enums/capabilities");
const base_error_1 = require("./base-error");
const fs = __importStar(require("fs-extra"));
const tl = __importStar(require("azure-pipelines-task-lib/task"));
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

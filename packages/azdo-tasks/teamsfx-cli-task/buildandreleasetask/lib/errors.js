"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalError = exports.SpfxZippedPackageMissingError = exports.LanguageError = exports.EnvironmentVariableError = exports.InputsError = void 0;
const base_error_1 = require("./base-error");
const constant_1 = require("./constant");
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

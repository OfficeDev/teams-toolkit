"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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

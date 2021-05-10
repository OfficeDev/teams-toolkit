// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import * as path from "path";
import AdmZip from "adm-zip";
import Mustache from "mustache";

import { CommonConstants, FunctionPluginPathInfo as PathInfo, FunctionPluginInfo as PluginInfo, RegularExpr, FunctionPluginPathInfo } from "../constants";
import { FunctionLanguage } from "../enums";
import { InfoMessages } from "../resources/message";
import { LanguageStrategyFactory } from "../language-strategy";
import { Logger } from "../utils/logger";
import { ScaffoldSteps, StepGroup, step } from "../resources/steps";
import { TemplateZipFallbackError, runWithErrorCatchAndThrow } from "../resources/errors";
import { fetchZipFromURL, getTemplateURL, unzip} from "../utils/templates-fetch";

export interface TemplateVariables {
    appName: string;
    functionName: string;
}

export class FunctionScaffold {
    public static async doesFunctionPathExist(componentPath: string, language: FunctionLanguage, entryName: string): Promise<boolean> {
        const entryFileOrFolderName: string = LanguageStrategyFactory.getStrategy(language).getFunctionEntryFileOrFolderName(entryName);
        return fs.pathExists(path.join(componentPath, entryFileOrFolderName));
    }

    public static async getTemplateZip(
        group: string,
        language: FunctionLanguage,
        scenario: string
    ): Promise<AdmZip> {
        try {
            const url: string = await getTemplateURL(group, language, scenario);
            Logger.info(InfoMessages.getTemplateFrom(url));

            const zip: AdmZip = await fetchZipFromURL(url);
            return zip;
        } catch(e) {
            Logger.error(e.toString());
            return await runWithErrorCatchAndThrow(new TemplateZipFallbackError(), async() => {
                const fileName: string = [group, language, scenario].join(PathInfo.templateZipNameSep) + PathInfo.templateZipExt;
                const zipPath: string = path.join(FunctionPluginPathInfo.rootPath, PathInfo.templateFolderPath, fileName);
                const data: Buffer = await fs.readFile(zipPath);
                const zip: AdmZip = new AdmZip(data);
                return zip;
            });
        }
    }

    private static async scaffoldFromZipPackage(
        componentPath: string,
        group: string,
        language: FunctionLanguage,
        scenario: string,
        variables: TemplateVariables,
        nameReplaceFn?: (filePath: string, data: Buffer) => string
    ): Promise<void> {
        const zip = await this.getTemplateZip(group, language, scenario);
        const _dataReplaceFn = (name: string, data: Buffer) => this.fulfill(name, data, variables);
        const _nameReplaceFn = (name: string, data: Buffer) => {
            name = nameReplaceFn ? nameReplaceFn(name, data) : name;
            return name.replace(RegularExpr.replaceTemplateExtName, CommonConstants.emptyString);
        };

        await unzip(zip, componentPath, _nameReplaceFn, _dataReplaceFn);
    }

    public static async scaffoldFunction(componentPath: string, language: FunctionLanguage,
        trigger: string, entryName: string, variables: TemplateVariables): Promise<void> {

        await step(StepGroup.ScaffoldStepGroup, ScaffoldSteps.ensureFunctionAppProject, async() =>
            await this.ensureFunctionAppProject(componentPath, language, variables)
        );

        await step(StepGroup.ScaffoldStepGroup, ScaffoldSteps.scaffoldFunction, async() =>
            await this.scaffoldFromZipPackage(
                componentPath, PluginInfo.templateTriggerGroupName, language, trigger, variables,
                (name: string) => name.replace(RegularExpr.replaceTemplateFileNamePlaceholder, entryName))
        );
    }

    /*
     * Always call ensure project before scaffold a function entry.
     */
    private static async ensureFunctionAppProject(componentPath: string, language: FunctionLanguage,
        variables: TemplateVariables): Promise<void> {
        const exists = await fs.pathExists(componentPath);
        if (exists) {
            Logger.info(InfoMessages.projectScaffoldAt(componentPath));
            return;
        }

        await this.scaffoldFromZipPackage(
            componentPath, PluginInfo.templateBaseGroupName, language, PluginInfo.templateBaseScenarioName, variables);
    }

    private static fulfill(filePath: string, data: Buffer, variables: TemplateVariables): Buffer | string {
        if (path.extname(filePath) === PathInfo.templateFileExt) {
            return Mustache.render(data.toString(), variables);
        }
        return data;
    }
}

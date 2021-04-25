// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import * as path from "path";
import { MsgLevel, PluginContext } from "fx-api";
import { WebSiteManagementClient } from "@azure/arm-appservice";
import AdmZip from "adm-zip";
import axios from "axios";
import ignore, { Ignore } from "ignore";

import { AzureInfo, Commands, CommonConstants, DefaultValues, FunctionPluginInfo, FunctionPluginPathInfo } from "../constants";
import {
    ConfigFunctionAppError,
    DotnetVersionError,
    FunctionAppOpError,
    PublishCredentialError,
    UploadZipError,
    ZipError,
    runWithErrorCatchAndThrow
} from "../resources/errors";
import { DeploySteps, StepGroup, step } from "../resources/steps";
import { DialogUtils } from "../utils/dialog";
import { ErrorMessages, InfoMessages } from "../resources/message";
import { FunctionLanguage } from "../enums";
import { LanguageStrategyFactory } from "../language-strategy";
import { Logger } from "../utils/logger";
import { WebAppsListPublishingCredentialsResponse } from "@azure/arm-appservice/esm/models";
import { execute } from "../utils/execute";
import { forEachFileAndDir } from "../utils/dir-walk";
import { requestWithRetry } from "../utils/templates-fetch";
import { BackendExtensionsInstaller } from "../utils/depsChecker/backendExtensionsInstall";
import { DotnetChecker } from "../utils/depsChecker/dotnetChecker";
import { funcPluginAdapter } from "../utils/depsChecker/funcPluginAdapter";
import { funcPluginLogger } from "../utils/depsChecker/funcPluginLogger";
import { funcPluginTelemetry } from "../utils/depsChecker/funcPluginTelemetry";

export class FunctionDeploy {

    public static async getLastDeploymentTime(componentPath: string): Promise<Date> {
        const deploymentInfoDir = path.join(componentPath, FunctionPluginPathInfo.funcDeploymentFolderName);
        const deploymentInfoPath = path.join(deploymentInfoDir, FunctionPluginPathInfo.funcDeploymentInfoFileName);
        const lastFunctionDeployJson = await fs.readJSON(deploymentInfoPath);
        return new Date(lastFunctionDeployJson.time);
    }

    public static async hasUpdatedContent(componentPath: string, language: FunctionLanguage): Promise<boolean> {
        const folderFilter = LanguageStrategyFactory.getStrategy(language).hasUpdatedContentFilter;

        try {
            const lastFunctionDeployTime = await this.getLastDeploymentTime(componentPath);
            // Always ignore node_modules folder and the file ignored both by git and func.
            const defaultIgnore = ignore().add(FunctionPluginPathInfo.npmPackageFolderName);
            const funcIgnore = await this.prepareIgnore(componentPath, FunctionPluginPathInfo.funcIgnoreFileName);
            const gitIgnore = await this.prepareIgnore(componentPath, FunctionPluginPathInfo.gitIgnoreFileName);

            let changed = false;
            await forEachFileAndDir(componentPath,
                (itemPath: string, stats: fs.Stats) => {
                    // Don't check the modification time of .deployment folder.
                    const relativePath = path.relative(componentPath, itemPath);

                    if (relativePath &&
                        !defaultIgnore.test(relativePath).ignored &&
                        !(funcIgnore.test(relativePath).ignored && gitIgnore.test(relativePath).ignored) &&
                        lastFunctionDeployTime < stats.mtime) {
                        changed = true;
                        // Return true to stop walking.
                        return true;
                    }
                },
                folderFilter);
            return changed;
        } catch (e) {
            // Failed to check updated, but it doesn't block the deployment.
            return true;
        }
    }

    public static async build(componentPath: string, language: FunctionLanguage): Promise<void> {
        for (const commandItem of LanguageStrategyFactory.getStrategy(language).buildCommands) {
            const command: string = commandItem.command;
            const relativePath: string = commandItem.relativePath;
            const absolutePath: string = path.join(componentPath, relativePath);
            await execute(command, absolutePath);
        }
    }

    public static async installFuncExtensions(componentPath: string, language: FunctionLanguage): Promise<void> {
        if (LanguageStrategyFactory.getStrategy(language).skipFuncExtensionInstall) {
            return;
        }

        const binPath = path.join(componentPath, FunctionPluginPathInfo.functionExtensionsFolderName);
        const dotnetChecker = new DotnetChecker(funcPluginAdapter, funcPluginLogger, funcPluginTelemetry);
        const backendExtensionsInstaller = new BackendExtensionsInstaller(dotnetChecker, funcPluginLogger);
        await backendExtensionsInstaller.install(componentPath, FunctionPluginPathInfo.functionExtensionsFileName, binPath);
    }

    public static async deployFunction(
        client: WebSiteManagementClient, componentPath: string, functionAppName: string,
        language: FunctionLanguage, resourceGroupName: string): Promise<void> {

        const deployTime: Date = new Date();

        // To parallel execute the three tasks, we first create all and then await them.
        const publishRelativePath: string = LanguageStrategyFactory.getStrategy(language).deployFolderRelativePath;
        const publishAbsolutePath: string = path.join(componentPath, publishRelativePath);

        const zip: AdmZip =
            await runWithErrorCatchAndThrow(new ZipError(), async () =>
                await step(StepGroup.DeployStepGroup, DeploySteps.generateZip, async () =>
                    await this.generateFunctionZip(publishAbsolutePath)
                )
            );

        const publishCred: WebAppsListPublishingCredentialsResponse =
            await runWithErrorCatchAndThrow(new PublishCredentialError(), async () =>
                await step(StepGroup.DeployStepGroup, DeploySteps.fetchCredential, async () =>
                    await client.webApps.listPublishingCredentials(resourceGroupName, functionAppName)
                )
            );

        await runWithErrorCatchAndThrow(new ConfigFunctionAppError(), async () =>
            await step(StepGroup.DeployStepGroup, DeploySteps.checkFuncAppSettings, async () =>
                this.checkRunFromPackageSetting(client, resourceGroupName, functionAppName)
            )
        );

        const zipContent = zip.toBuffer();
        const username = publishCred.publishingUserName;
        const password = publishCred.publishingPassword;

        Logger.debug(InfoMessages.uploadZipSize(zipContent.length));

        if (!password) {
            Logger.error(ErrorMessages.failToQueryPublishCred);
            throw new PublishCredentialError();
        }

        await runWithErrorCatchAndThrow(new UploadZipError(), async () =>
            await step(StepGroup.DeployStepGroup, DeploySteps.deploy, async () =>
                await requestWithRetry(DefaultValues.maxTryCount, async () =>
                    await axios.post(
                        AzureInfo.zipDeployURL(functionAppName),
                        zipContent,
                        {
                            headers: {
                                "Content-Type": "application/octet-stream",
                                "Cache-Control": "no-cache"
                            },
                            auth: {
                                "username": username,
                                "password": password
                            },
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity,
                            timeout: DefaultValues.deployTimeoutInMs
                        }
                    )
                )
            )
        );

        await runWithErrorCatchAndThrow(new FunctionAppOpError("restart"), async () =>
            await step(StepGroup.DeployStepGroup, DeploySteps.restart, async () =>
                await client.webApps.restart(resourceGroupName, functionAppName)
            )
        );

        await runWithErrorCatchAndThrow(new FunctionAppOpError("sync triggers"), async () =>
            await step(StepGroup.DeployStepGroup, DeploySteps.syncTrigger, async () => {
                // TODO: combine with requestWithRetry
                let tryCount = 0;
                while (tryCount++ < DefaultValues.maxTryCount) {
                    try {
                        await client.webApps.syncFunctionTriggers(resourceGroupName, functionAppName);
                        break;
                    } catch (e) {
                        /* Workaround: syncFunctionTriggers throw exception even for response 200 */
                        if (e.response?.status === 200 || e.response?.status === 201) {
                            break;
                        }
                        if (tryCount === DefaultValues.maxTryCount) {
                            throw e;
                        }
                    }
                }
                if (tryCount > 1) {
                    Logger.info(InfoMessages.succeedWithRetry("sync triggers", tryCount));
                }
            })
        );

        await this.saveDeploymentInfo(componentPath, zipContent, deployTime);
    }

    private static async saveDeploymentInfo(componentPath: string, zipContent: Buffer, deployTime: Date): Promise<void> {
        const deploymentInfoDir = path.join(componentPath, FunctionPluginPathInfo.funcDeploymentFolderName);
        const deploymentInfoPath = path.join(deploymentInfoDir, FunctionPluginPathInfo.funcDeploymentInfoFileName);
        const deploymentZipCache = path.join(deploymentInfoDir, FunctionPluginPathInfo.funcDeploymentZipCacheFileName);

        await fs.ensureDir(deploymentInfoDir);
        let lastFunctionDeployJson: any = {};
        try {
            lastFunctionDeployJson = await fs.readJSON(deploymentInfoPath);
        } catch {
            // It's fine if failed to read json from the deployment file.
        }

        lastFunctionDeployJson.time = deployTime;

        try {
            await fs.writeJSON(deploymentInfoPath, lastFunctionDeployJson);
            await fs.writeFile(deploymentZipCache, zipContent);
        } catch {
            // Deploy still succeeded even we failed to record it.
        }
    }

    private static async loadLastDeploymentZipCache(componentPath: string): Promise<AdmZip | undefined> {
        const deploymentInfoDir = path.join(componentPath, FunctionPluginPathInfo.funcDeploymentFolderName);
        const deploymentZipCache = path.join(deploymentInfoDir, FunctionPluginPathInfo.funcDeploymentZipCacheFileName);
        try {
            const content = await fs.readFile(deploymentZipCache);
            const zip = new AdmZip(content);
            Logger.info(InfoMessages.reuseZipNotice);
            return zip;
        } catch {
            // Failed to load cache, it doesn't block deployment.
        }
        return undefined;
    }

    public static removeLegacyFileInZip(zip: AdmZip, existenceFiles: Set<string>): void {
        zip.getEntries().filter(entry => !existenceFiles.has(entry.name)).forEach(entry => {
            zip.deleteFile(entry.name);
        });
    }

    private static async generateFunctionZip(componentPath: string) {
        // The granularity of time store in zip is 2-seconds.
        // To compare it with mtime in fs.Stats, we need to normalize them into same granularity.
        const normalizeTime = (t: number) => Math.floor(t / CommonConstants.zipTimeMSGranularity);

        const zip = (await this.loadLastDeploymentZipCache(componentPath)) || new AdmZip();
        const ig = await this.prepareIgnore(componentPath, FunctionPluginPathInfo.funcIgnoreFileName);
        const tasks: Promise<void>[] = [];
        const zipFiles = new Set<string>();

        const addFileIntoZip = async (zip: AdmZip, filePath: string, zipPath: string, stats?: fs.Stats) => {
            const content = await fs.readFile(filePath);
            zip.addFile(zipPath, content);
            if (stats) {
                (zip.getEntry(zipPath)!.header as any).time = stats.mtime;
            }
        };

        await forEachFileAndDir(componentPath, (itemPath: string, stats: fs.Stats) => {
            const relativePath: string = path.relative(componentPath, itemPath);
            if (relativePath && !stats.isDirectory() && ig.filter([relativePath]).length > 0) {
                zipFiles.add(relativePath);

                const entry = zip.getEntry(relativePath);
                if (entry) {
                    // The header is an object, the ts declare of adm-zip is wrong.
                    const header = entry.header as any;
                    const mtime = header && header.time;
                    // Some files' mtime in node_modules are too old, which may be invalid,
                    // so we arbitrarily add a limitation to update this kind of files.
                    // If mtime is valid and the two mtime is same in two-seconds, we think the two are same file.
                    if (mtime >= CommonConstants.latestTrustMtime &&
                        normalizeTime(mtime.getTime()) === normalizeTime(stats.mtime.getTime())) {
                        return;
                    }

                    // Delete the entry because the file has been updated.
                    zip.deleteFile(relativePath);
                }

                // If fail to reuse cached entry, load it from disk.
                const fullPath = path.join(componentPath, relativePath);
                const task = addFileIntoZip(zip, fullPath, relativePath, stats);
                tasks.push(task);
            }
        });

        await Promise.all(tasks);
        this.removeLegacyFileInZip(zip, zipFiles);

        return zip;
    }

    // If we can find an ignore file, parse it and use it for zip generation.
    private static async prepareIgnore(componentPath: string, fileName: string): Promise<Ignore> {
        const ignoreFilePath = path.join(componentPath, fileName);
        const ig = ignore().add(FunctionPluginPathInfo.funcDeploymentFolderName);

        if (await fs.pathExists(ignoreFilePath)) {
            const ignoreFileContent = await fs.readFile(ignoreFilePath);
            ignoreFileContent.toString()
                .split("\n")
                .forEach(line => ig.add(line.trim()));
        }

        return ig;
    }

    private static async checkRunFromPackageSetting(
        client: WebSiteManagementClient, resourceGroupName: string, azureFuncName: string) {
        const appSettings = await client.webApps.listApplicationSettings(resourceGroupName, azureFuncName);

        if (!appSettings.properties) {
            appSettings.properties = {};
        }

        if (appSettings.properties[AzureInfo.runFromPackageSettingKey] !== AzureInfo.runFromPackageEnabled) {
            appSettings.properties[AzureInfo.runFromPackageSettingKey] = AzureInfo.runFromPackageEnabled;
            await client.webApps.updateApplicationSettings(resourceGroupName, azureFuncName, appSettings);
        }
    }
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureSolutionSettings, ConfigFolderName, PluginContext, TeamsAppManifest, Platform } from "fx-api";
import { AppStudioClient } from "./appStudio";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import { Constants } from "./constants";
import { IAppDefinition } from "../../solution/fx-solution/appstudio/interface";
import { REMOTE_TEAMS_APP_ID } from "../../solution/fx-solution/constants";
import AdmZip from "adm-zip";
import * as fs from "fs-extra";

export class AppStudioPluginImpl {

    public async validateManifest(ctx: PluginContext, manifestString: string): Promise<string[]> {
        const appStudioToken = await ctx?.appStudioToken?.getAccessToken();
        return await AppStudioClient.validateManifest(manifestString, appStudioToken!);
    }

    public async buildTeamsAppPackage(ctx: PluginContext, appDirectory: string, manifestString: string): Promise<string> {
        const status = await fs.lstat(appDirectory);
        if (!status.isDirectory()) {
            throw AppStudioResultFactory.UserError(AppStudioError.NotADirectoryError.name, AppStudioError.NotADirectoryError.message(appDirectory));
        }
        const manifest: TeamsAppManifest = JSON.parse(manifestString);
        const colorFile = this.isSPFxProject(ctx) ? `${ctx.root}/SPFx/teams/${manifest.icons.color}` : `${appDirectory}/${manifest.icons.color}`;
        
        try {
            const colorFileState = await fs.stat(colorFile);
            if (!colorFileState.isFile()) {
                throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(colorFile));
            }
        } catch (error) {
            throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(colorFile));
        }
        
        const outlineFile = this.isSPFxProject(ctx) ? `${ctx.root}/SPFx/teams/${manifest.icons.outline}` : `${appDirectory}/${manifest.icons.outline}`;
        try {
            const outlineFileState = await fs.stat(outlineFile);
            if (!outlineFileState.isFile()) {
                throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(outlineFile));
            }
        } catch (error) {
            throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(outlineFile));
        }
        
        const zip = new AdmZip();
        zip.addFile(Constants.MANIFEST_FILE, Buffer.from(manifestString));
        zip.addLocalFile(colorFile);
        zip.addLocalFile(outlineFile);
        
        const zipFileName = `${appDirectory}/appPackage.zip`;
        zip.writeZip(zipFileName);

        if (this.isSPFxProject(ctx)) {
            await fs.copyFile(zipFileName, `${ctx.root}/SPFx/teams/TeamsSPFxApp.zip`);
        }

        return zipFileName;
    }

    public async publish(ctx: PluginContext): Promise<string> {
        let appDirectory: string | undefined = undefined;
        let manifestString: string | undefined = undefined;

        // For vs platform, read the local manifest.json file
        // For cli/vsc platform, get manifest from ctx
        if (ctx.platform === Platform.VS) {
            appDirectory = ctx.answers?.getString(Constants.PUBLISH_PATH_QUESTION);
            const manifestFile = `${appDirectory}/${Constants.MANIFEST_FILE}`;
            try {
                const manifestFileState = await fs.stat(manifestFile);
                if (manifestFileState.isFile()) {
                    manifestString = (await fs.readFile(manifestFile)).toString();
                } else {
                    throw AppStudioResultFactory.SystemError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(manifestFile));
                }
            } catch (error) {
                throw AppStudioResultFactory.SystemError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(manifestFile));
            }
        } else {
            appDirectory = `${ctx.root}/.${ConfigFolderName}`;
            manifestString = JSON.stringify(ctx.app);
        }

        if (!appDirectory) {
            throw AppStudioResultFactory.SystemError(AppStudioError.ParamUndefinedError.name, AppStudioError.ParamUndefinedError.message(Constants.PUBLISH_PATH_QUESTION));
        }

        const manifest = JSON.parse(manifestString);
        const publishProgress = ctx.dialog?.createProgressBar(
            `Publishing ${manifest.name.short}`,
            3,
        );
        
        try {
            // Validate manifest
            await publishProgress?.start("Validating manifest file");
            const validationResult = await this.validateManifest(ctx, manifestString!);
            if (validationResult.length > 0) {
                throw AppStudioResultFactory.UserError(AppStudioError.ValidationFailedError.name, AppStudioError.ValidationFailedError.message(validationResult));
            }

            // Update App in App Studio
            let remoteTeamsAppId: string | undefined = undefined;
            if (ctx.platform === Platform.VS) {
                remoteTeamsAppId = ctx.answers?.getString(Constants.REMOTE_TEAMS_APP_ID);
            } else {
                remoteTeamsAppId = ctx.configOfOtherPlugins.get("solution")?.get(REMOTE_TEAMS_APP_ID) as string;
            }
            await publishProgress?.next(`Updating app definition for app ${remoteTeamsAppId} in app studio`);
            const manifest: TeamsAppManifest = JSON.parse(manifestString!);
            const appDefinition = this.convertToAppDefinition(manifest);
            let appStudioToken = await ctx?.appStudioToken?.getAccessToken();
            await AppStudioClient.updateTeamsApp(remoteTeamsAppId!, appDefinition, appStudioToken!);

            // Build Teams App package
            await publishProgress?.next(`Building Teams app package in ${appDirectory}.`);
            const appPackage = await this.buildTeamsAppPackage(ctx, appDirectory, manifestString!);

            // Publish Teams App
            await publishProgress?.next(`Publishing ${manifest.name.short}`);
            appStudioToken = await ctx.appStudioToken?.getAccessToken();
            const appContent = await fs.readFile(appPackage);
            const appIdInAppCatalog = await AppStudioClient.publishTeamsApp(remoteTeamsAppId!, appContent, appStudioToken!);
            return appIdInAppCatalog;
        } finally {
            await publishProgress?.end();
        }
    }

    private convertToAppDefinition(appManifest: TeamsAppManifest): IAppDefinition {
        const appDefinition: IAppDefinition = {
            appName: appManifest.name.short,
            validDomains: appManifest.validDomains,
        };

        appDefinition.appId = appManifest.id;

        appDefinition.appName = appManifest.name.short;
        appDefinition.shortName = appManifest.name.short;
        appDefinition.version = appManifest.version;

        appDefinition.packageName = appManifest.packageName;
        appDefinition.websiteUrl = appManifest.developer.websiteUrl;
        appDefinition.privacyUrl = appManifest.developer.privacyUrl;
        appDefinition.termsOfUseUrl = appManifest.developer.termsOfUseUrl;

        appDefinition.shortDescription = appManifest.description.short;
        appDefinition.longDescription = appManifest.description.full;

        appDefinition.developerName = appManifest.developer.name;

        appDefinition.staticTabs = appManifest.staticTabs;
        appDefinition.configurableTabs = appManifest.configurableTabs;

        appDefinition.bots = appManifest.bots;

        if (appManifest.webApplicationInfo) {
            appDefinition.webApplicationInfoId = appManifest.webApplicationInfo.id;
            appDefinition.webApplicationInfoResource = appManifest.webApplicationInfo.resource;
        }

        return appDefinition;
    }

    private isSPFxProject(ctx: PluginContext): boolean {
        const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings).activeResourcePlugins;
        return selectedPlugins.indexOf("fx-resource-spfx") !== -1;
    }
}
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { PluginContext, TeamsAppManifest } from "fx-api";
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

    public async buildTeamsAppPackage(appDirectory: string): Promise<string> {
        const status = await fs.lstat(appDirectory);
        if (!status.isDirectory()) {
            throw AppStudioResultFactory.UserError(AppStudioError.NotADirectoryError.name, AppStudioError.NotADirectoryError.message(appDirectory));
        }
        const manifestFile = `${appDirectory}/${Constants.MANIFEST_REMOTE}`;
        const manifestFileState = await fs.stat(manifestFile);
        if (!manifestFileState.isFile()) {
            throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(manifestFile));
        }
        const manifest: TeamsAppManifest = await fs.readJSON(manifestFile);
        const colorFile = `${appDirectory}/${manifest.icons.color}`;
        const colorFileState = await fs.stat(colorFile);
        if (!colorFileState.isFile()) {
            throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(colorFile));
        }
        const outlineFile = `${appDirectory}/${manifest.icons.outline}`;
        const outlineFileState = await fs.stat(outlineFile);
        if (!outlineFileState.isFile()) {
            throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(outlineFile));
        }
        
        const zip = new AdmZip();
        zip.addLocalFile(manifestFile, "", Constants.MANIFEST_FILE);
        zip.addLocalFile(colorFile);
        zip.addLocalFile(outlineFile);
        
        const zipFileName = `${appDirectory}/appPackage.zip`;
        zip.writeZip(zipFileName);
        return zipFileName;
    }

    public async publish(ctx: PluginContext): Promise<string> {
        const publishProgress = ctx.dialog?.createProgressBar(
            `Publishing ${ctx.app.name.short}`,
            3,
        );
        // Validate manifest
        try {
            await publishProgress?.start("Validating manifest file");
            const appDirectory = ctx.answers?.getString(Constants.PUBLISH_PATH_QUESTION);
            if (!appDirectory) {
                throw AppStudioResultFactory.SystemError(AppStudioError.ParamUndefinedError.name, AppStudioError.ParamUndefinedError.message(Constants.PUBLISH_PATH_QUESTION));
            }
            const manifestFile = `${appDirectory}/${Constants.MANIFEST_REMOTE}`;
            const manifestFileState = await fs.stat(manifestFile);
            if (!manifestFileState.isFile()) {
                throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(manifestFile));
            }
            const validationResult = await this.validateManifest(ctx, (await fs.readFile(manifestFile)).toString());
            if (validationResult.length > 0) {
                throw AppStudioResultFactory.UserError(AppStudioError.ValidationFailedError.name, AppStudioError.ValidationFailedError.message(validationResult));
            }

            // Update App in App Studio
            const remoteTeamsAppId = ctx.config.getString(REMOTE_TEAMS_APP_ID);
            await publishProgress?.next(`Updating app definition for app ${remoteTeamsAppId} in app studio`);
            const manifest: TeamsAppManifest = await fs.readJSON(manifestFile);
            const appDefinition = this.convertToAppDefinition(manifest);
            let appStudioToken = await ctx?.appStudioToken?.getAccessToken();
            await AppStudioClient.updateTeamsApp(remoteTeamsAppId!, appDefinition, appStudioToken!);

            // Build Teams App package
            await publishProgress?.next(`Building Teams app package in ${appDirectory}.`);
            const appPackage = await this.buildTeamsAppPackage(appDirectory);

            // Publish Teams App
            await publishProgress?.next(`Publishing ${ctx.app.name.short}`);
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
}
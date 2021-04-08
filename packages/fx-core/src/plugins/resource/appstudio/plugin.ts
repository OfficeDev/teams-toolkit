// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, PluginContext, Result, TeamsAppManifest } from "fx-api";
import { AppStudioClient } from "./appStudio";
import { AppStudioError } from "./errors";
import { AppStudioResultFactory } from "./results";
import { Constants } from "./constants";
import { IAppDefinition } from "../../solution/fx-solution/appstudio/interface";
import AdmZip from "adm-zip";
import Ajv from "ajv";
import * as fs from "fs-extra";

export class AppStudioPluginImpl {
    private manifestSchema = require("./../../resource/MicrosoftTeams.schema.json");
    private ajv = new Ajv();
    private validate = this.ajv.compile(this.manifestSchema);

    public async validateManifest(manifestString: string): Promise<string[]> {
        const valid = this.validate(manifestString);
        if (!valid && this.validate.errors) {
            return this.validate.errors.map(error => error.keyword + error.message);
        } else {
            return [];
        }
    }

    public async buildTeamsAppPackage(appDirectory: string): Promise<string> {
        const status = fs.lstatSync(appDirectory);
        if (!status.isDirectory()) {
            throw AppStudioResultFactory.UserError(AppStudioError.NotADirectoryError.name, AppStudioError.NotADirectoryError.message(appDirectory));
        }
        let manifestFile = `${appDirectory}/${Constants.MANIFEST_REMOTE}`;
        if (!fs.existsSync(manifestFile)) {
            throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(manifestFile));
        }
        const manifest: TeamsAppManifest = await fs.readJSON(manifestFile);
        let colorFile = `${appDirectory}/${manifest.icons.color}`;
        if (!fs.existsSync(colorFile)) {
            throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(colorFile));
        }
        const outlineFile = `${appDirectory}/${manifest.icons.outline}`;
        if (!fs.existsSync(outlineFile)) {
            throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(outlineFile));
        }
        
        const zip = new AdmZip();
        zip.addLocalFile(manifestFile);
        zip.addLocalFile(colorFile);
        zip.addLocalFile(outlineFile);
        
        const zipFileName = `${appDirectory}/appPackage.zip`;
        zip.writeZip(zipFileName);
        return zipFileName;
    }

    public async publish(ctx: PluginContext): Promise<string> {
        // Validate manifest
        const appDirectory = ctx.answers?.getString(Constants.PUBLISH_PATH_QUESTION);
        if (!appDirectory) {
            throw AppStudioResultFactory.SystemError(AppStudioError.ParamUndefinedError.name, AppStudioError.ParamUndefinedError.message(Constants.PUBLISH_PATH_QUESTION));
        }
        let manifestFile = `${appDirectory}/${Constants.MANIFEST_REMOTE}`;
        if (!fs.existsSync(manifestFile)) {
            throw AppStudioResultFactory.UserError(AppStudioError.FileNotFoundError.name, AppStudioError.FileNotFoundError.message(manifestFile));
        }
        const validationResult = await this.validateManifest((await fs.readFile(manifestFile)).toString());
        if (validationResult.length > 0) {
            throw AppStudioResultFactory.UserError(AppStudioError.ValidationFailedError.name, AppStudioError.ValidationFailedError.message(validationResult));
        }

        // Update App in App Studio
        const manifest: TeamsAppManifest = await fs.readJSON(manifestFile);
        const appDefinition = this.convertToAppDefinition(manifest);
        let appStudioToken = await ctx?.appStudioToken?.getAccessToken();
        await AppStudioClient.updateTeamsApp(manifest.id, appDefinition, appStudioToken!);

        // Build Teams App package
        const appPackage = await this.buildTeamsAppPackage(appDirectory);
        
        // Publish Teams App
        appStudioToken = await ctx?.appStudioToken?.getAccessToken();
        const fileBuffer = Buffer.from(appPackage, "base64");
        const teamsAppId = await AppStudioClient.publishTeamsApp(manifest.id, fileBuffer, appStudioToken!);
        return teamsAppId;
    }

    private convertToAppDefinition(appManifest: TeamsAppManifest): IAppDefinition {
        let appDefinition: IAppDefinition = {
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
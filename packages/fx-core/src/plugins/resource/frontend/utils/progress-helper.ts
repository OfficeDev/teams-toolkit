// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler, PluginContext } from "fx-api";
import { Messages } from "../resources/messages";

export const ScaffoldSteps = {
    Scaffold: Messages.ProgressScaffold,
};

export const ProvisionSteps = {
    CreateStorage: Messages.ProgressCreateStorage,
    Configure: Messages.ProgressConfigure,
};

export const PreDeploySteps = {
    CheckStorage: Messages.ProgressCheckStorage,
};

export const DeploySteps = {
    NPMInstall: Messages.ProgressNPMInstall,
    Build: Messages.ProgressBuild,
    getSrcAndDest: Messages.ProgressGetSrcAndDest,
    Clear: Messages.ProgressClear,
    Upload: Messages.ProgressUpload,
};

export class ProgressHelper {
    static scaffoldProgress: IProgressHandler | undefined;
    static provisionProgress: IProgressHandler | undefined;
    static preDeployProgress: IProgressHandler | undefined;
    static deployProgress: IProgressHandler | undefined;

    static async startScaffoldProgressHandler(ctx: PluginContext): Promise<IProgressHandler | undefined> {
        await this.scaffoldProgress?.end();

        this.scaffoldProgress = ctx.dialog?.createProgressBar(
            Messages.ScaffoldProgressTitle,
            Object.entries(ScaffoldSteps).length,
        );
        await this.scaffoldProgress?.start(Messages.ProgressStart);
        return this.scaffoldProgress;
    }

    static async startProvisionProgressHandler(ctx: PluginContext): Promise<IProgressHandler | undefined> {
        await this.provisionProgress?.end();

        this.provisionProgress = ctx.dialog?.createProgressBar(
            Messages.ProvisionProgressTitle,
            Object.entries(ProvisionSteps).length,
        );
        await this.provisionProgress?.start(Messages.ProgressStart);
        return this.provisionProgress;
    }

    static async createPreDeployProgressHandler(ctx: PluginContext): Promise<IProgressHandler | undefined> {
        await this.preDeployProgress?.end();

        this.preDeployProgress = ctx.dialog?.createProgressBar(
            Messages.PreDeployProgressTitle,
            Object.entries(PreDeploySteps).length,
        );
        await this.preDeployProgress?.start(Messages.ProgressStart);
        return this.preDeployProgress;
    }

    static async startDeployProgressHandler(ctx: PluginContext): Promise<IProgressHandler | undefined> {
        await this.deployProgress?.end();

        this.deployProgress = ctx.dialog?.createProgressBar(
            Messages.DeployProgressTitle,
            Object.entries(DeploySteps).length,
        );
        await this.deployProgress?.start(Messages.ProgressStart);
        return this.deployProgress;
    }

    static async endAllHandlers(): Promise<void> {
        await this.endScaffoldProgress();
        await this.endProvisionProgress();
        await this.endPreDeployProgress();
        await this.endDeployProgress();
    }

    static async endScaffoldProgress(): Promise<void> {
        await this.scaffoldProgress?.end();
        this.scaffoldProgress = undefined;
    }

    static async endProvisionProgress(): Promise<void> {
        await this.provisionProgress?.end();
        this.provisionProgress = undefined;
    }

    static async endPreDeployProgress(): Promise<void> {
        await this.preDeployProgress?.end();
        this.preDeployProgress = undefined;
    }

    static async endDeployProgress(): Promise<void> {
        await this.deployProgress?.end();
        this.deployProgress = undefined;
    }
}

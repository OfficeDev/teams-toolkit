// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler, PluginContext } from "fx-api";
import { ProgressTitleMessage, PreDeployProgressMessage, DeployProgressMessage } from "./constants";

export class ProgressHelper {
    static preDeployProgress: IProgressHandler | undefined;
    static deployProgress: IProgressHandler | undefined;

    static async startPreDeployProgressHandler(ctx: PluginContext): Promise<IProgressHandler | undefined> {
        this.preDeployProgress = ctx.dialog?.createProgressBar(
            ProgressTitleMessage.PreDeployProgressTitle,
            Object.entries(PreDeployProgressMessage).length,
        );
        await this.preDeployProgress?.start("");
        return this.preDeployProgress;
    }

    static async startDeployProgressHandler(ctx: PluginContext): Promise<IProgressHandler | undefined> {
        await this.deployProgress?.end();

        this.deployProgress = ctx.dialog?.createProgressBar(
            ProgressTitleMessage.DeployProgressTitle,
            Object.entries(DeployProgressMessage).length,
        );
        await this.deployProgress?.start("");
        return this.deployProgress;
    }

    static async endAllHandlers(): Promise<void> {
        await this.endPreDeployProgress();
        await this.endDeployProgress();
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

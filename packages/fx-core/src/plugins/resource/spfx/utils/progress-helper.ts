// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler, PluginContext } from "@microsoft/teamsfx-api";
import { ProgressTitleMessage, PreDeployProgressMessage, DeployProgressMessage } from "./constants";

export class ProgressHelper {
    static preDeployProgress: IProgressHandler | undefined;

    static async startPreDeployProgressHandler(ctx: PluginContext): Promise<IProgressHandler | undefined> {
        this.preDeployProgress = ctx.dialog?.createProgressBar(
            ProgressTitleMessage.PreDeployProgressTitle,
            Object.entries(PreDeployProgressMessage).length,
        );
        await this.preDeployProgress?.start("");
        return this.preDeployProgress;
    }

    static async endAllHandlers(): Promise<void> {
        await this.endPreDeployProgress();
    }

    static async endPreDeployProgress(): Promise<void> {
        await this.preDeployProgress?.end();
        this.preDeployProgress = undefined;
    }
}

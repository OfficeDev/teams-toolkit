// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { IProgressHandler, PluginContext } from "teamsfx-api";
import { ProgressMessages, ProgressStep } from "../constants";

export class ProgressBar {
    private progressBarMap = new Map<ProgressStep, IProgressHandler>();

    public async init(step: ProgressStep, ctx: PluginContext): Promise<void> {
        if (step === ProgressStep.None) {
            return;
        }

        await this.progressBarMap.get(step)?.end();

        const progressBar = ctx.dialog?.createProgressBar(step, Object.keys(ProgressMessages[step]).length);

        if (progressBar) {
            this.progressBarMap.set(step, progressBar);
        }
        await progressBar?.start();
    }

    public async next(step: ProgressStep, detail: string): Promise<void> {
        if (step === ProgressStep.None) {
            return;
        }

        await this.progressBarMap.get(step)?.next(detail);
    }

    public async close(step: ProgressStep): Promise<void> {
        if (step === ProgressStep.None) {
            return;
        }
        
        await this.progressBarMap.get(step)?.end();
    }

    public async closeAll(): Promise<void> {
        for (const [type, bar] of this.progressBarMap) {
            await bar.end();
        }
    }
}

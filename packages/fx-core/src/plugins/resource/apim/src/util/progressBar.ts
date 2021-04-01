// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { IProgressHandler, PluginContext } from 'teamsfx-api';
import { ProgressMessages, ProgressStep } from '../constants';

export class ProgressBar {
    private progressBarMap = new Map<ProgressStep, IProgressHandler>();

    public async init(step: ProgressStep, ctx: PluginContext) {
        await this.progressBarMap.get(step)?.end();

        let progressBar = ctx.dialog?.createProgressBar(
            step,
            Object.keys(ProgressMessages[step]).length,
        );

        if (progressBar) {
            this.progressBarMap.set(step, progressBar);
        }
        await progressBar?.start();
    }

    public async next(step: ProgressStep, detail: string) {
        await this.progressBarMap.get(step)?.next(detail);
    }

    public async close(step: ProgressStep): Promise<void> {
        await this.progressBarMap.get(step)?.end();
    }

    public async closeAll(): Promise<void> {
        for (let [type, bar] of this.progressBarMap) {
            await bar.end();
        }
    }
}

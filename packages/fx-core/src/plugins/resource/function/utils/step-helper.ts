// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Dialog, IProgressHandler } from "fx-api";

export class StepHelper {
    progressHandler?: IProgressHandler;

    message: string;
    title: string;

    constructor (title: string) {
        this.title = title;
        this.message = "";
    }

    public async start(entireSteps: number, dialog?: Dialog) {
        this.progressHandler = dialog?.createProgressBar(this.title, entireSteps);
        await this.progressHandler?.start();
    }

    public async forward(message: string): Promise<void> {
        await this.progressHandler?.next(message);
    }

    public async end(): Promise<void> {
        await this.progressHandler?.end();
    }
}

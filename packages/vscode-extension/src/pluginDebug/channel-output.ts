/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.
 * -------------------------------------------------------------------------------------------
 */

import * as vscode from 'vscode';
import commonlibLogger from "../commonlib/log";

export class ChannelOutput {
    readonly title: string;
    readonly content: string;
    readonly languageId: string;
    private outputChannel: vscode.OutputChannel | undefined;

    constructor(title: string, content: string, languageId: string) {
        this.title = title;
        this.content = content;
        this.languageId = languageId;
    }

    showCopilotLog(): void {
        this.outputChannel = commonlibLogger.outputChannel;
        this.outputChannel.show();
        this.outputChannel.appendLine(this.content);
    }
}
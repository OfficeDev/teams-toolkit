// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
 
import { Result } from "neverthrow";
import { FxError } from "../error";
export interface Dialog {
    /*
     * Platforms (such as VSCode, CLI) support this function to communicate with core.
     * There are 3 dialog types.
     *   1. Ask: core can ask platform for questions and platform will render UI for users to collect data.
     *      The return type is Answer.
     *   2. Show: core can let platform show some messages to users.
     *
     * Example 1 (ask for appType):
     *     await communicate(new DialogMsg(
     *          DialogType.Ask,
     *          {
     *              type: QuestionType.Radio,
     *              description: "Which type of Teams App do you want to develop?",
     *              defaultAnswer: "tab",
     *              options: ["tab", "bot", "message"],
     *          }
     *     ))
     *
     * Example 2 (show something):
     *     await communicate(new DialogMsg(
     *          DialogType.Show,
     *          {
     *              description: "Scaffold successfully!",
     *              level: MsgLevel.Info,
     *          }
     *     ))
     */
    communicate: (msg: DialogMsg) => Promise<DialogMsg>;

    /**
     * Create a new progress bar with the specified title and the number of steps. It will 
     * return a progress handler and you can use this handler to control the detail message 
     * of it.
     * ${currentStep} will increase from 0 to ${totalSteps}.
     * @param title the title of this progress bar.
     * @param totalSteps the number of steps.
     * @returns the handler of a progress bar
     */
    createProgressBar: (title: string, totalSteps: number) => IProgressHandler;
}

export interface IProgressHandler {
    /**
     * Start this progress bar. After calling it, the progress bar will be seen to users with 
     * ${currentStep} = 0 and ${detail} = detail.
     * @param detail the detail message of the next work.
     */
    start: (detail?: string) => Promise<void>;
    
    /**
     * Update the progress bar's message. After calling it, the progress bar will be seen to 
     * users with ${currentStep}++ and ${detail} = detail.
     * This func must be called after calling start().
     * @param detail the detail message of the next work.
     */
    next: (detail?: string) => Promise<void>;
    
    /**
     * End the progress bar. After calling it, the progress bar will disappear. This handler 
     * can be reused after calling end().
     */
    end: () => Promise<void>;
}

export enum MsgLevel {
    Info = "Info",
    Warning = "Warning",
    Error = "Error",
}

export interface IMessage {
    description: string;
    level: MsgLevel;
    items?: string[];
}

export enum QuestionType {
    Text = "Text",
    Radio = "radio",
    SelectFolder = "SelectFolder",
    OpenFolder = "OpenFolder",
    ExecuteCmd = "ExecuteCmd",
    OpenExternal = "OpenExternal",
    Confirm = "Confirm",
}

export interface IQuestion {
    type: QuestionType;
    description: string;
    defaultAnswer?: string;
    options?: string[];
    terminalName?: string; // for 'ExecuteCmd', specify the terminal name or undefined.
    validateInput?: (value: string) => string | undefined | null | Promise<string | undefined | null>;
    multiSelect?: boolean;
    password?: boolean;
    prompt?: string;
}

export interface IProgressStatus {
    message: string;
    increment?: number;
}

/**
 * Iprogress status
 * @deprecated
 */
export interface IProgress {
    title?: string; // A human-readable string which will be used to describe the
    cancellable?: boolean; // Controls if a cancel button should show to allow the user to cancel the long running operation
    progressIter: AsyncGenerator<IProgressStatus, Result<null, FxError>>; // An iterator of progress status
}

export type Answer = string | undefined;

export enum DialogType {
    Show = "Show",
    ShowProgress = "ShowProgress",
    Ask = "Ask",
    Answer = "Answer",
    Output = "Output",
}

export class DialogMsg {
    public dialogType: DialogType;
    public content: IMessage | IQuestion | IProgress | Answer;

    constructor(dialogType: DialogType, content: IMessage | IQuestion | IProgress | Answer) {
        this.dialogType = dialogType;
        // TODO: check the dialog type.
        this.content = content;
    }

    public getAnswer(): Answer | undefined {
        if (this.dialogType === DialogType.Answer && this.content !== undefined) {
            return this.content as Answer;
        }
        return undefined;
    }
}

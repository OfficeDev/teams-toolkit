import { Result } from 'neverthrow';
import { FxError } from '../error';
export interface Dialog {
    communicate: (msg: DialogMsg) => Promise<DialogMsg>;
    /**
     * Create a new progress bar with the specified title and the number of steps. It will
     * return a progress handler and you can use this handler to control the detail message
     * of it.
     * The message looks like `[TeamsFx Toolkit] ${title}: [${currentStep}/${totalSteps}] ${detail}`
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
export declare enum MsgLevel {
    Info = "Info",
    Warning = "Warning",
    Error = "Error"
}
export interface IMessage {
    description: string;
    level: MsgLevel;
}
export declare enum QuestionType {
    Text = "Text",
    Radio = "radio",
    SelectFolder = "SelectFolder",
    OpenFolder = "OpenFolder",
    ExecuteCmd = "ExecuteCmd",
    OpenExternal = "OpenExternal"
}
export interface IQuestion {
    type: QuestionType;
    description: string;
    defaultAnswer?: string;
    options?: string[];
    terminalName?: string;
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
    title?: string;
    cancellable?: boolean;
    progressIter: AsyncGenerator<IProgressStatus, Result<null, FxError>>;
}
export declare type Answer = string | undefined;
export declare enum DialogType {
    Show = "Show",
    ShowProgress = "ShowProgress",
    Ask = "Ask",
    Answer = "Answer",
    Output = "Output"
}
export declare class DialogMsg {
    dialogType: DialogType;
    content: IMessage | IQuestion | IProgress | Answer;
    constructor(dialogType: DialogType, content: IMessage | IQuestion | IProgress | Answer);
    getAnswer(): Answer | undefined;
}
//# sourceMappingURL=dialog.d.ts.map
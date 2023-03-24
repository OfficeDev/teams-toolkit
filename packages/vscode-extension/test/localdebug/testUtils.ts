import {
  Colors,
  FxError,
  InputTextConfig,
  InputTextResult,
  IProgressHandler,
  LogLevel,
  LogProvider,
  MultiSelectConfig,
  MultiSelectResult,
  ok,
  Result,
  RunnableTask,
  SelectFileConfig,
  SelectFileResult,
  SelectFilesConfig,
  SelectFilesResult,
  SelectFolderConfig,
  SelectFolderResult,
  SingleSelectConfig,
  SingleSelectResult,
  TaskConfig,
  TelemetryReporter,
  UserInteraction,
} from "@microsoft/teamsfx-api";

export const EventTypes = Object.freeze({
  TelemetryEvent: "TelemetryEvent",
  TelemetryErrorEvent: "TelemetryErrorEvent",
});
export type EventType = typeof EventTypes[keyof typeof EventTypes];

export interface TelemetryEventParams {
  type: EventType;
  eventName: string;
  properties?: { [key: string]: string };
  measurements?: { [key: string]: number };
}

export class MockUserInteraction implements UserInteraction {
  selectOption(config: SingleSelectConfig): Promise<Result<SingleSelectResult, FxError>> {
    throw new Error(`Method selectOption not implemented: ${JSON.stringify(config)}`);
  }

  selectOptions(config: MultiSelectConfig): Promise<Result<MultiSelectResult, FxError>> {
    throw new Error(`Method selectOptions not implemented: ${JSON.stringify(config)}`);
  }

  inputText(config: InputTextConfig): Promise<Result<InputTextResult, FxError>> {
    throw new Error(`Method inputText not implemented: ${JSON.stringify(config)}`);
  }

  selectFile(config: SelectFileConfig): Promise<Result<SelectFileResult, FxError>> {
    throw new Error(`Method selectFile not implemented: ${JSON.stringify(config)}`);
  }

  selectFiles(config: SelectFilesConfig): Promise<Result<SelectFilesResult, FxError>> {
    throw new Error(`Method selectFiles not implemented: ${JSON.stringify(config)}`);
  }

  selectFolder(config: SelectFolderConfig): Promise<Result<SelectFolderResult, FxError>> {
    throw new Error(`Method selectFolder not implemented: ${JSON.stringify(config)}`);
  }

  openUrl(link: string): Promise<Result<boolean, FxError>> {
    throw new Error(`Method openUrl not implemented: ${link}`);
  }

  async showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>>;

  async showMessage(
    level: "info" | "warn" | "error",
    message: string | Array<{ content: string; color: Colors }>,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string | undefined, FxError>> {
    return ok("");
  }

  createProgressBar(title: string, totalSteps: number): IProgressHandler {
    const handler: IProgressHandler = {
      start: async (detail?: string): Promise<void> => {},
      next: async (detail?: string): Promise<void> => {},
      end: async (): Promise<void> => {},
    };
    return handler;
  }

  async runWithProgress<T>(
    task: RunnableTask<T>,
    config: TaskConfig,
    ...args: any
  ): Promise<Result<T, FxError>> {
    return task.run(args);
  }
  async runCommand(args: {
    cmd: string;
    workingDirectory?: string;
    shell?: string;
    timeout?: number;
    env?: { [k: string]: string };
  }): Promise<Result<string, FxError>> {
    throw new Error(`Method openUrl not implemented: runCommand`);
  }
}

export class MockTelemetryReporter implements TelemetryReporter {
  events: TelemetryEventParams[] = [];

  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number },
    errorProps?: string[]
  ): void {
    this.events.push({ type: EventTypes.TelemetryErrorEvent, eventName, properties, measurements });
  }

  sendTelemetryEvent(
    eventName: string,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    this.events.push({ type: EventTypes.TelemetryEvent, eventName, properties, measurements });
  }

  sendTelemetryException(
    error: Error,
    properties?: { [key: string]: string },
    measurements?: { [key: string]: number }
  ): void {
    throw new Error("Not implemented");
  }

  resetEvents() {
    this.events = [];
  }
}

export class MockLogProvier implements LogProvider {
  async log(logLevel: LogLevel, message: string): Promise<boolean> {
    return true;
  }
  async trace(message: string): Promise<boolean> {
    return true;
  }
  async debug(message: string): Promise<boolean> {
    return true;
  }
  async info(message: string | Array<{ content: string; color: Colors }>): Promise<boolean> {
    return true;
  }
  async warning(message: string): Promise<boolean> {
    return true;
  }
  async error(message: string): Promise<boolean> {
    return true;
  }
  async fatal(message: string): Promise<boolean> {
    return true;
  }
}

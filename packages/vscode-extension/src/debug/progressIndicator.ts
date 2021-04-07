import { OutputChannel } from "vscode";

const downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime

export async function runWithProgressIndicator(
  outputChannel: OutputChannel,
  callback: () => Promise<void>
): Promise<void> {
  let timer: NodeJS.Timeout;
  try {
    timer = setInterval(() => outputChannel.append("."), downloadIndicatorInterval);
    await callback();
  } finally {
    outputChannel.appendLine("");
    clearTimeout(timer!);
  }
}

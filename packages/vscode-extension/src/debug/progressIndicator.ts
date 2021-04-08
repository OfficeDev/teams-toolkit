import { OutputChannel } from "vscode";

const downloadIndicatorInterval = 1000; // same as vscode-dotnet-runtime

export async function runWithProgressIndicator(
  outputChannel: OutputChannel,
  callback: () => Promise<void>
): Promise<void> {
  const timer = setInterval(() => outputChannel.append("."), downloadIndicatorInterval);
  try {
    await callback();
  } finally {
    outputChannel.appendLine("");
    clearTimeout(timer);
  }
}

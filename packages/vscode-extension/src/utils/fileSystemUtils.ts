// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function anonymizeFilePaths(stack?: string): string {
  if (!stack) {
    return "";
  }
  const filePathRegex = /\s\(([a-zA-Z]:(\\|\/)([^\\\/\s:]+(\\|\/))+|\/([^\s:\/]+\/)+)/g;
  const redactedErrorMessage = stack.replace(filePathRegex, " (<REDACTED: user-file-path>/");
  return redactedErrorMessage;
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import chalk from "chalk";

export function white(content: string): string {
  if (process.platform === "win32") return chalk.grey(content);
  return chalk.white(content);
}

export function space(num: number): string {
  return " ".repeat(num);
}

export function splitLongStringByWidth(content: string, width: number): string[] {
  return content.match(new RegExp(`.{1,${width}}`, "g"))!;
}

export function addChoiceDetail(
  output: string,
  detail: string,
  choiceNameLength: number,
  prefixWidth: number
): string {
  const terminalColumns = process.stdout.isTTY ? process.stdout.columns - 1 : 1000;
  const detailWidth = terminalColumns - prefixWidth - 4;
  if (detailWidth > 10) {
    const details = splitLongStringByWidth(detail, detailWidth);
    details.forEach((detail: string, i: number) => {
      if (i === 0) {
        output += space(prefixWidth - choiceNameLength) + white(detail);
      } else {
        output += "\n" + space(prefixWidth + 4) + white(detail);
      }
    });
  } else {
    const details = splitLongStringByWidth(detail, terminalColumns - 4);
    details.forEach((detail: string) => {
      output += "\n" + space(4) + white(detail);
    });
  }
  return output;
}

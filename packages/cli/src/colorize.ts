// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import chalk from "chalk";
import figures from "figures";

export enum TextType {
  Success = "success",
  Error = "error",
  Warning = "warning",
  Info = "info", // primary text
  Hyperlink = "hyperlink",
  Email = "email",
  Important = "important",
  Details = "details", // secondary text
  Commands = "commands", // commands, parameters, system inputs
}

export function colorize(message: string, type: TextType): string {
  if (!process.stdout.isTTY) {
    return message;
  }
  switch (type) {
    case TextType.Success:
      return chalk.greenBright(message);
    case TextType.Error:
      return chalk.redBright(message);
    case TextType.Warning:
      return chalk.yellowBright(message);
    case TextType.Info:
      return chalk.whiteBright(message);
    case TextType.Hyperlink:
      return chalk.cyanBright(message);
    case TextType.Email:
    case TextType.Important:
      return chalk.magentaBright(message);
    case TextType.Details:
      return chalk.gray(message);
    case TextType.Commands:
      return chalk.blueBright(message);
  }
}

export const SuccessText = colorize(`(${figures.tick}) Success: `, TextType.Success);
export const WarningText = colorize(`(${figures.warning}) Warning: `, TextType.Success);
export const ErrorPrefix = `(${figures.cross}) Error: `;

export function replaceTemplateString(template: string, ...args: string[]): string {
  let result = template;
  for (let i = 0; i < args.length; i++) {
    result = result.replace(`%s`, args[i]);
  }
  return result;
}

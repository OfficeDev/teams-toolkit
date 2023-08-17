// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AsyncPromptConfig,
  Separator,
  createPrompt,
  isDownKey,
  isEnterKey,
  isNumberKey,
  isUpKey,
  useKeypress,
  usePagination,
  usePrefix,
  useRef,
  useState,
} from "@inquirer/core";
import type {} from "@inquirer/type";
import ansiEscapes from "ansi-escapes";
import chalk from "chalk";
import figures from "figures";
import { addChoiceDetail } from "./utils";

export type Choice = {
  id: string;
  title: string;
  detail?: string;
  disabled?: boolean | string;
};

export type Config = AsyncPromptConfig & {
  choices: ReadonlyArray<Choice | Separator>;
  defaultValue?: string;
  pageSize?: number;
};

function isSelectableChoice(choice: undefined | Separator | Choice): choice is Choice {
  return choice != null && !Separator.isSeparator(choice) && !choice.disabled;
}

export const select = createPrompt((config: Config, done: (value: string) => void): string => {
  const { choices, defaultValue } = config;
  const firstRender = useRef(true);

  const prefix = usePrefix();
  const [status, setStatus] = useState("pending");
  const [cursorPosition, setCursorPos] = useState(() => {
    const startIndex = choices.findIndex(
      defaultValue
        ? (choice) => !Separator.isSeparator(choice) && choice.id === defaultValue
        : isSelectableChoice
    );
    if (startIndex < 0) {
      throw new Error("[select prompt] No selectable choices. All choices are disabled.");
    }

    return startIndex;
  });

  // Safe to assume the cursor position always point to a Choice.
  const choice = choices[cursorPosition] as Choice;

  useKeypress((key) => {
    if (isEnterKey(key)) {
      setStatus("done");
      done(choice.id);
    } else if (isUpKey(key) || isDownKey(key)) {
      let newCursorPosition = cursorPosition;
      const offset = isUpKey(key) ? -1 : 1;
      let selectedOption;

      while (!isSelectableChoice(selectedOption)) {
        newCursorPosition = (newCursorPosition + offset + choices.length) % choices.length;
        selectedOption = choices[newCursorPosition];
      }

      setCursorPos(newCursorPosition);
    } else if (isNumberKey(key)) {
      // Adjust index to start at 1
      const newCursorPosition = Number(key.name) - 1;

      // Abort if the choice doesn't exists or if disabled
      if (!isSelectableChoice(choices[newCursorPosition])) {
        return;
      }

      setCursorPos(newCursorPosition);
    }
  });

  let message: string = chalk.bold(config.message);
  if (firstRender.current) {
    message += chalk.dim(" (Use arrow keys)");
    firstRender.current = false;
  }

  const allChoices = choices
    .map((choice, index): string => {
      if (Separator.isSeparator(choice)) {
        return choice.separator;
      }

      if (choice.disabled) {
        const disabledLabel = typeof choice.disabled === "string" ? choice.disabled : "(disabled)";
        return chalk.dim(`--- ${choice.title} ${disabledLabel}`);
      }

      let prefixWidth = 1;
      (choices as Choice[]).forEach((choice) => {
        prefixWidth = Math.max(
          prefixWidth,
          choice.disabled || !choice.title ? 0 : choice.title.length + 1
        );
      });

      let output = "";
      if (index === cursorPosition) {
        output += chalk.blueBright(`${figures.radioOn} ${choice.title}`);
      } else {
        output += `${chalk.blueBright(figures.radioOff)} ${chalk.whiteBright(choice.title)}`;
      }

      if (choice.detail) {
        output = addChoiceDetail(output, choice.detail, choice.title.length, prefixWidth);
      }

      return output;
    })
    .join("\n");
  /// not infinit
  if (cursorPosition === 0) {
    usePagination(allChoices, {
      active: cursorPosition,
      pageSize: config.pageSize,
    });
  }
  const windowedChoices = usePagination(allChoices, {
    active: cursorPosition,
    pageSize: config.pageSize,
  });

  if (status === "done") {
    return `${prefix} ${message} ${chalk.cyan(choice.title)}`;
  }

  return `${prefix} ${message}\n${windowedChoices}${ansiEscapes.cursorHide}`;
});

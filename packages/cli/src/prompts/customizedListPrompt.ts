// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AsyncPromptConfig,
  Separator,
  createPrompt,
  isDownKey,
  isEnterKey,
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
  loop?: boolean;
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
        if (config.loop) {
          newCursorPosition = (newCursorPosition + offset + choices.length) % choices.length;
        } else {
          newCursorPosition = newCursorPosition + offset;
          if (newCursorPosition < 0) {
            newCursorPosition = 0;
          } else if (newCursorPosition >= choices.length) {
            newCursorPosition = choices.length - 1;
          }
        }
        selectedOption = choices[newCursorPosition];
      }

      setCursorPos(newCursorPosition);
    }
  });

  const message: string = chalk.bold(config.message);
  if (firstRender.current) {
    // message += chalk.dim(" (Use arrow keys)");
    firstRender.current = false;
  }

  const renderChoice = (choice: Choice, index: number) => {
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
      output += chalk.cyan(`${figures.radioOn} ${choice.title}`);
    } else {
      output += `${chalk.blueBright(figures.radioOff)} ${choice.title}`;
    }

    if (choice.detail) {
      output = addChoiceDetail(output, choice.detail, choice.title.length, prefixWidth);
    }

    return output;
  };

  const windowedChoices = usePagination({
    items: choices,
    active: cursorPosition,
    pageSize: config.pageSize,
    loop: false,
    renderItem: (item) => renderChoice(item.item as Choice, item.index),
  });

  if (status === "done") {
    return `${prefix} ${message} ${chalk.cyan(choice.title)}`;
  }

  return `${prefix} ${message}\n${windowedChoices}${ansiEscapes.cursorHide}`;
});

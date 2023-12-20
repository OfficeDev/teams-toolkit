// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AsyncPromptConfig,
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
import { addChoiceDetail, computePrefixWidth, nextPosition } from "./utils";

export type Choice = {
  id: string;
  title: string;
  detail?: string;
};

export type Config = AsyncPromptConfig & {
  choices: ReadonlyArray<Choice>;
  defaultValue?: string;
  pageSize?: number;
  loop?: boolean;
};

export const select = createPrompt((config: Config, done: (value: string) => void): string => {
  const { choices, defaultValue } = config;
  const firstRender = useRef(true);
  const prefix = usePrefix();
  const [status, setStatus] = useState("pending");
  const [cursorPosition, setCursorPos] = useState(() => {
    const startIndex = defaultValue ? choices.findIndex((choice) => choice.id === defaultValue) : 0;
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
      let selectedOption = undefined;

      while (!selectedOption) {
        newCursorPosition = nextPosition(
          newCursorPosition,
          offset,
          choices.length,
          config.loop === true
        );
        selectedOption = choices[newCursorPosition];
      }

      setCursorPos(newCursorPosition);
    }
  });

  const message: string = chalk.bold(config.message);
  if (firstRender.current) {
    firstRender.current = false;
  }
  const pageSize = config.pageSize || 7;
  const prefixWidth = computePrefixWidth(cursorPosition, pageSize, choices);
  const renderChoice = (choice: Choice, index: number) => {
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
    pageSize: pageSize,
    loop: false,
    renderItem: (item) => renderChoice(item.item as Choice, item.index),
  });

  if (status === "done") {
    return `${prefix} ${message} ${chalk.cyan(choice.title)}`;
  }

  return `${prefix} ${message}\n${windowedChoices}${ansiEscapes.cursorHide}`;
});

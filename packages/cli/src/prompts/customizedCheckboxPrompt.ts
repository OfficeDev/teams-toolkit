// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AsyncPromptConfig,
  createPrompt,
  isDownKey,
  isEnterKey,
  isNumberKey,
  isSpaceKey,
  isUpKey,
  useKeypress,
  usePagination,
  usePrefix,
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
  checked?: boolean;
};

export type Config = AsyncPromptConfig & {
  prefix?: string;
  pageSize?: number;
  instructions?: string | boolean;
  choices: ReadonlyArray<Choice>;
  defaultValues?: ReadonlyArray<string>;
  validateValues?: (value: string[]) => string | Promise<string | undefined> | undefined;
  loop?: boolean;
};

export const checkbox = createPrompt(
  (config: Config, done: (value: Array<string>) => void): string => {
    const {
      prefix = usePrefix(),
      instructions,
      defaultValues = [],
      validateValues = () => undefined,
    } = config;

    const [status, setStatus] = useState("pending");
    const [choices, setChoices] = useState<Array<Choice>>(() =>
      config.choices.map((choice) => {
        return { ...choice, checked: defaultValues.includes(choice.id) };
      })
    );
    const [cursorPosition, setCursorPosition] = useState(0);
    const [showHelpTip, setShowHelpTip] = useState(true);
    const [errorMsg, setError] = useState<string | undefined>(undefined);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    useKeypress(async (key) => {
      let newCursorPosition = cursorPosition;
      if (isEnterKey(key)) {
        const answer = choices
          .filter((choice) => choice.checked)
          .map((choice) => (choice as Choice).id);

        const validationRes = await validateValues(answer);
        if (validationRes) {
          setError(validationRes);
          setStatus("pending");
        } else {
          setStatus("done");
          done(answer);
        }
      } else if (isUpKey(key) || isDownKey(key)) {
        setError(undefined);
        const offset = isUpKey(key) ? -1 : 1;
        let selectedOption;

        while (!selectedOption) {
          newCursorPosition = nextPosition(
            newCursorPosition,
            offset,
            choices.length,
            config.loop === true
          );
          selectedOption = choices[newCursorPosition];
        }

        setCursorPosition(newCursorPosition);
      } else if (isSpaceKey(key)) {
        setError(undefined);
        setShowHelpTip(false);
        setChoices(
          choices.map((choice, i) => {
            if (i === cursorPosition && !!choice) {
              return { ...choice, checked: !choice.checked };
            }

            return choice;
          })
        );
      } else if (key.name === "a") {
        setError(undefined);
        const selectAll = Boolean(choices.find((choice) => choice && !choice.checked));
        setChoices(choices.map((choice) => (choice ? { ...choice, checked: selectAll } : choice)));
      } else if (key.name === "i") {
        setError(undefined);
        setChoices(
          choices.map((choice) => (choice ? { ...choice, checked: !choice.checked } : choice))
        );
      } else if (isNumberKey(key)) {
        setError(undefined);
        // Adjust index to start at 1
        const position = Number(key.name) - 1;

        // Abort if the choice doesn't exists or if disabled
        if (!choices[position]) {
          return;
        }

        setCursorPosition(position);
        setChoices(
          choices.map((choice, i) => {
            if (i === position && choice) {
              return { ...choice, checked: !choice.checked };
            }
            return choice;
          })
        );
      }
    });

    const message = chalk.bold(config.message);
    const pageSize = config.pageSize || 7;
    const prefixWidth = computePrefixWidth(cursorPosition, pageSize, choices);
    const renderChoice = (choice: Choice, index: number) => {
      let output = "";
      if (index === cursorPosition) {
        output += `${getCheckbox(!!choice.checked)} ${chalk.blueBright(choice.title)}`;
      } else {
        output += `${getCheckbox(!!choice.checked)} ${choice.title}`;
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

    let error = "";
    if (errorMsg) {
      error = chalk.red(`> ${errorMsg}`);
    }
    if (status === "done") {
      const selection = choices
        .filter((choice) => choice && choice.checked)
        .map((choice) => (choice as Choice).title);
      return `${prefix} ${message} ${chalk.cyan(selection.join(", "))}${error ? "\n" + error : ""}`;
    }

    let helpTip = "";
    if (showHelpTip && (instructions === undefined || instructions)) {
      if (typeof instructions === "string") {
        helpTip = instructions;
      } else {
        const keys = [
          `${chalk.cyan.bold("<space>")} to select`,
          `${chalk.cyan.bold("<a>")} to toggle all`,
          `${chalk.cyan.bold("<i>")} to invert selection`,
          `and ${chalk.cyan.bold("<enter>")} to proceed`,
        ];
        helpTip = ` (Press ${keys.join(", ")})`;
      }
    }
    return `${prefix} ${message}${helpTip}\n${windowedChoices}${ansiEscapes.cursorHide}${
      error ? "\n" + error : ""
    }`;
  }
);

/**
 * Get the checkbox
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */
function getCheckbox(checked: boolean): string {
  if (process.platform === "win32") return chalk.blueBright(checked ? "[X]" : "[ ]");
  return chalk.blueBright(checked ? figures.checkboxOn : figures.checkboxOff);
}

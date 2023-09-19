// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AsyncPromptConfig,
  Separator,
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
import { addChoiceDetail } from "./utils";

export type Choice = {
  id: string;
  title: string;
  detail?: string;
  checked?: boolean;
  disabled?: boolean | string;
};

export type Config = AsyncPromptConfig & {
  prefix?: string;
  pageSize?: number;
  instructions?: string | boolean;
  choices: ReadonlyArray<Choice | Separator>;
  defaultValues?: ReadonlyArray<string>;
  validateValues?: (value: string[]) => string | Promise<string | undefined> | undefined;
};

function isSelectableChoice(choice: undefined | Separator | Choice): choice is Choice {
  return choice != null && !Separator.isSeparator(choice) && !choice.disabled;
}

export const checkbox = createPrompt(
  (config: Config, done: (value: Array<string>) => void): [string, string | undefined] => {
    const {
      prefix = usePrefix(),
      instructions,
      defaultValues = [],
      validateValues = () => undefined,
    } = config;

    const [status, setStatus] = useState("pending");
    const [choices, setChoices] = useState<Array<Separator | Choice>>(() =>
      config.choices.map((choice) => {
        if (!Separator.isSeparator(choice)) {
          return { ...choice, checked: defaultValues.includes(choice.id) };
        }

        return choice;
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
          .filter((choice) => isSelectableChoice(choice) && choice.checked)
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

        while (!isSelectableChoice(selectedOption)) {
          newCursorPosition = (newCursorPosition + offset + choices.length) % choices.length;
          selectedOption = choices[newCursorPosition];
        }

        setCursorPosition(newCursorPosition);
      } else if (isSpaceKey(key)) {
        setError(undefined);
        setShowHelpTip(false);
        setChoices(
          choices.map((choice, i) => {
            if (i === cursorPosition && isSelectableChoice(choice)) {
              return { ...choice, checked: !choice.checked };
            }

            return choice;
          })
        );
      } else if (key.name === "a") {
        setError(undefined);
        const selectAll = Boolean(
          choices.find((choice) => isSelectableChoice(choice) && !choice.checked)
        );
        setChoices(
          choices.map((choice) =>
            isSelectableChoice(choice) ? { ...choice, checked: selectAll } : choice
          )
        );
      } else if (key.name === "i") {
        setError(undefined);
        setChoices(
          choices.map((choice) =>
            isSelectableChoice(choice) ? { ...choice, checked: !choice.checked } : choice
          )
        );
      } else if (isNumberKey(key)) {
        setError(undefined);
        // Adjust index to start at 1
        const position = Number(key.name) - 1;

        // Abort if the choice doesn't exists or if disabled
        if (!isSelectableChoice(choices[position])) {
          return;
        }

        setCursorPosition(position);
        setChoices(
          choices.map((choice, i) => {
            if (i === position && isSelectableChoice(choice)) {
              return { ...choice, checked: !choice.checked };
            }

            return choice;
          })
        );
      }
    });

    const message = chalk.bold(config.message);
    const allChoices = choices
      .map((choice, index) => {
        if (Separator.isSeparator(choice)) {
          return choice.separator;
        }

        if (choice.disabled) {
          const disabledLabel =
            typeof choice.disabled === "string" ? choice.disabled : "(disabled)";
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
          output += `${getCheckbox(!!choice.checked)} ${chalk.blueBright(choice.title)}`;
        } else {
          output += `${getCheckbox(!!choice.checked)} ${choice.title}`;
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

    let error = "";
    if (errorMsg) {
      error = chalk.red(`> ${errorMsg}`);
    }
    if (status === "done") {
      const selection = choices
        .filter((choice) => isSelectableChoice(choice) && choice.checked)
        .map((choice) => (choice as Choice).title);
      return [`${prefix} ${message} ${chalk.cyan(selection.join(", "))}`, error];
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

    return [`${prefix} ${message}${helpTip}\n${windowedChoices}${ansiEscapes.cursorHide}`, error];
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

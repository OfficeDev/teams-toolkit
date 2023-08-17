// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import _ from "lodash";
import chalk from "chalk";
import figures from "figures";
import inquirer from "inquirer";
import { Interface as ReadlineInterface } from "readline";
import CheckboxPrompt from "inquirer/lib/prompts/checkbox";

import ScreenManager from "../console/screen";
import { addChoiceDetail } from "./utils";
import Choice from "inquirer/lib/objects/choice";

/**
 * The question-options for the `ChoicePrompt<T>`.
 */
export type Question = inquirer.CheckboxQuestionOptions<inquirer.Answers>;

export default class CustomizedCheckboxPrompt extends CheckboxPrompt {
  private selection: string[] = [];

  constructor(questions: Question, rl: ReadlineInterface, answers: inquirer.Answers) {
    super(questions, rl, answers);
    (this.paginator as any).isInfinite = false;
  }

  /**
   * Render the prompt to screen
   * @return {CustomizedCheckboxPrompt} self
   */
  render(error?: string): void {
    // Render question
    let message = this.getQuestion();
    let bottomContent = "";

    if (this.status !== "answered") {
      message +=
        "(Press " +
        chalk.magentaBright("<space>") +
        " to select, " +
        chalk.magentaBright("<a>") +
        " to toggle all, " +
        chalk.magentaBright("<i>") +
        " to invert selection)";
    }

    // Render choices or answer depending on the state
    if (this.status === "answered") {
      const selection = this.selection
        .map((sel) => this.opt.choices.realChoices.find((ch) => ch.name === sel))
        .map((ch) => (ch as Choice).extra.title);
      message += chalk.cyan(selection.join(", "));
    } else {
      const [choicesStr, choicesStrs] = renderChoices(this.opt.choices, this.pointer);
      const indexPosition = this.opt.choices.indexOf(
        this.opt.choices.getChoice(this.pointer) as any
      );
      const realIndexPosition =
        (this.opt.choices as any).reduce((acc: number, value: any, i: number) => {
          // Dont count lines past the choice we are looking at
          if (i > indexPosition) {
            return acc;
          }
          // Add line if it's a separator
          // if (value.type === "separator") {
          //   return acc + 1;
          // }

          const l = choicesStrs[i];
          // Non-strings take up one line
          // if (typeof l !== "string") {
          //   return acc + 1;
          // }

          // Calculate lines taken up by string
          return acc + l.split("\n").length;
        }, 0) - 1;
      message += "\n" + this.paginator.paginate(choicesStr, realIndexPosition);
    }

    if (error) {
      bottomContent = chalk.red(">> ") + error;
    }

    ScreenManager["moveCursorDown"](0);
    this.screen.render(message, bottomContent);
  }
}

/**
 * Function for rendering checkbox choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function renderChoices(choices: any, pointer: number): [string, string[]] {
  let output = "";
  let separatorOffset = 0;
  let prefixWidth = 1;
  choices.forEach((choice: any) => {
    prefixWidth = Math.max(
      prefixWidth,
      choice.disabled || !choice.extra?.title ? 0 : choice.extra.title.length + 1
    );
  });

  const outputs: string[] = [];
  choices.forEach((choice: any, i: number) => {
    output = "";
    if (choice.type === "separator") {
      separatorOffset++;
      output += " " + choice + "\n";
      return;
    }

    if (choice.disabled) {
      separatorOffset++;
      output += " - " + choice.extra.title;
      output += " (" + (_.isString(choice.disabled) ? choice.disabled : "Disabled") + ")";
    } else {
      if (i - separatorOffset === pointer) {
        output += getCheckbox(choice.checked) + " " + chalk.blueBright(choice.extra.title);
      } else {
        output += getCheckbox(choice.checked) + " " + chalk.whiteBright(choice.extra.title);
      }

      if (choice.extra.detail) {
        output = addChoiceDetail(
          output,
          choice.extra.detail,
          choice.extra.title.length,
          prefixWidth
        );
      }
    }

    output += "\n";
    outputs.push(output.replace(/\n$/, ""));
  });

  return [outputs.join("\n"), outputs];
}

/**
 * Get the checkbox
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */
function getCheckbox(checked: boolean): string {
  if (process.platform === "win32") return chalk.blueBright(checked ? "[X]" : "[ ]");
  return chalk.blueBright(checked ? figures.checkboxOn : figures.checkboxOff);
}

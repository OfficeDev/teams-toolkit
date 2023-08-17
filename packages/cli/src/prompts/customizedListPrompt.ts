// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import lodash from "lodash";
import chalk from "chalk";
import figures from "figures";
import inquirer from "inquirer";
import { Interface as ReadlineInterface } from "readline";
import ListPrompt from "inquirer/lib/prompts/list";

import ScreenManager from "../console/screen";
import { addChoiceDetail, white } from "./utils";

/**
 * The question-options for the `ListPrompt<T>`.
 */
export type Question = inquirer.ListQuestionOptions<inquirer.Answers>;

export default class CustomizedListPrompt extends ListPrompt {
  constructor(questions: Question, rl: ReadlineInterface, answers: inquirer.Answers) {
    questions.loop = false;
    super(questions, rl, answers);
  }

  /**
   * Render the prompt to screen
   * @return {ListPrompt} self
   */
  render(): void {
    // Render question
    let message = this.getQuestion();

    if (this.firstRender) {
      message += white("(Use arrow keys)");
    }

    // Render choices or answer depending on the state
    if (this.status === "answered") {
      message += chalk.cyan(this.opt.choices.getChoice(this.selected).extra.title);
    } else {
      const [choicesStr, choicesStrs] = listRender(this.opt.choices, this.selected);
      const indexPosition = this.opt.choices.indexOf(
        this.opt.choices.getChoice(this.selected) as any
      );
      const realIndexPosition =
        (this.opt.choices as any).reduce((acc: number, value: any, i: number) => {
          // Dont count lines past the choice we are looking at
          if (i > indexPosition) {
            return acc;
          }
          // Add line if it's a separator
          if (value.type === "separator") {
            return acc + 1;
          }

          const l = choicesStrs[i];
          // Non-strings take up one line
          if (typeof l !== "string") {
            return acc + 1;
          }

          // Calculate lines taken up by string
          return acc + l.split("\n").length;
        }, 0) - 1;
      message += "\n" + this.paginator.paginate(choicesStr, realIndexPosition);
    }

    this.firstRender = false;

    ScreenManager["moveCursorDown"](0);
    this.screen.render(message, "");
  }
}

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function listRender(choices: any, pointer: number): [string, string[]] {
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
      output += "  " + choice + "\n";
      return;
    }

    if (choice.disabled) {
      separatorOffset++;
      output += "  - " + choice.extra.title;
      output += " (" + (lodash.isString(choice.disabled) ? choice.disabled : "Disabled") + ")";
      output += "\n";
      return;
    }

    const isSelected = i - separatorOffset === pointer;
    if (isSelected) {
      output += chalk.blueBright(figures.radioOn + " " + choice.extra.title);
    } else {
      output += chalk.blueBright(figures.radioOff) + " " + chalk.whiteBright(choice.extra.title);
    }

    if (choice.extra?.detail) {
      output = addChoiceDetail(output, choice.extra.detail, choice.extra.title.length, prefixWidth);
    }

    output += "\n";
    outputs.push(output.replace(/\n$/, ""));
  });

  return [outputs.join("\n"), outputs];
}

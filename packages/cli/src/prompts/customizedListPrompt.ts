// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import lodash from "lodash";
import chalk from "chalk";
import figures from "figures";
import inquirer from "inquirer";
import { Interface as ReadlineInterface } from "readline";
import ListPrompt from "inquirer/lib/prompts/list";

import { addChoiceDetail, white } from "./utils";

/**
 * The question-options for the `ListPrompt<T>`.
 */
export type Question = inquirer.ListQuestionOptions<inquirer.Answers>;

export default class CustomizedListPrompt extends ListPrompt {
  constructor(questions: Question, rl: ReadlineInterface, answers: inquirer.Answers) {
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
      message += chalk.cyan(this.opt.choices.getChoice(this.selected).short);
    } else {
      const choicesStr = listRender(this.opt.choices, this.selected);
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

          let l = value.name;
          // Non-strings take up one line
          if (typeof l !== "string") {
            return acc + 1;
          }

          // Calculate lines taken up by string
          l = l.split("\n");
          return acc + l.length;
        }, 0) - 1;
      message += "\n" + this.paginator.paginate(choicesStr, realIndexPosition);
    }

    this.firstRender = false;

    this.screen.render(message, "");
  }
}

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function listRender(choices: any, pointer: number): string {
  let output = "";
  let separatorOffset = 0;
  let prefixWidth = 1;
  choices.forEach((choice: any) => {
    prefixWidth = Math.max(
      prefixWidth,
      choice.disabled || !choice.name ? 0 : choice.name.length + 1
    );
  });

  choices.forEach((choice: any, i: number) => {
    if (choice.type === "separator") {
      separatorOffset++;
      output += "  " + choice + "\n";
      return;
    }

    if (choice.disabled) {
      separatorOffset++;
      output += "  - " + choice.name;
      output += " (" + (lodash.isString(choice.disabled) ? choice.disabled : "Disabled") + ")";
      output += "\n";
      return;
    }

    const isSelected = i - separatorOffset === pointer;
    if (isSelected) {
      output += chalk.blueBright(figures.radioOn + " " + choice.name);
    } else {
      output += chalk.blueBright(figures.radioOff) + " " + chalk.whiteBright(choice.name);
    }

    if (choice.extra?.detail) {
      output = addChoiceDetail(output, choice.extra.detail, choice.name.length, prefixWidth);
    }

    output += "\n";
  });

  return output.replace(/\n$/, "");
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { render } from "@inquirer/testing";
import figures from "figures";
import "mocha";
import { select } from "../../../src/prompts/customizedListPrompt";
import { expect } from "../utils";

const choices = [
  { id: "id1", title: "title 1", detail: "detail 1" },
  { id: "id2", title: "title 2", detail: "detail 2" },
  { id: "id3", title: "title 3", detail: "detail 3" },
  { id: "id4", title: "title 4", detail: "detail 4" },
  { id: "id5", title: "title 5", detail: "detail 5" },
  { id: "id6", title: "title 6", detail: "detail 6" },
  { id: "id7", title: "title 7", detail: "detail 7" },
  { id: "id8", title: "title 8", detail: "detail 8" },
  { id: "id9", title: "title 9", detail: "detail 9" },
  { id: "id10", title: "title 10", detail: "detail 10" },
  { id: "id11", title: "title 11", detail: "detail 11" },
  { id: "id12", title: "title 12", detail: "detail 12" },
];

const getRadio = (checked: boolean) => {
  return checked ? figures.radioOn : figures.radioOff;
};

const trimOutput = (output: string) =>
  output
    .trim()
    .split("\n")
    .map((line) => line.trim().replace("( )", getRadio(false)).replace("(*)", getRadio(true)))
    .join("\n");

describe("select prompt", () => {
  it("use arrow keys to select an option", async () => {
    const { answer, events, getScreen } = await render(select, {
      message: "Select a string",
      choices,
    });

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a string (Use arrow keys)
        (*) title 1  detail 1
        ( ) title 2  detail 2
        ( ) title 3  detail 3
        ( ) title 4  detail 4
        ( ) title 5  detail 5
        ( ) title 6  detail 6
        ( ) title 7  detail 7
        (Use arrow keys to reveal more choices)`)
    );

    events.keypress("down");
    events.keypress("down");
    expect(getScreen()).equal(
      trimOutput(`
        ? Select a string
        ( ) title 1  detail 1
        ( ) title 2  detail 2
        (*) title 3  detail 3
        ( ) title 4  detail 4
        ( ) title 5  detail 5
        ( ) title 6  detail 6
        ( ) title 7  detail 7
        (Use arrow keys to reveal more choices)`)
    );

    events.keypress("enter");
    expect(getScreen()).equal("? Select a string title 3");

    expect(await answer).equal("id3");
  });

  it("use number key to select an option", async () => {
    const { answer, events, getScreen } = await render(select, {
      message: "Select a string",
      choices,
    });

    events.keypress("4");
    expect(getScreen()).equal(
      trimOutput(`
        ? Select a string
        ( ) title 1  detail 1
        ( ) title 2  detail 2
        ( ) title 3  detail 3
        (*) title 4  detail 4
        ( ) title 5  detail 5
        ( ) title 6  detail 6
        ( ) title 7  detail 7
        (Use arrow keys to reveal more choices)`)
    );

    events.keypress("enter");
    expect(getScreen()).equal("? Select a string title 4");

    expect(await answer).equal("id4");
  });

  it("allow setting a smaller page size", async () => {
    const { answer, events, getScreen } = await render(select, {
      message: "Select a string",
      choices,
      pageSize: 2,
    });

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a string (Use arrow keys)
        (*) title 1  detail 1
        ( ) title 2  detail 2
        (Use arrow keys to reveal more choices)`)
    );

    events.keypress("enter");
    expect(await answer).equal("id1");
  });

  it("allow setting a bigger page size", async () => {
    const { answer, events, getScreen } = await render(select, {
      message: "Select a string",
      choices,
      pageSize: 10,
    });

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a string (Use arrow keys)
        (*) title 1  detail 1
        ( ) title 2  detail 2
        ( ) title 3  detail 3
        ( ) title 4  detail 4
        ( ) title 5  detail 5
        ( ) title 6  detail 6
        ( ) title 7  detail 7
        ( ) title 8  detail 8
        ( ) title 9  detail 9
        ( ) title 10 detail 10
        (Use arrow keys to reveal more choices)`)
    );

    events.keypress("enter");
    expect(await answer).equal("id1");
  });

  it("cycles through options", async () => {
    const { answer, events, getScreen } = await render(select, {
      message: "Select a string",
      choices,
      pageSize: 2,
    });

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a string (Use arrow keys)
        (*) title 1  detail 1
        ( ) title 2  detail 2
        (Use arrow keys to reveal more choices)`)
    );

    events.keypress("up");
    events.keypress("up");

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a string
        (*) title 11 detail 11
        ( ) title 12 detail 12
        (Use arrow keys to reveal more choices)`)
    );

    events.keypress("enter");
    expect(await answer).equal("id11");
  });

  it("skip disabled options by arrow keys", async () => {
    const { answer, events, getScreen } = await render(select, {
      message: "Select a topping",
      choices: [
        { id: "ham", title: "Ham" },
        { id: "pineapple", title: "Pineapple" },
        { id: "pepperoni", title: "Pepperoni" },
      ],
    });

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a topping (Use arrow keys)
        (*) Ham
        ( ) Pepperoni`)
    );

    events.keypress("down");

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a topping
        ( ) Ham
        (*) Pepperoni`)
    );

    events.keypress("enter");
    expect(getScreen()).equal("? Select a topping Pepperoni");

    expect(await answer).equal("pepperoni");
  });

  it("skip disabled options by number key", async () => {
    const { answer, events, getScreen } = await render(select, {
      message: "Select a topping",
      choices: [
        { id: "ham", title: "Ham" },
        { id: "pineapple", title: "Pineapple" },
        { id: "pepperoni", title: "Pepperoni" },
      ],
    });

    events.keypress("2");

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a topping (Use arrow keys)
        (*) Ham
        --- Pineapple (disabled)
        ( ) Pepperoni`)
    );

    events.keypress("enter");
    expect(getScreen()).equal("? Select a topping Ham");

    expect(await answer).equal("ham");
  });

  it("allow customizing disabled label", async () => {
    const { answer, getScreen } = await render(select, {
      message: "Select a topping",
      choices: [
        { id: "ham", title: "Ham" },
        { id: "pineapple", title: "Pineapple" },
      ],
    });

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a topping (Use arrow keys)
        (*) Ham
        --- Pineapple *premium*`)
    );

    answer.cancel();
    await expect(answer).rejected;
  });

  it("throws if all choices are disabled", async () => {
    const { answer } = await render(select, {
      message: "Select a topping",
      choices: [
        { id: "ham", title: "Ham" },
        { id: "pineapple", title: "Pineapple" },
      ],
    });

    await expect(answer).rejectedWith(
      "[select prompt] No selectable choices. All choices are disabled."
    );
  });

  it("skip separator by arrow keys", async () => {
    const { answer, events, getScreen } = await render(select, {
      message: "Select a topping",
      choices: [
        { id: "ham", title: "Ham" },
        { id: "pineapple", title: "Pineapple" },
      ],
    });

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a topping (Use arrow keys)
        (*) Ham
        ( ) Pineapple`)
    );

    events.keypress("down");
    expect(getScreen()).equal(
      trimOutput(`
        ? Select a topping
        ( ) Ham
        (*) Pineapple`)
    );

    events.keypress("enter");
    expect(getScreen()).equal("? Select a topping Pineapple");

    expect(await answer).equal("pineapple");
  });

  it("skip separator by number key", async () => {
    const { answer, events, getScreen } = await render(select, {
      message: "Select a topping",
      choices: [
        { id: "ham", title: "Ham" },
        { id: "pineapple", title: "Pineapple" },
      ],
    });

    expect(getScreen()).equal(
      trimOutput(`
        ? Select a topping (Use arrow keys)
        (*) Ham
        ( ) Pineapple`)
    );

    events.keypress("2");
    expect(getScreen()).equal(
      trimOutput(`
        ? Select a topping (Use arrow keys)
        (*) Ham
        ( ) Pineapple`)
    );

    events.keypress("enter");
    expect(getScreen()).equal("? Select a topping Ham");

    expect(await answer).equal("ham");
  });
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function white(content: string): string {
  return content;
}

export function space(num: number): string {
  return " ".repeat(num);
}

export function splitLongStringByWidth(content: string, width: number): string[] {
  return content.match(new RegExp(`.{1,${width}}`, "g"))!;
}

export function addChoiceDetail(
  output: string,
  detail: string,
  choiceNameLength: number,
  prefixWidth: number
): string {
  const terminalColumns = process.stdout.isTTY ? process.stdout.columns - 1 : 1000;
  const detailWidth = terminalColumns - prefixWidth - 4;
  if (detailWidth > 10) {
    const details = splitLongStringByWidth(detail, detailWidth);
    details.forEach((detail: string, i: number) => {
      if (i === 0) {
        output += space(prefixWidth - choiceNameLength) + white(detail);
      } else {
        output += "\n" + space(prefixWidth + 4) + white(detail);
      }
    });
  } else {
    const details = splitLongStringByWidth(detail, terminalColumns - 4);
    details.forEach((detail: string) => {
      output += "\n" + space(4) + white(detail);
    });
  }
  return output;
}

export function computePrefixWidth(
  current: number,
  pageSize: number,
  choices: ReadonlyArray<{ title: string; disabled?: boolean }>
): number {
  const middle = Math.floor(pageSize / 2);
  let pageStart;
  if (choices.length <= pageSize) pageStart = 0;
  else {
    if (current < middle) pageStart = 0;
    else if (current > choices.length - middle) pageStart = choices.length - pageSize;
    else pageStart = current - middle;
  }
  let prefixWidth = 1;
  choices.slice(pageStart, pageStart + pageSize).forEach((choice) => {
    prefixWidth = Math.max(prefixWidth, !choice.title ? 0 : choice.title.length + 1);
  });
  return prefixWidth;
}

export function nextPosition(
  current: number,
  offset: number,
  length: number,
  loop: boolean
): number {
  if (loop) {
    current = (current + offset + length) % length;
  } else {
    current = current + offset;
    if (current < 0) {
      current = 0;
    } else if (current >= length) {
      current = length - 1;
    }
  }
  return current;
}

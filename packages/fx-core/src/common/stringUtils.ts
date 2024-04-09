// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

const MIN_ENTROPY = 4;

function getProbMap(str: string) {
  const probMap = new Map<string, number>();
  for (const char of str) {
    probMap.set(char, (probMap.get(char) || 0) + 1);
  }
  for (const [char, freq] of probMap.entries()) {
    const prob = freq / str.length;
    probMap.set(char, prob);
  }
  return probMap;
}

// Measure the entropy of a string in bits per symbol.
function shannonEntropy(str: string, probMap: Map<string, number>) {
  let sum = 0;
  for (const char of str) {
    const prob = probMap.get(char) || 0;
    const delta = (prob * Math.log(prob)) / Math.log(2);
    sum += delta;
  }
  return -sum;
}

class Token {
  value: string;
  splitter: boolean;
  entropy?: number;
  constructor(value: string, splitter: boolean) {
    this.value = value;
    this.splitter = splitter;
  }
}

function tokenize(text: string): Token[] {
  const splitterString = " '`\n\t\r\",:{}";
  const splitterChars = new Set<string>();
  for (const char of splitterString) {
    splitterChars.add(char);
  }
  const tokens: Token[] = [];
  let currentToken = "";
  for (const char of text) {
    if (splitterChars.has(char)) {
      if (currentToken.length > 0) {
        tokens.push(new Token(currentToken, false));
        currentToken = "";
      }
      tokens.push(new Token(char, true));
    } else {
      currentToken += char;
    }
  }
  if (currentToken.length > 0) {
    tokens.push(new Token(currentToken, false));
  }
  return tokens;
}

function computeShannonEntropy(token: Token) {
  if (!token.splitter) {
    const probMap = getProbMap(token.value);
    token.entropy = shannonEntropy(token.value, probMap);
  }
}

export interface MaskSecretOptions {
  threshold?: number;
  whiteList?: string[];
}

export function maskSecret(
  inputText?: string,
  option = { threshold: MIN_ENTROPY, whiteList: [] as string[] }
): string {
  if (!inputText) return "";
  let output = "";
  const tokens = tokenize(inputText);
  tokens.forEach((token) => {
    computeShannonEntropy(token);
    if (
      token.splitter ||
      option.whiteList?.includes(token.value) ||
      (token.entropy && token.entropy <= option.threshold)
    ) {
      output += token.value;
    } else {
      output += "<REDACTED: secret>";
    }
  });
  console.log(tokens);
  return output;
}

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

function tokenize(text: string) {
  return text.split(/\s/);
}

export function maskSecret(inputText: string, threshold = MIN_ENTROPY): string {
  if (!inputText) return inputText;
  const results: string[] = [];
  const tokens = tokenize(inputText);
  tokens.forEach((token) => {
    const probMap = getProbMap(token);
    const b64_entropy = shannonEntropy(token, probMap);
    if (b64_entropy > threshold) {
      results.push("***");
    } else {
      results.push(token);
    }
  });
  return results.join(" ");
}

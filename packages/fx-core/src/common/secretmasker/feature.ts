// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { dictMatcher } from "./dict";

function extractCharFeatures(token: string) {
  let alphabetNum = 0;
  let numberNum = 0;
  let upperCaseNum = 0;
  let lowerCaseNum = 0;
  let specialCharNum = 0;
  const frequency: Record<string, number> = {};
  for (const char of token) {
    if (char >= "0" && char <= "9") {
      numberNum++;
    } else if ((char >= "a" && char <= "z") || (char >= "A" && char <= "Z")) {
      if (char >= "a" && char <= "z") {
        lowerCaseNum++;
      } else {
        upperCaseNum++;
      }
      alphabetNum++;
    } else {
      specialCharNum++;
    }
    frequency[char] = (frequency[char] || 0) + 1;
  }
  const length = token.length;
  const entropy = -Object.values(frequency).reduce((acc, freq) => {
    const p = freq / length;
    return acc + p * Math.log2(p);
  }, 0);
  const specialCharRatio = specialCharNum / token.length;
  const charDiversity = Object.keys(frequency).length / token.length;
  let charCatDiversity = 0;
  if (alphabetNum > 0) charCatDiversity++;
  if (numberNum > 0) charCatDiversity++;
  if (specialCharNum > 0) charCatDiversity++;
  if (upperCaseNum > 0) charCatDiversity++;
  if (lowerCaseNum > 0) charCatDiversity++;
  return {
    specialCharRatio,
    charDiversity,
    charCatDiversity,
    entropy,
  };
}

// Helper function to check if a token contains common secret-related keywords
function containsSecretKeywords(token: string): number {
  const keywords = [
    "password",
    "pwd",
    "apikey",
    "api_key",
    "auth_key",
    "authkey",
    "token",
    "key",
    "secret",
    "credential",
    "authorization",
    "bearer",
  ];
  const weekKeywords = ["login", "auth"];
  if (keywords.some((keyword) => token.toLowerCase().includes(keyword))) return 1;
  if (weekKeywords.some((keyword) => token.toLowerCase().includes(keyword))) return 0.5;
  return 0;
}

interface SplitterToken {
  type: "splitter";
  token: string;
}

interface FeatureToken {
  type: "feature";
  token: string;
  vector?: number[];
  label?: number;
}

export type Token = SplitterToken | FeatureToken;

// export function tokenize(input: string): Token[] {
//   // Regular expression to match any whitespace (including `\r\n`, `\t`, spaces, etc.)
//   const tokens: string[] = input.split(/(\s+)/); // Retain the splitters in the result array

//   // Map the tokens into an array of Token objects
//   return tokens.map((t) => {
//     if (/\s+/.test(t)) {
//       return {
//         type: "splitter",
//         token: t,
//       };
//     } else {
//       return {
//         type: "feature",
//         token: t,
//       };
//     }
//   });
// }

export function tokenize(input: string): Token[] {
  // Regular expression to match JSON-specific delimiters and whitespace
  const tokens: string[] = input.split(/(\s+|[{}[\],:"])/); // Retain and filter out empty tokens

  // Map the tokens into an array of Token objects
  return tokens.map((t) => {
    if (/\s+/.test(t) || /[{}[\],:"]/.test(t)) {
      return {
        type: "splitter",
        token: t,
      };
    } else {
      return {
        type: "feature",
        token: t,
      };
    }
  });
}

export function extractFeatures(text: string): Token[] {
  const allTokens = tokenize(text);
  const featureTokens = allTokens.filter((t) => t.type === "feature");
  for (let i = 0; i < featureTokens.length; i++) {
    const tokenObj = featureTokens[i] as FeatureToken;
    const token = tokenObj.token;

    // check if the previous token contains secret keyword
    let preIndicator = 0;

    // check password=xxx pattern
    for (const mark of ["=", ":"]) {
      const index = token.indexOf(mark);
      if (index >= 0) {
        const preToken = token.substring(0, index - 1);
        if (containsSecretKeywords(preToken)) {
          preIndicator = 1;
        }
      }
    }

    if (i - 2 >= 0) {
      const preToken = featureTokens[i - 1].token;
      const prePreToken = featureTokens[i - 2].token;
      if (
        containsSecretKeywords(preToken) === 1 ||
        (containsSecretKeywords(prePreToken) === 1 && (preToken === ":" || preToken === "="))
      ) {
        preIndicator = 1;
      }
    } else if (i - 1 >= 0) {
      const preToken = featureTokens[i - 1].token;
      if (containsSecretKeywords(preToken) === 1) {
        preIndicator = 1;
      }
    }

    const dictMatchRes = dictMatcher.match(token);
    const isDictWord = dictMatchRes === "exact" || dictMatchRes === "contains" ? 1 : 0;
    const { specialCharRatio, charDiversity, entropy, charCatDiversity } =
      extractCharFeatures(token);
    tokenObj.vector = [
      entropy, // 0
      specialCharRatio, // 1
      charDiversity, //2
      charCatDiversity, //3
      isDictWord, //4
      preIndicator, //5
    ];
  }
  return allTokens;
}

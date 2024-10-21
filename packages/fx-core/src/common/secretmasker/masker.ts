// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { extractFeatures } from "./feature";

const WHITE_LIST = [
  "user-file-path",
  "publish-app,",
  "X-Correlation-ID",
  "innerError",
  "client-request-id",
];

interface SVMModel {
  coef_: number[][];
  intercept_: number[];
}

class SecretMasker {
  model: SVMModel = {
    coef_: [
      [
        1.1407116640136614, -1.207072387304919, -0.42671866671203285, 1.760054415121175, 0.0,
        1.776337354749609,
      ],
    ],
    intercept_: [-9.96020839830461],
  };

  predict(features: number[]): number {
    const { coef_, intercept_ } = this.model;
    // Calculate the dot product between the features and the coefficients
    let decisionValue = intercept_[0]; // Start with the intercept
    for (let i = 0; i < coef_[0].length; i++) {
      decisionValue += coef_[0][i] * features[i];
    }
    // console.log("decisionValue", decisionValue);
    // If the decision function value is positive, classify as 1 (secret), otherwise 0 (non-secret)
    return decisionValue > 0 ? 1 : 0;
  }
  maskSecret(text: string, replace = "***"): string {
    const tokens = extractFeatures(text);
    for (const token of tokens) {
      if (token.type === "splitter") continue;
      if (WHITE_LIST.includes(token.token)) continue;
      const prediction = this.predict(token.vector!);
      token.label = prediction;
      if (prediction === 1) {
        token.token = replace;
      }
    }
    return tokens.map((o) => o.token).join("");
  }
}

export const secretMasker = new SecretMasker();

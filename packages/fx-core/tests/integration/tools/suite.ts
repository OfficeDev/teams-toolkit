// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ConfigMap } from "fx-api";
/**
 * Convert an `Object` to a Map recursively
 * @param {Object} Object to convert.
 * @returns {Map} converted ModsJSON.
 */
export function objectToMap(o: Object): Map<any, any> {
  const m = new Map();
  for (const entry of Object.entries(o)) {
    if (entry[1] instanceof Array) {
      m.set(entry[0], entry[1]);
    } else if (entry[1] instanceof Object) {
      m.set(entry[0], objectToConfigMap(entry[1]));
    } else {
      m.set(entry[0], entry[1]);
    }
  }
  return m;
}

/**
 * Convert an `Object` to a Map recursively
 * @param {Object} Object to convert.
 * @returns {Map} converted ModsJSON.
 */
export function objectToConfigMap(o?: Object): ConfigMap {
  const m = new ConfigMap();
  if (o) {
    for (const entry of Object.entries(o)) {
      {
        m.set(entry[0], entry[1]);
      }
    }
  }
  return m;
}

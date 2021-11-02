// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export function replaceConfigValue(config: string, id: string, value: string): string {
  if (config && id && value) {
    const idTag = `{${id}}`;
    while (config.includes(idTag)) {
      config = config.replace(idTag, value);
    }
  }
  return config;
}

/**
 *
 * @throws Error - when placeholder doesn't have corresponding value
 */
export function checkAndConfig(config: string, id: string, value: string | undefined): string {
  const idTag = `{${id}}`;
  if (value) {
    return replaceConfigValue(config, id, value);
  } else {
    if (config.includes(idTag)) {
      throw new Error(`Data required: ${idTag}`);
    } else {
      return config;
    }
  }
}

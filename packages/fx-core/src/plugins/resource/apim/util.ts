// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export function getFileExtension(filePath: string): string {
    const basename = filePath.split(/[\\/]/).pop();
    if (!basename) {
        return "";
    }

    const pos = basename.lastIndexOf(".");
    if (basename === "" || pos < 1) {
        return "";
    }

    return basename.slice(pos + 1);
}

export function capitalizeFirstLetter(str: string): string {
    const firstLetter = str.length > 0 ? str.charAt(0).toUpperCase() : "";
    const nextLetters = str.length > 1 ? str.slice(1) : "";
    return firstLetter + nextLetters;
}

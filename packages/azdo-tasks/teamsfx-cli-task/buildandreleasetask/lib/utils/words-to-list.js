"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordsToList = void 0;
function WordsToList(words) {
    if (!words.length) {
        return [];
    }
    return words.split(',').map((word) => word.trim());
}
exports.WordsToList = WordsToList;

export function WordsToList(words: Readonly<string>): string[] {
  if (!words.length) {
    return []
  }

  return words.split(',').map((word: Readonly<string>): string => word.trim())
}

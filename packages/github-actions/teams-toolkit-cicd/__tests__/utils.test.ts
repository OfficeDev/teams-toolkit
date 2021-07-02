import {BaseError} from '../src/base-error'
import {checkEnvironment} from '../src/utils/check-env'
import {WordsToList} from '../src/utils/words-to-list'

test('fail to check environment', async () => {
  try {
    checkEnvironment()
  } catch (error) {
    expect(error).toBeInstanceOf(BaseError)
    return
  }

  expect(false).toBe(true) // should not reach here.
})

test('WordsToList empty case', async () => {
  // Arrange
  const empty = ''

  // Act
  const words = WordsToList(empty)

  // Assert
  expect(words.length).toBe(0)
})

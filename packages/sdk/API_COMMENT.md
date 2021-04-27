The doc comment should follow the [API Extractor syntax](https://api-extractor.com/pages/tsdoc/doc_comment_syntax/).

Frequently used keywords:

- API scope - you should add `@beta` for public preview API and change it to `@public` after GA. If it's an internal implementation method, `@internal` is a good choice, the API will not appear in generated doc.
- API description - you could use `@remarks` to add detailed description and use `@example` to add examples for this API.
- API parameters - you should use `@param` and `@returns`, add `@defaultValue` if possible.
- Use `{@link}` to reference other class or interface.

Here's the full template for reference:

````typescript
/**
 * Description of class. (required)
 *
 * @remarks
 * Detailed description. (optional)
 *
 * @beta (required)
 */
export class Foo {
 /**
  * Adds two numbers together. (required)
  *
  * @remarks
  * Use this function to perform example addition. (optional)
  *
  * @example (optional)
  * Here's a simple example:
  * ```
  * // Prints "2":
  * console.log(add(1,1));
  * ```
  *
  * @example
  * Here's an example with negative numbers:
  * ```
  * // Prints "0":
  * console.log(add(1,-1));
  * ```
  *
  * @param x - the first number to add (required)
  * @param y - the second number to add (required)
  * @returns the result of sum (required)
  * @beta
  */
  export function add(x: number, y: number): number {
      return x + y;
  }
}

/**
 * Interface description. (required)
 *
 * @remarks
 * Detailed description. (optional)
 *
 * @beta (required)
 */
export interface Bar {
  /**
   * Network request timeout value. (required)
   *
   * @readonly
   */
  readonly timeout?: number;

  /**
   * Baz
   *
   * @defaultValue {@link Baz.X}
   */
  baz?: Baz;
}
````

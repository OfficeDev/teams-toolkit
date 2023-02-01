# @microsoft/eslint-plugin-teamsfx

customized eslint plugins, rules & processors for teamsfx

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `@microsoft/eslint-plugin-teamsfx`:

```sh
npm install @microsoft/eslint-plugin-teamsfx --save-dev
```

## Usage

Add `@microsoft/eslint-plugin-teamsfx` to the plugins section of your `.eslintrc` configuration file:

```json
{
  "plugins": ["@microsoft/eslint-plugin-teamsfx"]
}
```

Then configure the rules you want to use under the rules section.

```json
{
  "rules": {
    "@microsoft/teamsfx/jsdoc-author": ["error"]
  }
}
```

## Supported Rules

- jsdoc-author

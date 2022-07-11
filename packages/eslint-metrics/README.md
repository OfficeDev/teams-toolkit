# eslint-plugin-metrics

auto add metrics for each method

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-metrics`:

```sh
npm install eslint-plugin-metrics --save-dev
```

## Usage

Add `metrics` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "metrics"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "metrics/rule-name": 2
    }
}
```

## Supported Rules

* Fill in provided rules here



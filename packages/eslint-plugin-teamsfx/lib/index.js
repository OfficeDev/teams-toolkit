// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const requireIndex = require('requireindex')
const path = require('path')

// ------------------------------------------------------------------------------
// Plugin Definition
// ------------------------------------------------------------------------------

// import all rules in lib/rules
const obj = requireIndex(path.join(__dirname, 'rules'))
const rules = {}
Object.values(obj).forEach(
  (v) => (rules[Object.keys(v)[0]] = Object.values(v)[0])
)

module.exports = { rules }

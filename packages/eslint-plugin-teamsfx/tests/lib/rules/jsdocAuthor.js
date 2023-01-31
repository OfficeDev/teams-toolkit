/**
 * @fileoverview auto add author
 * @author Long Hao <haolong@microsoft.com>
 */
'use strict'

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const rule = require('../../../lib/rules/jsdocAuthor')
const RuleTester = require('eslint').RuleTester

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const ruleTester = new RuleTester()
ruleTester.run('jsdoc-author', rule, {
  valid: [
    // give me some code that won't trigger a warning
  ],

  invalid: [
    {
      code: '',
      errors: [{ message: 'Fill me in.', type: 'Me too' }]
    }
  ]
})

/**
 * @fileoverview auto add metrics for each method
 * @author Long
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const requireIndex = require("requireindex");

//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------

// import all rules in lib/rules
const obj = requireIndex(__dirname + "/rules");
const rules = {};
Object.values(obj).forEach(
  (v) => (rules[Object.keys(v)[0]] = Object.values(v)[0])
);

module.exports = { rules };

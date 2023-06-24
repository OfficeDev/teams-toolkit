// Imports the default export from the "../packages/prettier-config" module
const prettierConfig = require("../packages/prettier-config").default;

// Exports an object that includes the imported prettierConfig as a property
module.exports = {
  ...prettierConfig,
};

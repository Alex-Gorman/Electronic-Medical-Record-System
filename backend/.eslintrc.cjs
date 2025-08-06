// backend/.eslintrc.js
// module.exports = {
//   env: {
//     node: true,
//     es2021: true
//   }, 
// };
module.exports = {
  // root: true,
  env: {
    node: true,
    es2021: true
  }, 
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended"
  ],
  rules: {
    /* custom overrides here */
  },
};

export default [
  {
    files: ["**/*.js", "**/*.jsx"],
    extends: ["eslint:recommended", "plugin:react/recommended"],
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
    settings: { react: { version: "detect" } },
    rules: {
      /* no override rules for now */
    },
  },
];
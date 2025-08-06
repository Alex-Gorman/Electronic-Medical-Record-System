// backend/.eslintrc.cjs
module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',        // <-- for CommonJS
  },
  extends: ['eslint:recommended'],
  rules: {
    // if you want to turn off no-undef/no-unused-vars in server.js, you can:
    'no-undef': ['error', { typeof: true }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: [
    // if you’d rather skip linting server.js entirely:
    'server.js'
  ],
};

// // backend/.eslintrc.js
// module.exports = {
//   // root: true,
//   env: {
//     node: true,
//     es2021: true
//   }, 
//   parserOptions: {
//     ecmaVersion: "latest",
//     sourceType: "module",
//     ecmaFeatures: { jsx: true },
//   },
//   settings: {
//     react: { version: "detect" },
//   },
//   extends: [
//     "eslint:recommended",
//     "plugin:react/recommended"
//   ],
//   rules: {
//     /* custom overrides here */
//   },
// };

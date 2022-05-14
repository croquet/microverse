module.exports = {
  'env': {
    'browser': true,
    'es6': true
  },
  'parserOptions': {
    "ecmaVersion": 11,
    "allowImportExportEverywhere": true,
    'sourceType': 'module'
  },

  'rules': {
    'prefer-const': 'off',
    'curly': [2, 'multi-line'],
    'brace-style': ['error', '1tbs', {'allowSingleLine': true}],
    'max-len': 'off',
    'no-var': ['warn'],
    'no-unused-vars': ['warn', {"argsIgnorePattern": "^_", "varsIgnorePattern": "^_"}],
    'no-use-before-define': ['error', {variables: true, classes: false}],
    'no-dupe-keys': ['error'],
    'no-implicit-globals': ['error'],
    'no-trailing-spaces': ['error'],
    'no-unreachable': ["error"],
    'indent': ['warn', 4, {
      SwitchCase: 1,
      VariableDeclarator: 1,
      outerIIFEBody: 1,
      FunctionDeclaration: {
        parameters: 1,
        body: 1
      },
      FunctionExpression: {
        parameters: 1,
        body: 1
      },
      CallExpression: {
        arguments: 1
      },
      ArrayExpression: 1,
      ObjectExpression: 'first',
      ImportDeclaration: 1,
      flatTernaryExpressions: false,
      ignoreComments: false
    }],

    'array-bracket-spacing': [ 'off' ],

    'block-spacing': [ 'off' ],

    'object-curly-spacing': ['off'],

    'space-infix-ops': [ 'error' ],

    'no-fallthrough': ['error', { 'commentPattern': 'break[\\s\\w]*omitted' }],

    'prefer-arrow-callback': ['error'],

    'quote-props': ['off'],

    'no-undef': [ 'error', { "typeof": true }],
    'no-use-before-define': [ 'off' ],

    "no-dupe-class-members": "error",

    'no-template-curly-in-string': [ 'warn' ],

    "no-prototype-builtins": ["off"],
    "arrow-parens": ["off"],
    "max-classes-per-file": ["off"],
    "object-shorthand": ["off"],
    "no-constant-condition": ["off"],
    "no-new-func": ["off"],

    "import/extensions": [ "off",
                           "ignorePackages",
                         ],

      "import/first": [ "off" ],
  }
};

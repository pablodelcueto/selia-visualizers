module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true
    },
    "extends": "airbnb",
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        },
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
        "react"
    ],

    "overrides": [
    {
      "files": ["*.js"],
      "rules": {
        "react/jsx-filename-extension": "off",
        "react/destructuring-assignment": "off",
        "react/prop-types": "off"
      }
    }
    ],

    "rules": {
        "no-plusplus":"off",
        "prefer-destructuring": ["error", {"object": true, "array": false}],
        "react/jsx-indent": [2, 4, {checkAttributes: true, indentLogicalExpressions: true}],
        "react/jsx-indent-props": [2, 4],
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
    }
};

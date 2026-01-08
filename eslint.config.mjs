import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import neostandard from 'neostandard'

export default defineConfig([
  js.configs.recommended,
  neostandard({
    ignores: neostandard.resolveIgnoresFromGitignore()
  }),
  {
    languageOptions: {
      globals: {
        describe: false,
        it: false,
        before: false,
        after: false,
        beforeEach: false,
        afterEach: false
      }
    },

    rules: {
      'array-bracket-spacing': 0,
      'dot-notation': 0
    }
  }]
)

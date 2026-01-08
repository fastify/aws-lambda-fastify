import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import neostandard from 'neostandard'

export default defineConfig([
  js.configs.recommended,
  neostandard({
    ignores: neostandard.resolveIgnoresFromGitignore()
  }),
  {
    rules: {
      'array-bracket-spacing': 0,
      'dot-notation': 0
    }
  }]
)

'use strict'

const { globSync } = require('fast-glob')
const { exec } = require('node:child_process')

// Expand patterns
const testFiles = [
  ...globSync('test/*test.js')
]

const args = ['node', '--test', ...testFiles]

const child = exec(args.join(' '), {
  shell: true
})

child.stdout.pipe(process.stdout)
child.stderr.pipe(process.stderr)
child.once('close', process.exit)

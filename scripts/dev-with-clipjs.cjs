const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const pptistDir = path.resolve(__dirname, '..')
const clipJsDir = path.resolve(__dirname, '..', '..', 'clip-js')
const npmCli = process.env.npm_execpath
if (!npmCli || !fs.existsSync(npmCli)) {
  console.error('Unable to locate npm-cli.js from npm_execpath')
  process.exit(1)
}

if (!fs.existsSync(path.join(clipJsDir, 'package.json'))) {
  console.error(`Clip-JS submodule is missing at ${clipJsDir}`)
  console.error('Run: git submodule update --init --recursive')
  process.exit(1)
}

const children = []
let stopping = false

const start = (label, cwd, args, extraEnv = {}) => {
  const child = spawn(process.execPath, [npmCli, ...args], {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
    windowsHide: true,
  })
  children.push(child)
  child.on('exit', code => {
    if (stopping) return
    console.error(`${label} exited with code ${code ?? 1}`)
    shutdown(code ?? 1)
  })
  return child
}

const shutdown = code => {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  setTimeout(() => process.exit(code), 100)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

console.log('Starting Clip-JS at http://127.0.0.1:3000')
start('Clip-JS', clipJsDir, ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', '3000'])

console.log('Starting PPTist at http://127.0.0.1:5173')
start(
  'PPTist',
  pptistDir,
  ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'],
  { VITE_CLIP_JS_URL: 'http://127.0.0.1:3000' }
)

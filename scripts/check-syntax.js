const { spawn } = require('child_process');
const { promisify } = require('util');
const { readdir, stat } = require('fs/promises');
const path = require('path');
const debug = require('debug')('app:syntax');

async function* walk(dir) {
  const files = await readdir(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stats = await stat(filepath);
    if (stats.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        yield* walk(filepath);
      }
    } else if (stats.isFile() && /\.(js|jsx)$/.test(file)) {
      yield filepath;
    }
  }
}

async function checkSyntax(file) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32'
    const swcBinary = isWindows ? 'swc.cmd' : 'swc'
    const swcPath = path.join(__dirname, '..', 'node_modules', '.bin', swcBinary)
    const swc = spawn(swcPath, [file], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    })

    let stderr = ''
    swc.stderr.on('data', data => {
      stderr += data
    })

    swc.on('close', code => {
      if (code !== 0) {
        debug(`Syntax error in ${file}:\n${stderr}`)
        reject(new Error(`Syntax error in ${file}:\n${stderr}`))
      } else {
        debug(`✓ ${file}`)
        resolve()
      }
    })
  })
}

async function main() {
  try {
    const srcDir = path.join(__dirname, '..', 'src');
    const files = [];
    for await (const file of walk(srcDir)) {
      files.push(file);
    }

    debug(`Checking syntax of ${files.length} files...`);
    await Promise.all(files.map(checkSyntax));
    debug('All files passed syntax check');
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();

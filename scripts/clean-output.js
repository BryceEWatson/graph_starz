process.stdin.setEncoding('utf8');
let output = '';

process.stdin.on('data', (data) => {
  output += data;
});

process.stdin.on('end', () => {
  const cleanOutput = output.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
});

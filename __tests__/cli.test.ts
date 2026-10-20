import { execSync } from 'child_process';
import path from 'path';

describe('CLI utility (bin/cli.js)', () => {
  const cliPath = path.resolve(__dirname, '../bin/cli.js');

  it('prints help message with --help flag', () => {
    const output = execSync(`node "${cliPath}" --help`).toString();
    expect(output).toContain('SDK Setup Utility');
    expect(output).toContain('setup-sdk');
    expect(output).toContain('verify-sdk');
    expect(output).toContain('https://wap.kbzpay.com');
  });

  it('prints verify output with verify command', () => {
    const output = execSync(`node "${cliPath}" verify`).toString();
    expect(output).toContain('SDK Setup Utility');
    expect(output).toContain('Checking SDK files');
  });
});

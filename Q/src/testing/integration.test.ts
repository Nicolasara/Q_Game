import { spawn } from 'child_process';
import { existsSync, lstatSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { glob } from 'glob';

const CONFIG_FILE_PATH = join(__dirname, 'integrationTestConfigs.json');
const REPO_ROOT = resolve(__dirname, '../../../');

// Where the testScript and directories paths are relative to the repo root
interface TestConfig {
  testScript: string;
  directories: string[];
}

const integrationTestConfigs: TestConfig[] = JSON.parse(
  readFileSync(CONFIG_FILE_PATH, 'utf-8')
);

for (const config of integrationTestConfigs) {
  const allDirectories = getAbsolutePaths(config.directories);
  const nestedDirectories: string[] = [];
  allDirectories.forEach((dir) =>
    nestedDirectories.push(
      ...glob.sync(dir).filter((d) => lstatSync(d).isDirectory())
    )
  );
  xTest(config.testScript, nestedDirectories);
}

function getAbsolutePaths(directories: string[]): string[] {
  return directories.map((directory) => join(REPO_ROOT, directory));
}

function xTest(testScript: string, directories: string[]) {
  const absolutePathTestScript = join(REPO_ROOT, testScript);
  const testScriptDirectory = dirname(absolutePathTestScript);

  process.chdir(testScriptDirectory);

  for (const directory of directories) {
    const directoryName = directory.split('/').pop();
    describe(`Integration tests for ${testScript} from ${directoryName}`, () => {
      for (let n = 0; existsSync(join(directory, `${n}-in.json`)); n += 1) {
        const inputPath = join(directory, `${n}-in.json`);
        const expectedOutputPath = join(directory, `${n}-out.json`);
        xTestOneFile(
          absolutePathTestScript,
          inputPath,
          expectedOutputPath,
          testScript,
          `${directoryName}/${n}`
        );
      }
    });
  }
}

function xTestOneFile(
  testScript: string,
  inputPath: string,
  expectedOutputPath: string,
  testScriptName: string,
  inputName: string
) {
  test(`Integration test of ${testScriptName} against ${inputName}`, async () => {
    // try {
    expect(() => assertFileHasValidJSONs(inputPath)).not.toThrowError(
      'invalid JSON'
    );
    expect(() => assertFileHasValidJSONs(expectedOutputPath)).not.toThrowError(
      'invalid JSON'
    );
    const inputData = readFileSync(inputPath, 'utf-8').trim();
    const expectedOutputData = readFileSync(expectedOutputPath, 'utf-8').trim();

    const outputData = await getOutputFromTest(testScript, inputData);

    expect(JSON.parse(outputData)).toStrictEqual(
      JSON.parse(expectedOutputData)
    );
  }, 10000);
}

async function getOutputFromTest(
  testScript: string,
  inputData: string
): Promise<string> {
  const child = spawn(testScript, [], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  child.stdin.write(inputData);
  child.stdin.end();

  const outputData = await new Promise<string>((resolve, reject) => {
    let data = '';
    child.stdout.on('data', (chunk) => (data += chunk));
    child.stdout.on('end', () => resolve(data.trim()));
    child.stdout.on('error', (err) => reject(err));
  });

  child.kill();

  return outputData;
}

function assertFileHasValidJSONs(filePath: string): void {
  const content = readFileSync(filePath, 'utf-8').trim();
  const values = [];
  let buffer = '';
  for (const char of content) {
    buffer += char;
    try {
      const value = JSON.parse(buffer);
      values.push(value);
      buffer = '';
    } catch (error) {
      continue;
    }
  }
  if (buffer !== '') {
    throw new Error('invalid JSON');
  }
}

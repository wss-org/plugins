import path from 'path';
import fs from 'fs';
import Engine from '@serverless-cd/engine';
require('dotenv').config({ path: path.join(__dirname, '.env') });

const logPrefix = path.join(__dirname, 'logs');

describe('orm', () => {
  beforeAll(() => {
    try {
      removeDir(logPrefix);
    } catch (err) { }
  });

  test('run', async () => {
    const steps = [
      {
        plugin: path.join(__dirname, '..', 'src'),
        inputs: {
          key: 'test123', // objectKey
          path: path.join(__dirname, 'logs'),
          region: 'cn-shenzhen',
          // internal: false,
          bucket: 'wss-test-shenzhen',
          accessKeySecret: process.env.accessKeySecret,
          accessKeyID: process.env.accessKeyID,
        }
      },
      { run: 'echo success' },
    ];
    const engine = new Engine({
      cwd: __dirname,
      steps,
      logConfig: { 
        logPrefix,
        logLevel: 'DEBUG',
      },
      inputs: { sts: { ACCESS_KEY_ID: 'xxxxxx' } },
    });
    await engine.start();
  });
});


function removeDir(dir: string) {
  let files = fs.readdirSync(dir);
  for (var i = 0; i < files.length; i++) {
    let newPath = path.join(dir, files[i]);
    let stat = fs.statSync(newPath);
    if (stat.isDirectory()) {
      //如果是文件夹就递归下去
      removeDir(newPath);
    } else {
      fs.unlinkSync(newPath); //删除文件
    }
  }
  fs.rmdirSync(dir); //如果文件夹是空的，就将自己删除掉
}

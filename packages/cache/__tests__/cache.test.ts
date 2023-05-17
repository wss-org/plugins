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
        run: 'echo "请关联一个阿里云密钥" && xxxxx',
        if: `\${{typeof cloudSecrets.AccessKeyID !== 'string'}}`
      },
      {
        // plugin: "@serverless-cd/cache",
        plugin: path.join(__dirname, '..', 'src'),
        id: 'my-cache',
        inputs: {
          key: `\${{hashFile('${path.join(__dirname, '.env')}')}}`, // objectKey
          path: path.join(__dirname, 'logs'),
          // region: 'cn-shenzhen',
          // credentials: {
          //   accessKeySecret: process.env.accessKeySecret,
          //   accessKeyId: process.env.accessKeyID,
          // },
          // ossConfig: {
          //   bucket: 'wss-test-shenzhen',
          //   internal: false,
          // },
        }
      },
      // { run: `echo {{ steps['my-cache'].outputs['cache-hit'] != 'true' }}` },
    ];
    const engine = new Engine({
      cwd: __dirname,
      steps,
      logConfig: { 
        logPrefix,
        logLevel: 'DEBUG',
      },
      inputs: {
        sts: { ACCESS_KEY_ID: 'xxxxxx' },
        workerRunConfig: {
          region: 'cn-shenzhen',
        },
      },
    });
    await engine.start();
  });

  test.only('run-application', async () => {
    const steps = [
      {
        // plugin: "@serverless-cd/cache",
        plugin: path.join(__dirname, '..', 'src'),
        id: 'my-cache',
        inputs: {
          key: `\${{hashFile('${path.join(__dirname, '.env')}')}}`, // objectKey
          path: path.join(__dirname, 'logs'),
        }
      },
    ];
    const engine = new Engine({
      steps,
      logConfig: { 
        logPrefix,
        logLevel: 'DEBUG',
      },
      inputs: {
        uid: 'xxxxx',
        requestId: 'xxxxxxx',
        ctx: { data: { cacheConfig: { oss: { bucketName: '', regionId: 'cn-shenzhen' } }}},
        context: {},
        sts: { accessKeyId: process.env.accessKeyID, accessKeySecret: process.env.accessKeySecret },
        currentRegion: 'cn-shenzhen',
      },
    });
    await engine.start();
  })
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

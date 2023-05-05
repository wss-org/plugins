import { lodash as _, Logger } from '@serverless-cd/core';

enum Runtime {
  NODEJS12 = 'nodejs12',
  NODEJS14 = 'nodejs14',
  NODEJS16 = 'nodejs16',
  NODEJS18 = 'nodejs18',
  JAVA8 = 'java8',
  PYTHON27 = 'python2.7',
  PYTHON36 = 'python3.6',
  PYTHON37 = 'python3.7',
  PYTHON39 = 'python3.9',
  PYTHON310 = 'python3.10',
  GO118 = 'go1.18',
  PHP72 = 'php7.2',
}

const appAppendPath = {
  [Runtime.NODEJS12]: '/usr/local/versions/node/v12.22.12/bin',
  [Runtime.NODEJS14]: '/usr/local/versions/node/v14.19.2/bin',
  [Runtime.NODEJS16]: '/usr/local/versions/node/v16.15.0/bin',
  [Runtime.NODEJS18]: '/usr/local/versions/node/v18.14.2/bin',
  [Runtime.PYTHON27]: '/usr/local/envs/py27/bin',
  [Runtime.PYTHON36]: '/usr/local/envs/py36/bin',
  [Runtime.PYTHON37]: '/usr/local/envs/py37/bin',
  [Runtime.PYTHON39]: '/usr/local/envs/py39/bin',
  [Runtime.PYTHON310]: '/usr/local/envs/py310/bin',
}

export interface IProps {
  runtime: Runtime;
}


export default function setupRuntime (props: IProps, logger: Logger) {
  const runtimes = _.get(props, 'runtime', [])
  if (!_.isArray(runtimes)) {
    logger.error('Runtime does not meet expectations, skipping processing');
    return;
  }
  const supportedRuntime = Object.values(Runtime);
  for (const runtime of runtimes) {
    if (_.includes(supportedRuntime, runtime)) {
      const needAppendPath = _.get(appAppendPath, runtime);
      logger.debug(`Runtime ${runtime} need appended path: ${needAppendPath}`);
      if (needAppendPath) {
        const p = process.env.PATH || '';
        process.env.PATH = `${needAppendPath}:${p}`;
      }
    } else {
      logger.error(`${runtime} does not meet expectations, skipping processing`);
    }
  }
  logger.debug(`echo $PATH: ${process.env.PATH}`);
}

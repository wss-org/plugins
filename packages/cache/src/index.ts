import { lodash as _, Logger, getInputs, getStepContext } from '@serverless-cd/core';
import Cache, { IProps } from './cache';

const getCacheInputs = (inputs: Record<string, any>, context: Record<string, any>, logger: Logger): IProps => {
  logger.debug(`context: ${JSON.stringify(context)}`);
  logger.debug(`inputs: ${JSON.stringify(inputs)}`);
  const newInputs = getInputs(inputs, context) as unknown;
  logger.debug(`newInputs: ${JSON.stringify(newInputs)}`);

  return {
    objectKey: _.get(newInputs, 'key', ''),
    region: _.get(newInputs, 'region', ''),
    bucket: _.get(newInputs, 'bucket', ''),
    cachePath: _.get(newInputs, 'path', ''),
    internal: _.get(newInputs, 'internal', true),
    credentials: {
      accessKeySecret: _.get(newInputs, 'accessKeySecret', ''),
      accessKeyID: _.get(newInputs, 'accessKeyID', ''),
    },
  };
}

export const run = async (inputs: Record<string, any>, context: Record<string, any>, logger: Logger) => {
  logger.info('start @serverless-cd/cache run');
  const props = getCacheInputs(inputs, context, logger);
  const cache = new Cache(props, logger);
  const res = await cache.run();
  logger.info('Run @serverless-cd/cache end');
  return res;
};

export const postRun = async (inputs: Record<string, any>, context: Record<string, any>, logger: Logger) => {
  logger.info('start @serverless-cd/cache postRun');
  const props = getCacheInputs(inputs, context, logger);

  const stepContext = getStepContext(context);
  const cacheHit = _.get(stepContext, 'run.outputs.cache-hit');
  const cacheError = _.get(stepContext, 'run.outputs.error');
  logger.debug(`Get run output cache hit: ${cacheHit}`);
  const cache = new Cache(props, logger);
  await cache.postRun(cacheHit, cacheError);
  logger.info('postRun @serverless-cd/cache end');
};

export default Cache;

import { lodash as _, Logger, getInputs, getStepContext, getCredentials } from '@serverless-cd/core';
import Joi from 'joi';
import Cache, { IProps, ICredentials } from './cache';

interface ISchemaError {
  error: Error;
};

const getCacheInputs = async (inputs: Record<string, any>, context: Record<string, any>, logger: Logger): Promise<IProps | ISchemaError> => {
  logger.debug(`context: ${JSON.stringify(context)}`);
  logger.debug(`inputs: ${JSON.stringify(inputs)}`);
  const newInputs = getInputs(inputs, context) as Record<string, any>;
  logger.debug(`newInputs: ${JSON.stringify(newInputs)}`);

  const credentials = await getCredentials(newInputs, context) as ICredentials;
  const { error: credentialError } = Joi.object({
    accountId: Joi.string().required(),
    accessKeyId: Joi.string().required(),
    accessKeySecret: Joi.string().required(),
    securityToken: Joi.string(),
  }).validate(credentials, { abortEarly: false, convert: false, allowUnknown: true });

  if (credentialError) {
    logger.debug(`get credentials error: ${credentialError}`);
    return { error: credentialError };
  }

  // 兼容应用中心的逻辑
  if (_.get(context, 'inputs.ctx.data.cacheConfig.oss')) {
    const currentRegion = _.get(context, 'inputs.currentRegion');
    const region = _.get(context, 'inputs.ctx.data.cacheConfig.oss.regionId');

    return {
      region,
      cwd: _.get(context, 'cwd', process.cwd()),
      objectKey: _.get(newInputs, 'key', ''),
      cachePath: _.get(newInputs, 'path', ''),
      bucket: _.get(context, 'inputs.ctx.data.cacheConfig.oss.bucketName', ''),
      internal: currentRegion === region,
      credentials,
    };
  }

  const Schema = Joi.object({
    key: Joi.string().required(),
    path: Joi.string().required(),
    region: Joi.string(),
    ossConfig: Joi.object({
      bucket: Joi.string(),
      internal: Joi.boolean(),
    }),
  });
  
  const { error } = Schema.validate(newInputs, { abortEarly: false, convert: false, allowUnknown: true });
  if (error) {
    logger.debug(`check input error: ${error}`);
    return { error };
  }

  const workerRunRegion = _.get(context, 'inputs.workerRunConfig.region');
  const region = _.get(newInputs, 'region', workerRunRegion);

  return {
    region,
    cwd: _.get(context, 'cwd'),
    objectKey: _.get(newInputs, 'key', ''),
    cachePath: _.get(newInputs, 'path', ''),
    bucket: _.get(newInputs, 'ossConfig.bucket', ''),
    internal: _.get(newInputs, 'ossConfig.internal', workerRunRegion === region),
    credentials,
  };
}

export const run = async (inputs: Record<string, any>, context: Record<string, any>, logger: Logger) => {
  logger.info('start @serverless-cd/cache run');
  const props = await getCacheInputs(inputs, context, logger);
  if ((props as ISchemaError).error) {
    const error = _.get(props, 'error') as unknown as Error;
    logger.warn(`The entry information is wrong: ${error.message}`);
    return { 'cache-hit': false, error };
  }
  const cache = new Cache(props as IProps, logger);
  const res = await cache.run();
  logger.info('Run @serverless-cd/cache end');
  return res;
};

export const postRun = async (inputs: Record<string, any>, context: Record<string, any>, logger: Logger) => {
  logger.info('start @serverless-cd/cache postRun');
  const props = await getCacheInputs(inputs, context, logger);
  if ((props as ISchemaError).error) {
    const error = _.get(props, 'error') as unknown as Error;
    logger.warn(`The entry information is wrong: ${error.message}`);
    return;
  }

  const stepContext = getStepContext(context);
  const cacheHit = _.get(stepContext, 'run.outputs.cache-hit');
  const cacheError = _.get(stepContext, 'run.outputs.error');
  logger.debug(`Get run output cache hit: ${cacheHit}`);
  const cache = new Cache((props as IProps), logger);
  await cache.postRun(cacheHit, cacheError);
  logger.info('postRun @serverless-cd/cache end');
};

export default Cache;

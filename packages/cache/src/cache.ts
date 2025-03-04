import { lodash as _, Logger, fs } from '@serverless-cd/core';
import { spawnSync } from 'child_process';

export interface IProps {
  objectKey: string;
  region: string;
  bucket: string;
  cachePath: string;
  credentials: ICredentials;
  internal?: boolean;
  cwd?: string;
}

export interface ICredentials {
  accountId: string;
  accessKeyId: string;
  accessKeySecret: string;
  securityToken?: string;
}

export default class Cache {
  // -j 多文件操作时的并发任务数，默认值为3，取值范围为1~10000
  // --bigfile-threshold  开启大文件断点续传的文件大小阈值，单位为Byte，默认值为100 MByte，取值范围为 0~9223372036854775807。
  static readonly cpCommonParams = ['-r', '-f', '-j 50', '--bigfile-threshold 9223372036854775800'];
  private logger: Logger;
  private cachePath: string;
  private cloudUrl: string;
  private commonSuffix: string;
  private error?: Error;
  private cwd: string | undefined;
  private createBucketName?: string;

  constructor(props: IProps, logger: Logger) {
    this.logger = (logger || console) as Logger;
    const commonSuffix = [];
    const errorMessage = [];

    const internal = _.get(props, 'internal') === true ? true : false; // 默认为 false
    const region = _.get(props, 'region', '');
    this.logger.debug(`region: ${region}`);
    if (_.isEmpty(region)) {
      errorMessage.push('Region does not meet expectations');
    }
    commonSuffix.push(`-e oss-${region}${internal ? '-internal' : ''}.aliyuncs.com`);

    const { accountId, accessKeyId, accessKeySecret, securityToken } = _.get(props, 'credentials', {} as ICredentials);
    if (_.isEmpty(accessKeyId) || _.isEmpty(accessKeySecret)) {
      errorMessage.push('Credentials does not meet expectations');
    }
    commonSuffix.push(`-i ${accessKeyId}`);
    commonSuffix.push(`-k ${accessKeySecret}`);
    if (securityToken) {
      commonSuffix.push(`-t ${securityToken}`);
    }
    
    let bucket = _.get(props, 'bucket', '');
    if (_.isEmpty(bucket)) {
      logger.debug('Bucket does not meet expectations, need to create');
      bucket = `serverless-cd-${region}-cache-${accountId}`;
      this.createBucketName = bucket;
    }
    const objectKey = _.get(props, 'objectKey', '');
    if (_.isEmpty(objectKey)) {
      errorMessage.push('Key does not meet expectations');
    }
    this.cloudUrl = `oss://${bucket}/${objectKey}${_.endsWith(objectKey, '/') ? '' : '/'}`;
    this.logger.debug(`cloudUrl: ${this.cloudUrl}`);
    this.cachePath = _.get(props, 'cachePath', '');
    this.logger.debug(`cachePath: ${this.cachePath}`);
    if (_.isEmpty(this.cachePath)) {
      errorMessage.push('Path does not meet expectations');
    }
    this.commonSuffix = commonSuffix.join(' ');

    if (!_.isEmpty(errorMessage)) {
      const message = errorMessage.join('\n');
      logger.debug(`New cache error: ${errorMessage}`);
      this.error = new Error(message);
    }
    this.cwd = _.get(props, 'cwd');
    logger.debug(`this.cwd: ${this.cwd}`);
  }

  run(): { 'cache-hit': boolean, error?: Error } {
    if (this.error) {
      return { 'cache-hit': false, error: this.error };
    }
    if (this.createBucketName) {
      this.logger.debug(`retry create bucket: ossutil mb oss://${this.createBucketName}`);
      const { stdout } = spawnSync(`ossutil mb oss://${this.createBucketName} ${this.commonSuffix}; stdout:`, {
        timeout: 10000,
        encoding: 'utf8',
        shell: true,
      });
      this.logger.debug(stdout);
    }
    // @ts-ignore
    const { stdout, status } = spawnSync(`ossutil du ${this.cloudUrl} ${this.commonSuffix}`, {
      timeout: 10000,
      encoding: 'utf8',
      shell: true,
    });
    this.logger.debug(`ossutild du response.status: ${status}; stdout:\n`);
    this.logger.debug(stdout);
    if (status === null || status !== 0) {
      this.error = new Error(`ossutil du error`);
      return { 'cache-hit': false, error: this.error };
    }

    if (!_.includes(stdout, 'total object count: 0')) {
      this.logger.debug('cache-hit: true');
      fs.ensureDirSync(this.cachePath);
      try {
        const cpResponse = spawnSync(`ossutil cp ${this.cloudUrl} ${this.cachePath} ${Cache.cpCommonParams.join(' ')} ${this.commonSuffix}`, {
          encoding: 'utf8',
          shell: true,
          cwd: this.cwd,
        });
        this.logger.debug(`ossutild du response.status: ${cpResponse.status}; stdout:\n`);
        this.logger.debug(cpResponse.stdout);
        return { 'cache-hit': true };
      } catch (ex) {
        this.logger.debug(`ossutild cp erorr: ${ex}`);
        this.logger.error('Download cache failed');
        this.error = new Error('Download cache failed');
      }
    }
    this.logger.debug('cache-hit: false');
    return { 'cache-hit': false, error: this.error };
  }

  postRun(cacheHit: boolean, cacheError: any): void {
    if (cacheError) {
      this.logger.info('Cache error, skipping');
      return;
    }
    if (cacheHit) {
      this.logger.info('Cache already exists, skipping put');
      return;
    }

    this.logger.info('Cache not exists, strat push');
    fs.ensureDirSync(this.cachePath);
    try {
      const cpResponse = spawnSync(`pwd && ossutil cp ${this.cachePath} ${this.cloudUrl} ${Cache.cpCommonParams.join(' ')} ${this.commonSuffix}`, {
        encoding: 'utf8',
        shell: true,
        cwd: this.cwd,
      });
      this.logger.debug(`ossutild du response.status: ${cpResponse.status}; stdout:\n`);
      this.logger.debug(cpResponse.stdout);
    } catch (ex) {
      this.logger.debug(`ossutild cp erorr: ${ex}`);
      this.logger.error('Download cache failed');
    }
  }
}

import { Logger, lodash as _ } from '@serverless-cd/core';
import artTemplate from 'art-template';
import https from 'https';
import crypto from 'crypto';

export enum TYPE {
  TEXT = 'text',
  LINK = 'link',
  MARKDOWN = 'markdown',
  ACTION_CARD = 'actionCard',
  FEED_CARD = 'feedCard',
}

interface IAt {
  isAtAll?: boolean;
  atUserIds?: string[];
  atMobiles?: string[];
}

/*
加签是否需要支持 v
*/

export interface IProps {
  webhook: string;
  msgtype: `${TYPE}`;
  payload: Record<string, any>;
  secret?: string;
  at?: IAt;
}

export default class DingTalk {
  url: string;
  msgtype: string;
  logger: Logger;
  at: IAt | undefined;
  payload: Record<string, any> | {};
  secret: string | undefined;

  static artTemplate(source: string, data: any) {
    return artTemplate.render(source, data);
  }

  constructor(props: IProps, context: Record<string, any> = {}, logger: Logger) {
    this.logger = logger;
    this.url = _.get(props, 'webhook', '');
    if (_.isEmpty(this.url)) {
      throw new Error(`DingTalk webhook is empty`);
    }
    this.msgtype = _.get(props, 'msgtype', TYPE.TEXT);
    this.at = _.get(props, 'at');
    this.secret = _.get(props, 'secret');

    const payload = _.get(props, 'payload', {});
    this.payload = DingTalk.artTemplate(JSON.stringify(payload), context);
  }

  async send() {
    const param = {
      method: 'POST',
      port: 443,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const requestData = this.getPayload();
    let url = this.url;
    if (this.secret) {
      const timestamp = new Date().getTime();
      const sign = this.signFn(this.secret, `${timestamp}\n${this.secret}`);
      url += `&timestamp=${timestamp}&sign=${sign}`;
    }

    const res: any = await new Promise((reslove, reject) => {
      const req = https.request(
        url,
        param,
        res => res.on('data', d => {
          const { errcode } = JSON.parse(d.toString());
          errcode !== 0 ? reject(d.toString()) : reslove(d.toString())
        }),
      );
      req.on('error', (error) => reject(error));
      req.write(requestData);
      req.end();
    });

    return res;
  }

  private signFn(secret: string, content: string): string { // 加签
    const str = crypto.createHmac('sha256', secret).update(content)
      .digest()
      .toString('base64');
    return encodeURIComponent(str);
  }

  private getPayload(): string {
    const payload: Record<string, any> = {
      at: this.at,
      msgtype: this.msgtype,
    };

    switch (this.msgtype) {
      case TYPE.TEXT:
        payload.text = this.payload;
        break;
      case TYPE.LINK:
        payload.link = this.payload;
        break;
      case TYPE.MARKDOWN:
        payload.markdown = this.payload;
        break;
      case TYPE.ACTION_CARD:
        payload.actionCard = this.payload;
        break;
      case TYPE.FEED_CARD:
        payload.feedCard = this.payload;
        break;
      default:
        throw new Error(`Unknown msgtype ${this.msgtype}`);
    }

    return JSON.stringify(payload);
  }
}

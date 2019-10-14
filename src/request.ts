import Url from 'url-parse';
import { Methods } from './index';
import Context from './context';

export default class Request<T extends Context> extends Url {
  public body: any = null;
  public state: any = null;
  public params: {[key: string]: string} = {};
  public referer: string | null = null;
  public method: Methods | null = null;
  public ctx: T;

  constructor(ctx: T, address: string, body: any) {
    super(address, true);
    this.ctx = ctx;
    this.state = body;
  }
}
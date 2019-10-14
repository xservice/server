import Url from 'url-parse';
import { Methods } from './index';
import Context from './context';
export default class Request<T extends Context> extends Url {
    body: any;
    state: any;
    params: {
        [key: string]: string;
    };
    referer: string | null;
    method: Methods | null;
    ctx: T;
    constructor(ctx: T, address: string, body: any);
}

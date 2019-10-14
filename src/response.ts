import Context from './context';
import { Methods } from './index';

export default class Response<T extends Context> {
  public readonly ctx: T;

  constructor(ctx: T) {
    this.ctx = ctx;
  }

  private http<U = any>(url: string, force: Boolean | undefined | null, method: Methods, body: any, callback?: (ctx: T) => void) {
    return this.ctx.ref.generator<U>(url, method, force, body, async (err, ctx) => {
      if (err) {
        if (this.ctx.ref.error) return await Promise.resolve(this.ctx.ref.error(err, ctx));
        throw err;
      }
      callback && callback(ctx);
    });
  }

  private redirection<U = any>(url: string, force: Boolean | undefined | null, body: any, callback?: (ctx: T) => void) {
    if (this.ctx.ref.routing) {
      this.ctx.ref.pushTask(() => this.http<U>(url, force, 'router', body, callback));
    } else {
      this.http<U>(url, force, 'router', body, callback);
    }
  }

  // Add a history to the browser 
  // and perform the current recorded events and behaviors
  redirect(url: string)  {
    return this.redirection(url, false, null, () => {
      if (this.ctx.ref.event === 'popstate') {
        window.history.pushState(null, this.ctx.title || window.document.title, this.ctx.ref.urlencodeWithPrefix(url));
      } else {
        window.location.hash = this.ctx.ref.urlencodeWithPrefix(url);
        window.document.title = this.ctx.title || window.document.title;
      }
    });
  }

  // Replace the current history for the browser 
  // and perform the current recorded events and behaviors
  replace(url: string) {
    url = this.ctx.ref.urlencodeWithPrefix(url);
    return this.redirection(url, false, null, () => {
      if (this.ctx.ref.event === 'popstate') {
        window.history.replaceState(null, this.ctx.title || window.document.title, this.ctx.ref.urlencodeWithPrefix(url));
      } else {
        const i = window.location.href.indexOf('#');
        window.location.replace(
          window.location.href.slice(0, i >= 0 ? i : 0) + '#' + this.ctx.ref.urlencodeWithPrefix(url)
        );
        window.document.title = this.ctx.title || window.document.title;
      }
    });
  }

  // Overloading events and behaviors of the current route
  realod() {
    return this.redirection(this.ctx.req.href, true, null, () => {
      if (this.ctx.ref.event === 'popstate') {
        window.history.pushState(null, this.ctx.title || window.document.title, this.ctx.ref.urlencodeWithPrefix(this.ctx.req.href));
      } else {
        window.location.hash = this.ctx.ref.urlencodeWithPrefix(this.ctx.req.href);
        window.document.title = this.ctx.title || window.document.title;
      }
    });
  }

  get<U = any>(url: string) {
    return this.http<U>(url, true, 'get', null);
  }

  post<U = any>(url: string, data?: any) {
    return this.http<U>(url, true, 'post', data);
  }

  put<U = any>(url: string, data?: any) {
    return this.http<U>(url, true, 'put', data);
  }

  delete<U = any>(url: string) {
    return this.http<U>(url, true, 'delete', null);
  }
}
import Url from 'url-parse';

class Request extends Url {
    constructor(ctx, address, body) {
        super(address, true);
        this.body = null;
        this.state = null;
        this.params = {};
        this.referer = null;
        this.method = null;
        this.ctx = ctx;
        this.state = body;
    }
}

class Response {
    constructor(ctx) {
        this.ctx = ctx;
    }
    http(url, force, method, body, callback) {
        return this.ctx.ref.generator(url, method, force, body, async (err, ctx) => {
            if (err) {
                if (this.ctx.ref.error)
                    return await Promise.resolve(this.ctx.ref.error(err, ctx));
                throw err;
            }
            callback && callback(ctx);
        });
    }
    redirection(url, force, body, callback) {
        if (this.ctx.ref.routing) {
            this.ctx.ref.pushTask(() => this.http(url, force, 'router', body, callback));
        }
        else {
            this.http(url, force, 'router', body, callback);
        }
    }
    // Add a history to the browser 
    // and perform the current recorded events and behaviors
    redirect(url) {
        return this.redirection(url, false, null, () => {
            if (this.ctx.ref.event === 'popstate') {
                window.history.pushState(null, this.ctx.title || window.document.title, this.ctx.ref.urlencodeWithPrefix(url));
            }
            else {
                window.location.hash = this.ctx.ref.urlencodeWithPrefix(url);
                window.document.title = this.ctx.title || window.document.title;
            }
        });
    }
    // Replace the current history for the browser 
    // and perform the current recorded events and behaviors
    replace(url) {
        url = this.ctx.ref.urlencodeWithPrefix(url);
        return this.redirection(url, false, null, () => {
            if (this.ctx.ref.event === 'popstate') {
                window.history.replaceState(null, this.ctx.title || window.document.title, this.ctx.ref.urlencodeWithPrefix(url));
            }
            else {
                const i = window.location.href.indexOf('#');
                window.location.replace(window.location.href.slice(0, i >= 0 ? i : 0) + '#' + this.ctx.ref.urlencodeWithPrefix(url));
                window.document.title = this.ctx.title || window.document.title;
            }
        });
    }
    // Overloading events and behaviors of the current route
    realod() {
        return this.redirection(this.ctx.req.href, true, null, () => {
            if (this.ctx.ref.event === 'popstate') {
                window.history.pushState(null, this.ctx.title || window.document.title, this.ctx.ref.urlencodeWithPrefix(this.ctx.req.href));
            }
            else {
                window.location.hash = this.ctx.ref.urlencodeWithPrefix(this.ctx.req.href);
                window.document.title = this.ctx.title || window.document.title;
            }
        });
    }
    get(url) {
        return this.http(url, true, 'get', null);
    }
    post(url, data) {
        return this.http(url, true, 'post', data);
    }
    put(url, data) {
        return this.http(url, true, 'put', data);
    }
    delete(url) {
        return this.http(url, true, 'delete', null);
    }
}

class Context {
    constructor(url, method, body, reference) {
        this.title = window.document.title;
        this.ref = reference;
        this.req = new Request(this, url, body);
        this.res = new Response(this);
        this.req.method = method;
    }
    get auth() {
        return this.req.auth;
    }
    get hash() {
        return this.req.hash;
    }
    get host() {
        return this.req.host;
    }
    get hostname() {
        return this.req.hostname;
    }
    get href() {
        return this.req.href;
    }
    get origin() {
        return this.req.origin;
    }
    get password() {
        return this.req.password;
    }
    get pathname() {
        return this.req.pathname;
    }
    get port() {
        return this.req.port;
    }
    get protocol() {
        return this.req.protocol;
    }
    get slashes() {
        return this.req.slashes;
    }
    get method() {
        return this.req.method;
    }
    get username() {
        return this.req.username;
    }
    get isApi() {
        return this.method !== 'router';
    }
    get query() {
        return this.req.query;
    }
    get state() {
        return this.req.state;
    }
    get params() {
        return this.req.params;
    }
    get referer() {
        return this.req.referer;
    }
    get path() {
        return this.req.pathname;
    }
    redirect(url) {
        return this.res.redirect(url);
    }
    replace(url) {
        return this.res.replace(url);
    }
    reload() {
        return this.res.realod();
    }
    get(url) {
        return this.res.get(url);
    }
    post(url, data) {
        return this.res.post(url, data);
    }
    put(url, data) {
        return this.res.put(url, data);
    }
    delete(url) {
        return this.res.delete(url);
    }
}

class VPCExpection extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'VPCExpection';
        this.status = status;
    }
}
function Monitor(options) {
    /**
     * In the following two cases, the system will force the listen mode to be converted to `hashchange`:
     *  1. When the `popstate` listen mode is specified, but the system browser does not support.
     *  2. When loading the page using the file protocol.
     */
    if ((options.event === 'popstate' && !window.history.pushState) ||
        window.location.protocol.indexOf('file:') === 0) {
        options.event = 'hashchange';
    }
    // We agree that the `options.prefix` must end with `/`
    if (!options.prefix)
        options.prefix = '/';
    if (!options.prefix.endsWith('/'))
        options.prefix += '/';
    const reference = {
        prefix: options.prefix,
        event: options.event,
        error: options.error,
        start: options.start,
        stop: options.stop,
        stacks: [],
        ctx: null,
        microTask: [],
        routing: false,
        get referer() {
            return reference.ctx ? reference.ctx.req.referer : null;
        },
        // Determine the routing address 
        // by the current network address and prefix prefix
        getCurrentRequest() {
            let path = reference.event === 'popstate'
                ? window.location.href.substring(window.location.origin.length) || reference.prefix
                : (window.location.hash ? window.location.hash.substring(1) : reference.prefix);
            if (path.startsWith(reference.prefix))
                path = path.substring(reference.prefix.length - 1) || '/';
            return path;
        },
        // Combine custom addresses with prefix to form a network address
        urlencodeWithPrefix(url) {
            if (url.startsWith(reference.prefix))
                return url;
            if (url.startsWith('/'))
                url = url.substring(1);
            return reference.prefix + url;
        },
        urldecodeWithPrefix(url) {
            if (url.startsWith(reference.prefix))
                url = url.substring(reference.prefix.length);
            if (!url.startsWith('/'))
                url = '/' + url;
            return url;
        },
        // Customize events and behaviors by throwing them 
        // into a rule parsing function by customizing the address.
        async generator(url, method, force, body, callback) {
            if (!force && reference.referer === url)
                return;
            const ctx = new Context(url, method, body, reference);
            const isRouter = method === 'router';
            if (isRouter) {
                reference.ctx = ctx;
                reference.routing = true;
            }
            reference.start && await reference.start(ctx);
            let stopInvoked = false;
            return await Promise.all(reference.stacks.map(stack => Promise.resolve(stack(ctx))))
                .then(async () => {
                if (isRouter)
                    reference.ctx.req.referer = url;
                if (reference.stop) {
                    await reference.stop(ctx);
                    stopInvoked = true;
                }
                if (callback)
                    await callback(null, ctx);
                if (isRouter)
                    reference.routing = false;
                return ctx.body;
            })
                .catch(async (e) => {
                if (!stopInvoked && reference.stop)
                    await reference.stop(ctx);
                callback && await callback(e, ctx);
                if (isRouter)
                    reference.routing = false;
                return Promise.reject(e);
            })
                .then(async (data) => {
                await reference.execTask();
                return data;
            })
                .catch(e => { })
                .finally(() => {
                if (isRouter)
                    reference.routing = false;
            });
        },
        pushTask(fn) {
            reference.microTask.push(fn);
        },
        async execTask() {
            if (!reference.microTask.length)
                return;
            const tasks = reference.microTask.slice(0);
            reference.microTask = [];
            await Promise.all(tasks.map(task => Promise.resolve(task())));
        },
        // Stack throw function for multi-layer custom events and behaviors
        callback(...fns) {
            this.stacks.push(...fns);
            return this;
        },
        // The jump map is implemented by listening 
        // to the matched route through the parameter dictionary.
        listen(mapState = {}) {
            const path = this.getCurrentRequest();
            return reference.bootstrap(mapState[path] || path);
        },
        bootstrap(url) {
            url = reference.urldecodeWithPrefix(url);
            return reference.generator(url, 'router', false, null, async (err, ctx) => {
                if (err) {
                    if (reference.error)
                        await Promise.resolve(reference.error(err, ctx));
                    throw err;
                }
                if (reference.event === 'popstate') {
                    window.history.replaceState(null, ctx.title || window.document.title, reference.urlencodeWithPrefix(url));
                }
                else {
                    const i = window.location.href.indexOf('#');
                    window.location.replace(window.location.href.slice(0, i >= 0 ? i : 0) + '#' + reference.urlencodeWithPrefix(url));
                    window.document.title = ctx.title || window.document.title;
                }
            });
        }
    };
    // Listen to browser default behavior
    window.addEventListener(reference.event, () => {
        const path = reference.getCurrentRequest();
        reference.generator(path, 'router', false, null, async (e, ctx) => {
            if (e) {
                if (reference.error)
                    return await Promise.resolve(reference.error(e, ctx));
                throw e;
            }
        });
    });
    return function createServer(...fns) {
        return reference.callback(...fns);
    };
}

export default Monitor;
export { Context, Request, Response, VPCExpection };

# @xservice/server

通用的路由监听处理架构，它主要分两中模式：

- `hashchange` 传统hash路由模式
- `popstate` 基于html5路由模式

它能够快速为你创建路由监听，省去您的工作时间，同时保障质量和效率。

## Usage

从npm下载模块：

```bash
npm i @xservice/server
```

在代码中使用

```typescript
import Monitor, { Context } from '@fvaa/monitor';
interface CustomContext extends Context {
  // ...
}
// create instance
const createServer = Monitor<CustomContext>({
  // prefix: '/api',
  event: 'hashchange'
});

// create server 
// and listen url redirection maps on start time.
createServer(async (ctx) => console.log(ctx)).listen({
  '/': '/abc'
});
```

## Monitor.options

- `prefix` 指定当前路由前缀
- `event` 您期望使用的监听事件名 *hashchange* 或 *popstate* 默认：**hashchange**
- `error` 错误处理函数
- `start` 进程开始处理函数
- `stop` 进程结束处理函数

错误处理函数可以这样这样写

```javascript
// ts type: error?(e: Error, req: Request, res: Response): void
Monitor({
  error(err, ctx) {
    console.log(err, ctx);
  },
  start(ctx) {
    console.log(ctx);
  },
  stop(err, ctx) {
    console.log(ctx);
  }
})
```

## createServer

它用来处理请求变化时候的响应函数。它的参数即回调函数，每个回调函数必须是`async`函数。我们来看下它的ts定义：

```javascript
export type AsyncRequestPromiseLike<T> = (req: Request, res: Response) => Promise<T>;
// ...
(...fns: Array<AsyncRequestPromiseLike<void>>) => MonitorContext
```

所以我们可以这样使用

```javascript
createServer(
  async (req: Request, res: Response) => console.log(1, req, res),
  async (req: Request, res: Response) => console.log(2, req, res),
  async (req: Request, res: Response) => console.log(3, req, res),
  ...
)
```

## listen

在初始化页面的时候，我们可以通过定义一个`redirection map`来转接路由地址：

```javascript
createServer(...).listen({
  '/': '/abc',
  '/test': '/yyyyyy/123'
})
```

当我们当前的URL在`/`的时候，自动转换为`/abc`路由；当我们当前的URL在`/test`的时候，自动转换为`/yyyyyy/123`路由。

> 注意，此功能值在页面初始化时候有效。

## Response

我们提供3中交互方法：

- `redirect(url:string)` 为浏览器历史记录添加一条数据
- `replace(url:string)` 替换当前浏览器历史记录为新记录
- `reload()` 重载历史记录。

```javascript
await res.redirect('/test');
await res.replace('/test');
await res.reload();
```

其他的虚拟请求(VPC)方法如下

```javascript
await res.get('/test');
await res.post('/test', {});
await res.put('/test', {});
await res.delete('/test');
```

> 所有Request与Response的方法属性都可以在ctx上直接被调用

# License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2018-present, yunjie (Evio) shen

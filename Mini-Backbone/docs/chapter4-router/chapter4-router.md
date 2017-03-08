## Chapter 4: Router&History

以往章节：

- [Chapter 1: Events](https://github.com/jsrebuild/javascript-framework-design/blob/master/Mini-Backbone/docs/chapter1-events/chapter1-events.md)
- [Chapter 2: Model](https://github.com/jsrebuild/javascript-framework-design/blob/master/Mini-Backbone/docs/chapter2-model/chapter2-model.md)
- [Chapter 3: Collection](https://github.com/jsrebuild/javascript-framework-design/blob/master/Mini-Backbone/docs/chapter4-router/chapter4-router.md)

### 关于SPA以及前端路由

> 这里要介绍一下SPA是什么，为什么要有前端路由，前端路由实现的两种方式。

### Backbone的Router和History模块

用Backbone来写SPA是一件很便利的事。Backbone中有完备的Router和History模块，它默认使用hash，而在不支持hash的浏览器中使用iframe，同时又可以使开发者在支持PushState的浏览器通过显示声明使用PushState mode。mBackbone实现了一个仅支持PushState mode 的Router模块：

### `Backbone.Router`的API设计

定义路由：

```javascript
var AppRouter = Backbone.Router.extend({
    //routes对象中key是路由规则，value是与路由规则相对应的方法名
    routes : {
        '' : 'index',
        'list' : 'renderList',
        //使用冒号时，会把冒号之后的内容传给对应的方法
        //比如 #article/100，  会把100传给renderArticle作为参数
        'article/:page' : 'renderArticle',
        '*error' : 'renderError'
    },
    index : function() {
        console.log('主页');
    },
    renderList : function() {
        console.log('文章列表页');
    },
    renderArticle : function(page) {
        console.log('文章内容页, page为: ' + page);
    },
    renderError : function(error) {
        console.log('URL错误, 错误信息: ' + error);
    }
});
var router = new AppRouter();
//手动调用start方法
Backbone.history.start();

```

View中路由跳转:

```javascript
this.options.router.navigate("error", {
        trigger: true
      });
```

> 介绍API之后，最好说一下具体的思路。比如有了路由-callback这个hash之后，我们在主动navigate和pushstate两种情况下进行处理。然后再开始分析具体的源码，不然有点没头没脑的。

### `Backbone.Router`和`Backbone.History`的实现

> 下面这里建议分小节加小标题，然后函数名要用`单行代码`修饰。写的时候可以加上主语，比如：我们首先看看xxx。


首先定义了Router的基本的属性，包括preinitialize 和 initialize函数，并传入options，绑定this.routes。this.\_bindRoutes()使得Router实例创建之后能够立即执行_bindRoutes函数

> 定义了Router的基本的属性，这个说法太不专业了，这里很明显就是在写Router构造函数。`preinitialize`函数具体做了什么呢，下文好像没有提到。

```javascript
var Router = mBackbone.Router = function(options) {
    // init options
    options || (options = {});
    this.preinitialize.apply(this, arguments);
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
};
```

接下来为了让Router具有Events模块的基本功能，还需要extend Events模块。

> extend其实就是一种mixin，混入Event模块的功能。

```
  _.extend(Router.prototype, Events, {
    preinitialize: function(){},
    initialize: function(){},
    ......
  }
    
```

首先来看`bindRoutes()`

```
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },
```

> 上面的代码片段，最后一个trailing comma没去掉，这种细节要注意。然后下面这段话没有主语，很奇怪。要把话讲清楚，用连接词。注意格式··

如果this.routes为空的话就返回。若定义路由时options中有定义routes，则把routes对象中的key-value 作为参数都传到this.route函数中。如this.route('list' ,'renderList')

> 如果this.routes为空的话就返回。这种是废话，看文章的人又不是没脑子，源码分析，不是让你用汉语把代码逻辑翻译一遍，你也是要用脑子的。你可以说`_bindRoutes`这个函数主要做的是什么事情，比如我会说，这个函数是遍历传入的routes hash，使用`route()`API把路由真正**注册**到router实例上，注册这个术语很关键。这里`_.result`这个utility函数是做什么的，你要说清楚啊，因为这个在上下文里是看不出的，`_.keys`这种倒是不用怎么说，属于self-explained的那种。`route = routes.pop()`这个判断也是属于没头没脑的，需要解释的。

紧接着来看`route()`

```
    route: function(route, name, callback){
        if (!_.isRegExp(route)) route = this._routeToRegExp(route);
        if (_.isFunction(name)) {
            callback = name;
            name = '';
        }
        if (!callback) callback = this[name];
        mBackbone.history.route(route, function(fragment) {
            		（a callback！！）
            }
        });
    },
```
首先是处理传入的route参数，将其转为正则表达式。再看一下传入的第二个参数是否为callback function。之后将route及一个高阶函数又再作为参数传给history.route。 

> 上面代码里的（a callback！！）这个··有问题吧 你这写的感觉是注释。我看了最后你写的那个没头没脑的匿名函数，才知道这个函数是这里的。醉了。
> 还有，把一个函数放一个匿名函数里，不叫高阶函数··。高阶函数是返回一个函数的函数··，是用来制造新函数的。


```
    route: function(route, callback) {
        this.handlers.unshift({route: route, callback: callback});
    },
```

history.route 做的事情很简单，就是把route和callback保存到handlers这个对象数组中。

> 这里说的要清楚一些。我们组装一个`handler`对象，route和route，callback是`route`里包装了用户回调的函数，然后把这个对象推进`handlers`数组中。

具体传入的callback有什么作用，我们等到后面调用它的时候再解释。到这里，我们就已经把Router和History两个模块联系起来了。

> 到这里，我们就已经把Router和History两个模块联系起来了。 你上文倒是预告一下啊，不然别人一开始哪里知道有什么联系。在介绍API之后那段话。

接下来就要执行 `Backbone.history.start()` 

```
    start: function(options) {
        if (History.started) throw new Error('Backbone.history has already been started');
        History.started = true;
        this.options          = _.extend({root: '/'}, this.options, options);
        this.root             = this.options.root;
        // hasPushState && usePushState
        this.fragment         = this.getFragment();
        addEventListener('popstate', this.checkUrl, false);
        if (!this.options.silent) return this.loadUrl();
    },
```

和router一样，把传进来的options保存到this.options中，从这里可以看到root默认为‘/’，但可以在options中修改。root定义的字符将不参与fragment的匹配。start方法里最重要的是监听popstate事件，当用户通过前进后退按钮触发popstate，使URL改变但不刷新页面，这是实现单页应用的关键。

> 这里漏了一个很重要的点，`Backbone.history`是一个全局的单例，只有一个实例。你要说一下这个实例是什么时候初始化的，你是190行的`mBackbone.history = new History();`来的。不然平白无故哪里来的。`Backbone.History`是构造函数，上面有个全局的静态变量`History.started`，来记录全局的`History`是不是已经开始监听。

---

前文说过，有两种情况会触发路由改变，一个是前进后退，一个是通过navigate方法。而触发路由改变之后做的事情都是一样的，首先是`getFragment`，再`loadUrl`

如果是通过浏览器的前进后退按钮，就触发popstate事件，并执行`checkUrl`

```
    checkUrl: function(e) {
        var current = this.getFragment();
        this.loadUrl(current);
    },
```
可以看到checkUrl里面只做了两件事，调用`getFragment()`和`loadUrl()`

再看调用navigate的时候，同样调用`getFragment()`和`loadUrl()`

```
    navigate: function(fragment, options) {
		 ...dealing with options...	
        fragment = this.getFragment(fragment || '');
		 ...dealing with path and fragment...
        if (options.trigger) return this.loadUrl(fragment);
    }
```

所以可以将`getFragment`和`loadUrl`抽象出来

```
    getFragment: function(fragment) {
        //undefined == null -> true
        if (fragment == null) {
            fragment = this.getPath();
            //getPath主要把pathname中root的部分删去
        }
        return fragment.replace(routeStripper, '');
    },
```
得到fragment，作为参数传到`loadUrl`中

```
    loadUrl: function(fragment) {
            // If the root doesn't match, no routes can match either.
            if (!this.matchRoot()) return false;
            return _.some(this.handlers, function(handler) {
            if (handler.route.test(fragment)) {
                handler.callback(fragment);
                return true;
            }
        });
    },
```
看到这里，还记得handlers这个对象数组吗？还记得之前有个还没来得及解释的高阶函数吗？如果不记得的话倒回去看一下Router.route吧。我们最后要做的，最最重要的事情就是到handlers中匹配fragment，匹配成功的话则把fragment作为参数传入callback。

> 这里用了`_.some`，按underscore文档里说的，那就是说这里会遍历`this.handlers`数组，在每个数组里都去运行回调，在第一个返回true的item那边停止，这边不会出现多个route匹配同一个fragment的情况，而是顺序第一的先匹配。

```
function(fragment){
	var args = router._extractParameters(route, fragment);
    if (router.execute(callback, args, name) !== false) {
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        mBackbone.history.trigger('route', router, name, args);
    }
}
```
首先是对fragment的处理。如`'article/:page' : 'renderArticle',`,则要把:page分离出来。接着利用Event模块中的trigger，执行如上例renderArticle function

> 这个函数是之前的`route`里面的，但你这里完全没有说啊，谁知道这个函数是哪里的。`mBackbone.history.trigger`以及`router.trigger`是用来触发内置的生命周期事件的，这个你完全没有提到。你上面说 接着利用Event模块中的trigger，执行如上例renderArticle function， 这个完全是错的，Event模块中的trigger不是用来触发路由回调的。 `router.execute(callback, args, name)` 才是




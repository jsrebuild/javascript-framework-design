## chapter4 - 路由Router + History

以往章节：

- [chapter1 - 事件Events](https://github.com/jsrebuild/javascript-framework-design/blob/master/Mini-Backbone/docs/chapter1-events/chapter1-events.md)
- [chapter2 - 模型Model](https://github.com/jsrebuild/javascript-framework-design/blob/master/Mini-Backbone/docs/chapter2-model/chapter2-model.md)
- [chapter3 - 集合Collection](https://github.com/jsrebuild/javascript-framework-design/blob/master/Mini-Backbone/docs/chapter4-router/chapter4-router.md)

### 前言
用Backbone来写SPA是一件很便利的事。Backbone中有完备的Router和History模块，它默认使用hash，而在不支持hash的浏览器中使用iframe，同时又可以使开发者在支持PushState的浏览器通过显示声明使用PushState mode。mBackbone实现了一个仅支持PushState mode 的Router模块：

### 用法
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
### 初始化

首先定义了Router的基本的属性，包括preinitialize 和 initialize函数，并传入options，绑定this.routes。this.\_bindRoutes()使得Router实例创建之后能够立即执行_bindRoutes函数

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

如果this.routes为空的话就返回。若定义路由时options中有定义routes，则把routes对象中的key-value 作为参数都传到this.route函数中。如this.route('list' ,'renderList')

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

```
    route: function(route, callback) {
        this.handlers.unshift({route: route, callback: callback});
    },
```
history.route 做的事情很简单，就是把route和callback保存到handlers这个对象数组中。
具体传入的callback有什么作用，我们等到后面调用它的时候再解释。到这里，我们就已经把Router和History两个模块联系起来了。

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




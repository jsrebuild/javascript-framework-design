## chapter5 - 视图View

以往章节：

- [chapter1 - 事件Events](https://github.com/jsrebuild/javascript-framework-design/blob/master/Mini-Backbone/docs/chapter1-events/chapter1-events.md)
- [chapter2 - 模型Model](https://github.com/jsrebuild/javascript-framework-design/blob/master/Mini-Backbone/docs/chapter2-model/chapter2-model.md)
- [chapter3 - 集合Collection](https://github.com/jsrebuild/javascript-framework-design/blob/master/Mini-Backbone/docs/chapter4-router/chapter4-router.md)
- [chapter4 - 路由Router + History](https://github.com/jsrebuild/javascript-framework-design/blob/master/Mini-Backbone/docs/chapter4-router/chapter4-router.md)

### 前言
MVC架构中的view的作用主要用来将model中的数据显示到用户界面，同时监听绑定到view的事件，执行相应的操作。Backbone中的view做的事情其实不多，这里我们主要从组件化的角度去实现一个view： 

- 初始化
- 生命周期
- 事件机制

作个比喻，笔者认为一个view就是一个组件，一个组件类似于自然界的生物，它具有从诞生到销毁的生命周期，具有名字（id），能够对外界刺激作出反应的事件机制。接下来我们将从这个方向展开，实现一个可操作的view。  

### 初始化
初始化一个view，我们只需要给其赋予一个名字，赋予它天生携带的属性，接着把它创造出来，最后带上一个初始化技能（也就是initialize方法)）, 根据以上我们实现一个View类，并且挂载到全局`mBackbone`变量上:  

```javascript
var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events']

var View =  mBackbone.View = function(options) {
  this.cid = _.uniqueId('view')
  _.extend(this, _.pick(options, viewOptions))
  this._ensureElement()
  this.initialize.apply(this, arguments)
}
```
其中`this.initialize.apply(this, arguments)`能够让view实例化后直接执行`initialize()`
方法，接下来看核心方法`this._ensureElement()`的实现，注意，为了让View具有Events模块的基本功能，我们需要从Events这里继承： 

```javascript
_.extend(View.prototype, Events, { 

  _ensureElement: function() {
    if(!this.el) {
      var attrs = _.extend({}, _.result(this, 'attributes'))
      if(this.id) attrs.id = _.result(this, 'id')
      if(this.className) attrs['class'] = _.result(this, 'className')
      this.setElement(document.createElement(_.result(this, 'tagName')))
      this.$el.attr(attrs)
    } else {
      this.setElement(_.result(this, 'el'))
    }
  }

})
```
首先必须说明的是 每个View必须有一个el属性，这个属性是DOM元素的引用，什么意思呢？即这个el是否插入页面和什么时候插入都是可控的，也就是说View实例根据这个el可以随时插入到dom中，这样就保证了减少重绘的性能损耗。  
上面代码，首先我们先判断是否有el，如果没有，则将`id, class`这些加入到`attributes`中，最关键的一步在于调用`setElement()`方法，这个方法是设置DOM元素的，我们下面会说，这里注意的一点是根据`tagName`创建DOM元素， 为了保证`tagName`一直存在，我们需要默认设置为'div' ： 

```javascript
_.extend(View.prototype, Events, { 
  tagName: 'div',
  
  _ensureElement: function() {
    ...
  }
})
```

接下来讲解`setElement()`, 看代码:  

```javascript
_.extend(View.prototype, Events, {
  
  $: function(selector) {
    return this.$el.find(selector)
  },

  setElement: function(element) {
    this.undelegateEvents()
    this.$el = el instanceof mBackbone.$ ? el : mBackbone.$(el)
    this.el = this.$el[0]
    this.delegateEvents()
    return this
  },
  ...
})
```

`undelegateEvents()` 和  `delegateEvents()` 的实现放在事件机制模块，我们只要知道前者是负责卸载委托事件，后者是装载委托事件。 当传入element到这个方法后，会判断是否为jQuery的实例，是就直接赋值给$el，否就调用$方法。可能有人会问，这个$el是干什么用的？我们知道有时候想使用jQuery或者Zepto的方法，但是调用el显然不行，于是$el随之而来，它是el的jQuery缓存对象，相当于 `view.$el = $(view.el)`，于是使用$el就可以调用jQuery或者Zepto库的方法了。  

### 生命周期
backbone中生命周期的实现非常灵活，基本上render全部交给了自己去实现，它只做了返回`this`实例这件事: 
```javascript
_.extend(View.prototype, Events, {
  
  initialize: function() {},

  render: function() {
    return this
  },

  remove: function() {
    this.$el.remove()
    this.stopListening()
    return this
  },
  ...
})
```

可以看到，从View组件的初始化到render再到最后销毁，大部分事情都交给程序员自己去实现，比如render方法它定义了渲染模版的实现，这里我们可以默认使用Underscore里的`_.template()`，注意这里的`initialize`会在view实例创建后立即调用，最后remove销毁组件。接下来我们讲解如何实现事件机制。

### 事件机制
如果是实现类似hash-events这种形式的事件机制，即`'eventName selector': 'callbackFunction'`， 这种该怎么实现呢？具体看以下代码:  

```javascript
_.extend(View.prototype, Events, {
  
  delegateEvents: function(events) {
    // 提取events属性 
    events || (events = _.result(this, 'events'))
    if(!events) return this
    // 卸载事件
    this.undelegateEvents()
    
    // 依次调用事件
    for (var key in events) {
      var method = events[key]
      if(! _.isFunction(method)) method = this[method]
      if(!method) continue
      // 使用match()返回一个匹配正则的数组
      var match = key.match(delegateEventSplitter)
      this.delegate(match[1], match[2], _.bind(method, this))
    }

    return this
  },

  delegate: function(eventName, selector, listener) {
    this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener)
    return this
  },

  undelegateEvents: function() {
    if(this.$el) this.$el.off('.delegateEvents' + this.cid)
    return this
  },
  ...
})
```
`delegateEvents`中的循环体主要将回调函数绑定到对应得事件上，注意`delegateEventSplitter`变量，这是个以正则表达式:    

`var delegateEventSplitter = /^(\S+)\s*(.*)$/ `    

这个表达式如何匹配呢，举个例子，比如eventName是这样的：   

`"click .foo .bar"`经过match方法匹配后返回一个数组: ["click .foo .bar", "click", ".foo .bar", index: 0, input: "click .foo .bar"]，我们需要提取事件名以及选择器，这也是为什么`delegate`传入"match[1],match[2]"这两个参数。这里需要注意的是，调用jQuery中的"on"方法，我们给每个事件名加了一个`'.delegateEvents' + this.cid`这样的命名空间，这样做的目的是在卸载事件的时候可以全部卸载带有该命名空间的事件。

### 总结
以上就是实现View的所有内容，可以说做的事情非常简单，其中大部分都交给开发者自己去实现(比如render,initialize等)。 



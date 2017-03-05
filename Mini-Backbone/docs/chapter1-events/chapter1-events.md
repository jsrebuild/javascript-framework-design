## chapter1-events

Backbone是早起的js前端MVC框架之一，是一个依赖于underscore和jquery的轻量级框架，尽管在当今已稍显落伍，但其精妙的设计与结构仍让读者受益匪浅。本文旨在介绍Backbone中最核心的Events事件模块，将依次分析`on`、`off`、`once`、`trigger`、`listenTo`、`stopListening`、`listenToOnce`等API的原理。本文会出现部分源码，请点击[这里](http://backbonejs.org/docs/backbone.html)查看完整源码

### on的实现（别名：bind）
调用语句：`object.on(name, callback, [context])` <br>
API`on`主要是用于自身事件的绑定，在`object`上绑定一个`callback`回调函数，只要名为`name`的事件触发该回调函数就会调用，如果一个页面含有大量不同事件时，约定使用`:`来为事件增添命名空间，并用空格来分隔事件。而且回调函数中的`this`指向传递的第三个参数`context`。其实绑定呢，就是把`callback`填到相应的数组里。
```
Events.on = function(name, callback, context){
    return internalOn(this,name,callback,context)
}
```

首先来看一下`eventsApi`函数，`iteratee`是一个执行实际功能的函数，`events`是一个用来挂载所有事件的对象，`name`是事件名称，`callback`是回调函数，`opts`是额外参数，这个函数的主要作用是事件流`name`划分成一个一个的事件然后调用`iteratee`函数，并最后返回`events`数组。
```
 var eventSplitter = /\s+/;
 //正则函数表达式，判断是否有多个空格
var eventsApi = function(iteratee, events, name, callback, opts){
    var i = 0,names
    if(name && typeof name === 'object'){

        if(callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback
        for(names = _.keys(name); i < names.length ; i++){
            //递归调用eventsApi使得分割多个事件对象
            events = eventsApi(iteratee,events,names[i],name[names[i]],opts)
        }
    }
    else if(name && eventSplitter.test(name)){
        //如果一个对象提供了多个事件，则遍历事件数组，逐个调用iteratee函数
        for (names = name.split(eventSplitter); i < names.length;i++)
            events = iteratee(events, names[i], callback,opts)
    }
    else{
        //只有一个事件
        events = iteratee(events, name, callback, opts)
    }
    return events
}
```

那么被调用的`iteratee`函数到底是什么样子的呢？<br>
第一步来看函数`onApi`，这个函数的主要作用是在名为`events`的对象上创建一个`key`为事件名`name`的数组，并将包含`callback`以及从`opts`中获得的`context`、`listening`这些属性的对象推入数组。关于`listening`会在后文事件监听中介绍。
```
var onApi = function(events, name, callback, opts){
    if(callback) {
        var handlers = events[name] || (events[name] = [])
        //检查是否存在events[name]数组，若无则创建
        var context = opts.contexts, ctx = opts.ctx, listening = opts.listening
        if(listening) listening.count++

        handlers.push({callback: callback, context: context, ctx: context || ctx, listening: listening})
    }
    return events 

}
```
如果回调函数`callback`存在的话就将相应信息添加到events[name]数组上，并`return`最后得到的`events`数组<br>

`onApi`的进一步封装是`internalOn`，`internalOn`调用`eventsApi`并将`onApi`作为传入的`iteratee`，调用`onApi`函数实现数组的绑定将回调函数等信息绑定在`obj._events`数组上，并返回对象`obj`。同时如果传入了`listening`对象，则将在被观察者的`_listeners`数组上记录观察者和观察的信息。
```
var internalOn = function(obj, name, callback, context, listening){
        obj._events = eventsApi(onApi, obj._events||{}, name, callback,{
        context: context,
        ctx: obj,
        listening: listening
    })
    if(listening){
        var listeners = obj._listeners || (obj._listeners = {})
        listeners[listening.id] = listening
    }
    return obj
}
```

然后就可以实现事件的绑定了
```
//绑定事件
Events.on = function(name, callback, context){
    return internalOn(this,name,callback,context)
}
```
调用`internalOn`函数就能绑定相应的事件信息到`this`上，也就是此处的`Events`

### listenTo的实现
调用语句：`object.listenTo(other, event, callback) `<br>
紧接着来看看`listenTo`的实现。让`object`监听另一个（`other`）对象上的一个特定事件。
```
//监听另一对象事件
Events.listenTo = function(obj,name,callback){
    if(!obj) return this
    var id = obj._listenId || (obj._listenId = _.uniqueId('l'))  
    //若此对象尚无监听事件，则产生一个全局的唯一id，以l作为前缀
    var listeningTo = this._listeningTo || (this._listeningTo = {})
    var listening = listeningTo[id]

    //若此对象未被监听
    if(!listening){
        var thisId = this._listenId || (this._listenId = _.uniqueId('l'))
        listening = listeningTo[id] = {obj:obj, objId : id, id : thisId,listeningTo : listeningTo,count : 0}
    }
    //调用internalOn添加相应信息
    internalOn(obj, name, callback, this, listening)
    return this
}
```
首先判断是否有传入被监听对象`obj`，如果没有，直接返回，否则获取到此被监听对象的被监听`id`值，并将`Events`上的监听事件的对象赋值给`listeningTo`，然后找到`Events`监听`obj`的对象，赋值给`listening`，若此对象不存在，则创建相应对象，最后调用`internalOn`添加监听信息。

### off的实现（别名：unbind）
调用语句：`object.off([event], [callback], [context])`<br>
API`off`用于事件的解绑，作用为，从`object`对象上移除先前绑定的`callback`函数。如果没有指定的`context`，所有上下文下的这个`callback`函数都会被移除，也就是会移除所有监听事件；如果没有`callback`，所有绑定在`object`上的回调函数都会被移除；如果没有`event`，所有事件的回调函数都会被移除。上文有说到，绑定，就是把`callback`填到相应的数组里，那么解绑，就是从数组里删除相应的`callback`。<br>
```
//解除事件的绑定
Events.off = function(name,callback,context){
    //若未绑定事件
    if(!this._events) return this
    this._events = eventsApi(offApi, this._events, name, callback, {
        context: context,
        listeners: this._listeners
    })
    return this
}
```
`this`指向`Events`。首先判断`Events`是否绑定事件，若未绑定事件，则直接返回，否则调用`eventsApi`函数进行事件的解绑。<br>
然后来看看`off`的核心函数`offApi`的实现。
```
var offApi = function(events, name, callback, opts){
    //判断events事件是否存在
    if(!events) return
    var i = 0,listening
    var context = opts.context, listeners = opts.listeners

    if(!name && !callback && !context){
        //移除所有监听
        var ids = _.keys(listeners)
        for(; i < ids.length; i++){
            listening = listeners[ids[i]]
            delete listeners[listening.id]
            delete listening.listeningTo[listening.objId]
        }
        return
    }
    var names = name ? [name] : _.keys(events)
    for(;i < names.length; i++){
        name = names[i]
        var handlers = events[name]

        //如果没有事件了，则退出循环
        if(!handlers) break;

        var remaining = []
        for(var j = 0; j < handlers.length; j++){
            var handler = handlers[j]
            if(callback && callback !== handler.callback
                && callback !== handler.callback._callback||
                context && context !== handler.context){
                //handler不是被删除的事件时，将该事件信息推入remaining数组
                remaining.push(handler)
            }
            else{
                listening = handler.listening
                if(listening && --listening.count === 0){
                    delete listeners[listening.id]
                    delete listening.listeningTo[listening.objId]
                }
            }
        }
        //若remaining中仍有值时，存入events数组
        if(remaining.length){
            events[name] = remaining
        }else{
            //否则清空该事件
            delete events[name]
        }
        return events
    }
}
```

### stopListening的实现
调用语句：`object.stopListening([other], [event], [callback]) `<br>
`stopListening`的实现也水到渠成，让`object`停止监听事件。如果调用不带任何参数的`stopListening`，可以移除`object`下所有已经注册的回调函数。`object.stopListening(other)`则为移除`object`上监听的`other`的所有事件，以此类推。下面来看实现的源码。
```
//移除监听
Events.stopListening = function(obj, name, callback){
    var listeningTo = this._listeningTo
    if(!listeningTo) return this

    //如果没有传入特定的参数对象，则将所有监听移除
    var ids = obj ? [obj._listenId] : _.keys(listeningTo)

    for(var i = 0; i < ids.length ; i++){
        var listening = listeningTo[ids[i]]

        if(!listening) break

        //obj上事件解绑
        listening.obj.off(name, callback, this)
    }
    return this
}
```
先获取事件`Events`上的监听事件的对象赋值给`listeningTo`，接着判断是否传入`obj`，若传入则将其上的监听事件的对象赋值给`ids`，否则则调用`underscore.js`的对象函数`_.keys(listeningTo) `返回`listeningTo`拥有的所有可枚举属性的名称，存入`ids`中。然后调用`listening.obj.off(name, callback, this)`在被观察者`obj`上解绑监听事件，也就是从`obj`的特定数组里删除相应的`callback`。

### once的实现
调用语句：`object.once(event, callback, [context]) `<br>
用法跟`on`很像，在`object`上绑定一个`callback`回调函数，只要名为`name`的事件触发该回调函数就会调用，两者的区别在于`once`绑定的回调函数`callback`触发一次后就会被自动移除。<br>
先来看看辅助函数`onceMap`的实现：
```
//借助underscore中的_.once函数实现创建调用一次就会被移除的事件
var onceMap = function(map,name,callback,offer){
    if(callback){
        var once = map[name] = _.once(function(){
            offer(name,callback)    //借助offer函数解除绑定
            callback.apply(this,arguments)  //调用函数
        })
        once._callback = callback  //记录原callback，以便方便移除监听
    }
    return map
}
```
如果回调函数`callback`存在的话，创建一个只能调用一次的函数，在这个函数中，先解除绑定，再调用`callback`。然后将原`callback`存入对象`map[name]`的`_callback`中。
```
//绑定只调用一次便解绑的事件
Events.once = function(name,callback,context){
    var events = eventsApi(onceMap,{},name,callback,_.bind(this.off,this))
    if(typeof name === 'string' && context == null) callback = void 0
    return this.on(events,callback,context) //绑定事件

}
```
于是`once`的实现就十分好理解了，调用`eventsApi`，在每一个事件上添加只能调用一次的函数。，然后调用`on`将相应信息绑定在`Events`上。

### listenToOnce的实现
调用语句：`object.listenToOnce(other, event, callback) ` <br> 
和`once`一样，`listenToOnce`也是和`listenTo`用法相似，唯一的区别在于，监听的事件触发一次后自动移除监听，由于实现原理和`once`差不多，此处就不作赘述。源码如下
```
//监听只调用一次就解除监听的事件
Events.listenToOnce = function(obj,name,callback){
    var events = eventsApi(onceMap,{},name, callback,_bind(this.stopListening,this,obj))
    return this.listenTo(obj,events)
}
```

### trigger的实现
调用语句：`object.trigger(event, [*args]) ` <br>
API`trigger`用于触发给定`event`中的一个或多个用空格隔开的事件的回调函数。后续传入 的参数会传递到触发事件的回调函数里。 `trigger`函数有两个辅助函数，其中`triggerApi`用于判断传入的事件是否为特殊事件`all`，另一个`triggerEvents`，则是`trigger`的核心函数，用于触发相应事件。<br>
首先来看`triggerEvents`。
```
//触发事件,由于backbone中一般最多只有三个事件，故分到case 3
var triggerEvents = function(events,args){
    var ev,i = -1,l = events.length, a1 = args[0],a2 = args[1],a3 = args[2]
    switch(args.length){
        case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx)
                return
        case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1)
                return
        case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2)
                return
        case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx,a1, a2, a3)
                return
        default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx,args)
                return
    }
}
```
传入`triggerEvents`中参数列表中，第一个参数为事件数组，随后则为绑定的函数列表，由于backbone中回调函数参数大多数都是一次不超过3个，并且`call`函数比`apply`函数的性能高，所以为了提高函数的调用效率，根据`args`数组的长度分类，当数组长度为0，1，2，3时，使用`call`函数，超过3则调用`apply`函数。<br>
然后是`triggerApi`，如果事件数组存在的话，判断是否为特殊事件`all`，即为`obj.on('all', function(){}) `，所有事件发生都能触发这个特别的事件。
```
//判断事件是否存在以及该事件是否是特殊事件all
var triggerApi = function(objEvents, name, callback,args){
    if(objEvents){
        var events = objEvents[name]
        var allEvents = objEvents.all
        if(events && allEvents) allEvents = allEvents.slice()
        if(events) triggerEvents(events,args)
        if(allEvents) triggerEvents(allEvents, [name].contact(args))
    }
    return objEvents
}
```
如果事件数组中有`all`事件的话，将其下的绑定的回调函数赋值给`allEvents`，并调用`triggerEvents`函数触发事件。<br>
这样就能实现事件触发的功能了
```
//触发事件，调用回调函数
Events.trigger = function(name) {
    if(!this._events) return this

    var length = Math.max(0, arguments.length - 1)
    var args = Array(length)
    //将后续传入的参数记录在args数组中，稍后会传递到触发事件的回调函数里。

    for(var i = 0; i < length; i++) args[i] = arguments[i+1]

    eventsApi(triggerApi, this._events, name, void 0, args)

    return this
}
```
<br>
至此，backbone中的Events的核心API就全部分析完毕了。
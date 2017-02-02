/*
	Events
 */

export var Events = Backbone.Events = {}

//辅助函数
//正则表达式匹配，事件名可以用空格分隔
var eventSplitter = /\s+/

//处理多个事件绑定
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
		for (names = name.split(eventSplitter); i < names.length;i++)
			events = iteratee(events, names[i], callback,opts)
	}
	else{
		//只有一个事件
		events = iteratee(events, name, callback, opts)
	}
	return events
}

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


var onApi = function(events, name, callback, opts){
	if(callback) {
		var handlers = events[name] || (events[name] = [])//检查是否存在events[name]数组，若无则创建
		var context = opts.contexts, ctx = opts.ctx, listening = opts.listening
		if(listening) listening.count++

		handlers.push({callback: callback, context: context, ctx: context || ctx, listening: listening})
	}
	return events 

}

var offApi = function(events, name, callback, opts){
	//如果没有该事件则返回
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
 				//不满足删除条件时
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
 		//若remaining中仍有值时
 		if(remaining.length){
 			events[name] = remaining
 		}else{
 			//否则清空该事件
 			delete events[name]
 		}
 		return events
 	}
}
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
//借助underscore中的_.once函数实现创建调用一次就会被移除的事件
var onceMap = function(map,name,callback,offer){
	if(callback){
		var once = map[name] = _.once(function(){
			offer(name,callback)	//借助offer函数解除绑定
			callback.apply(this,arguments)	//调用函数
		})
		once._callback = callback  //记录原callback，以便方便移除监听
	}
	return map 
}




//绑定事件
Events.on = function(name, callback, context){
	return internalOn(this,name,callback,context)
}

//监听另一对象事件
Events.listenTo = function(obj,name,callback){
	if(!obj) return this
	var id = obj._listenId || (obj._listenId = _.uniqueId('l'))  //产生一个全局的唯一id，以l作为前缀
    var listeningTo = this._listeningTo || (this._listeningTo = {})
    var listening = listeningTo[id]

    //若此对象未被监听
    if(!listening){
    	var thisId = this._listenId || (this._listenId = _.uniqueId('l'))
    	listening = listeningTo[id] = {obj:obj, objId : id, id : thisId,listeningTo : listeningTo,count : 0}
    }

    internalOn(obj, name, callback, this, listening)
    return this
}

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

//绑定只调用一次便解绑的事件
Events.once = function(name,callback,context){
	var events = eventsApi(onceMap,{},name,callback,_.bind(this.off,this))
	if(typeof name === 'string' && context == null)	callback = void 0
		return this.on(events,callback,context)	//绑定事件

}

//监听只调用一次就解除监听的事件
Events.listenToOnce = function(obj,name,callback){
	var events = eventsApi(onceMap,{},name, callback,_bind(this.stopListening,this,obj))
	return this.listenTo(obj,events)
}

//触发事件，调用回调函数
Events.trigger = function(name) {
	if(!this._events) return this

	var length = Math.max(0, arguments.length - 1)
	var args = Array(length)

	for(var i = 0; i < length; i++) args[i] = arguments[i+1]

	eventsApi(triggerApi, this._events, name, void 0, args)

	return this 
}


Events.bind = Events.on
Events.unbind = Events.off 

_.extend(Backbone,Events)

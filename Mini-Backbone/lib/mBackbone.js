var mBackbone = (function () {
'use strict';

// mBackbone initialize

var mBackbone$1 = {
  '$': $
};

/*
	Events
 */
var Events = mBackbone$1.Events = {};

//辅助函数
//正则表达式匹配，事件名可以用空格分隔
var eventSplitter = /\s+/;

//处理多个事件绑定
var eventsApi = function(iteratee, events, name, callback, opts){
	var i = 0,names;
	if(name && typeof name === 'object'){

		if(callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback;
		for(names = _.keys(name); i < names.length ; i++){
			//递归调用eventsApi使得分割多个事件对象
			events = eventsApi(iteratee,events,names[i],name[names[i]],opts);
		}
	}
	else if(name && eventSplitter.test(name)){
		for (names = name.split(eventSplitter); i < names.length;i++)
			events = iteratee(events, names[i], callback,opts);
	}
	else{
		//只有一个事件
		events = iteratee(events, name, callback, opts);
	}
	return events
};

var internalOn = function(obj, name, callback, context, listening){
		obj._events = eventsApi(onApi, obj._events||{}, name, callback,{
		context: context,
      	ctx: obj,
      	listening: listening
	});
	if(listening){
		var listeners = obj._listeners || (obj._listeners = {});
		listeners[listening.id] = listening;
	}
	return obj
};


var onApi = function(events, name, callback, opts){
	if(callback) {
		var handlers = events[name] || (events[name] = []);//检查是否存在events[name]数组，若无则创建
		var context = opts.contexts, ctx = opts.ctx, listening = opts.listening;
		if(listening) listening.count++;

		handlers.push({callback: callback, context: context, ctx: context || ctx, listening: listening});
	}
	return events

};

var offApi = function(events, name, callback, opts){
	//如果没有该事件则返回
	if(!events) return
	var i = 0,listening;
 	var context = opts.context, listeners = opts.listeners;

 	if(!name && !callback && !context){
 		//移除所有监听
 		var ids = _.keys(listeners);
 		for(; i < ids.length; i++){
 			listening = listeners[ids[i]];
 			delete listeners[listening.id];
 			delete listening.listeningTo[listening.objId];
 		}
 		return
 	}
 	var names = name ? [name] : _.keys(events);
 	for(;i < names.length; i++){
 		name = names[i];
 		var handlers = events[name];

 		//如果没有事件了，则退出循环
 		if(!handlers) break;

 		var remaining = [];
 		for(var j = 0; j < handlers.length; j++){
 			var handler = handlers[j];
 			if(callback && callback !== handler.callback
 				&& callback !== handler.callback._callback||
 				context && context !== handler.context){
 				//不满足删除条件时
 				remaining.push(handler);
 			}
 			else{
 				listening = handler.listening;
 				if(listening && --listening.count === 0){
 					delete listeners[listening.id];
 					delete listening.listeningTo[listening.objId];
 				}
 			}
 		}
 		//若remaining中仍有值时
 		if(remaining.length){
 			events[name] = remaining;
 		}else{
 			//否则清空该事件
 			delete events[name];
 		}
 		return events
 	}
};
//判断事件是否存在以及该事件是否是特殊事件all
var triggerApi = function(objEvents, name, callback,args){
	if(objEvents){
		var events = objEvents[name];
		var allEvents = objEvents.all;
		if(events && allEvents) allEvents = allEvents.slice();
		if(events) triggerEvents(events,args);
		if(allEvents) triggerEvents(allEvents, [name].contact(args));
	}
	return objEvents
};

//触发事件,由于backbone中一般最多只有三个事件，故分到case 3
var triggerEvents = function(events,args){
	var ev,i = -1,l = events.length, a1 = args[0],a2 = args[1],a3 = args[2];
	switch(args.length){
		case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx);
				return
		case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1);
				return
		case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2);
				return
		case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx,a1, a2, a3);
				return
		default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx,args);
				return
	}
};
//借助underscore中的_.once函数实现创建调用一次就会被移除的事件
var onceMap = function(map,name,callback,offer){
	if(callback){
		var once = map[name] = _.once(function(){
			offer(name,callback);	//借助offer函数解除绑定
			callback.apply(this,arguments);	//调用函数
		});
		once._callback = callback;  //记录原callback，以便方便移除监听
	}
	return map
};




//绑定事件
Events.on = function(name, callback, context){
	return internalOn(this,name,callback,context)
};

//监听另一对象事件
Events.listenTo = function(obj,name,callback){
	if(!obj) return this
	var id = obj._listenId || (obj._listenId = _.uniqueId('l'));  //产生一个全局的唯一id，以l作为前缀
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var listening = listeningTo[id];

    //若此对象未被监听
    if(!listening){
    	var thisId = this._listenId || (this._listenId = _.uniqueId('l'));
    	listening = listeningTo[id] = {obj:obj, objId : id, id : thisId,listeningTo : listeningTo,count : 0};
    }

    internalOn(obj, name, callback, this, listening);
    return this
};

//解除事件的绑定
Events.off = function(name,callback,context){
	//若未绑定事件
	if(!this._events) return this
	this._events = eventsApi(offApi, this._events, name, callback, {
		context: context,
		listeners: this._listeners
	});
	return this
};

//移除监听
Events.stopListening = function(obj, name, callback){
	var listeningTo = this._listeningTo;
	if(!listeningTo) return this

	//如果没有传入特定的参数对象，则将所有监听移除
	var ids = obj ? [obj._listenId] : _.keys(listeningTo);

	for(var i = 0; i < ids.length ; i++){
		var listening = listeningTo[ids[i]];

		if(!listening) break

		//obj上事件解绑
		listening.obj.off(name, callback, this);
	}
	return this
};

//绑定只调用一次便解绑的事件
Events.once = function(name,callback,context){
	var events = eventsApi(onceMap,{},name,callback,_.bind(this.off,this));
	if(typeof name === 'string' && context == null)	callback = void 0;
		return this.on(events,callback,context)	//绑定事件

};

//监听只调用一次就解除监听的事件
Events.listenToOnce = function(obj,name,callback){
	var events = eventsApi(onceMap,{},name, callback,_bind(this.stopListening,this,obj));
	return this.listenTo(obj,events)
};

//触发事件，调用回调函数
Events.trigger = function(name) {
	if(!this._events) return this

	var length = Math.max(0, arguments.length - 1);
	var args = Array(length);

	for(var i = 0; i < length; i++) args[i] = arguments[i+1];

	eventsApi(triggerApi, this._events, name, void 0, args);

	return this
};


Events.bind = Events.on;
Events.unbind = Events.off;

_.extend(mBackbone$1,Events);

/*
	Model
 */
var Model = mBackbone$1.Model = function() { };

/*
	Collection
 */
var Collection = mBackbone$1.Collection = function() { };

/*
	View
 */
// view属性列表
var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];
// 事件正则
var delegateEventSplitter = /^(\S+)\s*(.*)$/;

var View =  mBackbone$1.View = function(options) {
  this.cid = _.uniqueId('view');
  _.extend(this, _.pick(options, viewOptions));
  this._ensureElement();
  this.initialize.apply(this, arguments);
};

_.extend(View.prototype, Events, {

  tagName: 'div',

  $: function(selector) {
    return this.$el.find(selector)
  },

  initialize: function() {},

  render: function() {
    return this
  },

  remove: function() {
    this.$el.remove();
    this.stopListening();
    return this
  },

  setElement: function(element) {
    this.undelegateEvents();
    this._setElement(element);
    this.delegateEvents();
    return this
  },

  _setElement: function(el) {
    this.$el = el instanceof mBackbone$1.$ ? el : mBackbone$1.$(el);
    this.el = this.$el[0];
  },

  delegateEvents: function(events) {
    events || (events = _.result(this, 'events'));
    if(!events) return this
    this.undelegateEvents();

    for (var key in events) {
      var method = events[key];
      if(! _.isFunction(method)) method = this[method];
      if(!method) continue
      // 使用match()返回一个匹配正则的数组
      var match = key.match(delegateEventSplitter);
      this.delegate(match[1], match[2], _.bind(method, this));
    }

    return this
  },

  delegate: function(eventName, selector, listener) {
    this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
    return this
  },

  undelegateEvents: function() {
    if(this.$el) this.$el.off('.delegateEvents' + this.cid);
    return this
  },

  undelegate: function(eventName, selector, listener) {
    this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
    return this
  },

  _createElement: function(tagName) {
    return document.createElement(tagName)
  },

  _ensureElement: function() {
    if(!this.el) {
      var attrs = _.extend({}, _.result(this, 'attributes'));
      if(this.id) attrs.id = _.result(this, 'id');
      if(this.className) attrs['class'] = _.result(this, 'className');
      this.setElement(this._createElement(_.result(this, 'tagName')));
      this._setAttributes(attrs);
    } else {
      this.setElement(_.result(this, 'el'));
    }
  },

  _setAttributes: function(attrs) {
    this.$el.attr(attrs);
  }
});

/*
	Router
 */
var Router = mBackbone$1.Router = function(options) {
    options || (options = {});
    this.preinitialize.apply(this, arguments);
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
};

  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

_.extend(Router.prototype, mBackbone$1.Events, {
    preinitialize: function(){},
    initialize: function(){},

    // Manually bind a single named route to a callback.
    route: function(route,callback,name){
        if (!_.isRegExp(route)) route = this._routeToRegExp(route);
        if (_.isFunction(name)) {
            callback = name;
            name = '';
        }
        if (!callback) callback = this[name];
        mBackbone$1.history.route(route, function(fragment) {
            var args = router._extractParameters(route, fragment);
            if (router.execute(callback, args, name) !== false) {
                router.trigger.apply(router, ['route:' + name].concat(args));
                router.trigger('route', name, args);
                mBackbone$1.history.trigger('route', router, name, args);
            }
        });
    },
    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args, name) {
        if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
        Backbone.history.navigate(fragment, options);
        return this;
    },
    _bindRoutes: function() {
        if (!this.routes) return;
        this.routes = _.result(this, 'routes');
        var route, routes = _.keys(this.routes);
        while ((route = routes.pop()) != null) {
            this.route(route, this.routes[route]);
        }
    },
    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
        route = route.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function(match, optional) {
                return optional ? match : '([^/?]+)';
            })
            .replace(splatParam, '([^?]*?)');
        return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },
    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
        // 提取参数
        var params = route.exec(fragment).slice(1);
        return _.map(params, function(param, i) {
            // Don't decode the search params.
            if (i === params.length - 1) return param || null;
            return param ? decodeURIComponent(param) : null;
        });
    }
});

var History = function() {
    this.handlers = [];
    this.checkUrl = _.bind(this.checkUrl, this);

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
};


// Has the history handling already been started?
History.started = false;

_.extend(History.prototype, mBackbone$1.Events, {
    // Unicode characters in `location.pathname` are percent encoded so they're
    // decoded for comparison. `%25` should not be decoded since it may be part
    // of an encoded parameter.
    matchRoot: function() {
        // 判断当前路径与options里的root是否匹配
        var path = this.decodeFragment(this.location.pathname);
        var rootPath = path.slice(0, this.root.length - 1) + '/';
        return rootPath === this.root;
    },
    decodeFragment: function(fragment) {
      return decodeURI(fragment.replace(/%25/g, '%2525'));
    },
    getPath: function() {
        var path = this.decodeFragment(
            this.location.pathname
            //options中定义了root, 把pathname中root的部分删去
        ).slice(this.root.length - 1);
        return path.charAt(0) === '/' ? path.slice(1) : path;
    },
    getFragment: function(fragment) {
        //undefined == null -> true
        if (fragment == null) {
            fragment = this.getPath();
        }
        return fragment
    },
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
    stop: function(){
        removeEventListener('popstate', this.checkUrl, false);
        History.started = false;
    },
    route: function(route, callback) {
        this.handlers.unshift({route: route, callback: callback});
    },
    checkUrl: function(e) {
        var current = this.getFragment();
        this.loadUrl();
    },
    loadUrl: function(fragment) {
            // If the root doesn't match, no routes can match either.
            if (!this.matchRoot()) return false;
            fragment = this.fragment = this.getFragment(fragment);
            return _.some(this.handlers, function(handler) {
            if (handler.route.test(fragment)) {
                handler.callback(fragment);
                return true;
            }
        });
    },
    navigate: function(fragment, options) {
        if (!History.started) return false;
        if (!options || options === true) options = {trigger: !!options};

        // Normalize the fragment.
        fragment = this.getFragment(fragment || '');

        // Don't include a trailing slash on the root.
        var rootPath = this.root;
        if (fragment === '' || fragment.charAt(0) === '?') {
        rootPath = rootPath.slice(0, -1) || '/';
        }
        var url = rootPath + fragment;

        // Strip the fragment of the query and hash for matching.
        fragment = fragment.replace(pathStripper, '');

        // Decode for matching.
        var decodedFragment = this.decodeFragment(fragment);

        if (this.fragment === decodedFragment) return;
        this.fragment = decodedFragment;

        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);
        if (options.trigger) return this.loadUrl(fragment);
    }
});

mBackbone$1.history = new History();

/*
 *	Helpers
 */

var extend = function(protoProps, staticProps) {
	var parent = this;
	var child;

	if(protoProps && _.has(protoProps, 'constructor')) {
		child = protoProps.constructor;
	} else {
		child = function() {
			return parent.apply(this,arguments)
		};
	}

	_.extend(child, parent, staticProps);

	child.prototype = _.create(parent.prototype, protoProps);
	child.prototype.constructor = child;

	child.__super__ = parent.prototype;

	return child
};

Model.extend = Collection.extend = Router.extend = View.extend = extend;

return mBackbone$1;

}());

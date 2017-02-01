var mBackbone = (function () {
'use strict';

/*
	Events
 */

var Events = {};

Events.on = function() {};

Events.trigger = function() {};

/*
	Model
 */

var Model =  function() { };

/*
	Collection
 */

var Collection = function() { };

/*
	View
 */

var View =  function() {

};

/*
	Router
 */

var Router = function() {

};

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

var mBackbone = {};

Model.extend = Collection.extend = Router.extend = View.extend = extend;

mBackbone.Events = Events;
mBackbone.Model = Model;
mBackbone.Collection = Collection;
mBackbone.Router = Router;
mBackbone.View = View;

return mBackbone;

}());

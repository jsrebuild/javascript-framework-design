/*
 *	Helpers
 */

import { Events } from '../Events/index'
import { Model } from '../Model/index'
import { Collection } from '../Collection/index'
import { View } from '../View/index'
import { Router } from '../Router/index'

export var extend = function(protoProps, staticProps) {
	var parent = this
	var child

	if(protoProps && _.has(protoProps, 'constructor')) {
		child = protoProps.constructor
	} else {
		child = function() {
			return parent.apply(this,arguments)
		}
	}

	_.extend(child, parent, staticProps)

	child.prototype = _.create(parent.prototype, protoProps)
	child.prototype.constructor = child

	child.__super__ = parent.prototype

	return child
}

Model.extend = Collection.extend = Router.extend = View.extend = extend

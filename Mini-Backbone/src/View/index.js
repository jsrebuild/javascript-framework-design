/*
	View
 */
import { mBackbone } from '../Initialize/index'
import { Events } from '../Events/index'

export var View =  mBackbone.View = function(options) {
  this.cid = _.uniqueId('view')
  _.extend(this, _.pick(options, viewOptions))
}

// view属性列表
var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events']

_.extend(View.prototype, Events, {

})

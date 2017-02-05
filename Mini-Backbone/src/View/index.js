/*
	View
 */
import { mBackbone } from '../Initialize/index'
import { Events } from '../Events/index'

// view属性列表
var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events']


export var View =  mBackbone.View = function(options) {
  this.cid = _.uniqueId('view')
  _.extend(this, _.pick(options, viewOptions))
  this._ensureElement()
  this.initialize.apply(this, arguments)
}

_.extend(View.prototype, Events, {

  tagName: 'div',

  $: function(selector) {
    return this.$el.find(selector)
  },

  

})

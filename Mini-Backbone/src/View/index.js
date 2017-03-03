/*
	View
 */
import { mBackbone } from '../Initialize/index'
import { Events } from '../Events/index'

// view属性列表
var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events']
// 事件正则
var delegateEventSplitter = /^(\S+)\s*(.*)$/

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

  initialize: function() {},

  render: function() {
    return this
  },

  remove: function() {
    this.$el.remove()
    this.stopListening()
    return this
  },

  setElement: function(element) {
    this.undelegateEvents()
    this.$el = el instanceof mBackbone.$ ? el : mBackbone.$(el)
    this.el = this.$el[0]
    this.delegateEvents()
    return this
  },

  delegateEvents: function(events) {
    events || (events = _.result(this, 'events'))
    if(!events) return this
    this.undelegateEvents()

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

  undelegate: function(eventName, selector, listener) {
    this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener)
    return this
  },
  
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

// view Api test

(function(QUnit) {

  var view

  QUnit.module('mBackbone.View', {
    beforeEach: function() {
      $('#qunit-fixture').append(
        '<div id="testElement"><h1>Test</h1></div>'
      )

      view = new mBackbone.View({
        id: 'test-view',
        className: 'test-view',
        other: 'test-view'
      })
    },

    afterEach: function() {
      $('#testElement').remove()
      $('#test-view').remove()
    }
  })

  QUnit.test('constructor', function(assert) {
    assert.expect(3)
    assert.equal(view.el.id, 'test-view')
    assert.equal(view.el.className, 'test-view')
    assert.equal(view.el.other, void 0)
  })

  QUnit.test('$', function(assert) {
    assert.expect(1)

    var _view = new mBackbone.View
    _view.setElement('<p><a>test</a></p>')
    var result = _view.$('a')

    assert.strictEqual(result[0].innerHTML, 'test')
  })

  QUnit.test('$el', function(assert) {
    assert.expect(3)
    var _view = new mBackbone.View
    _view.setElement('<p><a>test</a></p>')
    // 判断node类型是否为element
    assert.strictEqual(_view.el.nodeType, 1)
    assert.ok(_view.$el instanceof mBackbone.$)
    assert.strictEqual(_view.$el[0], _view.el)
  })

  QUnit.test('Initialize', function(assert) {
    assert.expect(1)
    var View = mBackbone.View.extend({
      initialize: function() {
        this.one = 1
      }
    })

    assert.strictEqual(new View().one, 1)
  })
  
  QUnit.test('render', function(assert) {
    assert.expect(1)
    var view = new mBackbone.View

    assert.equal(view.render(), view, "#render returns the View instance")
  })

  QUnit.test('')
})(QUnit)

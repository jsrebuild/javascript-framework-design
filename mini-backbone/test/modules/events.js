// events Api test

(function(QUnit) {

  QUnit.module('mBackbone.Events')

  QUnit.test('on trigger', function(assert) {
    assert.expect(1)
    var counter = {
      count: 0
    }
    _.extend(counter, mBackbone.Events)
    counter.on('event', function() {
      counter.count += 1
    })
    counter.trigger('event')
    assert.equal(counter.count, 1, 'counter should be incremented.');
  })

  
})(QUnit)

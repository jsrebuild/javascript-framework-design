// router Api test

(function(QUnit) {
	var router = null;
	var location = null;
	var lastRoute = null;
	var lastArgs = [];

	var onRoute = function(routerParam, route, args) {
		lastRoute = route;
		lastArgs = args;
	};

	var Location = function(href) {
		this.replace(href);
	};
	QUnit.module('mBackbone.Events');
	QUnit.module('mBackbone.Router',{
		beforeEach: function() {
			location = new Location('http://example.com');
			mBackbone.history = _.extend(new mBackbone.History, {location: location});
			router = new AppRouter();
			mBackbone.history.start();
			lastRoute = null;
			lastArgs = [];
			mBackbone.history.on('route', onRoute);
    	},
    	afterEach: function() {
      		mBackbone.history.stop();
      		mBackbone.history.off('route', onRoute);
    	}
	});

	var AppRouter = mBackbone.Router.extend({
	    //routes对象中key是路由规则，value是与路由规则相对应的方法名
	    routes : {
	        '' : 'index',
	        'list' : 'renderList',
	        'article/:page' : 'renderArticle',
	        '*error' : 'renderError'
	    },
	    index : function() {
	        var a = 1;
	    },
	    renderList : function() {
	        var b = 2;
	    },
	    renderArticle : function(page) {
	        var c = 3;
	    },
	    renderError : function(error) {
	        var error = 'error';
	    }
	});
})(QUnit)

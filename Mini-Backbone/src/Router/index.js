/*
	Router
 */
import { mBackbone } from '../Initialize/index'

export var Router = mBackbone.Router = function(options) {
    options || (options = {});
    this.preinitialize.apply(this, arguments);
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
}

  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

_.extend(Router.prototype, mBackbone.Events, {
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
        mBackbone.history.route(route, function(fragment) {
            var args = router._extractParameters(route, fragment);
            if (router.execute(callback, args, name) !== false) {
                router.trigger.apply(router, ['route:' + name].concat(args));
                router.trigger('route', name, args);
                mBackbone.history.trigger('route', router, name, args);
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

var routeStripper = /^[#\/]|\s+$/g;
// Cached regex for stripping leading and trailing slashes.
var rootStripper = /^\/+|\/+$/g;
var pathStripper = /#.*$/;

// Has the history handling already been started?
History.started = false;

_.extend(History.prototype, mBackbone.Events, {
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
        return fragment.replace(routeStripper, '');
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
})

mBackbone.history = new History();
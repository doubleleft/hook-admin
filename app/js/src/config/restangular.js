module.exports = function(app, hook) {

  var setDefaultHeaders = function(RestangularProvider) {
    // Set default application headers
    var authToken = hook.auth.getToken();
    var headers = {
      'X-App-Id': hook.app_id,
      'X-App-Key': hook.key
    };
    if (authToken) { headers['X-Auth-Token'] = authToken; }
    RestangularProvider.setDefaultHeaders(headers);
  }

  app.config(function(RestangularProvider) {
    setDefaultHeaders(RestangularProvider);

    hook.auth.on('login', function() {
      setDefaultHeaders(RestangularProvider);
    });

    // // custom template
    // app.customTemplate(function(viewName) {
    //   console.log(viewName);
    //   // if (viewName === 'ListView') {
    //   //   return myTemplate;
    //   // }
    // });

    // Customize request via RestangularProvider
    RestangularProvider.addFullRequestInterceptor(function(
      element, operation, what, url, headers, params, httpConfig
    ) {
      var q = hook.collection('dummy');

      // sorting
      if (params._sortField) {
        if (params._sortField=="id") { params._sortField = "_id"; }
        q.sort(params._sortField, params._sortDir.toLowerCase());
      }

      // pagination with offset / limit
      if (params._perPage) { q.limit(params._perPage); }
      if (params._page > 0 && params._perPage) { q.offset(params._perPage * (params._page - 1)) }

      // quick filters
      if (params._filters) {
        for (let field in params._filters) {
          if (typeof(params._filters[field]) === "object" &&
              params._filters[field].operation) {
            q.where(field, params._filters[field].operation, params._filters[field].value);

          } else {
            q.where(field, params._filters[field]);
          }
        }
      }

      // ng-admin hack to use JSON on query string
      var obj = {},
          query = JSON.stringify(q.buildQuery());

      if (query !== "{}") {
        obj[""] = "&" + query;
      }

      return { params: obj };
    });

    // Display only 'error' field of exception responses.
    RestangularProvider.setErrorInterceptor(function(response, deferred, responseHandler) {
      if (response.data.error) {
        response.data = response.data.error;
      }
      return true;
    });

  });

};

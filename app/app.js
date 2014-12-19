var YAML = require('yamljs'),
    app = angular.module('admin', ['ng-admin']),
    config = YAML.load('config/app.yaml');

app.controller('main', function ($scope, $rootScope, $location) {
  $rootScope.$on('$stateChangeSuccess', function () {
    $scope.displayBanner = $location.$$path === '/dashboard';
  });
});

app.config(function(NgAdminConfigurationProvider, Application, Entity, Field, Reference, ReferencedList, ReferenceMany) {
  var hook = new Hook.Client(config.credentials);

  // set the main API endpoint for this admin
  var app = new Application('hook');
  app.baseApiUrl(config.credentials.endpoint);
  app.transformParams(function(params) {
    var q = hook.collection('dummy');

    // sorting
    if (params._sort) {
      q.sort(params._sort, params._sortDir.toLowerCase());
    }

    // pagination with offset / limit
    if (params.per_page) { q.limit(params.per_page); }
    if (params.page > 0 && params.per_page) { q.offset(params.per_page * (params.page - 1)) }

    // ng-admin hack to use JSON on query string
    var obj = {},
        query = JSON.stringify(q.buildQuery());

    if (query !== "{}") {
      obj[ JSON.stringify(q.buildQuery()) + "&"] = "&";
    }

    return obj;
  });

  var projects = new Entity('projects');
  projects.url(function(view, entityId) {
    return 'collection/' + view.entity.config.name + (entityId ? '/' + entityId : "");
  });
  projects.identifier(new Field('_id'));

  var views = [
    projects.config.dashboardView,
    projects.config.listView,
    projects.config.showView,
    projects.config.creationView,
    projects.config.editionView,
    projects.config.deletionView
  ];

  for (var i=0;i<views.length;i++) {
    views[i].title(projects.config.label);
    views[i].headers(function() {
      return {
        'X-App-Id': config.credentials.app_id,
        'X-App-Key': config.credentials.key
      }
    });

    views[i].addField(new Field('_id'));
    views[i].addField(new Field('client_name'));
    views[i].addField(new Field('description'));
    views[i].addField(new Field('href'));
    // views[i].addField(new Field('highlights'));
    // views[i].addField(new Field('thumb_image'));
    // views[i].addField(new Field('large_image'));
    // views[i].addField(new Field('logo_image'));
  }

  // list view: actions
  projects.listView().listActions(['show', 'edit', 'delete']);

  // menu view: icon
  projects.menuView().icon('<span class="glyphicon glyphicon-file"></span>');

  app.addEntity(projects);

  NgAdminConfigurationProvider.configure(app);
});


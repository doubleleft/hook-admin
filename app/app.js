var YAML = require('yamljs'),
    app = angular.module('admin', ['ng-admin']),
    appConfig = YAML.load('config/app.yaml'),
    schema = YAML.load('hook-ext/schema.yaml');

app.controller('main', function ($scope, $rootScope, $location) {
  $rootScope.$on('$stateChangeSuccess', function () {
    $scope.displayBanner = $location.$$path === '/dashboard';
  });
});

app.config(function(NgAdminConfigurationProvider, Application, Entity, Field, Reference, ReferencedList, ReferenceMany) {
  var hook = new Hook.Client(appConfig.credentials);

  // set the main API endpoint for this admin
  var app = new Application(appConfig.title);
  document.title = appConfig.title;

  app.baseApiUrl(appConfig.credentials.endpoint);
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
      obj[""] = "&" + query;
    }

    return obj;
  });

  for (var collectionName in schema) {
    let collectionConfig = (appConfig.collections && appConfig.collections[collectionName]) || {};

    // by default, allow 'show', 'edit' and 'delete' actions.
    if (!collectionConfig.list || !collectionConfig.list.actions) {
      collectionConfig.list.actions = ['show', 'edit', 'delete'];
    }

    var entity = new Entity(collectionName);
    entity.url(function(view, entityId) {
      return 'collection/' + view.entity.config.name + (entityId ? '/' + entityId : "");
    });
    entity.identifier(new Field('_id'));

    // overwrite label
    if (collectionConfig.label) {
      entity.config.label = collectionConfig.label;
    }

    var sections = {
      'dashboard': entity.config.dashboardView,
      'list': entity.config.listView,
      'show': entity.config.showView,
      'creation': entity.config.creationView,
      'edition': entity.config.editionView,
      'deletion': entity.config.deletionView
    };

    //
    // create collection fields based on schema definition
    // https://github.com/doubleleft/hook/wiki/Schema-definition
    //
    var fields = {};
    schema[collectionName].attributes.push({ name: 'created_at', type: 'date' });
    schema[collectionName].attributes.push({ name: 'updated_at', type: 'date' });
    for (var i=0;i<schema[collectionName].attributes.length;i++) {
      var attribute = schema[collectionName].attributes[i];
      fields[ attribute.name ] = new Field(attribute.name).type(attribute.type);
    }

    for (let section in sections) {
      let view = sections[section],
          sectionCollectionConfig = collectionConfig[section] || {};

      view.title(sectionCollectionConfig.title || entity.config.label);

      if (sectionCollectionConfig.description) {
        view.description(sectionCollectionConfig.description);
      }

      view.headers(function() {
        return {
          'X-App-Id': appConfig.credentials.app_id,
          'X-App-Key': appConfig.credentials.key
        }
      });

      for (var fieldName in fields) {
        if (!sectionCollectionConfig.fields || sectionCollectionConfig.fields.indexOf(fieldName) >= 0) {
          view.addField(fields[fieldName]);
        }
      }

      // list view: actions
      if (sectionCollectionConfig.actions) {
        view.listActions(sectionCollectionConfig.actions);
      }
    }

    // menu view: icon
    if (collectionConfig.menu) {
      let menu = collectionConfig.menu;
      if (menu.icon) {
        entity.menuView().icon('<span class="glyphicon glyphicon-' + menu.icon + '"></span>');
      }
      if (menu.order) {
        entity.menuView().order(menu.order);
      }
    }

    app.addEntity(entity);
  }

  NgAdminConfigurationProvider.configure(app);
});

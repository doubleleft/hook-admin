var YAML = require('yamljs'),
    app = angular.module('admin', ['ng-admin']),
    appConfig = YAML.load('config/app.yaml'),
    schema_builder = require('./src/schema_builder'),
    inflection = require('inflection');

app.controller('main', function ($scope, $rootScope, $location) {
  $rootScope.$on('$stateChangeSuccess', function () {
    $scope.displayBanner = $location.$$path === '/dashboard';
  });
});

function aggregateIds(ids) {
  return (ids && ids.length > 0) ? { _id: ids } : {};
}

app.config(function(RestangularProvider, NgAdminConfigurationProvider, Application, Entity, Field, Reference, ReferencedList, ReferenceMany) {
  var hook = new Hook.Client(appConfig.credentials),
      schema = schema_builder("hook-ext/schema.yaml");

  // set the main API endpoint for this admin
  var app = new Application(appConfig.title);
  document.title = appConfig.title;

  app.baseApiUrl(appConfig.credentials.endpoint);

  // Set default application headers
  RestangularProvider.setDefaultHeaders({
    'X-App-Id': appConfig.credentials.app_id,
    'X-App-Key': appConfig.credentials.key,
    'X-Auth-Token': hook.auth.getToken()
  });

  // Customize request via RestangularProvider
  RestangularProvider.addFullRequestInterceptor(function(
    element, operation, what, url, headers, params, httpConfig
  ) {
    var q = hook.collection('dummy');

    // sorting
    if (params._sortField) {
      q.sort(params._sortField, params._sortDir.toLowerCase());
    }

    // pagination with offset / limit
    if (params._perPage) { q.limit(params._perPage); }
    if (params._page > 0 && params._perPage) { q.offset(params._perPage * (params._page - 1)) }

    // quick filters
    if (params._filters) {
      for (let field in params._filters) {
        q.where(field, params._filters[field]);
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

  //
  // set-up all entities to allow referencing each other
  //
  var entities = {};
  for (let name in schema) {
    entities[ inflection.pluralize(name) ] = new Entity(name);
  }

  for (let name in schema) {
    let config = (appConfig.collections && appConfig.collections[name]) || {};
    let entity = entities[name];

    // normalize collection view configs
    if (typeof(config) == "boolean") { config = {}; }
    if (!config.list) { config.list = {}; }
    if (!config.menu) { config.menu = {}; }
    if (!config.dashboard) { config.dashboard = {}; }

    // by default, allow 'show', 'edit' and 'delete' actions.
    if (!config.list.actions) {
      config.list.actions = ['show', 'edit', 'delete'];
    }

    entity.url(function(view, entityId) {
      return 'collection/' + view.entity.config.name + (entityId ? '/' + entityId : "");
    });
    entity.identifier(new Field('_id'));

    // overwrite label
    if (config.label) {
      entity.config.label = config.label;
    }

    //
    // create collection fields based on schema definition
    // https://github.com/doubleleft/hook/wiki/Schema-definition
    //
    var fields = {};
    for (var i=0;i<schema[name].length;i++) {
      let attribute = schema[name][i];
      fields[ attribute.name ] = new Field(attribute.name).type(attribute.type);
    }

    // relationships: belongsTo
    let belongsTo = schema[name].belongsTo;
    if (belongsTo) {
      for (var i=0;i<belongsTo.length;i++) {
        let singular = inflection.singularize(belongsTo[i]),
            plural = inflection.pluralize(belongsTo[i]),
            reference = new Reference(singular + "_id").
              targetEntity(entities[plural]).
              targetField(new Field('name')). // TODO: specify related collection 'title' column
              singleApiCall(aggregateIds);

        fields[ belongsTo[i] ] = reference;
      }
    }

    // relationships: hasMany
    let hasMany = schema[name].hasMany;
    if (hasMany) {
      for (var i=0;i<hasMany.length;i++) {
        let singular = inflection.singularize(hasMany[i]),
            plural = inflection.pluralize(hasMany[i]),
            reference = new ReferenceMany(plural).
              targetEntity(entities[plural]).
              targetField(new Field('name')). // TODO: specify related collection 'title' column
              singleApiCall(aggregateIds);

        fields[ hasMany[i] ] = reference;
      }
    }

    //
    // Configure each section
    //
    var sections = {
      'dashboard': entity.config.dashboardView,
      'list': entity.config.listView,
      'show': entity.config.showView,
      'creation': entity.config.creationView,
      'edition': entity.config.editionView,
      'deletion': entity.config.deletionView
    };

    for (let section in sections) {
      let view = sections[section],
          sectionConfig = config[section] || {};

      view.title(sectionConfig.title || entity.config.label);

      if (sectionConfig.description) {
        view.description(sectionConfig.description);
      }

      //
      // field ordering
      //
      // use 'fields' view attribute
      // OR use schema order
      //
      var fieldNames = sectionConfig.fields || Object.keys(fields);
      for (var i in fieldNames) {
        let fieldName = fieldNames[i];

        // dashboard has detail links by default
        if (section == 'dashboard') {
          fields[fieldName].isDetailLink(true);
        }

        view.addField(fields[fieldName]);
      }

      // list view: actions
      if (section == 'list') {
        view.listActions(sectionConfig.actions);
        view.perPage(sectionConfig.per_page || 30);
      }

      // dashboard view: limit
      if (section == 'dashboard') {
        if (sectionConfig.limit) {
          view.limit(sectionConfig.limit);
        }
      }
    }

    if (config['filters']) {
      let filters = config['filters'];
      for (let i in filters) {
        sections['list'].filters([
          fields[ filters[i] ]
        ])
      }
    }

    // sections['list'].addQuickFilter('Today', function () { // a quick filter displays a button to filter the list based on a set of query parameters passed to the API
    //   var now = new Date(),
    //       year = now.getFullYear(),
    //       month = now.getMonth() + 1,
    //       day = now.getDate();
    //       month = month < 10 ? '0' + month : month;
    //       day = day < 10 ? '0' + day : day;
    //   return {
    //     created_at: [year, month, day].join('-') // ?created_at=... will be appended to the API call
    //   };
    // });

    // menu view: icon
    if (config.menu) {
      let menu = config.menu;
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

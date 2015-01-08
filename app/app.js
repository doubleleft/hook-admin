var YAML = require('yamljs'),
    app = angular.module('admin', ['ng-admin']),
    appConfig = YAML.load('config/app.yaml'),
    schema = YAML.load('hook-ext/schema.yaml'),
    inflection = require('inflection');

var fieldTypes = require('./src/field_types');

app.controller('main', function ($scope, $rootScope, $location) {
  $rootScope.$on('$stateChangeSuccess', function () {
    $scope.displayBanner = $location.$$path === '/dashboard';
  });
});

app.config(function(RestangularProvider, NgAdminConfigurationProvider, Application, Entity, Field, Reference, ReferencedList, ReferenceMany) {
  var hook = new Hook.Client(appConfig.credentials);

  // set the main API endpoint for this admin
  var app = new Application(appConfig.title);
  document.title = appConfig.title;

  app.baseApiUrl(appConfig.credentials.endpoint);

  // Customize request via RestangularProvider
  RestangularProvider.addFullRequestInterceptor(function(
    element, operation, what, url, headers, params, httpConfig
  ) {
    headers['X-App-Id'] = appConfig.credentials.app_id;
    headers['X-App-Key'] = appConfig.credentials.key;

    var q = hook.collection('dummy');

    console.log(params)

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

  //
  // set-up all entities to allow referencing each other
  //
  var entities = {};
  for (let collectionName in schema) {
    entities[ collectionName ] = new Entity(collectionName);
  }

  for (let collectionName in schema) {
    let collectionConfig = (appConfig.collections && appConfig.collections[collectionName]) || {};

    // normalize collection view configs
    if (typeof(collectionConfig) == "boolean") { collectionConfig = {}; }
    if (!collectionConfig.list) { collectionConfig.list = {}; }
    if (!collectionConfig.menu) { collectionConfig.menu = {}; }
    if (!collectionConfig.dashboard) { collectionConfig.dashboard = {}; }

    // by default, allow 'show', 'edit' and 'delete' actions.
    if (!collectionConfig.list.actions) {
      collectionConfig.list.actions = ['show', 'edit', 'delete'];
    }

    let entity = entities[collectionName];
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
      let attribute = schema[collectionName].attributes[i];
      fields[ attribute.name ] = new Field(attribute.name).type(fieldTypes.get(attribute.type));
    }

    // schema relationships
    if (schema[collectionName].relationships) {
      let belongsToFields = schema[collectionName].relationships.belongs_to,
          hasManyFields = schema[collectionName].relationships.has_many;

      if (belongsToFields) {
        if (typeof(belongsToFields)==="string") { belongsToFields = [belongsToFields]; }
        for (var i=0;i<belongsToFields.length;i++) {
          let singular = inflection.singularize(belongsToFields[i]),
              plural = inflection.pluralize(belongsToFields[i]);

          let reference = new Reference(singular + "_id").
            targetEntity(entities[plural]).
            targetField(new Field('name')). // TODO: specify related collection 'title' column
            .singleApiCall(function(ids) {
              return { _id: ids };
            });

          fields[ belongsToFields[i] ] = reference;
        }
      }

      if (hasManyFields) {
        if (typeof(hasManyFields)==="string") { hasManyFields = [hasManyFields]; }
      }

    }

    for (let section in sections) {
      let view = sections[section],
          sectionCollectionConfig = collectionConfig[section] || {};

      view.title(sectionCollectionConfig.title || entity.config.label);

      if (sectionCollectionConfig.description) {
        view.description(sectionCollectionConfig.description);
      }

      //
      // field ordering
      //
      // use 'fields' view attribute
      // OR use schema order
      //
      var fieldNames = sectionCollectionConfig.fields || Object.keys(fields);
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
        view.listActions(sectionCollectionConfig.actions);
      }

      // dashboard view: limit
      if (section == 'dashboard') {
        if (sectionCollectionConfig.limit) {
          view.limit(sectionCollectionConfig.limit);
        }
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

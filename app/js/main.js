var app = angular.module('admin', ['ng-admin']),
    appConfig = require('../config/app.yaml'),
    schemaBuilder = require('./src/schema/builder'),
    filters = require('./src/filters'),
    actions = require('./src/actions'),
    inflection = require('inflection'),
    hook = new Hook.Client(appConfig.credentials),
    schemaYaml = require('../../hook-ext/schema.yaml');

window.hook = hook;

// register default filters
filters.register('like', require('./src/filters/like'));

require('./src/config/restangular')(app, hook);
require('./src/authentication')(app, hook);
require('./src/fields')(app, hook);

function aggregateIds(ids) {
  return (ids && ids.length > 0) ? { _id: ids } : {};
}

app.controller("main", function ($scope, $rootScope, $location) {
  $rootScope.$on("$stateChangeSuccess", function () {
    $scope.displayBanner = $location.$$path === "/dashboard";
  });
});

app.config(function(NgAdminConfigurationProvider) {
  var nga = NgAdminConfigurationProvider;
  var schema = schemaBuilder(schemaYaml, appConfig.collections || {});

  // set the main API endpoint for this admin
  var app = nga.application(appConfig.title);
  document.title = appConfig.title;
  app.baseApiUrl(appConfig.credentials.endpoint + "/collection/");

  //
  // set-up all entities to allow referencing each other
  //
  var entities = {},
      configs = {};

  for (let name in schema) {
    let entity = nga.entity(name).
      identifier(nga.field('_id')).
      url(function(view, entityId) {
        return view.entity.name() + (entityId ? '/' + entityId : "");
      });

    entities[ inflection.pluralize(name) ] = entity;
    configs[ inflection.pluralize(name) ] = (appConfig.collections && appConfig.collections[name]) || {};
  }


  for (let name in schema) {
    let config = configs[name];
    let entity = entities[name];

    // normalize collection view configs
    if (!config || (typeof(config) == "boolean")) { config = {}; }
    if (!config.list) { config.list = {}; }
    if (!config.dashboard) { config.dashboard = {}; }

    // by default, allow 'show', 'edit' and 'delete' actions.
    if (!config.list.actions) {
      config.list.actions = ['show', 'edit', 'delete'];
    }

    if (!entity) {
      console.log("Missing config for entity: ", name);
      continue;
    }

    // overwrite label
    if (config.label) {
      entity.label(config.label);
    }

    //
    // create collection fields based on schema definition
    // https://github.com/doubleleft/hook/wiki/Schema-definition
    //
    var fields = {};
    for (var i=0;i<schema[name].length;i++) {
      let attribute = schema[name][i];
      fields[ attribute.name ] = nga.field(attribute.name, attribute.type);

      if (attribute.template) { fields[ attribute.name ].template(attribute.template); }
      if (attribute.choices) { fields[ attribute.name ].choices(attribute.choices); }

      // type: reference
      if (attribute.target_entity && attribute.target_field) {
        fields[ attribute.name ].targetEntity(entities[attribute.target_entity]);
        fields[ attribute.name ].targetField(nga.field(attribute.target_field));
        fields[ attribute.name ].singleApiCall(aggregateIds);
      }

      // //
      // // TODO: reference relationship fields
      // //
      // if (attribute.name.indexOf('.') > 0) {
      //   let field = attribute.name.split(".");
      //   fields[ attribute.name ] = nga.field(fields[1], 'reference').
      //     targetEntity(entities[ inflection.pluralize(field[0]) ]).
      //     targetField(nga.field(fields[1])).
      //     singleApiCall(aggregateIds);
      // }
    }

    // relationships: belongsTo
    let belongsTo = schema[name].belongsTo;
    if (belongsTo) {
      for (var i=0;i<belongsTo.length;i++) {
        let singular = inflection.singularize(belongsTo[i]),
            plural = inflection.pluralize(belongsTo[i]),
            label_field = (configs[plural] && configs[plural].label_field) ||
              (schema[plural] && schema[plural][0] && schema[plural][0].name);

        if (label_field) {
          fields[ belongsTo[i] ] = nga.field(singular + "_id", 'reference').
            targetEntity(entities[plural]).
            targetField(nga.field(label_field)).
            singleApiCall(aggregateIds);
        }
      }
    }

    // relationships: hasMany
    let hasMany = schema[name].hasMany;
    if (hasMany) {
      for (var i=0;i<hasMany.length;i++) {
        let singular = inflection.singularize(hasMany[i]),
            plural = inflection.pluralize(hasMany[i]),
            label_field = (configs[plural] && configs[plural].label_field) ||
              (schema[plural] && schema[plural][0] && schema[plural][0].name);

        if (label_field) {
          fields[ hasMany[i] ] = nga.field(plural, 'reference_many').
            targetEntity(entities[plural]).
            targetField(nga.field(label_field)).
            singleApiCall(aggregateIds);
        }

      }
    }

    //
    // Configure collection fields
    //
    if (config.fields) {
      for (let field in config.fields) {
        if (typeof(field)==="object" && field.name) {

          // custom field label
          if (field.label) { fields[field.name].label(field.label); }

        }
      }
    }

    // Don't configure section views if it's configured as hidden.
    if (config.hide) continue;

    //
    // Configure each section
    //
    var sections = {
      'dashboard': entity.dashboardView(),
      'list': entity.listView(),
      'show': entity.showView(),
      'creation': entity.creationView(),
      'edition': entity.editionView(),
      'deletion': entity.deletionView()
    };

    for (let section in sections) {
      let view = sections[section],
          sectionConfig = config[section] || {};

      // view.title(sectionConfig.title || entity.label);
      // if (sectionConfig.description) {
      //   view.description(sectionConfig.description);
      // }

      //
      // field ordering
      //
      // use 'fields' view attribute OR use schema order
      //
      let sectionFields = sectionConfig.fields || config.fields || Object.keys(fields);
      let sectionSort = sectionConfig.sort || config.sort || { '_id': 'asc' },
          sortField = Object.keys(sectionSort)[0],
          sortDir = sectionSort[ sortField ];

      for (var i in sectionFields) {
        let field = typeof(sectionFields[i])==="string" ? { name: sectionFields[i] } : sectionFields[i];

        if (fields[field.name]) {
          // TODO: DRY
          // custom field label
          if (field.label) { fields[field.name].label(field.label); }

          // dashboard has detail links by default
          if (section == 'dashboard') {
            fields[field.name].isDetailLink(true);
          }

          view.addField(fields[field.name]);
        }
      }

      // list view
      // - actions
      if (section == 'list') {
        view.listActions(sectionConfig.actions);
        view.sortField(sortField);
        view.sortDir(sortDir);
        view.perPage(sectionConfig.per_page || 30);
      }

      // dashboard view
      // - limit
      // - order
      if (section == 'dashboard') {
        view.sortField(sortField);
        view.sortDir(sortDir);
        if (sectionConfig.limit) { view.limit(sectionConfig.limit); }
        if (sectionConfig.order) { view.order(sectionConfig.order); }
      }
    }

    if (config['filters']) {
      for (let i=0; i<config['filters'].length; i++) {
        let data = (typeof(config['filters'][i]) == "string") ? { field: config['filters'][i] } : config['filters'][i],
            filter = filters.get(data.type),
            field = angular.copy(fields[ data.field ]);

        if (data.label) {
          field.label(data.label);
        }

        if (filter) {
          field.map(function(value, entry) {
            return filter(data.field, value, entry);
          });
        }

        sections['list'].filters([ field ]);
      }
    }

    // menu view: icon
    let defaultIcon = 'list',
        menu = config.menu || { icon: config.icon || defaultIcon };

    // if (config.menu === false) {
    //   entity.menuView().disable();
    //
    // } else {
    //   entity.menuView().icon('<span class="glyphicon glyphicon-' + (menu.icon || defaultIcon) + '"></span>');
    //   if (menu.order) {
    //     entity.menuView().order(menu.order);
    //   }
    // }

    app.addEntity(entity);
  }

  NgAdminConfigurationProvider.configure(app);
});

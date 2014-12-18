var YAML = require('yamljs'),
    app = angular.module('admin', ['ng-admin']),
    config = YAML.load('config/app.yaml');

app.config(function (NgAdminConfigurationProvider, Application, Entity, Field, Reference, ReferencedList, ReferenceMany) {
  var hook = new Hook.Client(config.credentials);
  console.log(hook);

  // set the main API endpoint for this admin
  var app = new Application('hook').
    baseApiUrl('http://hook.ddll.co/');

  // define an entity mapped by the http://localhost:3000/posts endpoint
  var post = app.addEntity('posts');

  // set the list of fields to map in each post view
  post.dashboardView().addField(/* see example below */);
  post.listView().addField(/* see example below */);
  post.creationView().addField(/* see example below */);
  post.editionView().addField(/* see example below */);

  NgAdminConfigurationProvider.configure(app);
});


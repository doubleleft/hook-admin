module.exports = function(app, hook) {

  app.directive('imagePreview', ['$location', function ($location) {
    return {
      restrict: 'E',
      template: '<img src="{{ entry.values.image }}" />'
    };
  }]);

}

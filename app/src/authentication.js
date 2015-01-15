module.exports = function(app, hook) {
  var headerNav, pageWrapper;

  function hideMenu() {
    headerNav = document.querySelector('#header-nav');
    pageWrapper = document.querySelector('#page-wrapper');

    headerNav.style.display = "none";
    pageWrapper.style.marginLeft = "0";
    pageWrapper.style.backgroundColor = "inherit";
  }

  function showMenu() {
    headerNav = document.querySelector('#header-nav');
    pageWrapper = document.querySelector('#page-wrapper');

    headerNav.style.display = "block";
    pageWrapper.style.marginLeft = "250px";
    pageWrapper.style.backgroundColor = "#fff";
  }

  // Go to login form if user isn't logged in
  app.run(function($rootScope, $location, $state){
    console.log($location);

    // listen to logout
    hook.auth.on('logout', function() {
      hideMenu();

      // why $location.path doesn't work, freaking angular?!
      location.hash = '#/login';
    });

    $rootScope.$on("$locationChangeStart", function (event, next, current) {
      if (!hook.auth.currentUser && !next.match(/login$/)) {
        $location.path('/login');
      }
    });
  });

  app.controller('AuthenticationController', function ($scope, $rootScope, $location) {
    $scope.title = 'Authentication';
    $scope.success = false;

    $scope.login = function (data) {
      hook.auth.login(data).then(function(auth) {
        showMenu();
        $scope.$apply(function(){
          $scope.success = true;
        });
        $location.path('/dashboard');
        $location.reload();

      }).otherwise(function(data) {
        // $apply is weird
        $scope.$apply(function(){
          $scope.error = data.error;
        });
      });
    };

    $scope.$on('$viewContentLoaded', function() {
      hideMenu();
    });

  });

  app.config(function($stateProvider) {
    $stateProvider
      .state('auth', {
        parent: 'main',
        url: '/login',
        controller: 'AuthenticationController',
        controllerAs: 'listController',
        template: document.querySelector('#login-template').innerHTML
      });
  })

}

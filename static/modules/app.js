'use strict';

var config = angular.module('app.config', [])
    .constant('appTitle', 'Log Scope')
    .constant('appModuleBase', '/pl/logscope/static/modules/')
    .constant('teranautModuleBase', '/pl/teranaut/static/modules/')
    .constant('teranautAdminUserRoles', ['user', 'admin', 'domains-user']);

// Declare app level module which depends on filters, and services
var app = angular.module('theApp', ['ngRoute', 'ngResource', 'ngCookies',
        'teranaut.util', 'teranaut.account', 'teranaut.search', 'teranaut.admin.users', 'teranaut.admin.nodes',
        'logscope.logs', 'app.config'
        ])
    .value('version', '0.1') // Application version
    .config(['$routeProvider', '$locationProvider', '$httpProvider', 'appModuleBase', 'teranautModuleBase',
        function($routeProvider, $locationProvider, $httpProvider, appModuleBase, teranautModuleBase) {        
            
            $routeProvider.
                when('/', {
                    templateUrl: appModuleBase + '/root/index.tpl.html',
                    controller: 'StubController'
                    //,reloadOnSearch: false
                }).                
                when('/search/logs/', {
                    templateUrl: teranautModuleBase + '/search/grid.tpl.html',
                    controller: 'LogsSearchController'
                    //,
                    //reloadOnSearch: false
                }).                  
                otherwise({
                    redirectTo: '/'
                });
            
            $locationProvider.html5Mode(true);        
        }
    ])

    .run(['$rootScope', '$http', '$angularCacheFactory', 'accountData', 'adminNodeData', 'searchContextService',
        function($rootScope, $http, $angularCacheFactory, accountData, adminNodeData, searchContextService) {
            
            $rootScope.$on('event:auth-loginConfirmed', function() {  
                accountData.getActiveUser().then(function(user) {    
                    $rootScope.activeUser = user;
                    $rootScope.hideLogin = true;
                    console.log("Loading node cache.")    ;
                    adminNodeData.loadNodeCache(user.client_id);
                })              
            });

            // Generated when the user logs out of the app. Need to clear any user specific state here.
            $rootScope.$on('event:auth-loginRequired', function() {     
                $rootScope.activeUser = null;
                $rootScope.hideLogin = false;
                searchContextService.reset();
            });

            $angularCacheFactory('defaultCache', {
                maxAge: 900000, // Items added to this cache expire after 15 minutes.
                cacheFlushInterval: 6000000, // This cache will clear itself every hour.
                deleteOnExpire: 'aggressive' // Items will be deleted from this cache right when they expire.
            });

            //$http.defaults.cache = $angularCacheFactory.get('defaultCache');
        }
    ])

    .controller('ApplicationController', ['$scope', '$location', 'pageTitle',
        function ($scope, $location, pageTitle) {
            $scope.isActive = function (viewLocation) {
                return (viewLocation === $location.path());        
            };
            $scope.appLoadingComplete = true;
            $scope.pageTitle = pageTitle;
        }
    ]);    

/*
 * This delays bootrapping of the main app until the configuration file is loaded.
 */
angular.element(document).ready(
    function() {       
        var initInjector = angular.injector(['ng']);
        angular.bootstrap(document, ['theApp']);

        /*var $http = initInjector.get('$http');
        $http.get('/wtconfig').then(function(response) {
            app.constant('wtConfig', response.data);
            angular.bootstrap(document, ['theApp']);
        });*/
    }
);
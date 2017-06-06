angular.module('logscope.logs', ['app.config', 'teranaut.data.elasticsearch'])
    .controller('WindowReloadController', 
    ['$scope', 'appModuleBase', '$window',
function ($scope, appModuleBase, $window) {
    if ($scope.activeUser) {
        $window.location.reload();
    }
}]);

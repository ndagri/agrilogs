angular.module('logscope.logs', ['app.config', 'teranaut.data.elasticsearch'])
    .controller('LogsSearchController', 
    ['$scope', 'appModuleBase',
function ($scope, appModuleBase) {

    var fields = [
        {
            name: '@timestamp',
            human_name: 'Date',
            type: 'date',
            header: true,
            sortable: true            
        },
        {
            name: 'name',
            human_name: 'Name',
            header: true
        },
        {
            name: 'hostname',
            human_name: 'Hostname',
            header: true
        },
        {
            name: 'message',
            human_name: 'Message',
            header: true
        }
    ];

    $scope.searchConfig = {
        title: "Logs",
        context: 'logs',
        engine: 'elasticsearch',
        collection: 'logstash',
        interactiveUI: false,
        history: 90,
        fields: fields,
        gridView: appModuleBase + '/logs/search-results.tpl.html',
        searchView: appModuleBase + '/logs/search-controls.tpl.html'
    };
    
}])
.directive('logsPivotMenu', ['appModuleBase', function(appModuleBase) {
    return {     
        replace: true,       
        templateUrl: appModuleBase + '/logs/pivot-menu.tpl.html'
    }
}]);


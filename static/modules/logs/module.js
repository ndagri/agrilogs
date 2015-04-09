angular.module('agrilogs.logs', ['app.config', 'agrinaut.data.elasticsearch'])
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
            name: 'request',
            human_name: 'Request',
            header: true
        },
        {
            name: 'referer',
            human_name: 'Referer',
            header: true
        },
        {
            name: 'host',
            human_name: 'Host',
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
        searchView: appModuleBase + '/logs/search-controls.tpl.html',
    };
    
}])
.directive('logsPivotMenu', ['appModuleBase', function(appModuleBase) {
    return {     
        replace: true,       
        templateUrl: appModuleBase + '/logs/pivot-menu.tpl.html'
    }
}])


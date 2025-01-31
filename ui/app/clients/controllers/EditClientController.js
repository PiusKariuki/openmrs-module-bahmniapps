angular.module('bahmni.clients')
    // eslint-disable-next-line angular/di
    .controller('EditClientController', ['$scope', '$stateParams', 'ClientsService', function ($scope, $stateParams, ClientService) {
        var clientId = $stateParams.clientId;

        ClientService.getClientByid(clientId)
            .then(function (response) {
                $scope.client = response.data;
            });

        $scope.updateClient = function () {
            ClientService.updateClient($scope.client)
                .then(function () {
                    alert("Client updated successfully");
                });
        };
    }]);

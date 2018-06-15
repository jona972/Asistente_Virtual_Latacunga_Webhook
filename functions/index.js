'use strict';
const http = require('http');

// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

//The Firebase Admin SDK para acceder a Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Funcion para enviar el resultado consultado a Dialogflow.
function sendResponseToDialogflow(response, result, resultArray) {
    // Enviamos el resultado con formato JSON.
    response.setHeader('Content-Type', 'application/json'); 

    // Enviamos la respuesta a Dialogflow con el texto que contiene el mensaje.
    return response.send(JSON.stringify({ 
        'speech': result, 
        'displayText': result, 
        'data': resultArray
     }));
}

// Funcion para obtener los parametros enviados por Dialogflow
function getDialogflowParameters(request, action) {
    var parameters = [];
    var arrayContext = request.body.result.contexts;
    switch(action) {
        case "churchInformationAction":
        parameters.push(request.body.result.parameters.name_churches);
        break
        case "hotelInformationAction":
        parameters.push(request.body.result.parameters.name_accommodation);
        break
        case "churchShowLocationAction":
        arrayContext.forEach(objectContext => {
            parameters.push(objectContext.parameters.name_churches);
        });
        break
        case "hotel_information_intent.hotel_information_intent-yes":
        arrayContext.forEach(objectContext => {
            parameters.push(objectContext.parameters.name_accommodation);
        });
        break
    }
    return parameters;
}

// Funcion para consultar los atractivos por parametro obtenido de Dialogflow.
function getTouristAttractionByAlias(request, response, action) {
    var parameters = getDialogflowParameters(request, action); // Obtenemos los parametros de Dialogflow
    
    var ref = admin.database().ref("atractivo"); // Creamos una variable que contiene el nodo "atractivo".

    // Buscamos todos los datos que sean igual al alias definido en la base de datos con el parametro obtenido de Dialogflow. 
    ref.orderByChild("alias").equalTo(parameters[0]).on("value", (snapshot) => {
        let jsonResult = {}; // Para almacenar todos los datos encontrados con el parametro y almacenarlo con su key respectivo.
        snapshot.forEach((childSnapshot) => { // Recorremos el resultado de la busqueda.
            var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
            values.key = childSnapshot.key; // Almacenamos la clave del atractivo en una variable.

            // Se guardan los valores obtenidos en un arreglo.
            jsonResult = { estado: true, key: values.key, resultado: childSnapshot.val() };              
        }); 

        let resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
        if (Object.keys(jsonResult).length === 0) {
            // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
            resultToSendDialogflow = "Asegurese que el nombre del atractivo este bien ingresado, o talvez esté " +
            "no pertenezca al centro historico de la ciudad de Latacunga.";
            sendResponseToDialogflow(response, resultToSendDialogflow, jsonResult); // Enviamos el resultado a Dialogflow.
        } else {
            // Enviamos los valores da la consulta a Dialogflow.
            if (action === "churchInformationAction") {
                resultToSendDialogflow = "¿Deseas saber la ruta de la iglesia " + parameters[0] + "?";
                sendResponseToDialogflow(response, resultToSendDialogflow, jsonResult); // Enviamos el resultado a Dialogflow.
            } else if (action === "churchShowLocationAction") {
                resultToSendDialogflow = "Consultado con exito la iglesia " + parameters[0];
                sendResponseToDialogflow(response, resultToSendDialogflow, jsonResult); // Enviamos el resultado a Dialogflow.
            }
            
        }     
    });
}

// Funcion para consultar los servicios por parametro obtenido de Dialogflow.
function getServiceByAlias(request, response, action) {
    var parameters = getDialogflowParameters(request, action); // Obtenemos los parametros de Dialogflow
    var ref = admin.database().ref("servicio"); // Creamos una variable que  apunta al nodo "servicio".

    // Buscamos todos los datos que sean igual al alias definido en la base de datos con el parametro obtenido de Dialogflow. 
    ref.orderByChild("alias").equalTo(parameters[0]).on("value", (snapshot) => {
        var listaServicio = {} // Para almacenar todos los datos encontrados.
        snapshot.forEach((childSnapshot, index, arr) => { // Recorremos el resultado de la busqueda.
            var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
            values.key = childSnapshot.key; // Almacenamos la clave del servicio en una variable.
            // Se guardan los valores obtenidos en un arreglo.
            listaServicio[values.key] = (childSnapshot.val());           
        }); 
        let resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
        if (Object.keys(listaServicio).length === 0) {
            // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
            resultToSendDialogflow = "Lo siento, no pude encontrar la información necesaria para responder tu duda."+
            " Por favor, asegúrese de que el nombre del servicio esté ingresado correctamente."+
            " O tal vez, no está en nuestra base de datos.";
            sendResponseToDialogflow(response, resultToSendDialogflow, listaServicio); // Enviamos el resultado a Dialogflow.
        } else {
            switch(action){
                case "hotelInformationAction":
                // Enviamos los valores da la consulta a Dialogflow.
                resultToSendDialogflow = "Esta es la información que pude encontrar sobre el servicio " + parameters[0] + ". ¿Te gustaría saber cómo llegar?";
                sendResponseToDialogflow(response, resultToSendDialogflow, listaServicio); // Enviamos el resultado a Dialogflow.
                break
                case "hotel_information_intent.hotel_information_intent-yes":
                // Enviamos los valores da la consulta a Dialogflow.
                resultToSendDialogflow = "Este es el camino que deberías tomar para llegar al servicio " + parameters[0];
                sendResponseToDialogflow(response, resultToSendDialogflow, listaServicio); // Enviamos el resultado a Dialogflow.
                break
            }
        }  
    });
}

// Funcion para consultar los servicios por categoria.
function getServicesByCategoria(request, response, categoria) {
    var ref = admin.database().ref("servicio"); // Creamos una variable que  apunta al nodo "servicio".

    // Buscamos todos los servicios que sean de la categoria buscada 
    ref.orderByChild("categoria").equalTo(categoria).on("value", (snapshot) => {
        var listaServicio = {} // Para almacenar todos los datos encontrados.
        snapshot.forEach((childSnapshot, index, arr) => { // Recorremos el resultado de la busqueda.
            var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
            values.key = childSnapshot.key; // Almacenamos la clave del servicio en una variable.
            // Se guardan los valores obtenidos en un arreglo.
            listaServicio[values.key] = (childSnapshot.val());           
        }); 
        let resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
        if (Object.keys(listaServicio).length === 0) {
            // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
            resultToSendDialogflow = "Lo siento, no pude encontrar la información necesaria para responder tu duda.";
            sendResponseToDialogflow(response, resultToSendDialogflow, listaServicio); // Enviamos el resultado a Dialogflow.
        } else {
            // Enviamos los valores da la consulta a Dialogflow.
            resultToSendDialogflow = "Estos son algunos de los lugares que ofrecen servicio de "+ categoria + " en la zona ";
            sendResponseToDialogflow(response, resultToSendDialogflow, listaServicio); // Enviamos el resultado a Dialogflow.
        }     
    });
}

// Funcion para consultar los atractivos.
function getTouristAttraction(request, response) {
    var ref = admin.database().ref("atractivo"); // Creamos una variable que  apunta al nodo "atractivo".

    // Buscamos todos los atractivos ordenados por categoria
    ref.orderByChild("categoria").on("value", (snapshot) => {
        var listaAtractivo = {} // Para almacenar todos los datos encontrados.
        snapshot.forEach((childSnapshot, index, arr) => { // Recorremos el resultado de la busqueda.
            var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
            values.key = childSnapshot.key; // Almacenamos la clave del atractivo en una variable.
            // Se guardan los valores obtenidos en un arreglo.
            listaAtractivo[values.key] = (childSnapshot.val());           
        }); 
        let resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
        if (Object.keys(listaAtractivo).length === 0) {
            // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
            resultToSendDialogflow = "Lo siento, no pude encontrar la información necesaria para responder tu duda.";
            sendResponseToDialogflow(response, resultToSendDialogflow, listaAtractivo); // Enviamos el resultado a Dialogflow.
        } else {
            // Enviamos los valores da la consulta a Dialogflow.
            resultToSendDialogflow = "Estos son los atractivos turísticos del centro histórico";
            sendResponseToDialogflow(response, resultToSendDialogflow, listaAtractivo); // Enviamos el resultado a Dialogflow.
        }     
    });
}

exports.virtualAssistantLatacungaWebhook = functions.https.onRequest((request, response) => {
    // Obtenemos la acción solicitada de la solicitud de DialogFlow
    let accion = request.body.result.action;
    // Revisamos la accion para llamar a la funcion correcta
    switch (accion) {
        case "churchInformationAction":
        case "churchShowLocationAction":
        // Llamamos a la funcion para consultar atractivos y enviamos request y response.
        getTouristAttractionByAlias(request, response, accion);
        break
        case "hotelInformationAction":
        case "hotel_information_intent.hotel_information_intent-yes":
        // Llamamos a la funcion para consultar servicios y enviamos request y response.
        getServiceByAlias(request, response, accion);
        break
        case "consultarAtractivoEnElArea":
        // Llamamos a la funcion para consultar atractivos y enviamos request y response.
        getTouristAttraction(request, response);
        break
        case "consultarAlojamientoEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request y response.
        getServicesByCategoria(request, response, "Alojamiento");
        break
        case "consultarComidaYBebidaEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request y response.
        getServicesByCategoria(request, response, "Comidas y bebidas");
        break
        default:
        // En caso de que niguna accion sea identificada.
        sendResponseToDialogflow(response, "La acción no fue identificada", null);
    }
});

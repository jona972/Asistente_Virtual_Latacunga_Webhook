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
    return response.send(JSON.stringify({ 'speech': result, 'displayText': result, 'data': resultArray }));
}

// Funcion para consultar los atractivos por parametro obtenido de Dialogflow.
function consultTouristAttractions(request, response, action) {

    // Para consultar el parametro que envia Dialogflow sobre la informacion sobre las iglesias.
    var parameterAttractive = [];

    if (action === "churchInformationAction") {
        parameterAttractive.push(request.body.result.parameters.name_churches);
    } else if (action === "churchShowLocationAction") {
        var arrayContext = request.body.result.contexts;

        arrayContext.forEach(objectContext => {
            parameterAttractive.push(objectContext.parameters.name_churches);
        });
    }

    var ref = admin.database().ref("atractivo"); // Creamos una variable que contiene el nodo "atractivo".

    // Buscamos todos los datos que sean igual al alias definido en la base de datos con el parametro obtenido de Dialogflow. 
    ref.orderByChild("alias").equalTo(parameterAttractive[0]).on("value", (snapshot) => {
        
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
                resultToSendDialogflow = "¿Deseas saber la ruta de la iglesia " + parameterAttractive[0] + "?";
                sendResponseToDialogflow(response, resultToSendDialogflow, jsonResult); // Enviamos el resultado a Dialogflow.
            } else if (action === "churchShowLocationAction") {
                resultToSendDialogflow = "Consultado con exito la iglesia " + parameterAttractive[0];
                sendResponseToDialogflow(response, resultToSendDialogflow, jsonResult); // Enviamos el resultado a Dialogflow.
            }
            
        }     
    });
}

// Funcion para consultar los servicios por categoria.
function consultarServiciosPorCategoria(request, response, categoria) {
    // Creamos una variable que  apunta al nodo "servicio".
    var ref = admin.database().ref("servicio");

    // Buscamos todos los servicios que sean de la categoria buscada 
    ref.orderByChild("categoria").equalTo(categoria).on("value", (snapshot) => {
        // Para almacenar todos los datos encontrados.
        let jsonResult = {};
        var listaServicio = {}
        snapshot.forEach((childSnapshot, index, arr) => { // Recorremos el resultado de la busqueda.
            var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
            values.key = childSnapshot.key; // Almacenamos la clave del servicio en una variable.
            // Se guardan los valores obtenidos en un arreglo.
            listaServicio[values.key] = (childSnapshot.val());           
        }); 
        let resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
        if (Object.keys(listaServicio).length === 0) {
            // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
            resultToSendDialogflow = "Lo siento, no pude encontrar información necesaria para poder responder tu duda.";
            sendResponseToDialogflow(response, resultToSendDialogflow, listaServicio); // Enviamos el resultado a Dialogflow.
        } else {
            // Enviamos los valores da la consulta a Dialogflow.
            resultToSendDialogflow = "Estos son algunos de los lugares que ofrecen servicio de "+ categoria + " en la zona ";
            sendResponseToDialogflow(response, resultToSendDialogflow, listaServicio); // Enviamos el resultado a Dialogflow.
        }     
    });
}

// Funcion para consultar los atractivos.
function consultarAtractivos(request, response) {
    // Creamos una variable que  apunta al nodo "atractivo".
    var ref = admin.database().ref("atractivo");

    // Buscamos todos los atractivos ordenados por categoria
    ref.orderByChild("categoria").on("value", (snapshot) => {
        // Para almacenar todos los datos encontrados.
        let jsonResult = {};
        var listaAtractivo = {}
        snapshot.forEach((childSnapshot, index, arr) => { // Recorremos el resultado de la busqueda.
            var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
            values.key = childSnapshot.key; // Almacenamos la clave del atractivo en una variable.
            // Se guardan los valores obtenidos en un arreglo.
            listaAtractivo[values.key] = (childSnapshot.val());           
        }); 
        let resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
        if (Object.keys(listaAtractivo).length === 0) {
            // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
            resultToSendDialogflow = "Lo siento, no pude encontrar información necesaria para poder responder tu duda.";
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
        // Llamamos a la funcion para consultar atractivos y enviamos request y response.
        consultTouristAttractions(request, response, "churchInformationAction");
        break
        case "consultarAtractivoEnElArea":
        // Llamamos a la funcion para consultar atractivos y enviamos request y response.
        consultarAtractivos(request, response);
        break
        case "consultarAlojamientoEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request y response.
        consultarServiciosPorCategoria(request, response, "Alojamiento");
        break
        case "consultarComidaYBebidaEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request y response.
        consultarServiciosPorCategoria(request, response, "Comidas y bebidas");
        break
        case "churchShowLocationAction":
        // Llamamos a la funcion para consultar atractivos y enviamos request y response.
        consultTouristAttractions(request, response, "churchShowLocationAction");
        break
        default:
        // En caso de que niguna accion sea identificada.
        sendResponseToDialogflow(response, "La acción no fue identificada", jsonResult);
    }
});

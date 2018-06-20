"use strict";
const http = require("http");

// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require("firebase-functions");

//The Firebase Admin SDK para acceder a Firebase Realtime Database.
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

// Funcion para enviar el resultado consultado a Dialogflow.
function sendResponseToDialogflow(response, result, resultArray) {
  // Enviamos el resultado con formato JSON.
  response.setHeader("Content-Type", "application/json");

  // Enviamos la respuesta a Dialogflow con el texto que contiene el mensaje.
  return response.send(
    JSON.stringify({ speech: result, displayText: result, data: resultArray })
  );
}

// Funcion para obtener los parametros enviados por Dialogflow
function getDialogflowParameters(request, action) {
  var parameters, arrayContext;
  parameters = [];
  arrayContext = request.body.result.contexts;
  switch (action) {
    case "churchInformationAction":
      parameters.push(request.body.result.parameters.name_churches);
      break;
    case "serviceInformationAction":
      parameters.push(request.body.result.parameters.name_services);
      break;
    case "church_information_intent.church_information_intent-yes":
      arrayContext.forEach(objectContext => {
        parameters.push(objectContext.parameters.name_churches);
      });
      break;
    case "service_information_intent.service_information_intent-yes":
      arrayContext.forEach(objectContext => {
        parameters.push(objectContext.parameters.name_services);
      });
      break;
  }
  return parameters;
}

// Funcion para consultar los atractivos por parametro obtenido de Dialogflow.
function getTouristAttractionByAlias(request, response, action) {
  var parameters, ref;
  parameters = getDialogflowParameters(request, action); // Obtenemos los parametros de Dialogflow
  ref = admin.database().ref("atractivo"); // Creamos una variable que contiene el nodo "atractivo".
  // Buscamos todos los datos que sean igual al alias definido en la base de datos con el parametro obtenido de Dialogflow.
  return ref.orderByChild("alias").equalTo(parameters[0]).once("value")
  .then( snapshot => {
    var jsonResult = {}; // Para almacenar todos los datos encontrados con el parametro y almacenarlo con su key respectivo.
    var resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
    snapshot.forEach(childSnapshot => {
      // Recorremos el resultado de la busqueda.
      var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
      values.key = childSnapshot.key; // Almacenamos la clave del atractivo en una variable.
      // Se guardan los valores obtenidos en un arreglo.
      jsonResult = {
        estado: true,
        key: values.key,
        resultado: childSnapshot.val()
      };
    });
    if (Object.keys(jsonResult).length === 0) {
      // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
      resultToSendDialogflow =
        "Lo siento, no pude encontrar la información necesaria para responder tu duda." +
        " Por favor, asegúrese que el nombre del atractivo este bien ingresado, o talvez esté " +
        "no pertenezca al centro historico de la ciudad de Latacunga.";
    } else {
      // Enviamos los valores da la consulta a Dialogflow.
      if (action === "churchInformationAction") {
        resultToSendDialogflow = "Esta es la información que pude encontrar sobre la Iglesia " +
        parameters[0] + ". ¿Te gustaría saber cómo llegar?";
      } else if (action === "church_information_intent.church_information_intent-yes") {
        resultToSendDialogflow = "Este es el camino que deberías tomar para llegar a la Iglesia " + 
        parameters[0];
      }
    }
    // Enviamos el resultado a Dialogflow.
    return sendResponseToDialogflow(response,resultToSendDialogflow,jsonResult);
  });
}

// Funcion para consultar los servicios por parametro obtenido de Dialogflow.
function getServiceByAlias(request, response, action) {
  var parameters, ref;
  parameters = getDialogflowParameters(request, action); // Obtenemos los parametros de Dialogflow
  ref = admin.database().ref("servicio"); // Creamos una variable que contiene el nodo "servicio".
  // Buscamos todos los datos que sean igual al alias definido en la base de datos con el parametro obtenido de Dialogflow.
  return ref.orderByChild("alias").equalTo(parameters[0]).once("value")
  .then( snapshot => {
      var jsonResult = {}; // Para almacenar todos los datos encontrados con el parametro y almacenarlo con su key respectivo.
      var resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
      snapshot.forEach(childSnapshot => {
        // Recorremos el resultado de la busqueda.
        var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
        values.key = childSnapshot.key; // Almacenamos la clave del servicio en una variable.
        // Se guardan los valores obtenidos en un arreglo.
        jsonResult[values.key] = childSnapshot.val();
      });
      if (Object.keys(jsonResult).length === 0) {
        // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
        resultToSendDialogflow =
          "Lo siento, no pude encontrar la información necesaria para responder tu duda." +
          " Por favor, asegúrese que el nombre del servicio este bien ingresado, o talvez esté " +
          "no pertenezca al centro historico de la ciudad de Latacunga.";
      } else {
        // Enviamos los valores da la consulta a Dialogflow.
        if (action === "serviceInformationAction") {
          resultToSendDialogflow =
            "Esta es la información que pude encontrar sobre el servicio " +
            parameters[0] + ". ¿Te gustaría saber cómo llegar?";
        } else if (action === "service_information_intent.service_information_intent-yes") {
          resultToSendDialogflow =
            "Este es el camino que deberías tomar para llegar al servicio " +
            parameters[0];
        }
      }
    // Enviamos el resultado a Dialogflow.
    return sendResponseToDialogflow(response,resultToSendDialogflow,jsonResult);
    });
}

// Funcion para consultar los servicios por categoria.
function getServicesByCategoria(response, categoria) {
  var ref;
  ref = admin.database().ref("servicio"); // Creamos una variable que  apunta al nodo "servicio".
  // Buscamos todos los servicios que sean de la categoria buscada
  return ref.orderByChild("categoria").equalTo(categoria).once("value")
    .then( snapshot => {
      var listaServicio = {}; // Para almacenar todos los datos encontrados.
      var resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
      snapshot.forEach(childSnapshot => {
        // Recorremos el resultado de la busqueda.
        var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
        values.key = childSnapshot.key; // Almacenamos la clave del servicio en una variable.
        // Se guardan los valores obtenidos en un arreglo.
        listaServicio[values.key] = childSnapshot.val();
      });
      if (Object.keys(listaServicio).length === 0) {
        // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
        resultToSendDialogflow =
          "Lo siento, no pude encontrar la información necesaria para responder tu duda.";
      } else {
        // Enviamos los valores da la consulta a Dialogflow.
        resultToSendDialogflow =
          "Estos son algunos de los lugares que ofrecen servicio de " +
          categoria + " en la zona ";
      }
      // Enviamos el resultado a Dialogflow.
      return sendResponseToDialogflow( response, resultToSendDialogflow, listaServicio );
    });
}

// Funcion para consultar los atractivos.
function getTouristAttractions(response) {
  var ref;
  ref = admin.database().ref("atractivo"); // Creamos una variable que  apunta al nodo "atractivo".
  // Buscamos todos los atractivos ordenados por categoria
  return ref.orderByChild("categoria").once("value")
  .then( snapshot => {
    var listaAtractivo = {}; // Para almacenar todos los datos encontrados.
    var resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
    snapshot.forEach( childSnapshot => {
      // Recorremos el resultado de la busqueda.
      var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
      values.key = childSnapshot.key; // Almacenamos la clave del atractivo en una variable.
      // Se guardan los valores obtenidos en un arreglo.
      listaAtractivo[values.key] = childSnapshot.val();
    });
    if (Object.keys(listaAtractivo).length === 0) {
      // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
      resultToSendDialogflow =
        "Lo siento, no pude encontrar la información necesaria para responder tu duda.";
    } else {
      // Enviamos los valores da la consulta a Dialogflow.
      resultToSendDialogflow =
        "Estos son los atractivos turísticos del centro histórico";
    }
    // Enviamos el resultado a Dialogflow.
    return sendResponseToDialogflow(response, resultToSendDialogflow, listaAtractivo);
  });
}

exports.virtualAssistantLatacungaWebhook = functions.https.onRequest(
  (request, response) => {
    // Obtenemos la acción solicitada de la solicitud de DialogFlow
    let accion = request.body.result.action;
    // Revisamos la accion para llamar a la funcion correcta
    switch (accion) {
      case "churchInformationAction":
      case "church_information_intent.church_information_intent-yes":
        // Llamamos a la funcion para consultar atractivos y enviamos request y response.
        getTouristAttractionByAlias(request, response, accion);
        break;
      case "serviceInformationAction":
      case "service_information_intent.service_information_intent-yes":
        // Llamamos a la funcion para consultar servicios y enviamos request y response.
        getServiceByAlias(request, response, accion);
        break;
      case "consultarAtractivoEnElArea":
        // Llamamos a la funcion para consultar atractivos y enviamos request y response.
        getTouristAttractions(response);
        break;
      case "consultarAgenciasDeViajeEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request y response.
        getServicesByCategoria(response, "Agencia de viajes");
        break;
      case "consultarAlojamientoEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request y response.
        getServicesByCategoria(response, "Alojamiento");
        break;
      case "consultarComidaYBebidaEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request y response.
        getServicesByCategoria(response, "Comidas y bebidas");
        break;
      case "consultarRecreacionDiversionEsparcimientoEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request y response.
        getServicesByCategoria(response, "Recreación, diversión, esparcimiento");
        break;
      default:
        // En caso de que niguna accion sea identificada.
        sendResponseToDialogflow(response, "La acción no fue identificada", null);
    }
  }
);

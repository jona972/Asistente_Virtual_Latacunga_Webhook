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
    case "attractionInformationAction":
      parameters.push(request.body.result.parameters.name_attraction);
      break;
    case "serviceInformationAction":
      parameters.push(request.body.result.parameters.name_services);
      break;
    case "attraction_information_intent.attraction_information_intent-yes":
      arrayContext.forEach(objectContext => {
        parameters.push(objectContext.parameters.name_attraction);
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
  var parameters, ref, nameAttraction;
  nameAttraction = [];
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
      nameAttraction.push(childSnapshot.val().nombre); // Almacenamos el nombre del atractivo en una variable.
      // Se guardan los valores obtenidos en un arreglo.
      jsonResult[values.key] = childSnapshot.val();
    });
    if (Object.keys(jsonResult).length === 0) {
      // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
      resultToSendDialogflow =
        "Lo siento, no pude encontrar la información necesaria para responder tu duda." +
        " Por favor, asegúrese que el nombre del atractivo este bien ingresado, o talvez esté " +
        "no pertenezca al centro histórico de la ciudad de Latacunga.";
    } else {
      // Enviamos los valores da la consulta a Dialogflow.
      if (action === "attractionInformationAction") {
        resultToSendDialogflow = "Esta es la información que pude encontrar sobre el atractivo " +
        nameAttraction + ". ¿Te gustaría saber cómo llegar?";
      } else if (action === "attraction_information_intent.attraction_information_intent-yes") {
        resultToSendDialogflow = "Este es el camino que deberías tomar para llegar a " + 
        nameAttraction;
      }
    }
    // Enviamos el resultado a Dialogflow.
    return sendResponseToDialogflow(response, resultToSendDialogflow, jsonResult);
  });
}

// Funcion para consultar los atractivos.
function getTouristAttractions(request, response) {
  var ref;
  // Variable para obtener el subtipo del atractivo de Dialogflow.
  var subType = request.body.result.parameters.subtype_attraction;
  ref = admin.database().ref("atractivo"); // Creamos una variable que  apunta al nodo "atractivo".
  // Buscamos todos los atractivos ordenados por categoria
  if (subType !== null) {
    return ref.orderByChild("subtipo").equalTo(subType).once("value").then( snapshot => {
      return getAttractions(response, snapshot, true); // Si se encontro de que subtipo es el atractivo.
    });
  } else {
    return ref.orderByChild("categoria").once("value").then( snapshot => {
      return getAttractions(response, snapshot, false); // Si no se encontro de que subtipo es el atractivo.
    });
  }
}

// Función para obtener los todos atractivos o sino para obtenerlos por su sub tipo.
function getAttractions(response, snapshot, typeMessage) {
  var listaAtractivo = {}; // Para almacenar todos los datos encontrados.
  var subtype = [];
  var resultToSendDialogflow = ""; // Variable para enviar el resultado a Dialogflow.
  snapshot.forEach( childSnapshot => {
    // Recorremos el resultado de la busqueda.
    var values = childSnapshot.val(); // Obtenemos un JSON con todos los valores consultados.
    values.key = childSnapshot.key; // Almacenamos la clave del atractivo en una variable.
    subtype.push(childSnapshot.val().subtipo); // Almacenamos el subtipo del atractivo en una variable.
    // Se guardan los valores obtenidos en un arreglo.
    listaAtractivo[values.key] = childSnapshot.val();
  });
  if (Object.keys(listaAtractivo).length === 0) {
    // Enviamos un mensaje de que no se encontro ningun valor con el parametro dado por el usuario.
    resultToSendDialogflow =
      "Lo siento, no pude encontrar la información necesaria para responder tu duda.";
  } else {
    // Enviamos los valores da la consulta a Dialogflow.
    if (!typeMessage) { // Si no se encontro de que subtipo es el atractivo.
      resultToSendDialogflow = "Estos son los atractivos turísticos del centro histórico";
    } else { // Si se encontro de que subtipo es el atractivo.
      resultToSendDialogflow = "Estos son los atractivos turísticos del centro histórico que pertenecen al sub tipo de " + 
      subtype[0];
    }
  }
  // Enviamos el resultado a Dialogflow.
  return sendResponseToDialogflow(response, resultToSendDialogflow, listaAtractivo);
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
function getServicesByTipoDeActividad(response, categoria, atractivos) {
  var ref;
  ref = admin.database().ref("servicio"); // Creamos una variable que  apunta al nodo "servicio".
  // Buscamos todos los servicios que sean de la categoria buscada
  return ref.orderByChild("tipoDeActividad").equalTo(categoria).once("value")
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
        if (!atractivos) { // Sirve para cuando el usuario quiera saber atractivos turisticos fuera de la zona.
          resultToSendDialogflow = "Lo siento, no puedo brindarle información de estos atractivos turísticos, " +  
          "porque no pertenecen al centro histórico de la ciudad de Latacunga. Sin embargo, te puedo mostrar las " + 
          "siguientes agencias de viajes que hay en la zona.";
        } else { // Para dar la respuesta normal consultado de Firebase.
          resultToSendDialogflow =
          "Estos son algunos de los lugares que ofrecen servicio de " +
          categoria + " en la zona ";
        }
      }
      // Enviamos el resultado a Dialogflow.
      return sendResponseToDialogflow( response, resultToSendDialogflow, listaServicio );
    });
}

exports.virtualAssistantLatacungaWebhook = functions.https.onRequest(
  (request, response) => {
    // Obtenemos la acción solicitada de la solicitud de DialogFlow
    let accion = request.body.result.action;
    // Revisamos la accion para llamar a la funcion correcta
    switch (accion) {
      case "attractionInformationAction":
      case "attraction_information_intent.attraction_information_intent-yes":
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
        getTouristAttractions(request, response);
        break;
      case "consultarAgenciasDeViajeEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request, response y true.
        getServicesByTipoDeActividad(response, "Agencia de viajes", true);
        break;
      case "consultarAlojamientoEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request, response y true.
        getServicesByTipoDeActividad(response, "Alojamiento", true);
        break;
      case "consultarComidaYBebidaEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request, response y true.
        getServicesByTipoDeActividad(response, "Comidas y bebidas", true);
        break;
      case "consultarRecreacionDiversionEsparcimientoEnElArea":
        // Llamamos a la funcion para consultar servicios y enviamos request, response y true.
        getServicesByTipoDeActividad(response, "Recreación, diversión, esparcimiento", true);
        break;
      case "attractionOutsideHistoricCenterAction":
        // Llamamos a la funcion para consultar servicios y enviamos request, response y false.
        getServicesByTipoDeActividad(response, "Agencia de viajes", false);
        break;  
      default:
        // En caso de que niguna accion sea identificada.
        sendResponseToDialogflow(response, "La acción no fue identificada", null);
    }
  }
);

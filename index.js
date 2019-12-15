const http = require('http')
const https = require('https')
const { URL } = require('url')

/**
 * Put both protocols and default ports in same object as nodejs has two different library for http & https
 * @type {Object}
 */
const protocols = {
  http: { lib: http, defaultPort: 80 },
  https: { lib: https, defaultPort: 443 },
}

function validateHttpParams(params) {
  if (!isObject(params)) {
    throw new Error(`Params mus be an object, ${typeof params} given`)
  }

  if (typeof params.url !== 'string' || !params.url.length) {
    throw new Error(`url must be a string, ${typeof params.url} given`)
  }

  if (!isNil(params.headers) && !isObject(params.headers)) {
    throw new Error(`headers mus be an object, ${typeof params.headers} given`)
  }

  if (
    !isNil(params.method) &&
    (typeof params.method !== 'string' ||
      !['GET', 'POST', 'PUT', 'DELETE'].includes(params.method.toUpperCase()))
  ) {
    throw new Error(`method must be a string, ${typeof method} given`)
  }

  if (!isNil(params.data) && !isObject(params.data)) {
    throw new Error(`data mus be an object, ${typeof params.data} given`)
  }

  if (!isNil(params.auth) && typeof params.auth !== 'string') {
    throw new Error(`auth must be a string, ${typeof params.auth} given`)
  }

  if (!isNil(params.agent) && !isObject(params.agent)) {
    throw new Error(`agent mus be an object, ${typeof params.agent} given`)
  }

  if (
    !isNil(params.createConnection) &&
    typeof params.createConnection !== 'string'
  ) {
    throw new Error(
      `createConnection must be a string, ${typeof params.createConnection} given`,
    )
  }

  if (!isNil(params.timeout) && typeof params.timeout !== 'number') {
    throw new Error(`timeout must be a number, ${typeof params.timeout} given`)
  }

  if (!isNil(params.ca) && typeof params.ca !== 'string') {
    throw new Error(`ca must be a string, ${typeof params.ca} given`)
  }

  if (!isNil(params.cert) && typeof params.cert !== 'string') {
    throw new Error(`cert must be a string, ${typeof params.cert} given`)
  }

  if (!isNil(params.key) && typeof params.key !== 'string') {
    throw new Error(`key must be a string, ${typeof params.key} given`)
  }

  if (
    !isNil(params.rejectUnauthorized) &&
    typeof params.rejectUnauthorized !== 'boolean'
  ) {
    throw new Error(
      `rejectUnauthorized must be a boolean, ${typeof params.rejectUnauthorized} given`,
    )
  }

  if (!isNil(params.returnStream) && typeof params.returnStream !== 'boolean') {
    throw new Error(
      `returnStream must be a boolean, ${typeof params.returnStream} given`,
    )
  }
}

/**
 * Custom function to check if some string can be parseInt
 * @param  {String}  stringToCheck  The string that we want to check if can be parseInt
 * @return {Boolean}                A boolean telling entered string can be or not parseInt
 */
function canParseInt(stringToCheck) {
  return !isNaN(parseInt(stringToCheck, 10))
}

function isNil(val) {
  return val === null || typeof val === 'undefined'
}

function isError(e) {
  return e && e.stack && e.message
}

function attempt(func) {
  try {
    return func()
  } catch (e) {
    return isError(e) ? e : new Error(e)
  }
}

function capitalize(string) {
  string.toLowerCase().replace(/(?:^|\s)\S/g, function(s) {
    return s.toUpperCase()
  })
}

function isObject(obj) {
  return !isNil(obj) && !Array.isArray(obj) && typeof obj === 'object'
}

function removeNilValue(obj) {
  if (!isObject(obj)) {
    return obj
  }

  return Object.entries(obj)
    .filter(([_, v]) => !isNil(v))
    .reduce((acc, [k, v]) => Object.assign({}, acc, { [k]: v }), {})
}

/**
 * Perform a http request based on entered params
 * @param  {Object} requestParams The http params we want to use for our request
 * @return {Object}               The http response
 */
module.exports = requestParams =>
  // Transform return type to promise
  new Promise((resolve, reject) => {
    // Check if input matches the http request params schema
    const httpRequestParamsError = attempt(() =>
      validateHttpParams(requestParams),
    )
    // If the validation ended in error, reject the promise with the error message
    if (isError(httpRequestParamsError)) {
      return reject(
        new Error(`Error on request params: ${httpRequestParamsError.message}`),
      )
    }

    // Try to build an url object based on inputed params url
    const url = attempt(() => new URL(requestParams.url))

    // If we could not build the url, throw the resulting error
    if (isError(url)) {
      return reject(new Error(`Error while parsing the url: ${url.message}`))
    }

    // Use url protocol minus the ":"
    const protocol = url.protocol.replace(':', '')

    // If the protocol is neither http nor https, throw an error
    if (!['http', 'https'].includes(protocol)) {
      return reject(new Error(`Bad protocol used: ${protocol}`))
    }

    // Build the http request options object based on inputed params
    // First step is remove all non assigned options with lodash pickBy
    const options = removeNilValue({
      hostname: url.hostname,
      // Check if port can be parseInt, else use default protocol port (80 for http & 443 for https)
      port: canParseInt(url.port)
        ? parseInt(url.port, 10)
        : protocols[protocol].defaultPort,
      path: `${url.pathname}${url.search}${url.hash}`,
      // Use inputed method or GET by default
      method: requestParams.method ? requestParams.method.toUpperCase() : 'GET',
      // Use inputed headers and add them to default ones
      // We need to be able to remove the default keys, hence the pickBy
      // Passing either or both default key with null value will remove them
      headers: removeNilValue(
        Object.assign({}, requestParams.headers, {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      ),
      agent: requestParams.agent,
      auth: requestParams.auth,
      createConnection: requestParams.createConnection,
      ca: protocol === 'https' ? requestParams.ca : null,
      cert: protocol === 'https' ? requestParams.cert : null,
      key: protocol === 'https' ? requestParams.key : null,
      rejectUnauthorized:
        protocol === 'https' ? requestParams.rejectUnauthorized : null,
      returnStream: requestParams.returnStream || false,
    })

    // Use 3s as default timeout. The user can override the default timeout
    const timeout = canParseInt(requestParams.timeout)
      ? requestParams.timeout
      : 3000

    // Create a http or https request (depending on defined protocol)
    const request = protocols[protocol].lib
      .request(options, response => {
        // Check response status code
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(
            new Error(`Query returned status code of ${response.statusCode}`),
          )
        }

        // Handle stream
        if (requestParams.returnStream) {
          return resolve(response)
        }

        const chunks = []
        // When we receive data, put them in an array
        response.on('data', chunk => {
          chunks.push(`${chunk}`)
        })

        // When the request finally ends, join the chunks & try to json parse to return it as an object, not as a string
        response.on('end', () => {
          try {
            return resolve(JSON.parse(chunks.join('')))
          } catch (e) {
            return reject(new Error(`Error parsing chunks: ${e.message}`))
          }
        })

        // Handle response error event
        response.on('error', e =>
          reject(new Error(`${capitalize(protocol)} error: ${e.message}`)),
        )

        // Arrow function need a return
        return true
      })
      // Handle error event
      .on('error', e =>
        reject(new Error(`${capitalize(protocol)} error: ${e.message}`)),
      )
      .setTimeout(timeout, () => {
        request.abort()
        return reject(
          new Error(
            `${capitalize(
              protocol,
            )} error: request timed out (timeout: ${timeout}ms)`,
          ),
        )
      })

    // Try to json stringify the data we want to send if any
    const requestBody = requestParams.data
      ? attempt(() => JSON.stringify(requestParams.data, null, 0))
      : null

    // If we have a non get request & a body set, write the body to the request
    if (isError(requestBody)) {
      reject(new Error(`Could not set request body: ${requestBody.message}`))
    } else if (options.method !== 'GET' && requestBody) {
      request.write(requestBody)
    }

    // End the request to release the stream and send the data
    return request.end()
  })

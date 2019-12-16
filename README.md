# riquest

Zero dependency node.js http(s) request library.

## Installation

```bash
npm i -s riquest
```

## Usage

Simple use the `arrandomize` function with an array:

```js
const riquest = require('riquest')

riquest({
  url: 'https://swapi.co/api/people/',
  headers: {
    accept: 'application/json',
  },
  method: 'get',
  timeout: 3000,
  returnStream: false,
})
  .then(console.log)
  .catch(console.error)
```

## API

### riquest(params)

Performs a http/http request using http/https base node libraries.

#### Parameters

- `params`: Params for http/https riquest.
- `params.url`: The full url to riquest. _REQUIRED_
- `params.headers`: An object of key/value headers. Defaults are `Accept: application/json` & `Content-Type: application/json`
- `params.method`: The method to use to query url.
- `params.data`: An object of key/value representing the body json which will be sent along with query.
- `params.timeout`: A number of milliseconds before the query returns a timeout error.
- `params.returnStream`: A boolean controlling whether riquest should return an object or a stream (useful when piping is needed, like for streaming response).

Other params are availible.

- `params.auth`
- `params.agent`
- `params.createConnection`
- `params.ca`
- `params.cert`
- `params.key`
- `params.rejectUnauthorized`

Please see node `http.request` [documentation](https://nodejs.org/api/http.html#http_http_request_url_options_callback) for more informations on those params.

#### Return value

A promise that returns an object representing the response json. If `returnStream` option is set to true, the promise return will be a stream.

#### Exceptions

Thows an `Error` when any param is not of expected format, or when actual query fails.

## License

MIT license. Copyright ©2019.

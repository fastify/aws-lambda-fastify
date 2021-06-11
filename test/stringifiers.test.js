const { test } = require('tap')
const stringifiers = require('../stringifiers')

const payloadV1 = {
  version: '1.0',
  resource: '/my/path',
  path: '/my/path',
  httpMethod: 'GET',
  headers: {
    header1: 'value1',
    header2: 'value2'
  },
  multiValueHeaders: {
    header1: ['value1'],
    header2: ['value1', 'value2']
  },
  queryStringParameters: {
    parameter1: 'value1',
    parameter2: 'value'
  },
  multiValueQueryStringParameters: {
    parameter1: ['value1', 'value2'],
    parameter2: ['value']
  },
  requestContext: {
    accountId: '123456789012',
    apiId: 'id',
    authorizer: {
      claims: null,
      scopes: null
    },
    domainName: 'id.execute-api.us-east-1.amazonaws.com',
    domainPrefix: 'id',
    extendedRequestId: 'request-id',
    httpMethod: 'GET',
    identity: {
      accessKey: null,
      accountId: null,
      caller: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: 'IP',
      user: null,
      userAgent: 'user-agent',
      userArn: null,
      clientCert: {
        clientCertPem: 'CERT_CONTENT',
        subjectDN: 'www.example.com',
        issuerDN: 'Example issuer',
        serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
        validity: {
          notBefore: 'May 28 12:30:02 2019 GMT',
          notAfter: 'Aug  5 09:36:04 2021 GMT'
        }
      }
    },
    path: '/my/path',
    protocol: 'HTTP/1.1',
    requestId: 'id=',
    requestTime: '04/Mar/2020:19:15:17 +0000',
    requestTimeEpoch: 1583349317135,
    resourceId: null,
    resourcePath: '/my/path',
    stage: '$default'
  },
  pathParameters: null,
  stageVariables: null,
  body: 'Hello from Lambda!',
  isBase64Encoded: false
}

const payloadV2 = {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/my/path',
  rawQueryString: 'parameter1=value1&parameter1=value2&parameter2=value',
  cookies: ['cookie1', 'cookie2'],
  headers: {
    header1: 'value1',
    header2: 'value1,value2'
  },
  queryStringParameters: {
    parameter1: 'value1,value2',
    parameter2: 'value'
  },
  requestContext: {
    accountId: '123456789012',
    apiId: 'api-id',
    authentication: {
      clientCert: {
        clientCertPem: 'CERT_CONTENT',
        subjectDN: 'www.example.com',
        issuerDN: 'Example issuer',
        serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
        validity: {
          notBefore: 'May 28 12:30:02 2019 GMT',
          notAfter: 'Aug  5 09:36:04 2021 GMT'
        }
      }
    },
    authorizer: {
      jwt: {
        claims: {
          claim1: 'value1',
          claim2: 'value2'
        },
        scopes: ['scope1', 'scope2']
      }
    },
    domainName: 'id.execute-api.us-east-1.amazonaws.com',
    domainPrefix: 'id',
    http: {
      method: 'POST',
      path: '/my/path',
      protocol: 'HTTP/1.1',
      sourceIp: 'IP',
      userAgent: 'agent'
    },
    requestId: 'id',
    routeKey: '$default',
    stage: '$default',
    time: '12/Mar/2020:19:03:58 +0000',
    timeEpoch: 1583348638390
  },
  body: 'Hello from Lambda',
  pathParameters: {
    parameter1: 'value1'
  },
  isBase64Encoded: false,
  stageVariables: {
    stageVariable1: 'value1',
    stageVariable2: 'value2'
  }
}

test('Serializer v1', (t) => {
  t.plan(1)
  t.equal(stringifiers['1.0'](payloadV1), JSON.stringify(payloadV1))
})

test('Serializer v2', (t) => {
  t.plan(1)
  t.equal(stringifiers['2.0'](payloadV2), JSON.stringify(payloadV2))
})

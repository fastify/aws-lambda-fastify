const fastJson = require('fast-json-stringify')

const v1 = fastJson({
  type: 'object',
  properties: {
    version: { type: 'string' },
    resource: { type: 'string' },
    path: { type: 'string' },
    httpMethod: { type: 'string' },
    headers: {
      type: 'object',
      patternProperties: {
        '.*': { type: 'string' }
      }
    },
    multiValueHeaders: {
      type: 'object',
      patternProperties: {
        '.*': { type: 'array', items: { type: 'string' } }
      }
    },
    queryStringParameters: {
      type: 'object',
      patternProperties: {
        '.*': { type: 'string' }
      }
    },
    multiValueQueryStringParameters: {
      type: 'object',
      patternProperties: {
        '.*': { type: 'array', items: { type: 'string' } }
      }
    },
    requestContext: {
      accountId: { type: 'string' },
      apiId: { type: 'string' },
      authorizer: {
        type: 'object',
        properties: {
          claims: {
            oneOf: [
              {
                type: 'object',
                patternProperties: {
                  '.*': { type: 'string' }
                }
              },
              { type: 'null' }
            ]
          },
          scopes: {
            oneOf: [
              {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              { type: 'null' }
            ]
          }
        }
      },
      domainName: { type: 'string' },
      domainPrefix: { type: 'string' },
      extendedRequestId: { type: 'string' },
      httpMethod: { type: 'string' },
      identity: {
        type: 'object',
        properties: {
          accessKey: { type: 'string' },
          accountId: { type: 'string' },
          caller: { type: 'string' },
          cognitoAuthenticationProvider: { type: 'string' },
          cognitoAuthenticationType: { type: 'string' },
          cognitoIdentityId: { type: 'string' },
          cognitoIdentityPoolId: { type: 'string' },
          principalOrgId: { type: 'string' },
          sourceIp: { type: 'string' },
          user: { type: 'string' },
          userAgent: { type: 'string' },
          userArn: { type: 'string' },
          clientCert: {
            type: 'object',
            properties: {
              clientCertPem: { type: 'string' },
              subjectDN: { type: 'string' },
              issuerDN: { type: 'string' },
              serialNumber: { type: 'string' },
              validity: {
                type: 'object',
                properties: {
                  notBefore: { type: 'string' },
                  notAfter: { type: 'string' }
                }
              }
            }
          }
        }
      },
      path: { type: 'string' },
      protocol: { type: 'string' },
      requestTime: { type: 'string' },
      requestTimeEpoch: { type: 'number' },
      resourceId: { type: 'string' },
      resourcePath: { type: 'string' },
      stage: { type: 'string' }
    },
    pathParameters: {
      oneOf: [
        {
          type: 'object',
          patternProperties: {
            '.*': { type: 'string' }
          }
        },
        { type: 'null' }
      ]
    },
    stageVariables: {
      oneOf: [
        {
          type: 'object',
          patternProperties: {
            '.*': { type: 'string' }
          }
        },
        { type: 'null' }
      ]
    },
    body: { type: 'string' },
    isBase64Encoded: { type: 'boolean' }
  }
})

const v2 = fastJson({
  type: 'object',
  properties: {
    version: { type: 'string' },
    routeKey: { type: 'string' },
    rawPath: { type: 'string' },
    rawQueryString: { type: 'string' },
    cookies: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    headers: {
      type: 'object',
      patternProperties: {
        '.*': { type: 'string' }
      }
    },
    queryStringParameters: {
      type: 'object',
      patternProperties: {
        '.*': { type: 'string' }
      }
    },
    requestContext: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        apiId: { type: 'string' },
        authentication: {
          type: 'object',
          properties: {
            clientCert: {
              type: 'object',
              properties: {
                clientCertPem: { type: 'string' },
                subjectDN: { type: 'string' },
                issuerDN: { type: 'string' },
                serialNumber: { type: 'string' },
                validity: {
                  type: 'object',
                  properties: {
                    notBefore: { type: 'string' },
                    notAfter: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        authorizer: {
          type: 'object',
          properties: {
            jwt: {
              type: 'object',
              properties: {
                claims: {
                  type: 'object',
                  patternProperties: {
                    '.*': { type: 'string' }
                  }
                },
                scopes: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        domainName: { type: 'string' },
        domainPrefix: { type: 'string' },
        http: {
          type: 'object',
          properties: {
            method: { type: 'string' },
            path: { type: 'string' },
            protocol: { type: 'string' },
            sourceIp: { type: 'string' },
            userAgent: { type: 'string' }
          }
        },
        requestId: { type: 'string' },
        routeKey: { type: 'string' },
        stage: { type: 'string' },
        time: { type: 'string' },
        timeEpoch: { type: 'number' }
      }
    },
    body: { type: 'string' },
    pathParameters: {
      type: 'object',
      patternProperties: {
        '.*': { type: 'string' }
      }
    },
    isBase64Encoded: { type: 'boolean' },
    stageVariables: {
      type: 'object',
      patternProperties: {
        '.*': { type: 'string' }
      }
    }
  }
})

module.exports = {
  '1.0': v1,
  '2.0': v2
}

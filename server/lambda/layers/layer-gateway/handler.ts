import { validateTokenClaims, validateTokenSignature } from '../common';

exports.handler = async (event: any) => {
  const { token } = event;
  const validSignature = await validateTokenSignature(token);
  if (validSignature) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Valid token' }),
    };
  }
  return {
    statusCode: 401,
    body: JSON.stringify({ message: 'Invalid token' }),
  };
};
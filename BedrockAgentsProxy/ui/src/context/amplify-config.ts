import { type ResourcesConfig } from "aws-amplify";
import { cognitoConfig, apiConfig } from "../config/auth-config";

export const applicationConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: cognitoConfig.userPoolId,
      userPoolClientId: cognitoConfig.userPoolClientId,
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
        phone: false,
        username: false,
      },
      userAttributes: {
        email: { required: true }
      }
    }
  },
  API: {
    REST: {
      'api': {
        endpoint: apiConfig.endpoint,
      }
    }
  }
};

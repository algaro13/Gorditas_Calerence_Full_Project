import { useMsal } from '@azure/msal-react';
import { useCallback } from 'react';
import { loginRequest } from '../config/msal-config';

export function useToken() {
  const { instance, accounts } = useMsal();

  const getToken = useCallback(async (): Promise<string | null> => {
    if (accounts.length === 0) return null;

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      return response.accessToken;
    } catch (error) {
      // If silent acquisition fails, try redirect
      try {
        await instance.acquireTokenRedirect(loginRequest);
      } catch (redirectError) {
        console.error('Token acquisition failed:', redirectError);
      }
      return null;
    }
  }, [instance, accounts]);

  return { getToken };
}

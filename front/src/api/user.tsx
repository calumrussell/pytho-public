import axios, { AxiosError } from 'axios';

export interface LoginResponse {
  userKey: string
}

export const checkUser = (isLoggedIn: boolean, successFunc: (res: LoginResponse) => void) => {
  const userKey = localStorage.getItem('userKey');
  // The user has a key saved in localStorage but isn't logged in, so we need
  // to see if the user has an active session on the server
  // This can happen if the user does a hard refresh and the state in the
  // reducer gets reset, whilst the browser state stays the same
  if (userKey != undefined && !isLoggedIn) {
    axios.get(process.env.API_URL + '/login')
        .then((res) => res.data)
        .then(successFunc)
        // Fail silently, and remove the bad key
        .catch((err) => localStorage.removeItem('userKey'));
  }
};

export const createUser = (successFunc: (res: LoginResponse) => void, errFunc: (err: AxiosError) => void) => {
  axios.get(process.env.API_URL + '/create')
      .then((res) => res.data)
      .then(successFunc)
      .catch(errFunc);
};

export const loginUser = (userKey: string, successFunc: (res: LoginResponse) => void, errFunc: (err: AxiosError) => void) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const requestInput = {
    'userKey': userKey,
  };

  axios.post(process.env.API_URL + '/login', requestInput, {
    headers: headers,
  })
      .then((res) => res.data)
      .then(successFunc)
      .catch(errFunc);
};

export const logoutUser = (successFunc: () => void, errFunc: (err: AxiosError) => void) => {
  axios.get(process.env.API_URL + '/logout')
      .then((res) => res.data)
      .then(successFunc)
      .catch(errFunc);
};
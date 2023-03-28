import axios from 'axios';

export const request = (url: string) => {
  const baseUrl = process.env.API_URL;

  const postRequest = (input: object | string) => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const config = {
      headers,
    };

    const requestUrl = baseUrl + url;
    return axios.post(requestUrl, input, config);
  };

  const getRequest = (abort?: AbortController) => {
    const requestUrl = baseUrl + url;
    if (abort) {
      const sigInput = {
        signal: abort.signal,
      };
      return axios.get(requestUrl, sigInput);
    }
    return axios.get(requestUrl);
  };

  const requestBuilder = {
    post: (input: object | string) => postRequest(input),
    get: (abort?: AbortController) => getRequest(abort),
  };

  return requestBuilder;
};
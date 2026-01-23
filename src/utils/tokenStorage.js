// Shared in-memory storage for access token (MVP - not production-safe)
// This module provides a simple way to share the access token between routers

let accessToken = null;

const setAccessToken = (token) => {
  accessToken = token;
};

const getAccessToken = () => {
  return accessToken;
};

const isAuthenticated = () => {
  return accessToken !== null;
};

module.exports = {
  setAccessToken,
  getAccessToken,
  isAuthenticated
};

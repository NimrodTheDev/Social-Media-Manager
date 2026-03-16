function makeResponse(success, message, data = null) {
    return { success, message, data: data || null };
}

module.exports = {
  makeResponse
};
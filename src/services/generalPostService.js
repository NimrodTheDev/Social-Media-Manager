const { postSingleLinkedInPost } = require("./postServiceLinkedIn");
const { postThread, postSingleTweet } = require("./postServiceX");

/**
 * Post a post to X API based on its mode
 * @param {string} platform - Platform name
 * @param {Array<{text: string, media: Array<{media_id: string}>}>} content - Post object from database
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<Object>} { success: boolean, tweetId: string, threadIds: Array|null, error: string }
 */
async function postToPlatform(platform, content, accessToken) {
    switch (platform) {
        case 'x':
            if (content.length > 1) {
                return await postThread(content.map((ele) => ele.text), accessToken, content.map((ele) => ele.media));
            } else {
                return await postSingleTweet(content[0].text, accessToken, content[0].media);
            }
        case 'linkedin':
            return await postSingleLinkedInPost(
                content.map(ele => ele.text).join("\n\n"),
                accessToken,
                content.map((ele) => ele.media)
            );

        default:
            return { success: false, error: 'Platform not supported' };
    }
}

module.exports = {
    postToPlatform
}
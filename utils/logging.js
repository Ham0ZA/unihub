const fs = require('fs');
const path = require('path');

const logChannelPath = path.join(__dirname, '..', 'data', 'logChannel.json');

const loadLogChannel = () => {
    if (!fs.existsSync(logChannelPath)) {
        return null;
    }
    const data = JSON.parse(fs.readFileSync(logChannelPath));
    return data.channelId;
};

const sendLog = async (client, message) => {
    const channelId = loadLogChannel();
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId);
    if (channel) {
        await channel.send(message);
    }
};

module.exports = {
    loadLogChannel,
    sendLog,
};

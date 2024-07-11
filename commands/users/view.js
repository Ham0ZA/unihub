const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const prefix = require('./../../index.js');

const dataPath = path.join(__dirname, '..', '..', 'data', "users.json");
const generatedImagesPath = path.join(__dirname, '..', '..', 'generated_images');

const loadData = () => {
    if (!fs.existsSync(dataPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(dataPath));
};

module.exports = {
    name: 'view',
    aliases: ['v'],
    description: 'View an item by its code or the most recent item if no code is provided',
    usage: `${prefix}view [item code]`,
    async execute(message, args) {
        const data = loadData();
        const code = args[0];
        let item, ownerId;

        if (code) {
            // Find item by code
            for (const userId in data) {
                if (Array.isArray(data[userId])) {
                    if (data[userId].some((userItem) => userItem.code === code)) {
                        item = data[userId].find((userItem) => userItem.code === code);
                        ownerId = userId;
                        break;
                    }
                }
            }

            if (!item) {
                return message.channel.send('No item with that code was found.');
            }
        } else {
            // Find the most recent item
            let mostRecentItem = null;
            let mostRecentTime = 0;

            for (const userId in data) {
                if (Array.isArray(data[userId])) {
                    data[userId].forEach((userItem) => {
                        if (userItem.timestamp && userItem.timestamp > mostRecentTime) {
                            mostRecentTime = userItem.timestamp;
                            mostRecentItem = userItem;
                            ownerId = userId;
                        }
                    });
                }
            }

            if (!mostRecentItem) {
                return message.channel.send('No items found.');
            }

            item = mostRecentItem;
        }

        // Get image path
        const imagePath = path.join(generatedImagesPath, `${item.code}.png`);

        const embed = new EmbedBuilder()
            .setTitle(`${item.name}`)
            .setDescription(`**Print Number:** ${item.print}\n**Code:** ${item.code}\n**Owner:** <@${ownerId}>\nNumber on List: ${item.numberOnList}`)
            .setImage(`attachment://${item.code}.png`);

        message.channel.send({
            embeds: [embed],
            files: [{ attachment: imagePath, name: `${item.code}.png` }]
        });
    }
};

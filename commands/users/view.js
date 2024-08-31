const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const prefix = require('./../../index.js');

const dataPath = path.join(__dirname, '..', '..', 'data', "cards.json");
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
    description: 'View a card',
    usage: `${prefix}view [item code or number]`,
    async execute(message, args) {
        const data = loadData();
        const input  = args[0];
        let item, ownerId;

        // Check if the input is a number (numberOnList)
        if (input && /^\d+$/.test(input)) {
            const numberOnList = parseInt(input);
            const userId = message.author.id;
            if (Array.isArray(data[userId])) {
                item = data[userId].find((userItem) => userItem.numberOnList === numberOnList);
            }

            if (!item) {
                return message.channel.send('No item with that number was found.');
            }
            
            ownerId = userId; // Set owner as the message author since it's their collection
        } 
        // Check if the input is a code
        else if (input) {
            for (const userId in data) {
                if (Array.isArray(data[userId])) {
                    if (data[userId].some((userItem) => userItem.code === input)) {
                        item = data[userId].find((userItem) => userItem.code === input);
                        ownerId = userId;
                        break;
                    }
                }
            }

            if (!input) {
                // Get the latest item from the user's collection
                if (Array.isArray(data[message.author.id])) {
                    item = data[message.author.id][data[message.author.id].length - 1];
                    ownerId = message.author.id;
                }
            }
            
            if (!item) {
                return message.channel.send('No item with that code was found.');
            }
        }
        // Get image path
        const imagePath = path.join(generatedImagesPath, `${item.code}.png`);

        const embed = new EmbedBuilder()
            .setTitle(`${item.name}`)
            .setDescription(`**Print Number:** ${item.print}\n**Code:** ${item.code}\n**Owner:** <@${ownerId}>\n**Rarity:** ${item.rarity}`)
            .setImage(`attachment://${item.code}.png`);

        message.channel.send({
            embeds: [embed],
            files: [{ attachment: imagePath, name: `${item.code}.png` }]
        });
    }
};

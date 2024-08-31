const fs = require('fs');
const path = require('path');
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('discord.js');

const dataPath = path.join(__dirname, '..', '..', 'data', "wishlist.json");

const loadData = () => {
    if (!fs.existsSync(dataPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(dataPath));
};


module.exports = {
    name: 'wishlist',
    aliases: ["wl"],
    description: 'Show the wishlisted cards.',
    async execute(message, args) {
        const mentionedUser = message.mentions.users.first();
        const userId = mentionedUser ? mentionedUser.id : message.author.id;
        const data = loadData();
        const userItems = data.users[userId] || [];
        const user = mentionedUser || message.author;

        if (userItems.length === 0) {
            return message.channel.send(`${user.username} doesn't have any wishlist yet.`);
        }


        const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Wishlist`)
            .setDescription(userItems.map((cardId) => `- ${cardId}`).join('\n'))
            .setColor(0x0099ff);

        return message.channel.send({ embeds: [embed] });
        
    }
}
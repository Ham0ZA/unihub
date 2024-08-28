const { EmbedBuilder } = require('discord.js');
const ownerId = process.env.ownerId;

module.exports = {
    name: 'servers',
    description: 'List all servers the bot is currently in along with their IDs',
    execute(message) {
        const servers = message.client.guilds.cache.map(guild => ({
            name: guild.name,
            id: guild.id
        }));

        if (message.author.id !== ownerId) {
            return message.reply('Command only for bot Owner.');
        }
        
        if (servers.length === 0) {
            return message.channel.send('The bot is not in any servers.');
        }

        const embed = new EmbedBuilder()
            .setTitle('Servers List')
            .setDescription(servers.map(server => `**${server.name}** (ID: ${server.id})`).join('\n'))
            .setColor('Random')
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    },
};

const { EmbedBuilder } = require('discord.js');
const ownerId = process.env.ownerId;

module.exports = {
    name: 'leave',
    description: 'Make the bot leave a server by providing its ID',
    args: true,
    usage: '<server_id>',
    async execute(message, args) {
        const serverId = args[0];
        const guild = message.client.guilds.cache.get(serverId);

        if (message.author.id !== ownerId) {
            return message.reply('Command only for bot Owner.');
        }

        if (!guild) {
            return message.channel.send('The bot is not in a server with that ID.');
        }

        try {
            await guild.leave();
            const embed = new EmbedBuilder()
                .setTitle('Server Left')
                .setDescription(`The bot has left the server **${guild.name}** (ID: ${guild.id}).`)
                .setColor('Red')
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            message.channel.send('An error occurred while trying to leave the server.');
        }
    },
};

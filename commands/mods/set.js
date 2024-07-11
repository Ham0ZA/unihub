const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { prefix } = require('../../index.js'); // Assuming prefix is defined in the config file

module.exports = {
    name: 'set',
    aliases: ['s'],
    description: 'Give the bot access to a mentioned channel',
    usage: `${prefix}set <#channel>`,
    async execute(message, args) {
        // Check if the user has the required roles or permissions
        const requiredRoles = ['1061059678336983130', '924070383064330290'];
        const hasRole = message.member.roles.cache.some(role => requiredRoles.includes(role.id));
        const hasAdminPermission = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hasRole && !hasAdminPermission) {
            return message.reply('You do not have permission to use this command.');
        }

        const channelMention = message.mentions.channels.first();
        if (!channelMention) {
            return message.reply('Please mention a channel to give the bot access to.');
        }

        // Set the allowedChannel to the mentioned channel's ID
        global.allowedChannel = channelMention.id;

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Channel Access Set')
            .setDescription(`The bot is now restricted to ${channelMention}.`);

        message.channel.send({ embeds: [embed] });
    },
};

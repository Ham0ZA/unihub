const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');

const logChannelPath = path.join(__dirname, '..', '..', 'data', 'logChannel.json');

const saveLogChannel = (channelId) => {
    if (!fs.existsSync(path.dirname(logChannelPath))) {
        fs.mkdirSync(path.dirname(logChannelPath), { recursive: true });
    }
    fs.writeFileSync(logChannelPath, JSON.stringify({ channelId }, null, 2));
};

module.exports = {
    name: 'log',
    description: 'Set the channel for logging bot activities',
    async execute(message, args) {
        const ownerId = '944919875674071060';
        const requiredRoles = ['1061059678336983130', '924070383064330290'];
        const hasRole = message.member.roles.cache.some(role => requiredRoles.includes(role.id));
        const hasAdminPermission = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (message.author.id !== ownerId && !hasRole && !hasAdminPermission) {
            return message.reply('You do not have permission to use this command.');
        }

        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply('Please mention a valid channel.');
        }
        
        const botPermissionsInChannel = channel.permissionsFor(message.guild.members.me);
        if (!botPermissionsInChannel || !botPermissionsInChannel.has(PermissionsBitField.Flags.ViewChannel) || !botPermissionsInChannel.has(PermissionsBitField.Flags.SendMessages)) {
            return message.reply('I do not have permission to view or send messages in the mentioned channel.');
        }
        
        saveLogChannel(channel.id);
        message.reply(`Log channel has been set to ${channel.name}.`);
    },
};

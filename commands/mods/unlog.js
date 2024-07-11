const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');

const logChannelPath = path.join(__dirname, '..', 'data', 'logChannel.json');

const deleteLogChannel = () => {
    if (fs.existsSync(logChannelPath)) {
        fs.unlinkSync(logChannelPath);
    }
};

module.exports = {
    name: 'unlog',
    description: 'Remove the log channel.',
    async execute(message, args) {
        // Ensure the command is being executed in a guild (server) context
        if (!message.guild) {
            return message.reply('This command can only be used in a server.');
        }

        const ownerId = '944919875674071060';
        const requiredRoles = ['1061059678336983130', '924070383064330290'];
        const hasRole = message.member && message.member.roles.cache.some(role => requiredRoles.includes(role.id));
        const hasAdminPermission = message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        // Check if the user has the necessary permissions
        if (message.author.id !== ownerId && !hasRole && !hasAdminPermission) {
            return message.reply('You do not have permission to use this command.');
        }

        // Delete the log channel file
        deleteLogChannel();
        message.channel.send('Log channel has been removed.');
    },
};

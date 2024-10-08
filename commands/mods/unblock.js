const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');

const blockedUsersPath = path.join(__dirname, '..', '..', 'data', 'blockedUsers.json');

// Load blocked users from the JSON file
const loadBlockedUsers = () => {
    if (!fs.existsSync(blockedUsersPath)) {
        fs.writeFileSync(blockedUsersPath, JSON.stringify([]));
        return [];
    }
    return JSON.parse(fs.readFileSync(blockedUsersPath));
};

// Save blocked users to the JSON file
const saveBlockedUsers = (blockedUsers) => {
    fs.writeFileSync(blockedUsersPath, JSON.stringify(blockedUsers, null, 2));
};

module.exports = {
    name: 'unblock',
    description: 'Unblock a user from using any commands',
    async execute(message, args) {
        const ownerId = '944919875674071060';
        const requiredRoles = ['1061059678336983130', '924070383064330290'];
        const hasRole = message.member.roles.cache.some(role => requiredRoles.includes(role.id));
        const hasAdminPermission = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        // Check if the command is executed by the bot owner, has required roles or admin permission
        if (message.author.id !== ownerId && !hasRole && !hasAdminPermission) {
            return message.reply('You do not have permission to use this command.');
        }

        const blockedUsers = loadBlockedUsers();
        const userId = args[0]?.replace(/[^0-9]/g, '');

        if (!userId) {
            return message.reply('Please provide a valid user ID or mention.');
        }

        const userIndex = blockedUsers.indexOf(userId);
        if (userIndex === -1) {
            return message.reply('This user is not blocked.');
        }

        blockedUsers.splice(userIndex, 1);
        saveBlockedUsers(blockedUsers);

        message.reply(`User with ID ${userId} (<@${userId}>) has been unblocked.`);
    },
};

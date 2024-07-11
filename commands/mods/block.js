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
    name: 'block',
    description: 'Block a user from using any commands',
    async execute(message, args) {
        const hasAdminPermission = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        // Check if the command is executed by the bot owner, has required roles or admin permission
        if (message.author.id !== message.guild.ownerID || hasAdminPermission) {
            return message.reply('You need **Administrator** permission to run this command.');
        }

        const blockedUsers = loadBlockedUsers();
        const userId = args[0]?.replace(/[^0-9]/g, '');

        if (!userId) {
            return message.reply('Please provide a valid user ID or mention.');
        }

        if (blockedUsers.includes(userId)) {
            return message.reply('This user is already blocked.');
        }

        blockedUsers.push(userId);
        saveBlockedUsers(blockedUsers);

        message.reply(`User with ID ${userId} (<@${userId}>) has been blocked.`);
    },
};

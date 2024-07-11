const fs = require('fs');
const path = require('path');

const blockedUsersPath = path.join(__dirname, 'data', 'blockedUsers.json');

// Load blocked users from the JSON file
const loadBlockedUsers = () => {
    if (!fs.existsSync(blockedUsersPath)) {
        fs.writeFileSync(blockedUsersPath, JSON.stringify([]));
        return [];
    }
    return JSON.parse(fs.readFileSync(blockedUsersPath));
};

// Middleware function to check if a user is blocked
const checkBlockedUser = (message, next) => {
    const blockedUsers = loadBlockedUsers();
    if (blockedUsers.includes(message.author.id)) {
        message.reply('You are blocked from using the bot commands.');
        return;
    }
    next();
};

module.exports = {
    checkBlockedUser,
};

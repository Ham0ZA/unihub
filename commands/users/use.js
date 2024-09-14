const fs = require('fs');
const path = require('path');

// User data path
const userDataPath = path.join(__dirname, "..", "..", "data", "currency.json");

// Function to get user data
function getUserData(userId) {
    const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    return userData[userId] || {};
}

// Function to save user data
function saveUserData(userId, data) {
    const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    userData[userId] = data;
    fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
}

module.exports = {
    name: 'use',
    description: 'Use an item you own.',
    async execute(message, args) {
        if (args.length === 0) {
            return message.reply('You need to specify an item to use.');
        }

        const itemName = args.slice(0, 2).join(' ').toLowerCase();
        const userId = message.author.id;
        const userData = getUserData(userId);

        // Check if the user has the item in their inventory
        if (!userData.items || !userData.items[itemName] || userData.items[itemName] <= 0) {
            return message.reply(`You don't have the item \`${itemName}\``);
        }

        // Decrease the item count or remove it from the inventory if the count is 1
        if (userData.items[itemName] > 1) {
            userData.items[itemName] -= 1;
        } else {
            delete userData.items[itemName];
        }
        saveUserData(userId, userData);

        // Check if there is a command associated with the item name
        try {
            const commandPath = path.join(__dirname, "..", "..", "items", `${itemName}.js`);
            const command = require(commandPath);

            if (!command) {
                return message.reply('This item does not have an associated command.');
            }

            // Execute the associated command
            await command.execute(message, args.slice(1), true);
        } catch (error) {
            console.error(error);
            message.reply('There was an error trying to execute that command!');
        }
    }
};

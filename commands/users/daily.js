const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Define the NDball emoji
const NDBALL_EMOJI = "<:ndball:1274489320086048788>";

// Path to store wallet data
const walletsPath = path.join(__dirname, '..', '..', 'data', 'currency.json');
const cooldownPath = path.join(__dirname, '..', "..", "data", "cooldowns.json");
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

// Ensure that the wallets.json file exists
const ensureWalletsExist = () => {
    if (!fs.existsSync(walletsPath)) {
        fs.writeFileSync(walletsPath, JSON.stringify({}));
    }
};

// Load the wallets data
const loadWallets = () => {
    if (!fs.existsSync(walletsPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(walletsPath));
};

// Save the wallets data
const saveWallets = (data) => {
    fs.writeFileSync(walletsPath, JSON.stringify(data, null, 2));
};

module.exports = {
    name: 'daily',
    description: 'Claim your daily NDball reward',
    async execute(message, args) {
        const userId = message.author.id;

        // Load cooldown data
        let cooldownData = {};
        if (fs.existsSync(cooldownPath)) {
            cooldownData = JSON.parse(fs.readFileSync(cooldownPath));
        }

        // Check if user is on cooldown
        const now = Date.now();
        if (cooldownData[userId]?.daily && now - cooldownData[userId].daily < DAILY_COOLDOWN) {
            const timeLeft = DAILY_COOLDOWN - (now - cooldownData[userId].daily);
            return message.channel.send(`You need to wait ${Math.floor(timeLeft / (1000 * 60 * 60))} hours and ${Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))} minutes before using this command again.`);
        }

        // Ensure that the wallets file exists
        ensureWalletsExist();

        // Load the wallet data
        const wallets = loadWallets();

        // Initialize user wallet if not exists
        if (!wallets[userId]) {
            wallets[userId] = {
                ndballs: 0,
                ddballs: 0
            };
        }

        const userWallet = wallets[userId];

        // Generate a random amount of NDball between 60 and 90
        const dailyReward = Math.floor(Math.random() * 31) + 60;

        // Update the user's wallet
        userWallet.ndballs += dailyReward;

        // Save the updated wallets data
        saveWallets(wallets);

        // Save the current time as the last time this command was used
        if (!cooldownData[userId]) cooldownData[userId] = {};
        cooldownData[userId].daily = now;
        fs.writeFileSync(cooldownPath, JSON.stringify(cooldownData, null, 2));


        // Create an embed message with the reward info, using the NDball emoji
        const embed = new EmbedBuilder()
            .setDescription(`You have claimed your daily reward of **${dailyReward} ${NDBALL_EMOJI}**!`)
            .setColor('Green')
            .setTimestamp();

        // Send the embed
        await message.channel.send({ embeds: [embed] });
    },
};

const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Cooldown durations (in milliseconds)
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const GACHA_COOLDOWN = 5 * 60 * 1000; // 10 minutes in milliseconds

module.exports = {
    name: "cooldown",
    aliases: ['cd'],
    description: "Check your cooldown status for gacha and daily commands",
    async execute(message) {
        const userId = message.author.id;
        const cooldownPath = path.join(__dirname, "..", "..", "data", "cooldowns.json");

        // Load cooldown data
        let cooldownData = {};
        if (fs.existsSync(cooldownPath)) {
            cooldownData = JSON.parse(fs.readFileSync(cooldownPath));
        }

        // Initialize response embed
        const cooldownEmbed = new EmbedBuilder()
            .setTitle(`${message.author.username}'s Cooldowns`)
            .setColor("Blue")
            .setTimestamp();

        // Check cooldowns for 'daily' and 'gacha'
        const now = Date.now();
        let dailyCooldownText = "Ready to claim!";
        let gachaCooldownText = "Ready to use!";

        // Check daily cooldown
        if (cooldownData[userId]?.daily) {
            const timeSinceLastDaily = now - cooldownData[userId].daily;
            if (timeSinceLastDaily < DAILY_COOLDOWN) {
                const timeLeft = DAILY_COOLDOWN - timeSinceLastDaily;
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
                dailyCooldownText = `\`${hoursLeft}h ${minutesLeft}m ${secondsLeft}s\``;
            }
        }

        // Check gacha cooldown
        if (cooldownData[userId]?.gacha) {
            const timeSinceLastGacha = now - cooldownData[userId].gacha;
            if (timeSinceLastGacha < GACHA_COOLDOWN) {
                const timeLeft = GACHA_COOLDOWN - timeSinceLastGacha;
                const minutesLeft = Math.floor(timeLeft / (1000 * 60));
                const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
                gachaCooldownText = `\`${minutesLeft}m ${secondsLeft}s\``;
            }
        }

        // Add fields to embed for daily and gacha cooldowns
        cooldownEmbed.addFields(
            { name: "Daily Cooldown", value: dailyCooldownText, inline: true },
            { name: "Gacha Cooldown", value: gachaCooldownText, inline: true }
        );

        // Send the embed with cooldown status
        return message.channel.send({ embeds: [cooldownEmbed] });
    }
};

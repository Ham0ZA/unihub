const { EmbedBuilder } = require("discord.js");
const { userCooldowns, buttonPressCooldowns } = require("./gacha");

module.exports = {
    name: "cooldowns",
    aliases: ["cd"],
    description: "Check your current cooldowns",
    async execute(message, args) {
        const userId = message.author.id;

        const userCooldownTime = userCooldowns.get(userId);
        const buttonPressCooldownTime = buttonPressCooldowns.get(userId);

        const currentTime = Date.now();

        const userCooldownRemaining = userCooldownTime ? (userCooldownTime - currentTime) / 1000 : 0;
        const buttonCooldownRemaining = buttonPressCooldownTime ? (buttonPressCooldownTime - currentTime) / 1000 : 0;

        const formatCooldown = (time) => {
            if (time <= 0) return "No cooldown";
            const minutes = Math.floor(time / 60);
            const seconds = Math.ceil(time % 60);
            return minutes > 0 ? `${minutes} minutes ${seconds} seconds` : `${seconds} seconds`;
        };

        const embed = new EmbedBuilder()
            .setTitle("Cooldowns")
            .setColor("#0099ff")
            .addFields(
                { name: "Command Cooldown", value: formatCooldown(userCooldownRemaining) },
                { name: "Button Press Cooldown", value: formatCooldown(buttonCooldownRemaining) }
            );

        message.channel.send({ embeds: [embed] });
    },
};

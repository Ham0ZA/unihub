const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const shopPath = path.join(__dirname, "..", "..", "data", "shop.json");

// Load shop data
const loadShopData = () => {
    if (!fs.existsSync(shopPath)) return {};
    return JSON.parse(fs.readFileSync(shopPath));
};

module.exports = {
    name: "shop",
    description: "View items in the shop.",
    async execute(message) {
        // Load shop data
        const shopData = loadShopData();

        // If no items found in shop data
        if (!Object.keys(shopData.items).length) return message.reply("The shop is currently empty.");

        // Display shop items in an embed
        const embed = new EmbedBuilder()
            .setTitle("Shop Items")
            .setColor("#FFD700") // Gold color for shop embed
            .setDescription("Here are the available items in the shop:");

        // Create fields for each item in the shop
        const fields = Object.keys(shopData.items).map((key) => {
            const item = shopData.items[key];
            return {
                name: `**${item.name}:** ${item.currency}`,
                value: `${item.cost}`,
                inline: false
            };
        });

        embed.addFields(fields);

        return message.reply({ embeds: [embed] });
    }
};

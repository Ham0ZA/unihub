const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");

const NDBALL_EMOJI = "<:ndball:1274489320086048788>"; // Define the NDball emoji

module.exports = {
    name: "burn",
    description: "Burn a card",
    async execute(message, args) {
        const userId = message.author.id;
        const dataPath = path.join(__dirname, "..", "..", "data", "cards.json");
        const currencyPath = path.join(__dirname, "..", "..", "data", "currency.json");

        const data = JSON.parse(fs.readFileSync(dataPath));
        let currencyData = {};

        if (fs.existsSync(currencyPath)) {
            currencyData = JSON.parse(fs.readFileSync(currencyPath));
        }

        if (!data[userId] || data[userId].length === 0) {
            return message.reply("You have no cards to burn.");
        }

        const cardNumber = parseInt(args[0]);
        if (isNaN(cardNumber) || cardNumber < 1 || cardNumber > data[userId].length) {
            return message.reply("Invalid card number.");
        }

        const cardToBurn = data[userId][cardNumber - 1];
        const imagePath = path.join(__dirname, "..", "..", "generated_images", `${cardToBurn.code}.png`);

        // NDball rewards based on rarity
        const ndBallRewards = {
            ":third_place:": { min: 10, max: 15 },
            ":second_place:": { min: 25, max: 35 },
            ":first_place:": { min: 50, max: 70 },
            "<a:uniquee:1274020241214672927>": { min: 100, max: 250 }
        };

        // Create the embed for the card to be burned
        const burnEmbed = new EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setDescription(`Are you sure you want to burn **${cardToBurn.name}**?`)
            .setColor("Red")
            .setImage(`attachment://${cardToBurn.code}.png`)
            .setTimestamp();

        // Create buttons for accept and decline
        const acceptButton = new ButtonBuilder()
            .setCustomId("accept_burn")
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId("decline_burn")
            .setLabel("Decline")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);

        // Send the initial message with buttons
        const burnMessage = await message.channel.send({
            embeds: [burnEmbed],
            components: [row],
            files: [{ attachment: imagePath, name: `${cardToBurn.code}.png` }]
        });

        // Set up a collector for the button interactions
        const filter = (interaction) => interaction.user.id === message.author.id;
        const collector = burnMessage.createMessageComponentCollector({ filter, time: 30000 });

        collector.on("collect", async (interaction) => {
            if (interaction.customId === "accept_burn") {
                // Remove the selected card from the user's data
                data[userId].splice(cardNumber - 1, 1);

                // Re-adjust the `numberOnList` for the remaining cards
                data[userId].forEach((card, index) => {
                    card.numberOnList = index + 1;
                });

                // Save the updated data
                fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

                // Delete the image from the filesystem
                fs.unlinkSync(imagePath);

                // Calculate and give the NDball reward
                const rarity = cardToBurn.rarity;
                const rewardRange = ndBallRewards[rarity];
                const ndBallReward = Math.floor(Math.random() * (rewardRange.max - rewardRange.min + 1)) + rewardRange.min;

                if (!currencyData[userId]) {
                    currencyData[userId] = { ndballs: 0, ddballs: 0 };
                }
                currencyData[userId].ndballs += ndBallReward;

                // Save the updated currency data
                fs.writeFileSync(currencyPath, JSON.stringify(currencyData, null, 2));

                // Update the embed to indicate success with emoji NDballs
                burnEmbed.setDescription(`**${cardToBurn.name}** has been burned successfully! \nYou earned **${ndBallReward} ${NDBALL_EMOJI}**!`);
                burnEmbed.setColor("Green");

                await interaction.update({
                    embeds: [burnEmbed],
                    components: [], // Remove the buttons
                });
            } else if (interaction.customId === "decline_burn") {
                // Update the embed to indicate that the burn was declined
                burnEmbed.setDescription(`Burning of **${cardToBurn.name}** has been declined.`);
                burnEmbed.setColor("Yellow");

                await interaction.update({
                    embeds: [burnEmbed],
                    components: [], // Remove the buttons
                });
            }
        });

        collector.on("end", async (collected, reason) => {
            if (reason === "time") {
                // Update the embed to indicate that the timer expired
                burnEmbed.setDescription(`Burning of **${cardToBurn.name}** timed out.`);
                burnEmbed.setColor("Grey");

                await burnMessage.edit({
                    embeds: [burnEmbed],
                    components: [], // Remove the buttons
                });
            }
        });
    }
};

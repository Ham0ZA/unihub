const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Path to the cards data
const cardsPath = path.join(__dirname, '..', '..', 'data', 'cards.json');

// Ensure that the cards file exists
const ensureCardsFileExists = () => {
    if (!fs.existsSync(cardsPath)) {
        fs.writeFileSync(cardsPath, JSON.stringify([])); // Initialize an empty array
    }
};

// Load the cards data
const loadCardsData = () => {
    if (!fs.existsSync(cardsPath)) {
        return [];
    }
    return JSON.parse(fs.readFileSync(cardsPath));
};

// Save updated cards data
const saveCardsData = (data) => {
    fs.writeFileSync(cardsPath, JSON.stringify(data, null, 2));
};

module.exports = {
    name: 'tag',
    description: 'Assign an emoji tag to a card by its numberOnList or code.',
    execute(message, args) {
        // Ensure that the cards file exists
        ensureCardsFileExists();

        // Load the cards data
        const cardsData = loadCardsData();
        const userId = message.author.id;

        // Check if the input is valid
        if (args.length < 2) {
            return message.reply('Please provide an emoji and a card numberOnList or code.');
        }

        const emoji = args[0];
        const cardIdentifier = args[1]; // This can be either numberOnList or code

        // Find the card by numberOnList or code
        const card = cardsData[userId].find(c => c.numberOnList == cardIdentifier || c.code == cardIdentifier);

        // If card is not found, return an error
        if (!card) {
            return message.reply(`Card with numberOnList or code "${cardIdentifier}" not found.`);
        }

        // Update the card with the new emoji tag
        card.tag = emoji;

        // Save the updated cards data back to the file
        saveCardsData(cardsData);

        // Send a confirmation message with the updated card details
        const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('Tag Assigned')
        .setDescription(`Successfully assigned the tag ${emoji} to **${card.name}**.`)

        // Send the embed message to the channel
        message.channel.send({ embeds: [embed] });
    },
};

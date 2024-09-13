const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");
const prefix = require("./../../index.js");

// Paths for card data and images
const cardDataPath = path.join(__dirname, "..", "..", "data", "cards.json");
const wishlistPath = path.join(__dirname, "..", "..", "data", "wishlist.json");
const imagesFolderPath = path.join(__dirname, "..", "..", "images");

// Load card data from JSON
const loadCardData = () => {
  if (!fs.existsSync(cardDataPath)) {
    return {
      cards: []
    };
  }
  return JSON.parse(fs.readFileSync(cardDataPath));
};

// Load wishlist data from JSON
const loadWishlistData = () => {
  if (!fs.existsSync(wishlistPath)) {
    return {
      cards: [],
      users: {}
    };
  }
  return JSON.parse(fs.readFileSync(wishlistPath));
};

// Save wishlist data to JSON
const saveWishlistData = (data) => {
  try {
    fs.writeFileSync(wishlistPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error saving wishlist data:", err);
  }
};

// Find all cards by name or source (ignores case) across all folders
const getCardImagesByNameOrSource = (query) => {
  const folders = ["common", "rare", "legendary", "unique"];
  const results = [];

  for (const folder of folders) {
    const folderPath = path.join(imagesFolderPath, folder);
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      for (const file of files) {
        const [cardName, ...sourceParts] = file.split("_");
        const sourceWithExtension = sourceParts.join("_");
        const source = sourceWithExtension.replace(path.extname(file), "");

        if (cardName.toLowerCase().includes(query.toLowerCase()) || source.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            path: path.join(folderPath, file),
            rarity: folder,
            cardName,
            source,
          });
        }
      }
    }
  }
  return results;
};

// Helper function to create select menu options
const createSelectMenuOptions = (cards) => {
  const uniqueCardNames = [...new Set(cards.map(card => card.cardName))];
  return uniqueCardNames.map((name) => ({
    label: name,
    value: name, // Store the card name as the value
  }));
};

// Function to handle the dropdown selection
const handleDropdownSelection = async (interaction, cardImages, data) => {
  const selectedCardName = interaction.values[0];
  const selectedCardImages = cardImages.filter(card => card.cardName === selectedCardName);

  const currentIndex = 0; // Start with the first rarity for the selected card
  const updatedEmbed = generateEmbed(selectedCardImages, currentIndex, data);

  await interaction.update({
    embeds: [updatedEmbed],
    files: [{
      attachment: selectedCardImages[currentIndex].path,
      name: "cardImage.png"
    }],
    components: [createCardButtonsRow()]
  });

  return {
    selectedCardImages,
    currentIndex,
  };
};

// Function to create the dropdown menu
const createDropdownMenu = (cardImages) => {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("card_select")
      .setPlaceholder("Select a card")
      .addOptions(createSelectMenuOptions(cardImages))
  );
};

// Function to generate buttons for card embeds
const createCardButtonsRow = () => {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("left")
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("wishlist")
      .setLabel("💫")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("right")
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
  );
};

// Function to generate the embed for a specific card image
const generateEmbed = (selectedCardImages, currentIndex, data) => {
  const { path: imagePath, rarity, cardName, source } = selectedCardImages[currentIndex];
  const prints = data.prints[cardName]?.[rarity] || 0;

  const rarityEmojis = {
    unique: "<a:uniquee:1274020241214672927>",
    legendary: ":first_place:",
    rare: ":second_place:",
    common: ":third_place:",
  };

  const embed = new EmbedBuilder()
    .setDescription(
      `**Name:** ${cardName}\n**Source:** ${source}\n**Rarity:** ${rarityEmojis[rarity]}\n**Drops:** ${prints}\n**Wishlisted:** ${loadWishlistData().cards.find(card => card.name === cardName)?.wishlistCount || 0}\n${currentIndex + 1} of ${selectedCardImages.length}`)
    .setColor("Blue")
    .setImage("attachment://cardImage.png"); // Referencing attached image as cardImage.png

  return embed;
};

module.exports = {
  name: "lookup",
  description: "Lookup information about a card by its name or source",
  usage: `${prefix}lookup [name]`,
  async execute(message, args) {
    const query = args.join(" ");
    if (!query) {
      return message.reply("Please provide the name or source of the card to look up.");
    }

    const data = loadCardData();
    const cardImages = getCardImagesByNameOrSource(query);

    if (cardImages.length === 0) {
      return message.reply(`No card found with the name or source "${query}".`);
    }

    const initialEmbed = new EmbedBuilder()
    .setColor("Blue")
    .setDescription(results);

    const messageEmbed = await message.channel.send({
      embeds: [initialEmbed],
      components: [createDropdownMenu(cardImages)]
    });

    const filter = (interaction) =>
      (interaction.isSelectMenu() || interaction.isButton()) &&
      interaction.user.id === message.author.id;

    const collector = messageEmbed.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    let currentIndex = 0;
    let selectedCardImages = [];

    collector.on("collect", async (interaction) => {
      if (interaction.isSelectMenu()) {
        const result = await handleDropdownSelection(interaction, cardImages, data);
        selectedCardImages = result.selectedCardImages;
        currentIndex = result.currentIndex;
      }

      if (interaction.isButton()) {
        if (interaction.customId === "left") {
          currentIndex = (currentIndex - 1 + selectedCardImages.length) % selectedCardImages.length;
        } else if (interaction.customId === "right") {
          currentIndex = (currentIndex + 1) % selectedCardImages.length;
        } else if (interaction.customId === "wishlist") {
          const cardName = selectedCardImages[currentIndex].cardName;
          const userId = interaction.user.id;
          const wishlistData = loadWishlistData();
          const userWishlist = wishlistData.users[userId] || [];
          const cardIndex = userWishlist.indexOf(cardName);

          if (userWishlist.length >= 10) {
            await interaction.reply({
              content: "You have reached the limit of 10 wishlisted cards.",
              ephemeral: true,
            });
          } else if (cardIndex === -1) {
            userWishlist.push(cardName);
            wishlistData.users[userId] = userWishlist;

            const cardData = wishlistData.cards.find(
              (card) => card.name === cardName
            );
            if (cardData) {
              cardData.wishlistCount += 1;
            } else {
              wishlistData.cards.push({
                name: cardName,
                wishlistCount: 1
              });
            }

            saveWishlistData(wishlistData);

            await interaction.reply({
              content: `Added **${cardName}** to your wishlist.`,
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: "Card already added to your wishlist.",
              ephemeral: true,
            });
          }
          return;
        }

        const updatedEmbed = generateEmbed(selectedCardImages, currentIndex, data);

        await interaction.update({
          embeds: [updatedEmbed],
          files: [{
            attachment: selectedCardImages[currentIndex].path,
            name: "cardImage.png"
          }],
          components: [createCardButtonsRow()]
        });
      }
    });

    collector.on("end", async () => {
      await messageEmbed.edit({
        components: []
      });
    });
  },
};

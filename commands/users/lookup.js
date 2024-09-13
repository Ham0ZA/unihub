const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
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

// Find all cards by name (ignores case) across all folders
const getCardImagesByName = (name) => {
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

        if (cardName.toLowerCase().includes(name.toLowerCase())) {
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

module.exports = {
  name: "lookup",
  description: "Lookup information about a card by its name",
  usage: `${prefix}lookup [name]`,
  async execute(message, args) {
    const name = args.join(" ");
    if (!name) {
      return message.reply("Please provide the name of the card to look up.");
    }

    // Load card data and find card info
    const data = loadCardData();
    const cardImages = getCardImagesByName(name);

    if (cardImages.length === 0) {
      return message.reply(`No card found with the name "${name}".`);
    }

    let currentIndex = 0;

    // Function to generate the embed for a specific card image
    const generateEmbed = (index) => {
      const {
        path: imagePath,
        rarity,
        cardName,
        source
      } = cardImages[index];
      const prints = data.prints[cardName]?.[rarity] || 0;

      const rarityEmojis = {
        unique: "<a:uniquee:1274020241214672927>",
        legendary: ":first_place:",
        rare: ":second_place:",
        common: ":third_place:",
      };

      const embed = new EmbedBuilder()
        .setDescription(
          `**Name:** ${cardName}\n**Source:** ${source}\n**Rarity:** ${rarityEmojis[rarity]}\n**Drops:** ${prints}\n**Wishlisted:** ${loadWishlistData().cards.find(card => card.name === cardName)?.wishlistCount || 0}\n${index + 1} of ${cardImages.length}`)
        .setColor("Blue")
        .setImage("attachment://cardImage.png") // Referencing attached image as cardImage.png

      return embed;
    };

    const row = new ActionRowBuilder().addComponents(
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

    const initialEmbed = generateEmbed(currentIndex);

    const messageEmbed = await message.channel.send({
      embeds: [initialEmbed],
      files: [{
        attachment: cardImages[currentIndex].path,
        name: "cardImage.png"
      }, ], // Attach image as 'cardImage.png'
      components: [row],
    });

    const filter = (interaction) => ["left", "right", "wishlist"].includes(interaction.customId) &&
      interaction.user.id === message.author.id;

    const collector = messageEmbed.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        // Inform the user they are not authorized to use these buttons
        await interaction.reply({
          content: "You are not authorized to interact with these buttons.",
          ephemeral: true,
        });
        return;
      }

      if (interaction.customId === "left") {
        currentIndex =
          (currentIndex - 1 + cardImages.length) % cardImages.length;
      } else if (interaction.customId === "right") {
        currentIndex = (currentIndex + 1) % cardImages.length;
      } else if (interaction.customId === "wishlist") {
        // Add card to wishlist
        const cardName = cardImages[currentIndex].cardName;
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

          // Update global wishlist count
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
          });
        } else {
          await interaction.reply({
            content: "Card already added to your wishlist.",
          });
        }

        return; // Ensure that no further updates are attempted after this reply
      }

      const updatedEmbed = generateEmbed(currentIndex);

      await interaction.update({
        embeds: [updatedEmbed],
        files: [{
          attachment: cardImages[currentIndex].path,
          name: "cardImage.png"
        }, ], // Always refer to the attached image as 'cardImage.png'
      });
    });

    collector.on("end", async () => {
      await messageEmbed.edit({
        components: []
      });
    });
  },
};
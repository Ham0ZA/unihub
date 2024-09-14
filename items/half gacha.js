const {
  EmbedBuilder
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// Path to user data (currency.json)
const userDataPath = path.join(__dirname, "..", "data", "currency.json");

// Load user data from JSON
const loadUserData = () => {
  if (!fs.existsSync(userDataPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(userDataPath));
};

// Save user data to JSON
const saveUserData = (data) => {
  try {
    fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error saving user data:", err);
  }
};

module.exports = {
  name: "half gacha",
  description: "applies half time for drops.",
  async execute(message) {
    const userId = message.author.id;
    const userData = loadUserData();
    const currentTime = Date.now();
    const oneMonthInMilliseconds = 30 * 24 * 60 * 60 * 1000; // Approx. 1 month
    
    // Set the new cooldown
    if (!userData[userId]) {
      userData[userId] = {};
    }
    userData[userId].items.HalfGacha = currentTime + oneMonthInMilliseconds;

    // Save user data
    saveUserData(userData);

    const embed = new EmbedBuilder()
      .setDescription(`cooldown will expire on <t:${Math.round(userData[userId].items.HalfGacha / 1000)}:F>`)
      .setColor("Green");

    message.channel.send({
      embeds: [embed]
    });
  },
};

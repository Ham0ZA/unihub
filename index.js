const { Client, GatewayIntentBits, Collection, ActivityType } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();


const { checkBlockedUser } = require("./middleware");
const { sendLog } = require("./utils/logging"); // Adjust the path accordingly

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const prefix = process.env.PREFIX;
client.commands = new Collection();
client.commandCategories = new Map();
const cooldowns = new Collection();
global.allowedChannel = null;

// Function to validate command filenames
const validateCommandFilenames = (commandsDir) => {
    const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
    let isValid = true;

    for (const file of commandFiles) {
        const command = require(path.join(commandsDir, file));
        const commandName = file.split('.')[0];

        if (command.name !== commandName) {
            console.error(`Filename mismatch: ${file} -> Command name: ${command.name}`);
            isValid = false;
        }
    }

    return isValid;
};

// Load commands
const loadCommands = (dir, category = "") => {
    const commandFiles = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
        const command = require(path.join(dir, file));
        command.category = category;
        client.commands.set(command.name, command);
        if (!client.commandCategories.has(category)) {
            client.commandCategories.set(category, []);
        }
        client.commandCategories.get(category).push(command.name);
    }

    const subDirs = fs
        .readdirSync(dir)
        .filter((subDir) => fs.lstatSync(path.join(dir, subDir)).isDirectory());
    for (const subDir of subDirs) {
        loadCommands(path.join(dir, subDir), subDir);
    }
};

// Validate command filenames before loading
const commandsDir = path.join(__dirname, "commands");
if (!validateCommandFilenames(commandsDir)) {
    console.error('Command filename validation failed. Please fix the mismatched filenames and try again.');
    process.exit(1); // Exit the process if there are mismatches
}

loadCommands(commandsDir);

// Event listener for when the bot is ready
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setPresence({
        activities: [{ name: `over 𝚄𝙽𝙸𝚅𝙴𝚁𝚂𝙴𝟽`, type: ActivityType.Watching }],
        status: "dnd",
    });

    try {
        // Fetch the owner user by ID
        const owner = await client.users.fetch("944919875674071060");

        if (owner) {
            // Send a DM to the owner
            await owner.send("The bot is now online!");
            console.log("DM sent to the owner.");
        } else {
            console.log("Owner not found.");
        }
    } catch (error) {
        console.error("Error sending DM to the owner:", error);
    }

    // Check if all commands are working properly
    client.commands.forEach((command, name) => {
        try {
            if (!command.name || !command.execute) {
                throw new Error(
                    `Command "${name}" is missing a required property.`,
                );
            }
            console.log(`Command "${name}" loaded successfully.`);
        } catch (error) {
            console.error(`Error loading command "${name}": ${error.message}`);
        }
    });
});

// Event listener for messages
client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot) return;
        if (
            message.content.includes("@here") ||
            message.content.includes("@everyone") ||
            message.type == "REPLY"
        )
            return false;
        
        /* if (message.author.id === "600542189570883605" ) {
            return message.reply('sir t9wd')
        } */

        // Check if the bot was mentioned
        if (message.content.startsWith('<@' + client.user.id + '>')) {
            await message.reply(`My prefix is ${prefix}`);
        }
        if (!message.content.startsWith(prefix)) return;

        if (global.allowedChannel && message.channel.id !== global.allowedChannel) {
            const allowedChannelMention = `<#${global.allowedChannel}>`;
            return message.channel.send(
                `You can only use the bot in ${allowedChannelMention}.`,
            );
        }

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command =
            client.commands.get(commandName) ||
            client.commands.find(
                (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
            );

        if (!command) return;

        // Cooldown logic
        const now = Date.now();
        const timestamps = cooldowns.get(commandName) || new Collection();
        const cooldownAmount = 3000; // 3 seconds in milliseconds

        if (timestamps.has(message.author.id)) {
            const expirationTime =
                timestamps.get(message.author.id) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply(
                    `please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${commandName}\` command.`,
                );
            }
        }

        timestamps.set(message.author.id, now);
        cooldowns.set(commandName, timestamps);

        checkBlockedUser(message, async () => {
            try {
                await command.execute(message, args);
                sendLog(
                    client,
                    `Command ${commandName} executed by ${message.author.tag}`,
                );
            } catch (error) {
                console.error(error);
                message.reply("There was an error trying to execute that command.");
                sendLog(
                    client,
                    `Error executing command ${commandName}: ${error.message}`,
                );
            }
        });
    } catch (error) {
        console.error("Unhandled error:", error);
        message.reply("An unexpected error occurred.");
        // Optionally, you could notify users or log this error to a log channel
    }
});

// Global error handling to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    sendLog(client, `Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    sendLog(client, `Uncaught Exception: ${error}`);
});

// Login to Discord with your app's token
client.login(process.env.TOKEN);

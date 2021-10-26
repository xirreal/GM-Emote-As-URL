import * as webpackModules from '@goosemod/webpack';
import * as patcher from '@goosemod/patcher';
import { createItem, removeItem } from '@goosemod/settings';

const settings = { emojisize: '64' };

const emojisModule = webpackModules.findByProps('getDisambiguatedEmojiContext', 'search');
const messageEmojiParserModule = webpackModules.findByProps('parse', 'parsePreprocessor', 'unparse');
const emojiPickerModule = webpackModules.findByProps('useEmojiSelectHandler');

const Unpatch = {};

export default {
    goosemodHandlers: {
        onImport: async () => {
            Unpatch.emojisModule = patcher.patch(emojisModule, "search", (originalArgs, previousReturn) => {
                previousReturn.unlocked.push(...previousReturn.locked);
                previousReturn.locked = [];
                return previousReturn;
            });

            Unpatch.messageEmojiParserModule = patcher.patch(messageEmojiParserModule, "parse", (originalArgs, previousReturn) => {
                if (previousReturn.invalidEmojis.length !== 0) {
                    for (let emoji of previousReturn.invalidEmojis) {
                        previousReturn.content = previousReturn.content.replace(
                            `<${emoji.animated ? 'a' : ''}:${emoji.originalName || emoji.name}:${emoji.id}>`,
                            `${emoji.url.split('?')[0]}?size=${settings.emojisize}&width=16`,
                        );
                    }
                    previousReturn.invalidEmojis = [];
                }
                return previousReturn;
            });

            Unpatch.emojiPickerModule = patcher.patch(emojiPickerModule, "useEmojiSelectHandler", (originalArgs, previousReturn) => {
                const {
                    onSelectEmoji,
                    closePopout
                } = originalArgs[0];
                return function(data, state) {
                    const emoji = data.emoji;
                    if (emoji != null && emoji.available) {
                        onSelectEmoji(emoji, state.isFinalSelection);
                        if (state.isFinalSelection) closePopout();
                    }
                };
            });

            createItem('Emote as URL', ['',
                {
                    type: 'text-input',
                    text: 'Emoji Size',
                    initialValue: () => settings.emojisize,
                    oninput: (value) => {
                        settings.emojisize = value;
                    },
                },
            ]);
        },

        getSettings: () => [settings],
        loadSettings: ([_settings]) => { [settings] = _settings },

        onRemove: async () => {
            Object.values(Unpatch).forEach(unpatch => unpatch());
            removeItem('Emote as URL');
        }
    },
};

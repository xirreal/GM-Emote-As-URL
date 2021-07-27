import * as webpackModules from '@goosemod/webpack';
import { createItem, removeItem } from '@goosemod/settings';
import { version } from './goosemodModule.json';

var searchHook;
var parseHook;
var useEmojiSelectHandlerHook;

let settings = {
  emojisize: '64',
};

const emojisModule = webpackModules.findByProps('getDisambiguatedEmojiContext', 'search');
const messageEmojiParserModule = webpackModules.findByProps(
  'parse',
  'parsePreprocessor',
  'unparse',
);
const emojiPickerModule = webpackModules.findByProps('useEmojiSelectHandler');

let originalFunctions = {
  original_search: undefined,
  original_parse: undefined,
  original_useEmojiSelectHandler: undefined,
};

export default {
  goosemodHandlers: {
    onImport: async () => {
      searchHook = originalFunctions.original_search = emojisModule.search;
      emojisModule.search = function () {
        return searchHook.apply(this, arguments);
      };

      parseHook = originalFunctions.original_parse = messageEmojiParserModule.parse;
      messageEmojiParserModule.parse = function () {
        return parseHook.apply(this, arguments);
      };

      useEmojiSelectHandlerHook = originalFunctions.original_useEmojiSelectHandler =
        emojiPickerModule.useEmojiSelectHandler;
      emojiPickerModule.useEmojiSelectHandler = function () {
        return useEmojiSelectHandlerHook.apply(this, arguments);
      };

      searchHook = function () {
        let result = originalFunctions.original_search.apply(this, arguments);
        result.unlocked.push(...result.locked);
        result.locked = [];
        return result;
      };

      parseHook = function () {
        let result = originalFunctions.original_parse.apply(this, arguments);
        if (result.invalidEmojis.length !== 0) {
          for (let emoji of result.invalidEmojis) {
            result.content = result.content.replace(
              `<${emoji.animated ? 'a' : ''}:${emoji.originalName || emoji.name}:${emoji.id}>`,
              `${emoji.url}&size=${settings.emojisize}&width=16`,
            );
          }
          result.invalidEmojis = [];
        }
        return result;
      };

      useEmojiSelectHandlerHook = function (args) {
        const { onSelectEmoji, closePopout } = args;
        return function (data, state) {
          const emoji = data.emoji;
          if (emoji != null && emoji.available) {
            onSelectEmoji(emoji, state.isFinalSelection);
            if (state.isFinalSelection) closePopout();
          }
        };
      };

      createItem('Emote as URL', [
        version,

        {
          type: 'header',
          text: 'Change the emoji size to your liking!',
        },
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

    onRemove: async () => {
      searchHook = originalFunctions.original_search;
      parseHook = originalFunctions.original_parse;
      useEmojiSelectHandlerHook = originalFunctions.original_useEmojiSelectHandler;
      removeItem('Emote as URL');
    },
  },
};
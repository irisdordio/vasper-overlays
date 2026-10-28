/* ==========================================================
   Tiny read-only Twitch chat client.
   Connects anonymously (no login, no token), so it can read
   chat messages, subs, gift subs, raids and cheers.
   Follows are NOT sent over chat; see README for options.
   ========================================================== */

const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";

/** Twitch escapes some characters inside tag values */
function unescapeTag(value = "") {
  return value
    .replace(/\\s/g, " ")
    .replace(/\\:/g, ";")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}

/** Parses one raw IRC line into { tags, command, channel, user, text } */
export function parseLine(line) {
  const msg = { tags: {}, command: "", channel: "", user: "", text: "" };
  let rest = line;

  if (rest.startsWith("@")) {
    const end = rest.indexOf(" ");
    rest.slice(1, end).split(";").forEach((pair) => {
      const split = pair.indexOf("=");
      msg.tags[pair.slice(0, split)] = unescapeTag(pair.slice(split + 1));
    });
    rest = rest.slice(end + 1);
  }

  if (rest.startsWith(":")) {
    const end = rest.indexOf(" ");
    const prefix = rest.slice(1, end);
    msg.user = prefix.includes("!") ? prefix.split("!")[0] : "";
    rest = rest.slice(end + 1);
  }

  const textStart = rest.indexOf(" :");
  const head = textStart >= 0 ? rest.slice(0, textStart) : rest;
  msg.text = textStart >= 0 ? rest.slice(textStart + 2) : "";

  const parts = head.split(" ");
  msg.command = parts[0];
  msg.channel = (parts[1] || "").replace("#", "");
  return msg;
}

/**
 * connectChat("its_vasper", { onMessage, onEvent, onStatus })
 *  onMessage({ user, color, text, badges, bits })
 *  onEvent({ type: "sub"|"resub"|"subgift"|"raid"|"cheer", user, amount, months, text })
 */
export function connectChat(channel, handlers = {}) {
  const { onMessage = () => {}, onEvent = () => {}, onStatus = () => {} } = handlers;
  const name = channel.toLowerCase().replace("#", "");
  let socket;
  let retryDelay = 1000;
  let closedByUs = false;

  function open() {
    socket = new WebSocket(IRC_URL);

    socket.addEventListener("open", () => {
      retryDelay = 1000;
      socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      socket.send("PASS SCHMOOPIIE");
      socket.send(`NICK justinfan${Math.floor(10000 + Math.random() * 80000)}`);
      socket.send(`JOIN #${name}`);
      onStatus("connected");
    });

    socket.addEventListener("message", (event) => {
      event.data.split("\r\n").filter(Boolean).forEach(handleLine);
    });

    socket.addEventListener("close", () => {
      onStatus("disconnected");
      if (closedByUs) return;
      setTimeout(open, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30000);
    });
  }

  function handleLine(line) {
    if (line.startsWith("PING")) {
      socket.send(line.replace("PING", "PONG"));
      return;
    }

    const msg = parseLine(line);
    const display = msg.tags["display-name"] || msg.user;

    if (msg.command === "PRIVMSG") {
      // "/me" messages arrive wrapped as \x01ACTION ...\x01
      msg.text = msg.text.replace(/^\x01ACTION (.*)\x01$/, "$1");
      const bits = Number(msg.tags.bits || 0);
      onMessage({
        id: msg.tags.id,
        user: display,
        color: msg.tags.color || "",
        badges: msg.tags.badges || "",
        emotes: msg.tags.emotes || "",
        text: msg.text,
        bits,
      });
      if (bits > 0) onEvent({ type: "cheer", user: display, amount: bits, text: msg.text });
    }

    if (msg.command === "USERNOTICE") {
      const kind = msg.tags["msg-id"];
      const login = msg.tags["display-name"] || msg.tags.login;

      if (kind === "sub" || kind === "resub") {
        onEvent({
          type: kind,
          user: login,
          months: Number(msg.tags["msg-param-cumulative-months"] || 1),
          text: msg.text,
        });
      }
      if (kind === "subgift") {
        onEvent({ type: "subgift", user: login, to: msg.tags["msg-param-recipient-display-name"] });
      }
      if (kind === "raid") {
        onEvent({
          type: "raid",
          user: msg.tags["msg-param-displayName"] || login,
          amount: Number(msg.tags["msg-param-viewerCount"] || 0),
        });
      }
    }

    if (msg.command === "CLEARCHAT" || msg.command === "CLEARMSG") {
      onEvent({ type: "moderation", command: msg.command, target: msg.text, id: msg.tags["target-msg-id"] });
    }
  }

  open();
  return {
    close() {
      closedByUs = true;
      socket?.close();
    },
  };
}

/** Reads ?key=value from the overlay URL with a fallback */
export function param(key, fallback = "") {
  const value = new URLSearchParams(location.search).get(key);
  return value === null ? fallback : value;
}

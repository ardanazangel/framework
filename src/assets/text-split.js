function splitWords(text) {
  return text.replace(
    /(\S+)/g,
    '<span class="word"><span class="word-inner">$1</span></span>',
  );
}

function splitChars(text) {
  return [...text].map((ch) =>
    ch === " "
      ? " "
      : `<span class="char"><span class="char-inner">${ch}</span></span>`,
  ).join("");
}

export function splitText(html) {
  if (!/\b(words|chars)\b/.test(html)) return html;

  const out = [];
  let i = 0;
  let mode = null;
  let depth = 0;

  while (i < html.length) {
    if (html[i] !== "<") {
      const end = html.indexOf("<", i);
      const text = html.slice(i, end === -1 ? html.length : end);
      if (mode === "words" && depth === 1) out.push(splitWords(text));
      else if (mode === "chars" && depth === 1) out.push(splitChars(text));
      else out.push(text);
      i = end === -1 ? html.length : end;
      continue;
    }

    const end = html.indexOf(">", i) + 1;
    const tag = html.slice(i, end);
    const isClosing = tag[1] === "/";
    const isSelfClosing = tag[tag.length - 2] === "/";

    if (mode) {
      if (isClosing) {
        depth--;
        if (depth === 0) mode = null;
      } else if (!isSelfClosing) {
        depth++;
      }
    } else if (!isClosing && !isSelfClosing) {
      if (/\bwords\b/.test(tag)) { mode = "words"; depth = 1; }
      else if (/\bchars\b/.test(tag)) { mode = "chars"; depth = 1; }
    }

    out.push(tag);
    i = end;
  }

  return out.join("");
}

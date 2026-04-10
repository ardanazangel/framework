// --- server-compatible (pure string) ---

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

// --- client-only (DOM/Canvas) ---

let ctx;

function splitContainer(container) {
  if (!ctx) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }
  const text = container.textContent.trim();
  const words = text.split(/\s+/);
  if (!words.length) return;

  const style = getComputedStyle(container);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}/${style.lineHeight} ${style.fontFamily}`;
  const maxWidth = container.clientWidth;
  const spaceWidth = ctx.measureText(" ").width;

  const measured = words.map((w) => ({ word: w, width: ctx.measureText(w).width }));

  const lines = [[]];
  let lineWidth = 0;

  for (const { word, width } of measured) {
    const isFirst = lines[lines.length - 1].length === 0;
    const needed = isFirst ? width : width + spaceWidth;
    if (!isFirst && lineWidth + needed > maxWidth) {
      lines.push([word]);
      lineWidth = width;
    } else {
      lines[lines.length - 1].push(word);
      lineWidth += needed;
    }
  }

  container.innerHTML = "";
  for (const lineWords of lines) {
    const inner = document.createElement("span");
    inner.className = "line-inner";
    inner.textContent = lineWords.join(" ");
    const line = document.createElement("span");
    line.className = "line";
    line.appendChild(inner);
    container.appendChild(line);
  }
}

export function splitLines(containers) {
  containers.forEach(splitContainer);
}
